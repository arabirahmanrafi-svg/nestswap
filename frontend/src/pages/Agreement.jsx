import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { money, parseDate } from '../format';

const longDate = (iso) => (iso ? parseDate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '________________');
const blank = (v, w = '________________') => (v && String(v).trim() ? v : w);

/**
 * Fill-in-the-blanks sublease agreement. Fields on the left, live preview on the right,
 * "Print / Save as PDF" prints only the agreement.
 */
export default function Agreement() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [f, setF] = useState({
    sublessor: user?.displayName || '', subtenant: '', landlord: '',
    address: '', rent: '', deposit: '', start: '', end: '', dueDay: '1',
    utilities: 'Subtenant pays their share of utilities directly to the Sublessor each month.',
    furnished: false, extra: '', state: '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // Pre-fill from a listing: /agreement?listing=12
  useEffect(() => {
    const id = params.get('listing');
    if (!id) return;
    api(`/api/listings/${id}`).then((l) => setF((x) => ({
      ...x,
      address: `${l.address}, ${l.city}, ${l.state}${l.zipCode ? ' ' + l.zipCode : ''}`,
      rent: String(l.monthlyRent), start: l.availableFrom, end: l.availableTo || '',
      furnished: l.furnished, state: l.state,
      utilities: l.utilitiesIncluded ? 'Utilities are included in the monthly rent.' : x.utilities,
    }))).catch(() => {});
  }, [params]);

  return (
    <div className="container agreement-page">
      <div className="no-print">
        <h1>Sublease agreement template</h1>
        <p className="lede">Fill in the blanks, review the preview, then print or save as PDF and have everyone sign.</p>
        <p className="banner warn" role="note">
          This is a general template, not legal advice. Laws differ by state, and your original lease may have its own rules.
          Have your landlord approve the sublease in writing, and ask a tenant-rights office (many universities have free student legal services) if you’re unsure.
        </p>
      </div>

      <div className="agreement-grid">
        <form className="card pad no-print" onSubmit={(e) => e.preventDefault()} aria-label="Agreement details">
          <h2 className="h3">Details</h2>
          {[
            ['sublessor', 'Sublessor (current tenant)'],
            ['subtenant', 'Subtenant (new occupant)'],
            ['landlord', 'Landlord / property manager'],
            ['address', 'Property address'],
            ['state', 'State whose law applies'],
          ].map(([k, label]) => (
            <div className="field" key={k}>
              <label htmlFor={`ag-${k}`}>{label}</label>
              <input id={`ag-${k}`} value={f[k]} onChange={set(k)} />
            </div>
          ))}
          <div className="row-2">
            <div className="field"><label htmlFor="ag-rent">Monthly rent ($)</label><input id="ag-rent" type="number" value={f.rent} onChange={set('rent')} /></div>
            <div className="field"><label htmlFor="ag-dep">Security deposit ($)</label><input id="ag-dep" type="number" value={f.deposit} onChange={set('deposit')} /></div>
          </div>
          <div className="row-2">
            <div className="field"><label htmlFor="ag-start">Start date</label><input id="ag-start" type="date" value={f.start} onChange={set('start')} /></div>
            <div className="field"><label htmlFor="ag-end">End date</label><input id="ag-end" type="date" value={f.end} onChange={set('end')} /></div>
          </div>
          <div className="field">
            <label htmlFor="ag-due">Rent due on day</label>
            <select id="ag-due" value={f.dueDay} onChange={set('dueDay')}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="ag-util">Utilities</label><textarea id="ag-util" rows={2} value={f.utilities} onChange={set('utilities')} /></div>
          <label className="check"><input type="checkbox" checked={f.furnished} onChange={set('furnished')} /> Furnished (attach an inventory list)</label>
          <div className="field"><label htmlFor="ag-extra">Additional terms (optional)</label><textarea id="ag-extra" rows={3} value={f.extra} onChange={set('extra')} placeholder="Parking spot, pets, guests, cleaning on move-out…" /></div>
          <button type="button" className="btn btn-primary block" onClick={() => window.print()}>Print / Save as PDF</button>
        </form>

        <article className="card pad agreement-doc" aria-label="Agreement preview">
          <h2>Sublease Agreement</h2>
          <p>This Sublease Agreement (“Agreement”) is made between <strong>{blank(f.sublessor)}</strong> (“Sublessor”) and <strong>{blank(f.subtenant)}</strong> (“Subtenant”).</p>

          <h3>1. Property</h3>
          <p>The Sublessor subleases to the Subtenant the premises at <strong>{blank(f.address, '______________________________')}</strong> (“Premises”){f.furnished ? ', including the furnishings listed in the attached inventory' : ''}.</p>

          <h3>2. Term</h3>
          <p>The sublease begins on <strong>{longDate(f.start)}</strong> and ends on <strong>{longDate(f.end)}</strong>, at which time the Subtenant will vacate the Premises and return all keys.</p>

          <h3>3. Rent</h3>
          <p>The Subtenant will pay <strong>{f.rent ? money(f.rent) : '$________'}</strong> per month, due on day <strong>{f.dueDay}</strong> of each month, to the Sublessor by a method both parties agree on in writing. {f.utilities}</p>

          <h3>4. Security deposit</h3>
          <p>The Subtenant will pay a security deposit of <strong>{f.deposit ? money(f.deposit) : '$________'}</strong> on signing. The Sublessor will return it, minus documented charges for damage beyond normal wear and tear and any unpaid rent, within the period required by the law of {blank(f.state, 'the applicable state')} after the Subtenant moves out.</p>

          <h3>5. Original lease</h3>
          <p>The Subtenant has received a copy of the original lease between the Sublessor and the Landlord, <strong>{blank(f.landlord)}</strong>, and agrees to follow all of its terms. The Sublessor remains responsible to the Landlord under the original lease. If the original lease ends early for any reason, this Agreement ends at the same time.</p>

          <h3>6. Landlord consent</h3>
          <p>The Sublessor represents that the Landlord has given written consent to this sublease where the original lease requires it.</p>

          <h3>7. Condition and move-in inspection</h3>
          <p>Both parties will inspect the Premises together at move-in and move-out and record its condition with dated photos.</p>

          {f.extra.trim() && (<><h3>8. Additional terms</h3><p className="pre">{f.extra}</p></>)}

          <h3>{f.extra.trim() ? '9' : '8'}. Entire agreement</h3>
          <p>This Agreement is the full agreement between the parties. Any change must be in writing and signed by both.</p>

          <div className="signatures">
            {['Sublessor', 'Subtenant', 'Landlord consent (if required)'].map((who) => (
              <div key={who}>
                <div className="sig-line" />
                <p>{who} signature &nbsp;&nbsp;&nbsp; Date</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
