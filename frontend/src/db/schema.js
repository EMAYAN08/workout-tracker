/** Normalize Mongo dumps, mongoose docs, and TrackIt backups into one shape. */

function asId(raw, fallbackPrefix = 'id') {
  if (!raw) return `${fallbackPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    if (raw.id) return String(raw.id);
    if (raw.$oid) return String(raw.$oid);
    if (raw._id) return asId(raw._id, fallbackPrefix);
  }
  return `${fallbackPrefix}_${Date.now()}`;
}

function asIso(value) {
  if (!value && value !== 0) return new Date().toISOString();
  if (value instanceof Date && !isNaN(value)) return value.toISOString();
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof value === 'object' && value.$date) return asIso(value.$date);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function asNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSet(s = {}) {
  return {
    type: s.type || 'Working',
    reps: asNumber(s.reps, 0),
    weight: asNumber(s.weight, 0),
    completedAt: s.completedAt ?? null,
    restTimeTaken: s.restTimeTaken ?? 0,
  };
}

function normalizeExercise(ex = {}, { withSets = false } = {}) {
  const base = {
    id: asId(ex.id || ex._id, 'ex'),
    name: String(ex.name || 'Exercise'),
    muscleGroup: String(ex.muscleGroup || ex.bodyPart || 'other').toLowerCase(),
    gifUrl: ex.gifUrl || null,
    unitSaved: ex.unitSaved === 'kgs' ? 'kgs' : 'lbs',
  };
  if (withSets) {
    base.sets = Array.isArray(ex.sets) ? ex.sets.map(normalizeSet) : [];
  } else {
    base.defaultSets = Array.isArray(ex.defaultSets)
      ? ex.defaultSets.map(normalizeSet)
      : [{ reps: 10, weight: 0, type: 'Working' }];
  }
  return base;
}

export function normalizeWorkout(raw = {}) {
  const timestamp = asIso(raw.timestamp || raw.startTime || raw.createdAt || raw.date);
  return {
    id: asId(raw.id || raw._id, 'wk'),
    timestamp,
    endTime: raw.endTime ? asIso(raw.endTime) : null,
    duration: asNumber(raw.duration ?? raw.durationSeconds, 0),
    unitSaved: raw.unitSaved === 'kgs' ? 'kgs' : 'lbs',
    routineId: raw.routineId || null,
    routineName: raw.routineName || null,
    exercises: Array.isArray(raw.exercises)
      ? raw.exercises.map((ex) => normalizeExercise(ex, { withSets: true }))
      : [],
  };
}

export function normalizeRoutine(raw = {}) {
  return {
    id: asId(raw.id || raw._id, 'rt'),
    name: String(raw.name || 'Routine'),
    exercises: Array.isArray(raw.exercises) ? raw.exercises.map((ex) => normalizeExercise(ex)) : [],
  };
}

export function normalizeCustomExercise(raw = {}) {
  return normalizeExercise(raw);
}

function pickArray(obj, keys) {
  for (const key of keys) {
    if (Array.isArray(obj?.[key])) return obj[key];
  }
  return null;
}

/**
 * Accepts:
 * - TrackIt envelope { version, workouts, routines, customExercises }
 * - Mongo export { workouts, routines, customexercises }
 * - mongoose { workouts: { documents } }
 * - raw arrays mixed into one object
 */
export function parseBackup(input) {
  let data = input;
  if (typeof input === 'string') {
    data = JSON.parse(input);
  }
  if (Array.isArray(data)) {
    const looksWorkout = data.some((x) => x?.exercises && (x.timestamp || x.duration !== undefined));
    if (looksWorkout) {
      return {
        workouts: data.map(normalizeWorkout),
        routines: [],
        customExercises: [],
      };
    }
    const looksRoutine = data.some((x) => x?.name && Array.isArray(x.exercises) && !x.timestamp);
    if (looksRoutine) {
      return { workouts: [], routines: data.map(normalizeRoutine), customExercises: [] };
    }
    return { workouts: [], routines: [], customExercises: data.map(normalizeCustomExercise) };
  }

  const workoutsRaw =
    pickArray(data, ['workouts', 'Workouts', 'workoutHistory']) ||
    pickArray(data.workouts, ['documents', 'docs']) ||
    [];
  const routinesRaw =
    pickArray(data, ['routines', 'Routines']) || pickArray(data.routines, ['documents', 'docs']) || [];
  const customRaw =
    pickArray(data, [
      'customExercises',
      'custom_exercises',
      'customexercises',
      'CustomExercise',
      'customExercise',
    ]) ||
    pickArray(data.customExercises, ['documents', 'docs']) ||
    [];

  return {
    workouts: workoutsRaw.map(normalizeWorkout),
    routines: routinesRaw.map(normalizeRoutine),
    customExercises: customRaw.map(normalizeCustomExercise),
    unit: data.unit === 'kgs' || data.unit === 'lbs' ? data.unit : undefined,
    restTargetSec: Number.isFinite(Number(data.restTargetSec)) ? Number(data.restTargetSec) : undefined,
  };
}

export function buildBackup({ workouts, routines, customExercises, unit, restTargetSec }) {
  return {
    version: 1,
    app: 'trackit',
    exportedAt: new Date().toISOString(),
    unit: unit || 'lbs',
    restTargetSec: restTargetSec || 90,
    workouts,
    routines,
    customExercises,
  };
}
