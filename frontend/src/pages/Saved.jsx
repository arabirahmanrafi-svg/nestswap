import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, toQuery } from '../api';
import ListingCard from '../components/ListingCard';
import { ErrorBanner } from '../components/bits';

export default function Saved() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'searches' ? 'searches' : 'listings';

  return (
    <div className="container">
      <h1>Saved</h1>
      <div className="tabs" role="tablist" aria-label="Saved items">
        <button role="tab" aria-selected={tab === 'listings'} className={tab === 'listings' ? 'on' : ''}
          onClick={() => setParams({})}>Listings</button>
        <button role="tab" aria-selected={tab === 'searches'} className={tab === 'searches' ? 'on' : ''}
          onClick={() => setParams({ tab: 'searches' })}>Searches & alerts</button>
      </div>
      <div role="tabpanel">{tab === 'listings' ? <SavedListings /> : <SavedSearches />}</div>
    </div>
  );
}

function SavedListings() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/saved/listings').then(setItems).catch((e) => setError(e.message)); }, []);

  if (error) return <ErrorBanner error={error} />;
  if (!items) return <p className="muted">Loading…</p>;
  if (!items.length) {
    return (
      <div className="empty-state">
        <h2 className="h3">Nothing saved yet</h2>
        <p>Tap the ♥ on any listing to keep it here and compare later.</p>
        <Link to="/" className="btn btn-primary">Browse listings</Link>
      </div>
    );
  }
  return (
    <div className="grid">
      {items.map((l) => (
        <ListingCard key={l.id} listing={l}
          onSavedChange={(id, on) => !on && setItems((list) => list.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}

function SavedSearches() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/saved/searches').then(setItems).catch((e) => setError(e.message)); }, []);

  async function toggle(s) {
    try {
      const updated = await api(`/api/saved/searches/${s.id}`, { method: 'PATCH', body: { emailAlerts: !s.emailAlerts } });
      setItems((list) => list.map((x) => (x.id === s.id ? updated : x)));
    } catch (e) { setError(e.message); }
  }

  async function remove(s) {
    if (!window.confirm(`Delete “${s.name}”?`)) return;
    try {
      await api(`/api/saved/searches/${s.id}`, { method: 'DELETE' });
      setItems((list) => list.filter((x) => x.id !== s.id));
    } catch (e) { setError(e.message); }
  }

  if (!items) return error ? <ErrorBanner error={error} /> : <p className="muted">Loading…</p>;
  if (!items.length) {
    return (
      <div className="empty-state">
        <h2 className="h3">No saved searches</h2>
        <p>Set your filters on the browse page and press <strong>Save search</strong>. We’ll email you when new places match.</p>
        <Link to="/" className="btn btn-primary">Start a search</Link>
      </div>
    );
  }

  return (
    <>
      <ErrorBanner error={error} />
      <ul className="search-list">
        {items.map((s) => {
          const q = Object.fromEntries(Object.entries(s.query).filter(([, v]) => v !== null && v !== false));
          return (
            <li key={s.id} className="card search-row">
              <div>
                <h2 className="h3"><Link to={`/${toQuery(q)}`}>{s.name}</Link></h2>
                <p className="muted small">Saved {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="search-actions">
                <label className="switch">
                  <input type="checkbox" checked={s.emailAlerts} onChange={() => toggle(s)} />
                  <span>Email alerts {s.emailAlerts ? 'on' : 'off'}</span>
                </label>
                <Link className="btn btn-ghost small" to={`/${toQuery(q)}`}>View results</Link>
                <button className="btn btn-danger-ghost small" onClick={() => remove(s)}>Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
