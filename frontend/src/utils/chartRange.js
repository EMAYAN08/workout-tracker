import {
  subDays,
  subMonths,
  startOfWeek,
  startOfDay,
  format,
  parseISO,
  isAfter,
  isEqual,
  isValid,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';

export const CHART_RANGES = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

function asValidDate(date) {
  if (date == null || date === '') return null;
  const d = date instanceof Date ? date : new Date(date);
  return isValid(d) ? d : null;
}

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
  const d = asValidDate(date);
  if (!d) return false;
  return isAfter(d, cutoff) || isEqual(d, cutoff);
}

function grainFor(range, grain) {
  if (grain === 'month' || grain === 'week' || grain === 'day') return grain;
  if (range === '1y' || range === 'month') return 'month';
  if (range === '6m' || range === 'week') return 'week';
  return 'day';
}

export function barGranularity(range) {
  if (range === '1y') return 'month';
  if (range === '3m' || range === '6m') return 'week';
  return 'day';
}

export function bucketKey(date, range) {
  const d = asValidDate(date);
  if (!d) return null;
  const g = grainFor(range);
  if (g === 'month') return format(d, 'yyyy-MM');
  if (g === 'week') return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return format(d, 'yyyy-MM-dd');
}

export function bucketLabel(key, range) {
  if (!key) return '';
  try {
    const g = grainFor(range);
    if (g === 'month') return format(parseISO(`${key}-01`), 'MMM');
    return format(parseISO(key), 'MMM d');
  } catch {
    return '';
  }
}

export function fullBarDate(key, grain) {
  if (!key) return '';
  try {
    if (grain === 'month') return format(parseISO(`${key}-01`), 'MMM yyyy');
    return format(parseISO(key), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function seriesFromWorkouts(points, range, reduce = 'last', grain) {
  const map = new Map();
  const g = grainFor(range, grain);
  (points || []).forEach((p) => {
    if (!p || p.value == null || !p.date) return;
    if (!asValidDate(p.date)) return;
    if (!inChartRange(p.date, range)) return;
    const key = bucketKey(p.date, g);
    if (!key) return;
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
      return {
        date: bucketLabel(key, g),
        value: Number(Number(row.value).toFixed(1)),
        key,
        fullDate: fullBarDate(key, g),
      };
    });
}

export function enumerateBarKeys(range) {
  const grain = barGranularity(range);
  const end = startOfDay(new Date());
  const start = rangeCutoff(range) || subDays(end, 30);
  const interval = { start: isAfter(start, end) ? end : start, end };
  if (grain === 'month') {
    return eachMonthOfInterval(interval).map((d) => format(d, 'yyyy-MM'));
  }
  if (grain === 'week') {
    return eachWeekOfInterval(interval, { weekStartsOn: 1 }).map((d) =>
      format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    );
  }
  return eachDayOfInterval(interval).map((d) => format(d, 'yyyy-MM-dd'));
}

export function filledBarSeries(points, range, reduce = 'sum') {
  const grain = barGranularity(range);
  const sparse = seriesFromWorkouts(points, range, reduce, grain);
  const map = new Map(sparse.map((s) => [s.key, s]));
  return enumerateBarKeys(range).map((key) => {
    const row = map.get(key);
    if (row) return row;
    return {
      date: bucketLabel(key, grain),
      value: 0,
      key,
      fullDate: fullBarDate(key, grain),
    };
  });
}
