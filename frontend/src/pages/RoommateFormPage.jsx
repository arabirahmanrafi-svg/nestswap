import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorBanner, Field } from '../components/bits';
import { CLEAN_LABELS, GENDER_LABELS, SLEEP_LABELS, VIBE_LABELS } from '../format';
import { geocode } from '../geo';

const EMPTY = {
  headline: '', about: '', occupation: '',
  budgetMin: '', budgetMax: '', city: '', state: '', preferredArea: '',
  moveInDate: '', stayMonths: '12', roommatesWanted: '1',
  genderPreference: 'ANY', householdVibe: 'MIXED', sleepSchedule: 'FLEXIBLE', cleanliness: 'TIDY',
  smokes: false, hasPet: false,
};

/** Create (/roommates/new) or edit (/roommates/:id/edit) a "looking for roommates" post. */
export default function RoommateFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api(`/api/roommates/${id}`).then((p) => {
      if (!p.mine) { setBanner('You can only edit your own posts.'); return; }
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
        budgetMin: String(p.budgetMin), budgetMax: String(p.budgetMax),
        stayMonths: p.stayMonths ? String(p.stayMonths) : '',
        roommatesWanted: String(p.roommatesWanted),
        occupation: p.occupation || '', preferredArea: p.preferredArea || '',
      });
      setLoaded(true);
    }).catch((e) => setBanner(e.message));
  }, [id, editing]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate() {
    const e = {};
    if (!form.headline.trim()) e.headline = 'Write a one-line summary.';
    if (form.about.trim().length < 20) e.about = 'Tell people a bit about yourself (at least 20 characters).';
    if (!form.budgetMin) e.budgetMin = 'Enter the least you’d pay.';
    if (!form.budgetMax) e.budgetMax = 'Enter the most you’d pay.';
    if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax)) e.budgetMax = 'Must be at least the lowest amount.';
    if (!form.city.trim()) e.city = 'Enter the city.';
    if (!form.state.trim()) e.state = 'Enter the state.';
    if (!form.moveInDate) e.moveInDate = 'When do you want to move in?';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    setBanner('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { setBanner('Please fix the highlighted fields.'); return; }

    setSaving(true);
    // Put the post on the map (used for "within X miles" searches). If the lookup fails, save without it.
    let point = null;
    try {
      point = await geocode([form.preferredArea, form.city, form.state].filter(Boolean).join(', '))
        || await geocode(`${form.city}, ${form.state}`);
    } catch { /* offline map lookup is fine */ }

    const body = {
      ...form,
      budgetMin: Number(form.budgetMin),
      budgetMax: Number(form.budgetMax),
      stayMonths: form.stayMonths ? Number(form.stayMonths) : null,
      roommatesWanted: Number(form.roommatesWanted),
      latitude: point?.lat ?? null,
      longitude: point?.lng ?? null,
    };
    try {
      const saved = await api(editing ? `/api/roommates/${id}` : '/api/roommates', { method: editing ? 'PUT' : 'POST', body });
      navigate(`/roommates/${saved.id}`);
    } catch (err) {
      setErrors(err.fields || {});
      setBanner(err.message);
      setSaving(false);
    }
  }

  if (!loaded) return <div className="container narrow">{banner ? <ErrorBanner error={banner} /> : <p className="muted">Loading…</p>}</div>;
  const err = (k) => errors[k];

  return (
    <div className="container narrow form-page">
      <h1>{editing ? 'Edit your roommate post' : 'Find people to rent with'}</h1>
      <p className="lede">
        For when you don’t have a place yet. If you already have a room to fill,{' '}
        <Link to="/post">post a roommate-wanted listing</Link> instead.
      </p>
      <ErrorBanner error={banner} />

      <form onSubmit={submit} noValidate>
        <section className="form-section">
          <h2>About you</h2>
          <Field id="headline" label="One-line summary" error={err('headline')} hint="e.g. “Grad student looking for 1 roommate near campus”">
            <input id="headline" maxLength={140} value={form.headline} onChange={set('headline')} aria-invalid={!!err('headline')} />
          </Field>
          <Field id="occupation" label="School or work (optional)" hint="e.g. “EMU junior, nursing”">
            <input id="occupation" maxLength={120} value={form.occupation} onChange={set('occupation')} />
          </Field>
          <Field id="about" label="About you" error={err('about')} hint="What you’re like to live with, your routine, what you’re looking for.">
            <textarea id="about" rows={5} maxLength={4000} value={form.about} onChange={set('about')} aria-invalid={!!err('about')} />
          </Field>
        </section>

        <section className="form-section">
          <h2>Budget and timing</h2>
          <div className="row-3">
            <Field id="budgetMin" label="Lowest ($/month)" error={err('budgetMin')}>
              <input id="budgetMin" type="number" inputMode="numeric" min="0" value={form.budgetMin} onChange={set('budgetMin')} aria-invalid={!!err('budgetMin')} />
            </Field>
            <Field id="budgetMax" label="Highest ($/month)" error={err('budgetMax')}>
              <input id="budgetMax" type="number" inputMode="numeric" min="1" value={form.budgetMax} onChange={set('budgetMax')} aria-invalid={!!err('budgetMax')} />
            </Field>
            <Field id="moveInDate" label="Move-in date" error={err('moveInDate')}>
              <input id="moveInDate" type="date" value={form.moveInDate} onChange={set('moveInDate')} aria-invalid={!!err('moveInDate')} />
            </Field>
          </div>
          <div className="row-3">
            <Field id="stayMonths" label="How long">
              <select id="stayMonths" value={form.stayMonths} onChange={set('stayMonths')}>
                <option value="">Flexible</option>
                {[3, 4, 6, 8, 12, 24].map((n) => <option key={n} value={n}>{n} months</option>)}
              </select>
            </Field>
            <Field id="roommatesWanted" label="Roommates wanted">
              <select id="roommatesWanted" value={form.roommatesWanted} onChange={set('roommatesWanted')}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Where</h2>
          <div className="row-3">
            <Field id="city" label="City" error={err('city')}>
              <input id="city" value={form.city} onChange={set('city')} aria-invalid={!!err('city')} />
            </Field>
            <Field id="state" label="State" error={err('state')}>
              <input id="state" placeholder="MI" value={form.state} onChange={set('state')} aria-invalid={!!err('state')} />
            </Field>
            <Field id="preferredArea" label="Area (optional)">
              <input id="preferredArea" placeholder="Near campus" maxLength={160} value={form.preferredArea} onChange={set('preferredArea')} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Living habits</h2>
          <div className="row-3">
            <Field id="sleepSchedule" label="Schedule">
              <select id="sleepSchedule" value={form.sleepSchedule} onChange={set('sleepSchedule')}>
                {Object.entries(SLEEP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="cleanliness" label="Cleaning">
              <select id="cleanliness" value={form.cleanliness} onChange={set('cleanliness')}>
                {Object.entries(CLEAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="householdVibe" label="Home vibe">
              <select id="householdVibe" value={form.householdVibe} onChange={set('householdVibe')}>
                {Object.entries(VIBE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="row-3">
            <Field id="genderPreference" label="Open to living with">
              <select id="genderPreference" value={form.genderPreference} onChange={set('genderPreference')}>
                {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="checks-row">
            <label className="check"><input type="checkbox" checked={form.smokes} onChange={set('smokes')} /> I smoke</label>
            <label className="check"><input type="checkbox" checked={form.hasPet} onChange={set('hasPet')} /> I have a pet</label>
          </div>
        </section>

        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Publish post'}</button>
          <Link className="btn btn-ghost" to={editing ? `/roommates/${id}` : '/roommates'}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
