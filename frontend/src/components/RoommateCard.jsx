import { Link } from 'react-router-dom';
import { Avatar, VerifiedBadge } from './bits';
import LeaseBar from './LeaseBar';
import { CLEAN_LABELS, SLEEP_LABELS, addMonthsISO, budgetRange } from '../format';

/** A "looking for roommates" profile in the results grid. No photos, so the person leads. */
export default function RoommateCard({ post: p }) {
  const habits = [
    SLEEP_LABELS[p.sleepSchedule],
    CLEAN_LABELS[p.cleanliness].toLowerCase(),
    p.smokes ? 'smokes' : 'non-smoker',
    p.hasPet ? 'has a pet' : null,
  ].filter(Boolean).join(', ');

  return (
    <article className={`roommate-card ${p.status === 'TAKEN' ? 'taken' : ''}`}>
      <Link to={`/roommates/${p.id}`} className="card-link">
        <div className="rm-person">
          <Avatar name={p.owner.displayName} size={44} />
          <div>
            <p className="rm-name">{p.owner.displayName} <VerifiedBadge user={p.owner} /></p>
            {p.occupation && <p className="rm-occupation">{p.occupation}</p>}
          </div>
        </div>
        <h3 className="card-title wrap">{p.headline}</h3>
        <p className="card-price">{budgetRange(p.budgetMin, p.budgetMax)}<span> / month</span></p>
        <p className="card-meta">
          {p.preferredArea ? `${p.preferredArea}, ` : ''}{p.city}, {p.state}
          {p.distanceMiles != null && <>, {p.distanceMiles} mi away</>}
          <br />
          {habits.charAt(0).toUpperCase() + habits.slice(1)}
        </p>
        <LeaseBar from={p.moveInDate} to={addMonthsISO(p.moveInDate, p.stayMonths)} />
        {p.status === 'TAKEN' && <p className="small muted">Found roommates</p>}
      </Link>
    </article>
  );
}
