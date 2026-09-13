import {
  subDays,
  subMonths,
  startOfWeek,
  format,
  parseISO,
  isAfter,
  isEqual,
} from 'date-fns';

export const CHART_RANGES = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

export function rangeCutoff(range) {
  const now = new Date();
  if (range === '1m') return subDays(now, 30);
  if (range === '3m') return subMonths(now, 3);
  if (range === '6m') return subMonths(now, 6);
  if (range === '1y') return subMonths(now, 12);
  return null;
}

export function inChartRange(date, range) {
  const cutoff = rangeCutoff(range);
  if (!cutoff || !date) return true;
  const d = date instanceof Date ? date : new Date(date);
  return isAfter(d, cutoff) || isEqual(d, cutoff);
}

export function bucketKey(date, range) {
  const d = date instanceof Date ? date : new Date(date);
  if (range === '1y') return format(d, 'yyyy-MM');
  if (range === '6m') return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return format(d, 'yyyy-MM-dd');
}

export function bucketLabel(key, range) {
  if (range === '1y') return format(parseISO(`${key}-01`), 'MMM');
  return format(parseISO(key), 'MMM d');
}

export function seriesFromWorkouts(points, range, reduce = 'last') {
  const map = new Map();
  (points || []).forEach((p) => {
    if (!p || p.value == null || !p.date) return;
    if (!inChartRange(p.date, range)) return;
    const key = bucketKey(p.date, range);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { value: Number(p.value) || 0, date: p.date, key });
      return;
    }
    const next = Number(p.value) || 0;
    if (reduce === 'max') prev.value = Math.max(prev.value, next);
    else if (reduce === 'sum') prev.value += next;
    else prev.value = next;
    prev.date = p.date;
  });
  return [...map.keys()]
    .sort()
    .map((key) => {
      const row = map.get(key);
      return { date: bucketLabel(key, range), value: Number(Number(row.value).toFixed(1)), key };
    });
}
