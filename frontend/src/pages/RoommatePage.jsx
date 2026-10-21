import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, ErrorBanner, VerifiedBadge } from '../components/bits';
import LeaseBar from '../components/LeaseBar';
import {
  CLEAN_LABELS, GENDER_LABELS, SLEEP_LABELS, VIBE_LABELS,
  addMonthsISO, budgetRange, shortDate, timeAgo,
} from '../format';

/** One "looking for roommates" profile. */
export default function RoommatePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setP(null);
    api(`/api/roommates/${id}`).then(setP).catch((e) => setError(e.message));
  }, [id, user]);

  if (error && !p) return <div className="container narrow"><ErrorBanner error={error} /><Link to="/roommates">Back to roommates</Link></div>;
  if (!p) return <p className="container muted" role="status">Loading…</p>;

  async function setStatus(status) {
    try { setP(await api(`/api/roommates/${p.id}/status`, { method: 'PATCH', body: { status } })); }
    catch (e) { setError(e.message); }
  }
  async function remove() {
    if (!window.confirm('Delete this roommate post? Its messages are deleted too.')) return;
    try { await api(`/api/roommates/${p.id}`, { method: 'DELETE' }); navigate('/my-listings'); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="container listing-page">
      <p className="crumbs"><Link to="/roommates">All roommate profiles</Link></p>
      <ErrorBanner error={error} />
      {p.status === 'TAKEN' && (
        <div className="banner warn" role="status">
          {p.mine ? 'Marked as found. It’s hidden from search until you re-open it.' : 'This person already found roommates.'}
        </div>
      )}

      <div className="title-row">
        <div className="rm-person large">
          <Avatar name={p.owner.displayName} size={64} />
          <div>
            <h1>{p.headline}</h1>
            <p className="muted">
              {p.owner.displayName}{p.occupation ? `, ${p.occupation}` : ''} <VerifiedBadge user={p.owner} />
            </p>
          </div>
        </div>
      </div>

      <div className="listing-grid">
        <div className="listing-main">
          <dl className="facts">
            <div><dt>Budget for their share</dt><dd>{budgetRange(p.budgetMin, p.budgetMax)} a month</dd></div>
            <div><dt>Where</dt><dd>{p.preferredArea ? `${p.preferredArea}, ` : ''}{p.city}, {p.state}</dd></div>
            <div><dt>Move in</dt><dd>{shortDate(p.moveInDate)}</dd></div>
            <div><dt>Looking for</dt><dd>{p.roommatesWanted} roommate{p.roommatesWanted === 1 ? '' : 's'}</dd></div>
          </dl>

          <section aria-labelledby="stay-h">
            <h2 id="stay-h">Planned stay</h2>
            <LeaseBar from={p.moveInDate} to={addMonthsISO(p.moveInDate, p.stayMonths)} size="large" />
          </section>

          <section aria-labelledby="about-h">
            <h2 id="about-h">About {p.owner.displayName}</h2>
            <p className="description">{p.about}</p>
          </section>

          <section aria-labelledby="habits-h">
            <h2 id="habits-h">Living habits</h2>
            <dl className="facts">
              <div><dt>Schedule</dt><dd>{SLEEP_LABELS[p.sleepSchedule]}</dd></div>
              <div><dt>Cleaning</dt><dd>{CLEAN_LABELS[p.cleanliness]}</dd></div>
              <div><dt>Smoking</dt><dd>{p.smokes ? 'Smokes' : 'Doesn’t smoke'}</dd></div>
              <div><dt>Pets</dt><dd>{p.hasPet ? 'Has a pet' : 'No pets'}</dd></div>
              <div><dt>Home vibe</dt><dd>{VIBE_LABELS[p.householdVibe]}</dd></div>
              <div><dt>Open to living with</dt><dd>{GENDER_LABELS[p.genderPreference]}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="listing-side">
          {p.mine ? (
            <div className="side-panel">
              <h2 className="h3">Your roommate post</h2>
              <Link className="btn btn-primary block" to={`/roommates/${p.id}/edit`}>Edit post</Link>
              {p.status === 'ACTIVE' ? (
                <button className="btn btn-ghost block" onClick={() => setStatus('TAKEN')}>I found roommates</button>
              ) : (
                <button className="btn btn-ghost block" onClick={() => setStatus('ACTIVE')}>Start looking again</button>
              )}
              <button className="link-btn danger" onClick={remove}>Delete post</button>
            </div>
          ) : (
            <MessageBox p={p} user={user} />
          )}
          <p className="safety-note">
            Meet in a public place first, and sign the lease together so everyone is responsible for their share.{' '}
            <Link to="/guide#safety">More safety tips</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}

function MessageBox({ p, user }) {
  const navigate = useNavigate();
  const [text, setText] = useState(`Hi ${p.owner.displayName}, I'm also looking for a place in ${p.city} around ${shortDate(p.moveInDate)}. Want to talk?`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send(e) {
    e.preventDefault();
    if (!user) { navigate('/login', { state: { from: `/roommates/${p.id}` } }); return; }
    setSending(true);
    setError('');
    try {
      const conv = await api(`/api/roommates/${p.id}/conversations`, { method: 'POST', body: { body: text } });
      navigate(`/messages/${conv.summary.id}`);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="side-panel">
      <div className="poster">
        <Avatar name={p.owner.displayName} size={40} />
        <div>
          <p className="poster-name">{p.owner.displayName} <VerifiedBadge user={p.owner} /></p>
          <p className="muted small">Posted {timeAgo(p.createdAt)}</p>
        </div>
      </div>
      {p.myConversationId ? (
        <Link to={`/messages/${p.myConversationId}`} className="btn btn-primary block">Open your conversation</Link>
      ) : p.status === 'TAKEN' ? (
        <p className="muted">Messaging is closed because they found roommates.</p>
      ) : (
        <form onSubmit={send}>
          <label htmlFor="rm-msg">Message {p.owner.displayName}</label>
          <textarea id="rm-msg" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} required />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="btn btn-primary block" disabled={sending}>{user ? (sending ? 'Sending…' : 'Send message') : 'Log in to send'}</button>
          <p className="muted small">Your email and phone number aren’t shared.</p>
        </form>
      )}
    </div>
  );
}
