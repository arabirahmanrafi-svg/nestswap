import { Link } from 'react-router-dom';
import { TYPE_LABELS, money } from '../format';
import { SaveButton } from './bits';
import LeaseBar from './LeaseBar';

export default function ListingCard({ listing: l, onSavedChange, highlighted, onHover }) {
  const bedText = l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bed`;
  return (
    <article
      className={`listing-card ${highlighted ? 'highlight' : ''} ${l.status === 'TAKEN' ? 'taken' : ''}`}
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/listings/${l.id}`} className="card-link">
        <div className="card-photo">
          {l.cover ? <img src={l.cover.url} alt={l.cover.alt} loading="lazy" /> : <div className="photo-placeholder" aria-hidden="true" />}
          {l.status === 'TAKEN' && <span className="taken-pill">Taken</span>}
        </div>
        <div className="card-body">
          <p className="card-price">{money(l.monthlyRent)}<span> / month</span></p>
          <h3 className="card-title">{l.title}</h3>
          <p className="card-meta">
            {TYPE_LABELS[l.listingType]}, {bedText}, {Number(l.bathrooms)} bath
            <br />
            {l.city}, {l.state}
            {l.distanceMiles != null && <>, {l.distanceMiles} mi away</>}
          </p>
          <LeaseBar from={l.availableFrom} to={l.availableTo} />
        </div>
      </Link>
      <div className="card-save">
        <SaveButton listingId={l.id} initial={l.saved} onChange={(v) => onSavedChange?.(l.id, v)} />
      </div>
    </article>
  );
}
