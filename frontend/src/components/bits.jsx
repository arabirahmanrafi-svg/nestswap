import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

/** Shows "Verified" or "Verified student" next to a poster's name. */
export function VerifiedBadge({ user, compact = false }) {
  if (!user?.emailVerified) return null;
  const student = user.verifiedStudent;
  return (
    <span className={`verified ${student ? 'student' : ''}`} title={student ? 'Verified .edu email' : 'Verified email'}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0l2 1.6 2.5-.2.8 2.4 2.1 1.4-.8 2.4.8 2.4-2.1 1.4-.8 2.4-2.5-.2L8 16l-2-1.6-2.5.2-.8-2.4L.6 10.8l.8-2.4L.6 6l2.1-1.4.8-2.4 2.5.2z"/><path fill="var(--paper)" d="M7 10.6L4.4 8l1-1L7 8.6l3.6-3.6 1 1z"/></svg>
      {!compact && (student ? 'Verified student' : 'Verified')}
      {compact && <span className="sr-only">{student ? 'Verified student' : 'Verified'}</span>}
    </span>
  );
}

/** Heart button. Logged-out users are sent to log in first. */
export function SaveButton({ listingId, initial, onChange, large = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login', { state: { from: `/listings/${listingId}` } }); return; }
    setBusy(true);
    const next = !saved;
    setSaved(next);                     // optimistic update
    try {
      await api(`/api/listings/${listingId}/save`, { method: next ? 'PUT' : 'DELETE' });
      onChange?.(next);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`save-btn ${saved ? 'on' : ''} ${large ? 'large' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save this listing'}
      onClick={toggle}
      disabled={busy}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.5 1.1 4.2 2.3h2c.7-1.2 2.1-2.3 4.2-2.3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"
          fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {large && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

/** Labelled form field with error text wired up for screen readers. */
export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {children}
      {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

const AVATAR_COLORS = ['#1f5d4c', '#b2541f', '#6a4c93', '#1e5aa8', '#8a5a00', '#a23b5c'];

/** Round initial avatar with a stable color per name. */
export function Avatar({ name = '?', size = 46 }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span className="avatar" aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42, background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}>
      {name.trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return <div className="banner error" role="alert">{error}</div>;
}

export function Tag({ children, tone }) {
  return <span className={`tag ${tone || ''}`}>{children}</span>;
}
