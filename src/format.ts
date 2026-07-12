// Pure formatting + small data helpers. Fully unit-tested.

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatSigned(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

// "Mar-26" -> "March 2026" ; "Dec-10" -> "December 2010"
const MONTHS: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
  May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
  Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

export function formatQuarter(q: string): string {
  const m = q.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!m) return q;
  const month = MONTHS[m[1]] || m[1];
  const year = Number(m[2]) < 70 ? `20${m[2]}` : `19${m[2]}`;
  return `${month} ${year}`;
}

// "Mar-26" -> "Q1 2026" (quarter end months: Mar=Q1, Jun=Q2, Sep=Q3, Dec=Q4)
const QUARTER_OF: Record<string, string> = { Mar: 'Q1', Jun: 'Q2', Sep: 'Q3', Dec: 'Q4' };
export function shortQuarter(q: string): string {
  const m = q.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!m) return q;
  const qtr = QUARTER_OF[m[1]] || m[1];
  return `${qtr} 20${m[2]}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'unknown';
  const diff = now - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.round(mon / 12)}y ago`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Last non-null value in a series, or null.
export function lastValue(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return series[i];
  }
  return null;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
