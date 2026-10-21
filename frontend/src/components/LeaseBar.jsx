import { parseDate, shortDate } from '../format';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The lease window drawn as 12 calendar months with the covered months highlighted,
 * like marking dates on a wall calendar. Starts at whichever is earlier: this month
 * or the move-in month.
 *
 * size="small" is used on result cards; size="large" adds month letters and years.
 */
export default function LeaseBar({ from, to, size = 'small' }) {
  const start = parseDate(from);
  if (!start) return null;
  const end = to ? parseDate(to) : null;

  const today = new Date();
  const first = new Date(Math.min(
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(start.getFullYear(), start.getMonth(), 1),
  ));

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const covered = mEnd >= start && (!end || m <= end);
    return { m, covered, isJan: m.getMonth() === 0 };
  });

  const months_ = end ? Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44))) : null;
  const label = end
    ? `${shortDate(from)} to ${shortDate(to)}, ${months_} month${months_ === 1 ? '' : 's'}`
    : `From ${shortDate(from)}, no end date`;

  return (
    <div className={`lease lease-${size}`}>
      <div className="lease-strip" aria-hidden="true">
        {months.map(({ m, covered, isJan }, i) => (
          <span key={i} className={`lease-month ${covered ? 'on' : ''} ${!end && covered && i === 11 ? 'open' : ''}`}>
            {size === 'large' && (
              <>
                <span className="lease-letter">{MONTHS[m.getMonth()]}</span>
                {(i === 0 || isJan) && <span className="lease-year">{m.getFullYear()}</span>}
              </>
            )}
          </span>
        ))}
      </div>
      <p className="lease-label">
        <span className="sr-only">Lease dates: </span>{label}
      </p>
      {size === 'large' && (
        <p className="sr-only">
          Covers {months.filter((x) => x.covered).map((x) => MONTH_NAMES[x.m.getMonth()]).join(', ')}.
        </p>
      )}
    </div>
  );
}
