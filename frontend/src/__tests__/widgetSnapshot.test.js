import {
  buildWidgetSnapshot,
  bucketDays,
  computeStats,
  computeStreak,
  dayKey,
  mondayOf,
  syncWidgetSnapshot,
  resetWidgetCache,
  pickWidgetColors,
  __setWidgetNativeForTests,
  WIDGET_WEEKS,
} from '../widgetSnapshot';
import { msUntilNextMidnight } from '../useWidgetSync';
import { resolvePalette } from '../theme';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const wk = (date, exercises = [{ name: 'Bench' }]) => ({ timestamp: date.toISOString(), exercises });

describe('bucketing', () => {
  test('local day keys and monday', () => {
    expect(dayKey(at(2026, 3, 5))).toBe('2026-03-05');
    expect(dayKey(mondayOf(at(2026, 10, 25)))).toBe('2026-10-19'); // Sunday -> previous Monday
    expect(dayKey(mondayOf(at(2026, 10, 19)))).toBe('2026-10-19');
  });
  test('rest vs work, work wins on same day', () => {
    const m = bucketDays([wk(at(2026, 10, 1), []), wk(at(2026, 10, 2), []), wk(at(2026, 10, 2))]);
    expect(m.get('2026-10-01')).toEqual({ work: false, rest: true });
    expect(m.get('2026-10-02')).toEqual({ work: true, rest: true });
  });
  test('midnight edges use local time', () => {
    const m = bucketDays([wk(at(2026, 10, 1, 23, 59)), wk(at(2026, 10, 2, 0, 0), [])]);
    expect(m.get('2026-10-01').work).toBe(true);
    expect(m.get('2026-10-02')).toEqual({ work: false, rest: true });
  });
  test('ignores bad entries', () => {
    expect(bucketDays([null, {}, { timestamp: 'nope' }]).size).toBe(0);
  });
});

describe('buildWidgetSnapshot', () => {
  const now = at(2026, 10, 24, 9, 58); // Saturday
  test('range: Monday-aligned start through today', () => {
    const s = buildWidgetSnapshot({ workoutHistory: [], now });
    expect(s.endDate).toBe('2026-10-24');
    expect(s.startDate).toBe(dayKey(new Date(2026, 9, 19 - 7 * (WIDGET_WEEKS - 1))));
    expect(new Date(2026, 9, 19 - 7 * (WIDGET_WEEKS - 1)).getDay()).toBe(1);
    expect(s.days.length).toBe((WIDGET_WEEKS - 1) * 7 + 6);
  });
  test('empty data', () => {
    const s = buildWidgetSnapshot({ workoutHistory: [], now });
    expect(s.hasData).toBe(false);
    expect(s.days).toMatch(/^0+$/);
    expect(s).toMatchObject({ score: 0, activeDays: 0, streak: 0, totalWorkouts: 0 });
  });
  test('codes land on the right index; out-of-range ignored', () => {
    const s = buildWidgetSnapshot({
      now,
      workoutHistory: [wk(at(2026, 10, 24, 0, 1)), wk(at(2026, 10, 23), []), wk(at(2025, 1, 1)), wk(at(2026, 10, 25))],
    });
    expect(s.days.slice(-2)).toBe('21');
    expect(s.days.length).toBe((WIDGET_WEEKS - 1) * 7 + 6);
    expect(s.hasData).toBe(true);
    expect(s.totalWorkouts).toBe(3);
  });
  test('stats match the in-app map rules (prev + current month, rest excluded)', () => {
    // Sep has 30 days + Oct 1..24 = 54 days; 2 rest days -> 52 valid; 13 workouts
    const hist = [];
    for (let d = 1; d <= 13; d += 1) hist.push(wk(at(2026, 10, d)));
    hist.push(wk(at(2026, 9, 3), []), wk(at(2026, 9, 4), []));
    hist.push(wk(at(2026, 8, 31))); // August: outside
    const s = buildWidgetSnapshot({ workoutHistory: hist, now });
    expect(s.activeDays).toBe(13);
    expect(s.score).toBe(Math.round((13 / 52) * 100));
  });
  test('streak counts through rest days and tolerates today not yet logged', () => {
    const hist = [wk(at(2026, 10, 23)), wk(at(2026, 10, 22), []), wk(at(2026, 10, 21)), wk(at(2026, 10, 19))];
    expect(buildWidgetSnapshot({ workoutHistory: hist, now }).streak).toBe(2);
  });
  test('colours come from resolved theme palette', () => {
    const p = resolvePalette('dark');
    const s = buildWidgetSnapshot({ workoutHistory: [], colors: p, now });
    expect(s.colors.work).toBe(p.heatmapWork);
    expect(s.colors.rest).toBe(p.heatmapRest);
    expect(s.colors.background).toBe(p.surface);
    expect(pickWidgetColors(undefined).empty).toBe('#1C1C1C');
  });
  test('DST transition keeps one code per calendar day', () => {
    const s = buildWidgetSnapshot({ workoutHistory: [], now: at(2026, 3, 10), weeks: 2 });
    expect(s.days.length).toBe(7 + 2); // Mon..Tue of 2nd week
  });
});

describe('computeStats / computeStreak', () => {
  test('all-rest month gives 0 score without dividing by zero', () => {
    expect(computeStats(() => '2', at(2026, 10, 24))).toEqual({ score: 0, activeDays: 0 });
  });
  test('streak 0 with nothing', () => {
    expect(computeStreak(() => '0', at(2026, 10, 24))).toBe(0);
  });
});

describe('syncWidgetSnapshot', () => {
  afterEach(() => __setWidgetNativeForTests(undefined));
  test('no-op without native module', () => {
    __setWidgetNativeForTests(null);
    expect(syncWidgetSnapshot({ a: 1 })).toBe(false);
  });
  test('writes JSON and dedupes; force/reset rewrites', () => {
    const n = { setWidgetData: jest.fn(() => true) };
    __setWidgetNativeForTests(n);
    const snap = buildWidgetSnapshot({ workoutHistory: [wk(at(2026, 10, 1))], now: at(2026, 10, 24) });
    expect(syncWidgetSnapshot(snap)).toBe(true);
    expect(JSON.parse(n.setWidgetData.mock.calls[0][0])).toEqual(snap);
    expect(syncWidgetSnapshot(snap)).toBe(false);
    expect(syncWidgetSnapshot(snap, { force: true })).toBe(true);
    resetWidgetCache();
    expect(syncWidgetSnapshot(snap)).toBe(true);
    expect(n.setWidgetData).toHaveBeenCalledTimes(3);
  });
  test('native error is swallowed and retried next time', () => {
    const n = { setWidgetData: jest.fn(() => { throw new Error('x'); }) };
    __setWidgetNativeForTests(n);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(syncWidgetSnapshot({ a: 1 })).toBe(false);
    expect(syncWidgetSnapshot({ a: 1 })).toBe(false);
    expect(n.setWidgetData).toHaveBeenCalledTimes(2);
  });
});

test('msUntilNextMidnight', () => {
  expect(msUntilNextMidnight(at(2026, 10, 24, 23, 59))).toBe(60_000);
});
