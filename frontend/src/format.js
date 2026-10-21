export const TYPE_LABELS = {
  SUBLEASE: 'Sublease',
  LEASE_TAKEOVER: 'Lease takeover',
  ROOM: 'Roommate wanted',
};

export const TYPE_HELP = {
  SUBLEASE: 'Someone lives in your place for part of your lease. You stay on the lease.',
  LEASE_TAKEOVER: 'Someone takes over the rest of your lease and becomes the tenant.',
  ROOM: 'You have a place and need someone to take a room in it.',
};

export const GENDER_LABELS = { ANY: 'Anyone', FEMALE: 'Women only', MALE: 'Men only' };
export const VIBE_LABELS = { QUIET: 'Quiet', SOCIAL: 'Social', MIXED: 'A bit of both' };
export const SLEEP_LABELS = { EARLY: 'Early riser', LATE: 'Night owl', FLEXIBLE: 'Flexible schedule' };
export const CLEAN_LABELS = { RELAXED: 'Relaxed about cleaning', TIDY: 'Tidy', VERY_TIDY: 'Very tidy' };

/** "2027-01-01" plus n months, as an ISO date (used to draw a roommate's planned stay). */
export function addMonthsISO(iso, n) {
  const d = parseDate(iso);
  if (!d || !n) return null;
  const end = new Date(d.getFullYear(), d.getMonth() + n, d.getDate() - 1);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

/** "$550 to $750" */
export const budgetRange = (min, max) => (min === max ? money(max) : `${money(min)} to ${money(max)}`);

export const money = (n) =>
  n == null ? '' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// Dates come from the API as "2027-01-01". Parse as local dates so they don't shift a day.
export function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shortDate(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "Jan 1 – May 31 · 5 months" or "From Jan 1 · open-ended" */
export function leaseRange(from, to) {
  if (!to) return `From ${shortDate(from)} · open-ended`;
  const a = parseDate(from), b = parseDate(to);
  const months = Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.44)));
  return `${shortDate(from)} – ${shortDate(to)} · ${months} month${months === 1 ? '' : 's'}`;
}

export function availabilityNote(from) {
  const d = parseDate(from);
  if (!d) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d <= today ? 'Available now' : `Available ${shortDate(from)}`;
}

export function timeAgo(isoInstant) {
  const secs = Math.round((Date.now() - new Date(isoInstant).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoInstant).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const baths = (b) => `${Number(b)} bath${Number(b) === 1 ? '' : 's'}`;
export const beds = (n) => (n === 0 ? 'Studio' : `${n} bed${n === 1 ? '' : 's'}`);
