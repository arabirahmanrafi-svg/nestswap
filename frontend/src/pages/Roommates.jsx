import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, toQuery } from '../api';
import { useAuth } from '../auth';
import RoommateCard from '../components/RoommateCard';
import { ErrorBanner } from '../components/bits';
import { money } from '../format';
import { geocode } from '../geo';

const KEYS = ['q', 'city', 'canPay', 'moveInBy', 'genderPreference', 'noSmoking', 'lat', 'lng', 'radiusMiles', 'nearLabel', 'sort'];

/** Browse people who are looking for someone to rent with. */
export default function Roommates() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const f = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const page = Number(params.get('page') || 0);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/roommates${toQuery({ ...f, page, size: 24 })}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [f, page]);

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('page');
    setParams(next);
  }

  const anyFilter = KEYS.some((k) => k !== 'sort' && f[k]);

  return (
    <div className="container">
      <header className="home-head">
        <h1>Find a roommate</h1>
        <p className="lede">
          People looking for someone to rent with. Already have a place with a spare room?{' '}
          <Link to={user ? '/post' : '/register'}>Post it as a roommate-wanted listing</Link>.
        </p>
        <WhereRow f={f} onSearch={update} />
      </header>

      <div className="toolbar">
        <div className="filter-inline">
          <label htmlFor="rm-movein">Move in by</label>
          <input id="rm-movein" type="date" value={f.moveInBy} onChange={(e) => update({ moveInBy: e.target.value })} />
          <label htmlFor="rm-gender">Open to</label>
          <select id="rm-gender" value={f.genderPreference} onChange={(e) => update({ genderPreference: e.target.value })}>
            <option value="">Anyone</option>
            <option value="FEMALE">Women</option>
            <option value="MALE">Men</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={!!f.noSmoking} onChange={(e) => update({ noSmoking: e.target.checked ? 'true' : '' })} />
            Non-smokers
          </label>
        </div>
        <div className="toolbar-right">
          <label htmlFor="rm-sort" className="sr-only">Sort by</label>
          <select id="rm-sort" className="select-quiet" value={f.sort || 'newest'} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Newest</option>
            <option value="soonest">Soonest move-in</option>
            <option value="budget_desc">Highest budget</option>
          </select>
          <Link className="btn btn-primary" to={user ? '/roommates/new' : '/register'}>Post your profile</Link>
        </div>
      </div>

      <div className="results-meta">
        <p aria-live="polite">{loading ? 'Searching…' : data ? `${data.totalItems} ${data.totalItems === 1 ? 'person' : 'people'}` : ''}</p>
        {anyFilter && <button className="link-btn" onClick={() => setParams({})}>Clear filters</button>}
      </div>

      <ErrorBanner error={error} />

      <div className="grid">
        {data?.items.map((p) => <RoommateCard key={p.id} post={p} />)}
        {!loading && data && data.items.length === 0 && (
          <div className="empty-state">
            <h2>No roommate profiles match</h2>
            <p>Try a wider area or later move-in date, or post your own profile so others can find you.</p>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <nav className="pager" aria-label="Pages">
          <button className="btn btn-ghost" disabled={page === 0} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Previous</button>
          <span>Page {page + 1} of {data.totalPages}</span>
          <button className="btn btn-ghost" disabled={page + 1 >= data.totalPages} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Next</button>
        </nav>
      )}
    </div>
  );
}

/** Area search plus "can pay at least" for people who need to fill a room. */
function WhereRow({ f, onSearch }) {
  const [where, setWhere] = useState(f.nearLabel || f.q || '');
  const [canPay, setCanPay] = useState(f.canPay || '');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const text = where.trim();
    const base = { canPay, q: '', lat: '', lng: '', nearLabel: '', radiusMiles: '' };
    if (!text) { onSearch(base); return; }
    setBusy(true);
    try {
      const hit = await geocode(text);
      onSearch(hit ? { ...base, lat: hit.lat.toFixed(5), lng: hit.lng.toFixed(5), nearLabel: text, radiusMiles: '10' } : { ...base, q: text });
    } catch {
      onSearch({ ...base, q: text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="search-row" role="search" onSubmit={submit}>
      <label htmlFor="rm-where" className="sr-only">City, neighborhood or campus</label>
      <input id="rm-where" type="search" placeholder="City, neighborhood or campus" value={where} onChange={(e) => setWhere(e.target.value)} />
      <label htmlFor="rm-pay" className="sr-only">Can pay at least</label>
      <select id="rm-pay" value={canPay} onChange={(e) => setCanPay(e.target.value)}>
        <option value="">Any budget</option>
        {[400, 500, 600, 700, 800, 1000].map((n) => <option key={n} value={n}>Can pay {money(n)}+</option>)}
      </select>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
    </form>
  );
}
