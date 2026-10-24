// Single entry point for the iOS workout Live Activity (lock screen + Dynamic Island).
//
// The activity is driven declaratively: WorkoutContext calls `syncLiveActivity()`
// with the current workout state whenever anything relevant changes, and this
// service works out the payload, de-duplicates identical updates, serialises
// native calls and ends the activity when there's no workout.
// On Android, web, iOS builds without the native module, or when the user has
// Live Activities switched off, everything here is a silent no-op.
import { Platform } from 'react-native';
import { findNextIncompleteSet } from './notifications';

// iOS ends a Live Activity after ~8h anyway; if a "workout" is older than this
// it was almost certainly abandoned, so don't keep resurrecting the activity.
export const MAX_WORKOUT_AGE_MS = 12 * 60 * 60 * 1000;

let nativeModule;
let lastKey = null; // JSON of the last payload pushed (or 'none' after endAll)
let queue = Promise.resolve();
let warned = false;

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

function warnOnce(err) {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn('[liveActivity]', err?.message || err);
}

export function isLiveActivitySupported() {
  const n = getNative();
  if (!n) return false;
  try {
    return !!n.areActivitiesEnabled();
  } catch {
    return false;
  }
}

function fmtNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return String(Math.round(n * 100) / 100);
}

function describeSet(set, unit) {
  if (!set) return '';
  const w = fmtNum(set.weight);
  const r = fmtNum(set.reps);
  if (w && r) return `${w} ${unit} × ${r}`;
  if (r) return `${r} reps`;
  if (w) return `${w} ${unit}`;
  return '';
}

function setRef(exercises, ei, si, unit) {
  const ex = exercises[ei];
  const set = ex?.sets?.[si];
  if (!ex || !set) return null;
  const d = describeSet(set, unit);
  return {
    exerciseName: String(ex.name || 'Exercise'),
    detail: d || `Set ${si + 1}`,
    setNumber: si + 1,
    setCount: ex.sets.length,
    exerciseId: String(ex.id ?? ''),
    exerciseIndex: ei,
    setIndex: si,
    // Same rule as the in-app check button: a set needs reps to be completed.
    canComplete: !!set.reps,
  };
}

/** The set the primary button acts on: the set in progress, else the next one. */
export function resolveTarget(activeWorkout, playingSet, unit = 'lbs') {
  const exercises = Array.isArray(activeWorkout?.exercises) ? activeWorkout.exercises : [];
  if (playingSet) {
    const ref = setRef(exercises, playingSet.exerciseIndex, playingSet.setIndex, unit);
    if (ref) return ref;
  }
  const next = findNextIncompleteSet(activeWorkout);
  if (!next) return null;
  return setRef(exercises, next.exerciseIndex, next.setIndex, unit);
}

/**
 * Pure: turns workout state into the Live Activity payload, or null when no
 * activity should be shown.
 */
export function buildLiveActivityPayload({
  activeWorkout,
  lastSetCompletedAt,
  restTargetSec,
  playingSet,
  unit = 'lbs',
  now = Date.now(),
} = {}) {
  if (!activeWorkout || !activeWorkout.startTime) return null;
  if (now - activeWorkout.startTime > MAX_WORKOUT_AGE_MS) return null;

  const exercises = Array.isArray(activeWorkout.exercises) ? activeWorkout.exercises : [];
  const restSec = Math.max(1, Number(restTargetSec) || 0);
  const target = resolveTarget(activeWorkout, playingSet, unit);

  // What the target becomes once it is completed (for instant lock-screen feedback).
  let next = null;
  if (target) {
    const clone = {
      ...activeWorkout,
      exercises: exercises.map((ex, ei) =>
        ei !== target.exerciseIndex
          ? ex
          : { ...ex, sets: ex.sets.map((s, si) => (si === target.setIndex ? { ...s, completedAt: now } : s)) }
      ),
    };
    next = resolveTarget(clone, null, unit);
  }

  let exerciseName;
  let detail;
  if (target) {
    exerciseName = target.exerciseName;
    detail = target.detail;
  } else if (exercises.length === 0) {
    exerciseName = 'No exercises yet';
    detail = 'Add an exercise to begin';
  } else {
    exerciseName = String(exercises[exercises.length - 1]?.name || 'Workout');
    detail = 'All sets done';
  }

  const state = {
    workoutStart: activeWorkout.startTime / 1000,
    restOver: false,
    restTargetSec: restSec,
    hasTarget: !!target,
    canComplete: !!target?.canComplete,
    exerciseName,
    detail,
    setNumber: target?.setNumber ?? 0,
    setCount: target?.setCount ?? 0,
    targetExerciseId: target?.exerciseId ?? '',
    targetExerciseIndex: target?.exerciseIndex ?? -1,
    targetSetIndex: target?.setIndex ?? -1,
    hasNext: !!next,
    nextCanComplete: !!next?.canComplete,
    nextExerciseName: next?.exerciseName ?? '',
    nextDetail: next?.detail ?? '',
    nextSetNumber: next?.setNumber ?? 0,
    nextSetCount: next?.setCount ?? 0,
    nextExerciseId: next?.exerciseId ?? '',
    nextExerciseIndex: next?.exerciseIndex ?? -1,
    nextSetIndex: next?.setIndex ?? -1,
  };

  let staleAtMs = 0;
  if (playingSet && target) {
    state.setStart = (playingSet.startTime || now) / 1000;
  } else if (lastSetCompletedAt) {
    const restEndMs = lastSetCompletedAt + restSec * 1000;
    state.restStart = lastSetCompletedAt / 1000;
    state.restEnd = restEndMs / 1000;
    state.restOver = now >= restEndMs;
    // When this passes, iOS re-renders with isStale = true -> "rest over" look,
    // even if the app is suspended.
    if (!state.restOver) staleAtMs = restEndMs;
  }

  return {
    workoutId: String(activeWorkout.id || `wk_${activeWorkout.startTime}`),
    workoutName: String(activeWorkout.routineName || 'Workout'),
    state,
    staleAtMs,
  };
}

// ---- Lock-screen button actions ----
// The iOS intent queues {id, type, workoutId, exerciseId, exerciseIndex, setIndex, at}
// in the App Group; WorkoutContext drains them and applies each through the same
// startSet / completeSet / stopRestTimer / cancelSet used by in-app taps.

export const ACTION_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const ACTION_TYPES = ['start', 'complete', 'skipRest', 'cancelSet'];
const seenActionIds = new Set();

/** Parse + dedupe whatever the native side returns. */
export function parsePendingActions(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const a of list) {
    if (!a || typeof a !== 'object' || !a.id || !ACTION_TYPES.includes(a.type)) continue;
    if (seenActionIds.has(a.id)) continue;
    seenActionIds.add(a.id);
    out.push(a);
  }
  if (seenActionIds.size > 500) {
    // keep memory bounded; ids are UUIDs so old ones won't come back
    const keep = [...seenActionIds].slice(-200);
    seenActionIds.clear();
    keep.forEach((id) => seenActionIds.add(id));
  }
  return out.sort((x, y) => (Number(x.at) || 0) - (Number(y.at) || 0));
}

/** Read and clear queued actions from the native side (iOS only). */
export function consumePendingActions() {
  const n = getNative();
  if (!n?.consumePendingActions) return [];
  try {
    return parsePendingActions(n.consumePendingActions());
  } catch (e) {
    warnOnce(e);
    return [];
  }
}

/** Subscribe to "an action was queued" pings from the intent. Returns unsubscribe. */
export function addLiveActionListener(cb) {
  const n = getNative();
  if (!n?.addListener) return () => {};
  try {
    const sub = n.addListener('onAction', cb);
    return () => sub?.remove?.();
  } catch (e) {
    warnOnce(e);
    return () => {};
  }
}

function resolveExerciseIndex(exercises, action) {
  const ei = Number(action.exerciseIndex);
  const si = Number(action.setIndex);
  if (exercises[ei] && String(exercises[ei].id ?? '') === String(action.exerciseId ?? '')) return ei;
  // The list may have been reordered/edited since the tap: find it by id.
  const candidates = exercises
    .map((ex, i) => ({ ex, i }))
    .filter(({ ex }) => String(ex.id ?? '') === String(action.exerciseId ?? '') && ex.sets?.[si]);
  const open = candidates.find(({ ex }) => !ex.sets[si].completedAt);
  return (open || candidates[0])?.i ?? -1;
}

/**
 * Pure: decide what a queued action should do against the current state.
 * Returns { kind, exerciseIndex, setIndex } or { kind: 'skip', reason }.
 */
export function planLiveAction(action, { activeWorkout, playingSet, lastSetCompletedAt, now = Date.now() } = {}) {
  const skip = (reason) => ({ kind: 'skip', reason });
  if (!action || !ACTION_TYPES.includes(action.type)) return skip('invalid');
  if (!activeWorkout) return skip('no-workout');
  if (String(activeWorkout.id || `wk_${activeWorkout.startTime}`) !== String(action.workoutId)) {
    return skip('other-workout');
  }
  if (action.at && now - Number(action.at) > ACTION_MAX_AGE_MS) return skip('expired');

  if (action.type === 'skipRest') {
    if (!lastSetCompletedAt || playingSet) return skip('not-resting');
    return { kind: 'skipRest' };
  }

  const exercises = Array.isArray(activeWorkout.exercises) ? activeWorkout.exercises : [];
  const ei = resolveExerciseIndex(exercises, action);
  const si = Number(action.setIndex);
  const set = exercises[ei]?.sets?.[si];
  if (!set) return skip('set-missing');
  const isPlaying = !!playingSet && playingSet.exerciseIndex === ei && playingSet.setIndex === si;

  switch (action.type) {
    case 'start':
      if (set.completedAt) return skip('already-completed');
      if (isPlaying) return skip('already-started');
      if (playingSet) return skip('other-set-in-progress');
      return { kind: 'start', exerciseIndex: ei, setIndex: si };
    case 'complete':
      if (set.completedAt) return skip('already-completed');
      if (!isPlaying) return skip('not-in-progress');
      if (!set.reps) return skip('no-reps');
      return { kind: 'complete', exerciseIndex: ei, setIndex: si };
    case 'cancelSet':
      if (!isPlaying) return skip('not-in-progress');
      return { kind: 'cancelSet', exerciseIndex: ei, setIndex: si };
    default:
      return skip('invalid');
  }
}

/** Milliseconds until the current rest ends (null if not resting / already over). */
export function msUntilRestEnd(payload, now = Date.now()) {
  if (!payload?.state?.restEnd || payload.state.restOver) return null;
  return Math.max(0, payload.state.restEnd * 1000 - now);
}

function enqueue(fn) {
  queue = queue.then(fn).catch(warnOnce);
  return queue;
}

/**
 * Push the current workout state to the Live Activity. Safe to call often:
 * identical payloads are skipped unless `force` is set.
 */
export function syncLiveActivity(input, { force = false } = {}) {
  const n = getNative();
  if (!n) return Promise.resolve();
  const payload = buildLiveActivityPayload(input);
  if (!payload) return endLiveActivity({ force });

  const key = JSON.stringify(payload);
  if (!force && key === lastKey) return queue;
  lastKey = key;
  return enqueue(async () => {
    const id = await n.upsert(
      payload.workoutId,
      payload.workoutName,
      JSON.stringify(payload.state),
      payload.staleAtMs
    );
    // '' = user has Live Activities off. Forget the key so we retry later
    // (e.g. after they enable it and come back to the app).
    if (!id) lastKey = null;
  });
}

export function endLiveActivity({ force = false } = {}) {
  const n = getNative();
  if (!n) return Promise.resolve();
  if (!force && lastKey === 'none') return queue;
  lastKey = 'none';
  return enqueue(() => n.endAll());
}

/** Forget de-dupe state, e.g. when the app returns to the foreground. */
export function resetLiveActivityCache() {
  lastKey = null;
}

// Test hooks
export function __setNativeModuleForTests(mod) {
  nativeModule = mod;
  lastKey = null;
  warned = false;
  queue = Promise.resolve();
  seenActionIds.clear();
}
