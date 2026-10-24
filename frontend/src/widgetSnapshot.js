// Home screen "Consistency" widget (iOS WidgetKit) data bridge.
//
// JS builds a compact snapshot of the consistency map (same day rules and
// colours as Dashboard/ConsistencyMap) and writes it as JSON to the App Group
// via the TrackHitLiveActivity native module, which then reloads the widget
// timeline. The widget computes "today"/future cells and the Score/Days stats
// itself from the per-day string, so it rolls over at midnight without the
// app being opened. Everything is a no-op off iOS or without the native module.
import { Platform } from 'react-native';

export const WIDGET_KIND = 'TrackHitConsistency';
export const WIDGET_SCHEMA = 1;
export const WIDGET_WEEKS = 27; // large widget shows 26 weeks; +1 so it still fills after rollover

// Day codes in snapshot.days
export const DAY_EMPTY = '0';
export const DAY_WORK = '1';
export const DAY_REST = '2';

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date key (yyyy-MM-dd) — same local-day bucketing as the app (startOfDay). */
export function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n) {
  // calendar arithmetic (DST-safe)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
/** Monday of the week containing d (app weeks are Monday-first). */
export function mondayOf(d) {
  const m = localMidnight(d);
  const dow = (m.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(m, -dow);
}

/** Same rules as ConsistencyMap: a day with any non-empty workout is a workout day; only empty-exercise logs = rest. */
export function bucketDays(workoutHistory = []) {
  const map = new Map();
  for (const w of workoutHistory || []) {
    if (!w || !w.timestamp) continue;
    const t = new Date(w.timestamp);
    if (Number.isNaN(t.getTime())) continue;
    const k = dayKey(t);
    const e = map.get(k) || { work: false, rest: false };
    if (Array.isArray(w.exercises) && w.exercises.length === 0) e.rest = true;
    else e.work = true;
    map.set(k, e);
  }
  return map;
}

/**
 * Score/Days over previous + current month up to today, exactly like the
 * in-app map at monthOffset 0. `codeFor(date)` returns a day code.
 */
export function computeStats(codeFor, now = new Date()) {
  const today = localMidnight(now);
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  let active = 0;
  let valid = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const c = codeFor(d);
    if (c !== DAY_REST) valid += 1;
    if (c === DAY_WORK) active += 1;
  }
  return { score: Math.min(Math.round((active / (valid || 1)) * 100), 100), activeDays: active };
}

/** Consecutive workout days ending today (or yesterday if today not yet logged); rest days keep it alive. */
export function computeStreak(codeFor, now = new Date()) {
  let d = localMidnight(now);
  if (codeFor(d) !== DAY_WORK) d = addDays(d, -1);
  let n = 0;
  for (let i = 0; i < 400; i += 1) {
    const c = codeFor(d);
    if (c === DAY_WORK) n += 1;
    else if (c !== DAY_REST) break;
    d = addDays(d, -1);
  }
  return n;
}

export function pickWidgetColors(colors = {}) {
  return {
    background: colors.surface || '#111111',
    border: colors.border || '#2A2A2A',
    text: colors.text || '#F4F4F2',
    textMuted: colors.textMuted || '#9A9A96',
    textSubtle: colors.textSubtle || '#6A6A66',
    empty: colors.heatmapEmpty || '#1C1C1C',
    rest: colors.heatmapRest || '#3A3A3A',
    work: colors.heatmapWork || '#C8C4C0',
    future: colors.heatmapFuture || '#070707',
  };
}

/**
 * Build the widget snapshot.
 * days[i] is the code for startDate + i days, through today (inclusive).
 */
export function buildWidgetSnapshot({ workoutHistory = [], colors, now = new Date(), weeks = WIDGET_WEEKS } = {}) {
  const today = localMidnight(now);
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  const buckets = bucketDays(workoutHistory);
  let days = '';
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const e = buckets.get(dayKey(d));
    days += !e ? DAY_EMPTY : e.work ? DAY_WORK : DAY_REST;
  }
  const codeFor = (d) => {
    const e = buckets.get(dayKey(d));
    return !e ? DAY_EMPTY : e.work ? DAY_WORK : DAY_REST;
  };
  const stats = computeStats(codeFor, today);
  return {
    v: WIDGET_SCHEMA,
    startDate: dayKey(start),
    endDate: dayKey(today),
    days,
    hasData: buckets.size > 0,
    totalWorkouts: (workoutHistory || []).filter((w) => w && !(Array.isArray(w.exercises) && w.exercises.length === 0)).length,
    score: stats.score,
    activeDays: stats.activeDays,
    streak: computeStreak(codeFor, today),
    colors: pickWidgetColors(colors),
  };
}

// ---- native sync ----
let nativeModule;
let lastJson = null;

function getNative() {
  if (nativeModule !== undefined) return nativeModule;
  nativeModule = null;
  if (Platform.OS !== 'ios') return nativeModule;
  try {
    // eslint-disable-next-line global-require
    const core = require('expo-modules-core');
    nativeModule = core?.requireOptionalNativeModule?.('TrackHitLiveActivity') || null;
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

/** Write the snapshot if changed (or forced). Returns true when written. */
export function syncWidgetSnapshot(snapshot, { force = false } = {}) {
  const n = getNative();
  if (!n || typeof n.setWidgetData !== 'function' || !snapshot) return false;
  const json = JSON.stringify(snapshot);
  if (!force && json === lastJson) return false;
  try {
    n.setWidgetData(json);
    lastJson = json;
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[widget]', err?.message || err);
    return false;
  }
}

export function resetWidgetCache() {
  lastJson = null;
}

export function __setWidgetNativeForTests(mod) {
  nativeModule = mod;
  lastJson = null;
}
