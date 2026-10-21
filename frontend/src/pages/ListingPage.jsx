import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, ErrorBanner, SaveButton, VerifiedBadge } from '../components/bits';
import LeaseBar from '../components/LeaseBar';
import { GENDER_LABELS, TYPE_HELP, TYPE_LABELS, VIBE_LABELS, beds, money, shortDate, timeAgo } from '../format';

const pinIcon = L.divIcon({ className: '', html: '<span class="map-dot" aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });

export default function ListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [l, setL] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setL(null);
    api(`/api/listings/${id}`).then(setL).catch((e) => setError(e.message));
  }, [id, user]);

  if (error && !l) return <div className="container narrow"><ErrorBanner error={error} /><Link to="/">Back to all listings</Link></div>;
  if (!l) return <p className="container muted" role="status">Loading listing…</p>;

  async function setStatus(status) {
    try { setL(await api(`/api/listings/${l.id}/status`, { method: 'PATCH', body: { status } })); }
    catch (e) { setError(e.message); }
  }

  async function remove() {
    if (!window.confirm('Delete this listing permanently? Its photos and messages are deleted too.')) return;
    try { await api(`/api/listings/${l.id}`, { method: 'DELETE' }); navigate('/my-listings'); }
    catch (e) { setError(e.message); }
  }

  const showRoommates = l.listingType === 'ROOM' || l.currentRoommates > 0;

  return (
    <div className="container listing-page">
      <p className="crumbs"><Link to="/">All listings</Link></p>
      <ErrorBanner error={error} />

      {l.status === 'TAKEN' && (
        <div className="banner warn" role="status">
          {l.mine ? 'Marked as taken. It’s hidden from search until you re-open it.' : 'This place has been taken.'}
        </div>
      )}

      <div className="title-row">
        <div>
          <h1>{l.title}</h1>
          <p className="muted">{l.address}, {l.city}, {l.state}{l.zipCode ? ` ${l.zipCode}` : ''}</p>
        </div>
        <SaveButton listingId={l.id} initial={l.saved} large />
      </div>

      <Gallery images={l.images} />

      <div className="listing-grid">
        <div className="listing-main">
          <dl className="facts">
            <div><dt>Rent</dt><dd>{money(l.monthlyRent)} a month{l.utilitiesIncluded ? ', utilities included' : ''}</dd></div>
            <div><dt>Type</dt><dd>{TYPE_LABELS[l.listingType]}</dd></div>
            <div><dt>Size</dt><dd>{beds(l.bedrooms)}, {Number(l.bathrooms)} bath</dd></div>
            <div><dt>Move in</dt><dd>{shortDate(l.availableFrom)}</dd></div>
          </dl>

          <section aria-labelledby="dates-h">
            <h2 id="dates-h">Lease dates</h2>
            <LeaseBar from={l.availableFrom} to={l.availableTo} size="large" />
            <p className="muted small">{TYPE_HELP[l.listingType]}</p>
          </section>

          <section aria-labelledby="about-h">
            <h2 id="about-h">About the place</h2>
            <p className="description">{l.description}</p>
            <ul className="plain-list">
              <li>{l.furnished ? 'Furnished' : 'Not furnished'}</li>
              <li>{l.petsAllowed ? 'Pets allowed' : 'No pets'}</li>
              <li>{l.utilitiesIncluded ? 'Utilities included in rent' : 'Utilities paid separately'}</li>
              {l.subletPermissionConfirmed && <li>The poster confirmed their lease allows this</li>}
            </ul>
          </section>

          {showRoommates && (
            <section aria-labelledby="rm-h">
              <h2 id="rm-h">Roommates</h2>
              <dl className="facts">
                <div><dt>Staying</dt><dd>{l.currentRoommates === 0 ? 'Nobody' : `${l.currentRoommates} roommate${l.currentRoommates === 1 ? '' : 's'}`}</dd></div>
                <div><dt>Open to</dt><dd>{GENDER_LABELS[l.genderPreference]}</dd></div>
                <div><dt>Household</dt><dd>{VIBE_LABELS[l.householdVibe]}</dd></div>
              </dl>
            </section>
          )}

          {l.latitude != null && (
            <section aria-labelledby="map-h">
              <h2 id="map-h">Location</h2>
              <MapContainer center={[l.latitude, l.longitude]} zoom={15} className="detail-map" scrollWheelZoom={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[l.latitude, l.longitude]} icon={pinIcon} />
              </MapContainer>
              <p className="small">
                <a href={`https://www.openstreetmap.org/directions?to=${l.latitude},${l.longitude}`} target="_blank" rel="noreferrer">
                  Get directions (opens in a new tab)
                </a>
              </p>
            </section>
          )}
        </div>

        <aside className="listing-side">
          {l.mine ? <OwnerPanel l={l} onStatus={setStatus} onDelete={remove} /> : <ContactPanel l={l} user={user} />}
          <p className="safety-note">
            Before you pay anything, see the place in person or on a live video call, and ask to see the lease.
            Never wire money or pay a deposit to hold a place. <Link to="/guide#safety">More safety tips</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}

/** One large photo with up to four smaller ones; any photo opens a full-screen viewer. */
function Gallery({ images }) {
  const [open, setOpen] = useState(null);
  if (!images.length) return null;
  const shown = images.slice(0, 5);
  return (
    <section className={`mosaic count-${shown.length}`} aria-label="Photos">
      {shown.map((img, n) => (
        <button key={img.id} className={`mosaic-item ${n === 0 ? 'main' : ''}`} onClick={() => setOpen(n)}
          aria-label={`Open photo ${n + 1} of ${images.length}`}>
          <img src={img.url} alt={img.alt} loading={n === 0 ? 'eager' : 'lazy'} />
        </button>
      ))}
      {images.length > 1 && (
        <button className="mosaic-all" onClick={() => setOpen(0)}>All {images.length} photos</button>
      )}
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Lightbox({ images, start, onClose }) {
  const [i, setI] = useState(start);
  const go = (n) => setI((n + images.length) % images.length);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.querySelector('.lightbox-close')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [images.length, onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-top">
          <span aria-live="polite">{i + 1} of {images.length}</span>
          <button className="lightbox-close" onClick={onClose}>Close</button>
        </div>
        <img src={images[i].url} alt={images[i].alt} />
        {images.length > 1 && (
          <div className="lightbox-nav">
            <button onClick={() => go(i - 1)}>Previous</button>
            <button onClick={() => go(i + 1)}>Next</button>
          </div>
        )}
        {images[i].ownerAlt && <p className="lightbox-caption">{images[i].ownerAlt}</p>}
      </div>
    </div>
  );
}

function ContactPanel({ l, user }) {
  const navigate = useNavigate();
  const [text, setText] = useState(`Hi ${l.owner.displayName}, is this still available? I’d like to move in around ${shortDate(l.availableFrom)}.`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send(e) {
    e.preventDefault();
    if (!user) { navigate('/login', { state: { from: `/listings/${l.id}` } }); return; }
    setSending(true);
    setError('');
    try {
      const conv = await api(`/api/listings/${l.id}/conversations`, { method: 'POST', body: { body: text } });
      navigate(`/messages/${conv.summary.id}`);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="side-panel">
      <p className="side-price">{money(l.monthlyRent)} <span>a month</span></p>
      <div className="poster">
        <Avatar name={l.owner.displayName} size={40} />
        <div>
          <p className="poster-name">{l.owner.displayName} <VerifiedBadge user={l.owner} /></p>
          <p className="muted small">Posted {timeAgo(l.createdAt)}</p>
        </div>
      </div>

      {l.myConversationId ? (
        <Link to={`/messages/${l.myConversationId}`} className="btn btn-primary block">Open your conversation</Link>
      ) : l.status === 'TAKEN' ? (
        <p className="muted">Messaging is closed because this place was taken.</p>
      ) : (
        <form onSubmit={send}>
          <label htmlFor="first-msg">Message {l.owner.displayName}</label>
          <textarea id="first-msg" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} required />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="btn btn-primary block" disabled={sending}>
            {user ? (sending ? 'Sending…' : 'Send message') : 'Log in to send'}
          </button>
          <p className="muted small">Your email and phone number aren’t shared.</p>
        </form>
      )}
    </div>
  );
}

function OwnerPanel({ l, onStatus, onDelete }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy this link:', window.location.href); }
  };
  return (
    <div className="side-panel">
      <h2 className="h3">Your listing</h2>
      <Link className="btn btn-primary block" to={`/listings/${l.id}/edit`}>Edit listing</Link>
      {l.status === 'ACTIVE' ? (
        <button className="btn btn-ghost block" onClick={() => onStatus('TAKEN')}>Mark as taken</button>
      ) : (
        <button className="btn btn-ghost block" onClick={() => onStatus('ACTIVE')}>Re-open listing</button>
      )}
      <button className="btn btn-ghost block" onClick={share}>{copied ? 'Link copied' : 'Copy link'}</button>
      <Link className="btn btn-ghost block" to={`/agreement?listing=${l.id}`}>Make a sublease agreement</Link>
      <button className="link-btn danger" onClick={onDelete}>Delete listing</button>
      <p className="muted small">Share the link in your Facebook or Discord groups so people see the photos and dates in one place.</p>
    </div>
  );
}
