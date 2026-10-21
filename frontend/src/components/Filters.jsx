import { useEffect, useState } from 'react';
import { currentPosition, geocode } from '../geo';
import { GENDER_LABELS, TYPE_LABELS } from '../format';

export const FILTER_KEYS = [
  'q', 'city', 'state', 'minRent', 'maxRent', 'minBedrooms', 'type', 'availableBy',
  'furnished', 'petsAllowed', 'utilitiesIncluded', 'genderPreference',
  'lat', 'lng', 'radiusMiles', 'nearLabel',
];

const BUDGETS = [
  { label: 'Under $600', min: '', max: '600' },
  { label: '$600–900', min: '600', max: '900' },
  { label: '$900–1,200', min: '900', max: '1200' },
  { label: '$1,200+', min: '1200', max: '' },
];

/**
 * The filter panel. Edits a local draft and only updates the URL (and therefore
 * the search) when the user presses "Show results", so typing doesn't spam the API.
 */
export default function Filters({ values, onApply, onClear }) {
  const [draft, setDraft] = useState(values);
  const [nearText, setNearText] = useState(values.nearLabel || '');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => { setDraft(values); setNearText(values.nearLabel || ''); }, [values]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const check = (k) => (e) => set(k, e.target.checked ? 'true' : '');

  async function apply(e) {
    e?.preventDefault();
    setGeoError('');
    let next = { ...draft };
    const typed = nearText.trim();
    if (!typed) {
      next = { ...next, lat: '', lng: '', nearLabel: '', radiusMiles: '' };
    } else if (typed !== values.nearLabel || !draft.lat) {
      setLocating(true);
      try {
        const hit = await geocode(typed);
        if (!hit) { setGeoError(`Couldn’t find “${typed}”. Try a city, address or campus name.`); return; }
        next = { ...next, lat: hit.lat.toFixed(5), lng: hit.lng.toFixed(5), nearLabel: typed, radiusMiles: draft.radiusMiles || '5' };
      } catch (err) {
        setGeoError(err.message); return;
      } finally {
        setLocating(false);
      }
    }
    onApply(next);
  }

  async function useMyLocation() {
    setGeoError('');
    setLocating(true);
    try {
      const p = await currentPosition();
      const next = { ...draft, lat: p.lat.toFixed(5), lng: p.lng.toFixed(5), nearLabel: 'My location', radiusMiles: draft.radiusMiles || '5' };
      setNearText('My location');
      onApply(next);
    } catch (err) {
      setGeoError(err.message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <form className="filters" onSubmit={apply} aria-label="Search filters">
      <fieldset>
        <legend>Distance</legend>
        <label htmlFor="f-near" className="sr-only">Near a place</label>
        <input id="f-near" type="text" placeholder="Campus, workplace or address"
          value={nearText} onChange={(e) => setNearText(e.target.value)} autoComplete="off" />
        <div className="row-2">
          <label htmlFor="f-radius" className="sr-only">Within how many miles</label>
          <select id="f-radius" value={draft.radiusMiles || '5'} onChange={(e) => set('radiusMiles', e.target.value)}>
            {[1, 2, 3, 5, 10, 25, 50].map((m) => <option key={m} value={m}>{m} mi</option>)}
          </select>
          <button type="button" className="btn btn-ghost small" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {geoError && <p className="field-error" role="alert">{geoError}</p>}
      </fieldset>

      <fieldset>
        <legend>Monthly budget</legend>
        <div className="chips" role="group" aria-label="Quick budget ranges">
          {BUDGETS.map((b) => {
            const active = (draft.minRent || '') === b.min && (draft.maxRent || '') === b.max;
            return (
              <button type="button" key={b.label} className={`chip ${active ? 'on' : ''}`} aria-pressed={active}
                onClick={() => setDraft((d) => ({ ...d, minRent: active ? '' : b.min, maxRent: active ? '' : b.max }))}>
                {b.label}
              </button>
            );
          })}
        </div>
        <div className="row-2">
          <div>
            <label htmlFor="f-min">Min $</label>
            <input id="f-min" type="number" inputMode="numeric" min="0" step="50" placeholder="0"
              value={draft.minRent || ''} onChange={(e) => set('minRent', e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-max">Max $</label>
            <input id="f-max" type="number" inputMode="numeric" min="0" step="50" placeholder="Any"
              value={draft.maxRent || ''} onChange={(e) => set('maxRent', e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Place</legend>
        <label htmlFor="f-type">Type</label>
        <select id="f-type" value={draft.type || ''} onChange={(e) => set('type', e.target.value)}>
          <option value="">Any type</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <label htmlFor="f-beds">Bedrooms</label>
        <select id="f-beds" value={draft.minBedrooms || ''} onChange={(e) => set('minBedrooms', e.target.value)}>
          <option value="">Any</option>
          <option value="0">Studio+</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>

        <label htmlFor="f-date">Move in by</label>
        <input id="f-date" type="date" value={draft.availableBy || ''} onChange={(e) => set('availableBy', e.target.value)} />

        <div className="row-2">
          <div>
            <label htmlFor="f-city">City</label>
            <input id="f-city" type="text" value={draft.city || ''} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-state">State</label>
            <input id="f-state" type="text" maxLength={20} placeholder="MI" value={draft.state || ''} onChange={(e) => set('state', e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Must have</legend>
        <label className="check"><input type="checkbox" checked={!!draft.furnished} onChange={check('furnished')} /> Furnished</label>
        <label className="check"><input type="checkbox" checked={!!draft.petsAllowed} onChange={check('petsAllowed')} /> Pets allowed</label>
        <label className="check"><input type="checkbox" checked={!!draft.utilitiesIncluded} onChange={check('utilitiesIncluded')} /> Utilities included</label>
      </fieldset>

      <fieldset>
        <legend>Roommates</legend>
        <label htmlFor="f-gender">Household open to</label>
        <select id="f-gender" value={draft.genderPreference || ''} onChange={(e) => set('genderPreference', e.target.value)}>
          <option value="">Show all</option>
          <option value="FEMALE">{GENDER_LABELS.FEMALE} + anyone</option>
          <option value="MALE">{GENDER_LABELS.MALE} + anyone</option>
        </select>
      </fieldset>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary" disabled={locating}>Show results</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setNearText(''); onClear(); }}>Clear all</button>
      </div>
    </form>
  );
}
