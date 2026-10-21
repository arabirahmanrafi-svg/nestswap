import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorBanner, Field } from '../components/bits';
import LocationPicker from '../components/LocationPicker';
import PhotoPicker from '../components/PhotoPicker';
import { GENDER_LABELS, TYPE_HELP, TYPE_LABELS, VIBE_LABELS } from '../format';

const EMPTY = {
  title: '', description: '', listingType: 'SUBLEASE',
  monthlyRent: '', bedrooms: '1', bathrooms: '1',
  address: '', city: '', state: '', zipCode: '',
  availableFrom: '', availableTo: '',
  furnished: false, petsAllowed: false, utilitiesIncluded: false,
  currentRoommates: '0', genderPreference: 'ANY', householdVibe: 'MIXED',
  subletPermissionConfirmed: false,
};

/** Create a new listing (/post) or edit one (/listings/:id/edit). */
export default function ListingFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api(`/api/listings/${id}`).then((l) => {
      if (!l.mine) { setBanner('You can only edit your own listings.'); return; }
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, l[k] ?? EMPTY[k]])),
        monthlyRent: String(l.monthlyRent), bedrooms: String(l.bedrooms), bathrooms: String(Number(l.bathrooms)),
        currentRoommates: String(l.currentRoommates), zipCode: l.zipCode || '', availableTo: l.availableTo || '',
      });
      if (l.latitude != null) setLocation({ lat: l.latitude, lng: l.longitude });
      setPhotos(l.images.map((img) => ({ key: `e-${img.id}`, kind: 'existing', id: img.id, url: img.url, alt: img.ownerAlt || '' })));
      setLoaded(true);
    }).catch((e) => setBanner(e.message));
  }, [id, editing]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  /** Quick checks in the browser so people get instant feedback; the server re-checks everything. */
  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Give your listing a title.';
    if (form.description.trim().length < 20) e.description = 'Add a few sentences (at least 20 characters).';
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) e.monthlyRent = 'Enter the monthly rent.';
    if (!form.address.trim()) e.address = 'Enter the street address.';
    if (!form.city.trim()) e.city = 'Enter the city.';
    if (!form.state.trim()) e.state = 'Enter the state.';
    if (!form.availableFrom) e.availableFrom = 'When can someone move in?';
    if (form.availableTo && form.availableFrom && form.availableTo < form.availableFrom) e.availableTo = 'End date must be after move-in.';
    if (photos.length === 0) e.photos = 'Add at least one photo.';
    if (!form.subletPermissionConfirmed) e.subletPermissionConfirmed = 'Please confirm you’re allowed to sublet or transfer this lease.';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    setBanner('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setBanner('Please fix the highlighted fields.');
      document.querySelector('.has-error input, .has-error textarea, .has-error select, .has-error button')?.focus();
      return;
    }

    const newPhotos = photos.filter((p) => p.kind === 'new');
    const data = {
      ...form,
      title: form.title.trim(),
      monthlyRent: Number(form.monthlyRent),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      currentRoommates: Number(form.currentRoommates),
      availableTo: form.availableTo || null,
      zipCode: form.zipCode || null,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      photoOrder: photos.map((p) => (p.kind === 'existing' ? `e:${p.id}` : `n:${newPhotos.indexOf(p)}`)),
      newImageAltTexts: newPhotos.map((p) => p.alt),
      existingAltTexts: Object.fromEntries(photos.filter((p) => p.kind === 'existing').map((p) => [p.id, p.alt])),
    };

    const body = new FormData();
    body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    newPhotos.forEach((p) => body.append('photos', p.file));

    setSaving(true);
    try {
      const saved = await api(editing ? `/api/listings/${id}` : '/api/listings', { method: editing ? 'PUT' : 'POST', form: body });
      navigate(`/listings/${saved.id}`);
    } catch (err) {
      setErrors(err.fields || {});
      setBanner(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="container narrow">{banner ? <ErrorBanner error={banner} /> : <p className="muted">Loading…</p>}</div>;

  const showRoommates = form.listingType === 'ROOM' || Number(form.currentRoommates) > 0;
  const fullAddress = [form.address, form.city, form.state, form.zipCode].filter(Boolean).join(', ');
  const err = (k) => errors[k];
  const described = (k) => (errors[k] ? `${k}-error` : undefined);

  return (
    <div className="container narrow form-page">
      <h1>{editing ? 'Edit your listing' : 'Post your place'}</h1>
      <p className="lede">Takes about 5 minutes. Clear photos and exact dates get the most replies.</p>
      <ErrorBanner error={banner} />

      <form onSubmit={submit} noValidate>
        <section className="form-section">
          <h2>What are you offering?</h2>
          <div className="type-choices" role="radiogroup" aria-label="Listing type">
            {Object.entries(TYPE_LABELS).map(([k, label]) => (
              <label key={k} className={`type-choice ${form.listingType === k ? 'on' : ''}`}>
                <input type="radio" name="listingType" value={k} checked={form.listingType === k} onChange={set('listingType')} />
                <strong>{label}</strong>
                <span>{TYPE_HELP[k]}</span>
              </label>
            ))}
          </div>

          <Field id="title" label="Title" error={err('title')} hint="e.g. “Sunny 1BR near campus — Jan to May”">
            <input id="title" maxLength={140} value={form.title} onChange={set('title')} aria-describedby={described('title')} aria-invalid={!!err('title')} />
          </Field>

          <Field id="description" label="Description" error={err('description')}
            hint="What’s nearby, parking, laundry, why you’re leaving, anything the next person should know.">
            <textarea id="description" rows={6} maxLength={5000} value={form.description} onChange={set('description')}
              aria-describedby={described('description')} aria-invalid={!!err('description')} />
          </Field>
        </section>

        <section className="form-section">
          <h2>Price & dates</h2>
          <div className="row-3">
            <Field id="monthlyRent" label="Monthly rent ($)" error={err('monthlyRent')}>
              <input id="monthlyRent" type="number" inputMode="numeric" min="1" value={form.monthlyRent} onChange={set('monthlyRent')}
                aria-describedby={described('monthlyRent')} aria-invalid={!!err('monthlyRent')} />
            </Field>
            <Field id="availableFrom" label="Move-in date" error={err('availableFrom')}>
              <input id="availableFrom" type="date" value={form.availableFrom} onChange={set('availableFrom')}
                aria-describedby={described('availableFrom')} aria-invalid={!!err('availableFrom')} />
            </Field>
            <Field id="availableTo" label="Lease ends (optional)" error={err('availableTo')}>
              <input id="availableTo" type="date" value={form.availableTo} onChange={set('availableTo')}
                aria-describedby={described('availableTo')} aria-invalid={!!err('availableTo')} />
            </Field>
          </div>
          <label className="check"><input type="checkbox" checked={form.utilitiesIncluded} onChange={set('utilitiesIncluded')} /> Utilities included in rent</label>
        </section>

        <section className="form-section">
          <h2>The space</h2>
          <div className="row-3">
            <Field id="bedrooms" label="Bedrooms">
              <select id="bedrooms" value={form.bedrooms} onChange={set('bedrooms')}>
                <option value="0">Studio</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field id="bathrooms" label="Bathrooms">
              <select id="bathrooms" value={form.bathrooms} onChange={set('bathrooms')}>
                {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field id="currentRoommates" label="Roommates staying">
              <select id="currentRoommates" value={form.currentRoommates} onChange={set('currentRoommates')}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
              </select>
            </Field>
          </div>
          <div className="checks-row">
            <label className="check"><input type="checkbox" checked={form.furnished} onChange={set('furnished')} /> Furnished</label>
            <label className="check"><input type="checkbox" checked={form.petsAllowed} onChange={set('petsAllowed')} /> Pets allowed</label>
          </div>

          {showRoommates && (
            <div className="sub-section">
              <h3>Roommate details</h3>
              <div className="row-2">
                <Field id="genderPreference" label="Household open to">
                  <select id="genderPreference" value={form.genderPreference} onChange={set('genderPreference')}>
                    {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field id="householdVibe" label="Household vibe">
                  <select id="householdVibe" value={form.householdVibe} onChange={set('householdVibe')}>
                    {Object.entries(VIBE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <h2>Location</h2>
          <Field id="address" label="Street address" error={err('address')} hint="Shown on your listing. Leave off the unit number if you prefer.">
            <input id="address" autoComplete="street-address" value={form.address} onChange={set('address')}
              aria-describedby={described('address')} aria-invalid={!!err('address')} />
          </Field>
          <div className="row-3">
            <Field id="city" label="City" error={err('city')}>
              <input id="city" autoComplete="address-level2" value={form.city} onChange={set('city')}
                aria-describedby={described('city')} aria-invalid={!!err('city')} />
            </Field>
            <Field id="state" label="State" error={err('state')}>
              <input id="state" autoComplete="address-level1" placeholder="MI" value={form.state} onChange={set('state')}
                aria-describedby={described('state')} aria-invalid={!!err('state')} />
            </Field>
            <Field id="zipCode" label="ZIP (optional)">
              <input id="zipCode" autoComplete="postal-code" inputMode="numeric" maxLength={10} value={form.zipCode} onChange={set('zipCode')} />
            </Field>
          </div>
          <LocationPicker address={fullAddress} value={location} onChange={setLocation} />
        </section>

        <section className="form-section">
          <h2>Photos</h2>
          <PhotoPicker items={photos} onChange={(p) => { setPhotos(p); if (errors.photos) setErrors((er) => ({ ...er, photos: undefined })); }} error={err('photos')} />
        </section>

        <section className={`form-section approval ${err('subletPermissionConfirmed') ? 'has-error' : ''}`}>
          <h2>Before you post</h2>
          <ul className="checklist">
            <li>Check your lease for a “subletting” or “assignment” clause. Many leases require written landlord approval.</li>
            <li>For a <strong>lease takeover</strong>, ask your landlord about their transfer process and any fee.</li>
            <li>For a <strong>sublease</strong>, you usually stay responsible for rent and damage, so screen carefully and sign a written agreement.</li>
          </ul>
          <label className="check strong">
            <input type="checkbox" checked={form.subletPermissionConfirmed} onChange={set('subletPermissionConfirmed')}
              aria-describedby={described('subletPermissionConfirmed')} aria-invalid={!!err('subletPermissionConfirmed')} />
            I’ve confirmed my lease or landlord allows subletting / transferring this place.
          </label>
          {err('subletPermissionConfirmed') && <p className="field-error" id="subletPermissionConfirmed-error" role="alert">{err('subletPermissionConfirmed')}</p>}
          <p className="hint">Need a contract? <Link to="/agreement" target="_blank">Open our free sublease agreement template</Link> (opens in a new tab).</p>
        </section>

        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}</button>
          <Link className="btn btn-ghost" to={editing ? `/listings/${id}` : '/'}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
