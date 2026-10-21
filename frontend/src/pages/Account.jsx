import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorBanner, Field, VerifiedBadge } from '../components/bits';

export default function Account() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const welcome = params.get('welcome');

  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState(user.displayName);
  const [nameMsg, setNameMsg] = useState('');

  async function resend() {
    setError(''); setMsg('');
    try { const r = await api('/api/auth/verify/request', { method: 'POST' }); setMsg(r.message); }
    catch (e) { setError(e.message); }
  }

  async function confirm(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const me = await api('/api/auth/verify/confirm', { method: 'POST', body: { code } });
      setUser(me);
      setMsg('Your email is verified!');
    } catch (err) { setError(err.message); }
  }

  async function saveName(e) {
    e.preventDefault();
    setNameMsg('');
    try { setUser(await api('/api/auth/me', { method: 'PUT', body: { displayName: name } })); setNameMsg('Saved.'); }
    catch (err) { setNameMsg(err.message); }
  }

  return (
    <div className="container narrow">
      {welcome && (
        <div className="banner success" role="status">
          Welcome to NestSwap, {user.displayName}! One quick step: verify your email below.
        </div>
      )}
      <h1>Your account</h1>

      <section className="card pad">
        <h2 className="h3">Verification {user.emailVerified && <VerifiedBadge user={user} />}</h2>
        {user.emailVerified ? (
          <p>
            {user.verifiedStudent
              ? 'You have the Verified Student badge. It shows on your listings and messages.'
              : 'Your email is verified. The Verified badge shows on your listings and messages.'}
          </p>
        ) : (
          <>
            <p>
              We sent a 6-digit code to <strong>{user.email}</strong>. Verified posters get a badge, which helps people trust
              your listing. {user.email.endsWith('.edu') && 'Because you used a .edu email, you’ll get the Verified Student badge.'}
            </p>
            <ErrorBanner error={error} />
            {msg && <p className="banner success" role="status">{msg}</p>}
            <form onSubmit={confirm} className="inline-form">
              <label htmlFor="code" className="sr-only">Verification code</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn-primary" disabled={code.length !== 6}>Verify</button>
              <button type="button" className="btn btn-ghost" onClick={resend}>Send a new code</button>
            </form>
            <p className="hint">Running locally without email set up? The code is printed in the backend console.</p>
          </>
        )}
      </section>

      <section className="card pad">
        <h2 className="h3">Profile</h2>
        <form onSubmit={saveName}>
          <Field id="name" label="Display name">
            <input id="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <button className="btn btn-ghost">Save name</button> {nameMsg && <span role="status" className="muted">{nameMsg}</span>}
        </form>
        <p className="muted small">Email: {user.email} (never shown to other users)</p>
      </section>

      <section className="card pad">
        <h2 className="h3">Next steps</h2>
        <ul className="link-list">
          <li><Link to="/post">Post a place</Link></li>
          <li><Link to="/">Browse listings</Link> and save the ones you like</li>
          <li><Link to="/guide">Read the subletting guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
