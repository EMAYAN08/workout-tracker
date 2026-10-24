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

  let exerciseName;
  let nextSet;
  const playingEx = playingSet ? exercises[playingSet.exerciseIndex] : null;
  if (playingEx) {
    const set = playingEx.sets?.[playingSet.setIndex];
    exerciseName = playingEx.name || 'Exercise';
    const d = describeSet(set, unit);
    nextSet = `Set ${playingSet.setIndex + 1} in progress${d ? ` · ${d}` : ''}`;
  } else {
    const next = findNextIncompleteSet(activeWorkout);
    if (next) {
      exerciseName = next.name;
      const d = describeSet(exercises[next.exerciseIndex]?.sets?.[next.setIndex], unit);
      nextSet = `Next: ${next.setLabel}${d ? ` · ${d}` : ''}`;
    } else if (exercises.length === 0) {
      exerciseName = 'No exercises yet';
      nextSet = 'Add an exercise to begin';
    } else {
      exerciseName = exercises[exercises.length - 1]?.name || 'Workout';
      nextSet = 'All sets done';
    }
  }

  const state = {
    workoutStart: activeWorkout.startTime / 1000,
    restOver: false,
    exerciseName: String(exerciseName),
    nextSet: String(nextSet),
  };

  let staleAtMs = 0;
  const target = Math.max(1, Number(restTargetSec) || 0);
  if (lastSetCompletedAt && !playingSet) {
    const restEndMs = lastSetCompletedAt + target * 1000;
    state.restStart = lastSetCompletedAt / 1000;
    state.restEnd = restEndMs / 1000;
    state.restOver = now >= restEndMs;
    // When this passes, iOS re-renders with isStale = true -> "rest over" colour,
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
}
