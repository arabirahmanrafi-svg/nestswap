import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, ErrorBanner, VerifiedBadge } from '../components/bits';
import { timeAgo } from '../format';

const THREAD_POLL_MS = 5000;
const INBOX_POLL_MS = 15000;

/** Polls `fn` every `ms` while the tab is visible. */
function usePolling(fn, ms, deps) {
  useEffect(() => {
    let alive = true;
    const run = () => { if (alive && !document.hidden) fn(); };
    run();
    const t = setInterval(run, ms);
    return () => { alive = false; clearInterval(t); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

const FILTERS = [['ALL', 'All'], ['LISTING', 'Places'], ['ROOMMATE', 'Roommates']];

export default function Messages() {
  const { id } = useParams();
  const [inbox, setInbox] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  usePolling(() => api('/api/conversations').then(setInbox).catch((e) => setError(e.message)), INBOX_POLL_MS, [id]);

  // No conversations at all: one friendly screen instead of an empty two-pane box.
  if (inbox && inbox.length === 0 && !id) {
    return (
      <div className="container narrow">
        <h1>Messages</h1>
        <ErrorBanner error={error} />
        <div className="inbox-empty">
          <h2>No messages yet</h2>
          <p>
            Conversations start when you message someone about a place or a roommate profile,
            or when someone messages you about your post. Your email and phone number stay private.
          </p>
          <div className="row-buttons">
            <Link to="/" className="btn btn-primary">Browse places</Link>
            <Link to="/roommates" className="btn btn-ghost">Find a roommate</Link>
          </div>
        </div>
      </div>
    );
  }

  const unreadTotal = inbox?.reduce((n, c) => n + c.unread, 0) || 0;
  const shown = inbox?.filter((c) => filter === 'ALL' || c.subjectType === filter) || [];

  return (
    <div className="container messages-page">
      <h1 className={id ? 'desktop-only' : ''}>Messages</h1>
      <ErrorBanner error={error} />
      <div className={`messages-layout ${id ? 'has-thread' : ''}`}>
        <nav className="inbox" aria-label="Conversations">
          <div className="inbox-head">
            <p>
              <strong>Inbox</strong>
              {unreadTotal > 0 && <span className="muted"> {unreadTotal} unread</span>}
            </p>
            <div className="inbox-filter" role="group" aria-label="Show">
              {FILTERS.map(([key, label]) => (
                <button key={key} className={filter === key ? 'on' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {!inbox && <p className="muted inbox-note">Loading…</p>}
          {inbox && shown.length === 0 && (
            <p className="muted inbox-note">No {filter === 'LISTING' ? 'place' : 'roommate'} conversations yet.</p>
          )}
          <ul>
            {shown.map((c) => (
              <li key={c.id}>
                <Link to={`/messages/${c.id}`} className={`inbox-row ${String(c.id) === id ? 'on' : ''} ${c.unread ? 'unread' : ''}`}
                  aria-current={String(c.id) === id ? 'page' : undefined}>
                  {c.subjectCover
                    ? <img src={c.subjectCover.url} alt="" />
                    : <Avatar name={c.otherUser.displayName} size={48} />}
                  <span className="inbox-text">
                    <span className="inbox-top">
                      <strong>{c.otherUser.displayName}</strong>
                      <span className="muted small">{timeAgo(c.lastMessageAt)}</span>
                    </span>
                    <span className="muted small ellipsis">
                      {c.subjectType === 'ROOMMATE' ? 'Roommate: ' : 'Place: '}{c.subjectTitle}
                    </span>
                    <span className="ellipsis">{c.lastMessage}</span>
                  </span>
                  {c.unread > 0 && <span className="badge-count" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="thread-pane" aria-label="Conversation">
          {id ? <Thread id={id} key={id} /> : (
            <div className="thread-placeholder desktop-only">
              <p><strong>Pick a conversation</strong></p>
              <p className="muted">Choose someone on the left to read and reply.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thread({ id }) {
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const lastCount = useRef(0);

  usePolling(() => api(`/api/conversations/${id}`)
    .then((c) => { setConv(c); window.dispatchEvent(new Event('nestswap:read')); })
    .catch((e) => setError(e.message)), THREAD_POLL_MS, [id]);

  // Scroll to the newest message only when a new one arrives.
  useEffect(() => {
    const n = conv?.messages.length || 0;
    if (n !== lastCount.current) bottomRef.current?.scrollIntoView({ block: 'end' });
    lastCount.current = n;
  }, [conv]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      setConv(await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body: text } }));
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (error && !conv) return <ErrorBanner error={error} />;
  if (!conv) return <p className="muted pad">Loading conversation…</p>;
  const s = conv.summary;

  return (
    <div className="thread">
      <header className="thread-head">
        <button className="link-btn mobile-only" onClick={() => navigate('/messages')}>Back</button>
        <Avatar name={s.otherUser.displayName} size={40} />
        <div>
          <p className="thread-name">{s.otherUser.displayName} <VerifiedBadge user={s.otherUser} /></p>
          <Link to={s.subjectType === 'ROOMMATE' ? `/roommates/${s.subjectId}` : `/listings/${s.subjectId}`} className="small">{s.subjectTitle}</Link>
          {s.subjectStatus === 'TAKEN' && <span className="tag muted">{s.subjectType === 'ROOMMATE' ? 'Found roommates' : 'Taken'}</span>}
        </div>
      </header>

      <ol className="bubbles" aria-live="polite" aria-label="Messages">
        {conv.messages.map((m) => (
          <li key={m.id} className={`bubble ${m.mine ? 'mine' : 'theirs'}`}>
            <span className="sr-only">{m.mine ? 'You' : s.otherUser.displayName} said:</span>
            <p>{m.body}</p>
            <span className="bubble-time">{timeAgo(m.createdAt)}{m.mine && m.readAt ? ', seen' : ''}</span>
          </li>
        ))}
        <li ref={bottomRef} aria-hidden="true" />
      </ol>

      {!s.iAmHost && (
        <p className="safety-inline">Don’t send money before you’ve toured the place and seen the lease.</p>
      )}

      <form className="composer" onSubmit={send}>
        <label htmlFor="msg" className="sr-only">Write a message</label>
        <textarea id="msg" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write a message…"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} />
        <button className="btn btn-primary send-btn" disabled={sending || !text.trim()} >Send</button>
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
