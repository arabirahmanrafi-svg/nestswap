import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ErrorBanner, Field } from '../components/bits';

/** Narrow, centered form. */
function AuthShell({ children }) {
  return <div className="container auth-page">{children}</div>;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1>Welcome back</h1>
      <p className="muted">Log in to message posters and see your saved places.</p>
      <ErrorBanner error={error} />
      <form onSubmit={submit}>
        <Field id="email" label="Email">
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="password" label="Password">
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn btn-primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="muted auth-switch">New here? <Link to="/register" state={{ from }}>Create an account</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    try {
      await register(form);
      navigate('/account?welcome=1', { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      setBusy(false);
    }
  }

  const isEdu = form.email.trim().toLowerCase().endsWith('.edu');

  return (
    <AuthShell>
      <h1>Create your account</h1>
      <p className="muted">Free. Post a place or message posters in minutes.</p>
      <ErrorBanner error={error} />
      <form onSubmit={submit}>
        <Field id="displayName" label="Your name" error={errors.displayName} hint="First name is fine. This is what posters see.">
          <input id="displayName" autoComplete="given-name" required maxLength={80} value={form.displayName} onChange={set('displayName')} />
        </Field>
        <Field id="email" label="Email" error={errors.email}
          hint={isEdu ? 'Nice! Verifying a .edu email earns you the Verified Student badge.' : 'Tip: use your school (.edu) email to get the Verified Student badge.'}>
          <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field id="password" label="Password" error={errors.password} hint="At least 8 characters.">
          <input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>
        <button className="btn btn-primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
