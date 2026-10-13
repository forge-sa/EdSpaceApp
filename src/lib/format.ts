const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "now", "5m", "3h", "2d", "4 Oct", "4 Oct 2025" */
export function shortTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function fullTime(ts: number) {
  return new Date(ts).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function joinedDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function compact(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1e6) return Math.floor(n / 1000) + 'K';
  return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
}

export const plural = (n: number, one: string, many = one + 's') => `${compact(n)} ${n === 1 ? one : many}`;

/** Characters as the server counts them (code points, so emoji count once). */
export const charCount = (s: string) => [...s].length;

export function initials(name: string | null | undefined) {
  return (name || '?')
    .split(/\s+/)
    .map((w) => [...w][0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
