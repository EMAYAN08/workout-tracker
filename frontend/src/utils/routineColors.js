// Deterministic routine -> colour mapping for the History calendar.
// All palette colours are dark/saturated enough for white day numbers in both
// light and dark themes, and none are pure black/white/grey so they don't clash
// with the "today" outline (theme text colour) or the neutral custom colour.
export const ROUTINE_PALETTE = [
  '#E5484D', // red
  '#3E63DD', // blue
  '#2F9E44', // green
  '#8E4EC6', // purple
  '#E8590C', // orange
  '#0C8599', // teal
  '#D6409F', // pink
  '#A0522D', // sienna
  '#5C940D', // olive green
  '#B08800', // gold
  '#1864AB', // navy
  '#C2255C', // raspberry
];

export const CUSTOM_KEY = 'custom';
export const REST_KEY = 'rest';
export const CUSTOM_COLOR = '#7B8088';

export function normalizeRoutineName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable key for a saved workout. */
export function routineKeyForWorkout(wk) {
  if (!wk) return CUSTOM_KEY;
  if (Array.isArray(wk.exercises) && wk.exercises.length === 0) return REST_KEY;
  if (wk.routineId) return `id:${wk.routineId}`;
  const n = normalizeRoutineName(wk.routineName);
  if (n) return `name:${n}`;
  return CUSTOM_KEY;
}

export function labelForWorkout(wk) {
  const key = routineKeyForWorkout(wk);
  if (key === REST_KEY) return wk?.routineName?.trim() || 'Rest day';
  if (key === CUSTOM_KEY) return 'Custom workout';
  return wk.routineName?.trim() || 'Routine';
}

/**
 * Builds a colour resolver. Routines get palette slots in list order (the
 * routines list is kept in creation order), so the same routine keeps its
 * colour across months and sessions. Keys not in the list (deleted routines,
 * name-only workouts) hash to a slot, preferring slots not already taken.
 */
export function createRoutineColorResolver(routines = [], { restColor = '#9A9A9A', customColor = CUSTOM_COLOR } = {}) {
  const assigned = new Map();
  const used = new Set();
  (routines || []).forEach((r, i) => {
    if (!r) return;
    const idx = i % ROUTINE_PALETTE.length;
    if (r.id && !assigned.has(`id:${r.id}`)) assigned.set(`id:${r.id}`, idx);
    const n = normalizeRoutineName(r.name);
    if (n && !assigned.has(`name:${n}`)) assigned.set(`name:${n}`, idx);
    used.add(idx);
  });
  const cache = new Map();
  return function colorForKey(key) {
    if (key === REST_KEY) return restColor;
    if (key === CUSTOM_KEY || !key) return customColor;
    if (assigned.has(key)) return ROUTINE_PALETTE[assigned.get(key)];
    if (cache.has(key)) return cache.get(key);
    const start = hashString(key) % ROUTINE_PALETTE.length;
    let idx = start;
    for (let k = 0; k < ROUTINE_PALETTE.length; k++) {
      const cand = (start + k) % ROUTINE_PALETTE.length;
      if (!used.has(cand)) {
        idx = cand;
        break;
      }
    }
    const c = ROUTINE_PALETTE[idx];
    cache.set(key, c);
    return c;
  };
}

/** Distinct routine entries (max `max`) for one day's workouts, in order. */
export function dayRoutineEntries(dayWorkouts = [], colorForKey, max = 3) {
  const out = [];
  const seen = new Set();
  dayWorkouts.forEach((wk) => {
    const key = routineKeyForWorkout(wk);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, label: labelForWorkout(wk), color: colorForKey(key) });
  });
  return out.slice(0, max);
}

/** Legend entries for a set of workouts (e.g. the visible month), most frequent first. */
export function legendEntries(workouts = [], colorForKey) {
  const map = new Map();
  workouts.forEach((wk) => {
    const key = routineKeyForWorkout(wk);
    const e = map.get(key) || { key, label: labelForWorkout(wk), color: colorForKey(key), count: 0, lastTs: 0 };
    e.count += 1;
    const ts = new Date(wk.timestamp || wk.startTime || 0).getTime() || 0;
    if (ts >= e.lastTs) {
      e.lastTs = ts;
      e.label = labelForWorkout(wk); // most recent saved name in range
    }
    map.set(key, e);
  });
  const rank = (k) => (k === REST_KEY ? 2 : k === CUSTOM_KEY ? 1 : 0);
  return [...map.values()]
    .sort((a, b) => rank(a.key) - rank(b.key) || b.count - a.count || a.label.localeCompare(b.label))
    .map(({ key, label, color, count }) => ({ key, label, color, count }));
}
