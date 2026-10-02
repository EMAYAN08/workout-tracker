import { format, parseISO, startOfWeek, subDays, subMonths } from 'date-fns';
import {
  CHART_RANGES,
  rangeCutoff,
  inChartRange,
  bucketKey,
  bucketLabel,
  seriesFromWorkouts,
  barGranularity,
  filledBarSeries,
  enumerateBarKeys,
} from '../utils/chartRange';

const FIXED = new Date('2026-09-12T15:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CHART_RANGES', () => {
  test('exposes 1m / 3m / 6m / 1y pills', () => {
    expect(CHART_RANGES.map((r) => r.value)).toEqual(['1m', '3m', '6m', '1y']);
    expect(CHART_RANGES.map((r) => r.label)).toEqual(['1M', '3M', '6M', '1Y']);
  });
});

describe('rangeCutoff', () => {
  test('1m is 30 days ago', () => {
    expect(rangeCutoff('1m').getTime()).toBe(subDays(FIXED, 30).getTime());
  });

  test('3m / 6m / 1y use calendar months', () => {
    expect(rangeCutoff('3m').getTime()).toBe(subMonths(FIXED, 3).getTime());
    expect(rangeCutoff('6m').getTime()).toBe(subMonths(FIXED, 6).getTime());
    expect(rangeCutoff('1y').getTime()).toBe(subMonths(FIXED, 12).getTime());
  });

  test('unknown range returns null', () => {
    expect(rangeCutoff('all')).toBeNull();
    expect(rangeCutoff(undefined)).toBeNull();
    expect(rangeCutoff('')).toBeNull();
  });
});

describe('inChartRange', () => {
  test('missing cutoff or missing date is treated as in-range', () => {
    expect(inChartRange(FIXED, 'all')).toBe(true);
    expect(inChartRange(null, '1m')).toBe(true);
    expect(inChartRange(undefined, '1m')).toBe(true);
    expect(inChartRange('', '1m')).toBe(true);
  });

  test('includes dates after and equal to the cutoff', () => {
    const cutoff = rangeCutoff('1m');
    expect(inChartRange(cutoff, '1m')).toBe(true);
    expect(inChartRange(FIXED, '1m')).toBe(true);
    expect(inChartRange(subDays(FIXED, 10), '1m')).toBe(true);
  });

  test('excludes dates before the cutoff', () => {
    expect(inChartRange(subDays(FIXED, 31), '1m')).toBe(false);
    expect(inChartRange(subMonths(FIXED, 4), '3m')).toBe(false);
  });

  test('accepts ISO strings', () => {
    expect(inChartRange(FIXED.toISOString(), '1m')).toBe(true);
    expect(inChartRange(subDays(FIXED, 40).toISOString(), '1m')).toBe(false);
  });

  test('invalid dates are not in a bounded range', () => {
    expect(inChartRange('not-a-date', '1m')).toBe(false);
    expect(inChartRange(new Date('nope'), '3m')).toBe(false);
  });
});

describe('bucketKey / bucketLabel', () => {
  const d = new Date('2026-09-09T12:00:00'); // Wednesday

  test('1y buckets by month', () => {
    expect(bucketKey(d, '1y')).toBe('2026-09');
    expect(bucketLabel('2026-09', '1y')).toBe(format(parseISO('2026-09-01'), 'MMM'));
  });

  test('6m buckets by week starting Monday', () => {
    const week = startOfWeek(d, { weekStartsOn: 1 });
    expect(bucketKey(d, '6m')).toBe(format(week, 'yyyy-MM-dd'));
    expect(bucketLabel(format(week, 'yyyy-MM-dd'), '6m')).toBe(format(week, 'MMM d'));
  });

  test('1m / 3m / default bucket by day', () => {
    expect(bucketKey(d, '1m')).toBe(format(d, 'yyyy-MM-dd'));
    expect(bucketKey(d, '3m')).toBe(format(d, 'yyyy-MM-dd'));
    expect(bucketKey(d, 'other')).toBe(format(d, 'yyyy-MM-dd'));
    expect(bucketLabel(format(d, 'yyyy-MM-dd'), '1m')).toBe(format(d, 'MMM d'));
  });

  test('accepts ISO strings', () => {
    expect(bucketKey(d.toISOString(), '1m')).toBe(format(d, 'yyyy-MM-dd'));
  });
});

describe('seriesFromWorkouts', () => {
  test('empty / null points return []', () => {
    expect(seriesFromWorkouts([], '1m')).toEqual([]);
    expect(seriesFromWorkouts(null, '1m')).toEqual([]);
    expect(seriesFromWorkouts(undefined, '1m')).toEqual([]);
  });

  test('skips null rows, null values, and missing dates', () => {
    const points = [
      null,
      { date: FIXED, value: null },
      { date: FIXED },
      { value: 10 },
      { date: FIXED, value: 7 },
    ];
    const series = seriesFromWorkouts(points, '1m');
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(7);
  });

  test('keeps zero values', () => {
    const series = seriesFromWorkouts([{ date: FIXED, value: 0 }], '1m');
    expect(series[0].value).toBe(0);
  });

  test('reduce last keeps the latest value in the bucket', () => {
    const day = new Date('2026-09-10T12:00:00');
    const series = seriesFromWorkouts(
      [
        { date: day, value: 10 },
        { date: day, value: 20 },
        { date: day, value: 4 },
      ],
      '1m',
      'last'
    );
    expect(series[0].value).toBe(4);
  });

  test('reduce max keeps the peak', () => {
    const day = new Date('2026-09-10T12:00:00');
    const series = seriesFromWorkouts(
      [
        { date: day, value: 10 },
        { date: day, value: 20 },
        { date: day, value: 4 },
      ],
      '1m',
      'max'
    );
    expect(series[0].value).toBe(20);
  });

  test('reduce sum adds values in the bucket', () => {
    const day = new Date('2026-09-10T12:00:00');
    const series = seriesFromWorkouts(
      [
        { date: day, value: 10 },
        { date: day, value: 20 },
        { date: day, value: 4 },
      ],
      '1m',
      'sum'
    );
    expect(series[0].value).toBe(34);
  });

  test('defaults reduce to last', () => {
    const day = new Date('2026-09-10T12:00:00');
    const series = seriesFromWorkouts(
      [
        { date: day, value: 1 },
        { date: day, value: 9 },
      ],
      '1m'
    );
    expect(series[0].value).toBe(9);
  });

  test('filters out-of-range points', () => {
    const series = seriesFromWorkouts(
      [
        { date: subDays(FIXED, 40), value: 99 },
        { date: subDays(FIXED, 2), value: 5 },
      ],
      '1m',
      'sum'
    );
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(5);
  });

  test('sorts buckets by key and rounds to 1 decimal', () => {
    const series = seriesFromWorkouts(
      [
        { date: new Date('2026-09-11T12:00:00'), value: 1.25 },
        { date: new Date('2026-09-09T12:00:00'), value: 2 },
      ],
      '1m'
    );
    expect(series.map((p) => p.key)).toEqual(['2026-09-09', '2026-09-11']);
    expect(series[1].value).toBe(1.3);
    expect(series[0].date).toBe(bucketLabel('2026-09-09', '1m'));
  });

  test('invalid dates in a bounded range are skipped', () => {
    const series = seriesFromWorkouts(
      [
        { date: 'not-a-date', value: 10 },
        { date: FIXED, value: 3 },
      ],
      '1m'
    );
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(3);
  });

  test('invalid dates with unknown range are skipped', () => {
    expect(seriesFromWorkouts([{ date: 'not-a-date', value: 10 }], 'all')).toEqual([]);
  });

  test('1y series uses month labels', () => {
    const series = seriesFromWorkouts([{ date: FIXED, value: 12 }], '1y');
    expect(series[0].key).toBe('2026-09');
    expect(series[0].date).toBe(bucketLabel('2026-09', '1y'));
    expect(series[0].value).toBe(12);
  });
});

describe('filledBarSeries', () => {
  test('barGranularity is day / week / month', () => {
    expect(barGranularity('1m')).toBe('day');
    expect(barGranularity('3m')).toBe('week');
    expect(barGranularity('6m')).toBe('week');
    expect(barGranularity('1y')).toBe('month');
  });

  test('1m fills every day in the window including zeros', () => {
    const series = filledBarSeries([{ date: FIXED, value: 10 }], '1m', 'sum');
    expect(series.length).toBe(enumerateBarKeys('1m').length);
    expect(series.some((p) => p.value === 10)).toBe(true);
    expect(series.some((p) => p.value === 0)).toBe(true);
    expect(series[series.length - 1].key).toBe(format(FIXED, 'yyyy-MM-dd'));
  });

  test('sums two sessions on the same day', () => {
    const series = filledBarSeries(
      [
        { date: FIXED, value: 10 },
        { date: FIXED, value: 5 },
      ],
      '1m',
      'sum'
    );
    const hit = series.find((p) => p.value === 15);
    expect(hit).toBeTruthy();
  });
});
