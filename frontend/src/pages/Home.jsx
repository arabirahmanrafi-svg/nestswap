import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, toQuery } from '../api';
import { useAuth } from '../auth';
import Filters, { FILTER_KEYS } from '../components/Filters';
import ListingCard from '../components/ListingCard';
import ListingsMap from '../components/ListingsMap';
import { ErrorBanner } from '../components/bits';
import { TYPE_LABELS, money } from '../format';
import { geocode } from '../geo';

const PAGE_SIZE = 24;
const TYPES = [['', 'All'], ['SUBLEASE', 'Subleases'], ['LEASE_TAKEOVER', 'Lease takeovers'], ['ROOM', 'Roommate wanted']];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // The URL is the single source of truth, so searches can be bookmarked and shared.
  const filters = useMemo(() => {
    const f = {};
    FILTER_KEYS.forEach((k) => { f[k] = params.get(k) || ''; });
    return f;
  }, [params]);
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 0);
  const view = params.get('view') === 'map' ? 'map' : 'list';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const size = view === 'map' ? 100 : PAGE_SIZE;
    api(`/api/listings${toQuery({ ...filters, sort, page, size })}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filters, sort, page, view]);

  function update(changes, resetPage = true) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete('page');
    setParams(next);
  }

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get('view')) next.set('view', params.get('view'));
    setParams(next);
  };

  const active = describeFilters(filters);
  const extraCount = active.filter((c) => !['q', 'near', 'rent', 'type'].includes(c.key)).length;
  const near = filters.lat && filters.lng
    ? { lat: Number(filters.lat), lng: Number(filters.lng), radiusMiles: Number(filters.radiusMiles || 5) }
    : null;

  return (
    <div className="home container">
      <header className="home-head">
        <h1>Subleases and lease takeovers</h1>
        <p className="lede">
          Places people need to hand off before their lease ends, with the dates up front.
          No place yet? <Link to="/roommates">Find people to rent with</Link>.
        </p>
        <SearchRow filters={filters} onSearch={update} />
      </header>

      <div className="toolbar">
        <div className="type-tabs" role="group" aria-label="Type of place">
          {TYPES.map(([value, label]) => (
            <button key={label} className={filters.type === value ? 'on' : ''} aria-pressed={filters.type === value}
              onClick={() => update({ type: value })}>
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <button className="btn btn-ghost" onClick={() => setDrawer(true)} aria-haspopup="dialog">
            Filters{extraCount ? ` (${extraCount})` : ''}
          </button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" className="select-quiet" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Newest</option>
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
            <option value="soonest">Soonest move-in</option>
          </select>
          <button className="btn btn-ghost" onClick={() => update({ view: view === 'map' ? '' : 'map' }, false)}>
            {view === 'map' ? 'Show list' : 'Show map'}
          </button>
        </div>
      </div>

      <div className="results-meta">
        <p aria-live="polite">
          {loading ? 'Searching…' : data ? `${data.totalItems} place${data.totalItems === 1 ? '' : 's'}` : ''}
        </p>
        {active.length > 0 && (
          <ul className="active-filters" aria-label="Active filters">
            {active.map((c) => (
              <li key={c.key}>
                <button onClick={() => update(Object.fromEntries(c.keys.map((k) => [k, ''])))} aria-label={`Remove filter: ${c.label}`}>
                  {c.label} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
            <li><button className="link-btn" onClick={clearFilters}>Clear all</button></li>
          </ul>
        )}
        <SaveSearchButton filters={filters} user={user}
          onNeedLogin={() => navigate('/login', { state: { from: `/?${params}` } })} />
      </div>

      <ErrorBanner error={error} />

      {view === 'map' && data && <ListingsMap listings={data.items} near={near} />}

      {view === 'list' && (
        <div className="grid">
          {data?.items.map((l) => <ListingCard key={l.id} listing={l} />)}
          {!loading && data && data.items.length === 0 && (
            <div className="empty-state">
              <h2>Nothing matches these filters</h2>
              <p>Widen the price or distance, or save this search and we’ll email you when a new place is posted.</p>
              {active.length > 0 && <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}
        </div>
      )}

      {view === 'list' && data && data.totalPages > 1 && (
        <nav className="pager" aria-label="Pages">
          <button className="btn btn-ghost" disabled={page === 0} onClick={() => update({ page: String(page - 1) }, false)}>Previous</button>
          <span>Page {page + 1} of {data.totalPages}</span>
          <button className="btn btn-ghost" disabled={page + 1 >= data.totalPages} onClick={() => update({ page: String(page + 1) }, false)}>Next</button>
        </nav>
      )}

      {!user && (
        <aside className="post-prompt">
          <div>
            <h2>Leaving before your lease ends?</h2>
            <p>Post your place with photos and exact dates. People message you here, so your number stays private.</p>
          </div>
          <Link to="/register" className="btn btn-primary">Post your place</Link>
        </aside>
      )}

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-h" onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setDrawer(false)}>
            <div className="drawer-head">
              <h2 id="drawer-h">Filters</h2>
              <button className="link-btn" onClick={() => setDrawer(false)} autoFocus>Close</button>
            </div>
            <Filters values={filters} onApply={(f) => { update(f); setDrawer(false); }} onClear={() => { clearFilters(); setDrawer(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** One search field (place or keyword) plus a max price, right under the heading. */
function SearchRow({ filters, onSearch }) {
  const [where, setWhere] = useState(filters.nearLabel || filters.q || '');
  const [max, setMax] = useState(filters.maxRent || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setWhere(filters.nearLabel || filters.q || ''); setMax(filters.maxRent || ''); }, [filters.nearLabel, filters.q, filters.maxRent]);

  async function submit(e) {
    e.preventDefault();
    const text = where.trim();
    const base = { maxRent: max, q: '', lat: '', lng: '', nearLabel: '', radiusMiles: '' };
    if (!text) { onSearch(base); return; }
    setBusy(true);
    try {
      const hit = await geocode(text);
      onSearch(hit
        ? { ...base, lat: hit.lat.toFixed(5), lng: hit.lng.toFixed(5), nearLabel: text, radiusMiles: filters.radiusMiles || '5' }
        : { ...base, q: text });
    } catch {
      onSearch({ ...base, q: text });   // map lookup unavailable: search by keyword instead
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="search-row" role="search" onSubmit={submit}>
      <label htmlFor="where" className="sr-only">City, neighborhood, campus or address</label>
      <input id="where" type="search" placeholder="City, neighborhood, campus or address" value={where}
        onChange={(e) => setWhere(e.target.value)} autoComplete="off" />
      <label htmlFor="max" className="sr-only">Maximum monthly rent</label>
      <select id="max" value={max} onChange={(e) => setMax(e.target.value)}>
        <option value="">Any price</option>
        {[600, 800, 1000, 1200, 1500, 2000].map((n) => <option key={n} value={n}>Up to {money(n)}</option>)}
      </select>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
    </form>
  );
}

function SaveSearchButton({ filters, user, onNeedLogin }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [alerts, setAlerts] = useState(true);
  const [status, setStatus] = useState('');

  function start() {
    if (!user) { onNeedLogin(); return; }
    setName(defaultName(filters));
    setStatus('');
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const query = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return;
      if (['minRent', 'maxRent', 'minBedrooms', 'lat', 'lng', 'radiusMiles'].includes(k)) query[k] = Number(v);
      else if (['furnished', 'petsAllowed', 'utilitiesIncluded'].includes(k)) query[k] = true;
      else query[k] = v;
    });
    try {
      await api('/api/saved/searches', { method: 'POST', body: { name: name.trim() || 'My search', query, emailAlerts: alerts } });
      setStatus('saved');
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="save-search">
      <button className="link-btn" onClick={start} aria-expanded={open}>Save this search</button>
      {open && (
        <div className="popover" role="dialog" aria-label="Save this search">
          {status === 'saved' ? (
            <>
              <p>Search saved. {alerts ? 'We’ll email you when a new place matches.' : 'Find it under Saved.'}</p>
              <button className="btn btn-ghost small" onClick={() => setOpen(false)}>Done</button>
            </>
          ) : (
            <form onSubmit={save}>
              <label htmlFor="ss-name">Name</label>
              <input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
              <label className="check"><input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} /> Email me new matches</label>
              {status && <p className="field-error" role="alert">{status}</p>}
              <div className="row-buttons">
                <button className="btn btn-primary small" type="submit">Save search</button>
                <button className="btn btn-ghost small" type="button" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function defaultName(f) {
  const parts = [];
  if (f.minBedrooms) parts.push(`${f.minBedrooms}+ bed`);
  if (f.type) parts.push(TYPE_LABELS[f.type]);
  if (f.maxRent) parts.push(`under ${money(f.maxRent)}`);
  if (f.nearLabel) parts.push(`near ${f.nearLabel}`);
  else if (f.city) parts.push(`in ${f.city}`);
  return parts.join(' ') || 'All places';
}

/** Readable labels for each active filter, so people can see and remove them. */
function describeFilters(f) {
  const out = [];
  if (f.q) out.push({ key: 'q', keys: ['q'], label: `“${f.q}”` });
  if (f.lat && f.lng) out.push({ key: 'near', keys: ['lat', 'lng', 'radiusMiles', 'nearLabel'], label: `Within ${f.radiusMiles || 5} mi of ${f.nearLabel || 'a point'}` });
  if (f.minRent || f.maxRent) {
    const label = f.minRent && f.maxRent ? `${money(f.minRent)} to ${money(f.maxRent)}` : f.maxRent ? `Up to ${money(f.maxRent)}` : `${money(f.minRent)} and up`;
    out.push({ key: 'rent', keys: ['minRent', 'maxRent'], label });
  }
  if (f.minBedrooms) out.push({ key: 'beds', keys: ['minBedrooms'], label: `${f.minBedrooms}+ beds` });
  if (f.availableBy) out.push({ key: 'date', keys: ['availableBy'], label: `Move in by ${f.availableBy}` });
  if (f.city) out.push({ key: 'city', keys: ['city'], label: f.city });
  if (f.state) out.push({ key: 'state', keys: ['state'], label: f.state.toUpperCase() });
  if (f.furnished) out.push({ key: 'furn', keys: ['furnished'], label: 'Furnished' });
  if (f.petsAllowed) out.push({ key: 'pets', keys: ['petsAllowed'], label: 'Pets allowed' });
  if (f.utilitiesIncluded) out.push({ key: 'util', keys: ['utilitiesIncluded'], label: 'Utilities included' });
  if (f.genderPreference) out.push({ key: 'gender', keys: ['genderPreference'], label: f.genderPreference === 'FEMALE' ? 'Open to women' : 'Open to men' });
  return out;
}
