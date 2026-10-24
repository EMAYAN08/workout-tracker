import {
  buildLiveActivityPayload,
  syncLiveActivity,
  endLiveActivity,
  resetLiveActivityCache,
  msUntilRestEnd,
  isLiveActivitySupported,
  MAX_WORKOUT_AGE_MS,
  parsePendingActions,
  consumePendingActions,
  planLiveAction,
  ACTION_MAX_AGE_MS,
  __setNativeModuleForTests,
} from '../liveActivity';

const T0 = 1_700_000_000_000;
const workout = (over = {}) => ({
  id: 'wk_1',
  startTime: T0,
  routineName: 'Push Day',
  exercises: [
    { id: 'ex_bench', name: 'Bench', sets: [{ weight: '100', reps: '8', completedAt: T0 + 1 }, { weight: '100', reps: '8', completedAt: null }] },
    { id: 'ex_fly', name: 'Fly', sets: [{ weight: '', reps: '12', completedAt: null }] },
  ],
  ...over,
});

function mockNative({ enabled = true } = {}) {
  return {
    areActivitiesEnabled: jest.fn(() => enabled),
    upsert: jest.fn(async () => (enabled ? 'act1' : '')),
    endAll: jest.fn(async () => 0),
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('buildLiveActivityPayload', () => {
  test('null without an active workout', () => {
    expect(buildLiveActivityPayload({ activeWorkout: null })).toBeNull();
  });

  test('abandoned (very old) workout shows nothing', () => {
    expect(buildLiveActivityPayload({ activeWorkout: workout(), now: T0 + MAX_WORKOUT_AGE_MS + 1 })).toBeNull();
  });

  test('working state: counts, next set and name', () => {
    const p = buildLiveActivityPayload({ activeWorkout: workout(), unit: 'kgs', now: T0 + 5000 });
    expect(p.workoutId).toBe('wk_1');
    expect(p.workoutName).toBe('Push Day');
    expect(p.state).toMatchObject({ workoutStart: T0 / 1000, exerciseName: 'Bench', restOver: false });
    expect(p.state.setsDone).toBeUndefined();
    expect(p.state.setsTotal).toBeUndefined();
    expect(p.state).toMatchObject({
      hasTarget: true,
      canComplete: true,
      detail: '100 kgs × 8',
      setNumber: 2,
      setCount: 2,
      targetExerciseId: 'ex_bench',
      targetExerciseIndex: 0,
      targetSetIndex: 1,
      hasNext: true,
      nextExerciseName: 'Fly',
      nextDetail: '12 reps',
      nextExerciseId: 'ex_fly',
      nextExerciseIndex: 1,
      nextSetIndex: 0,
      nextSetNumber: 1,
    });
    expect(p.state.setStart).toBeUndefined();
    expect(p.state.nextSet).toBeUndefined();
    expect(p.state.restEnd).toBeUndefined();
    expect(p.staleAtMs).toBe(0);
  });

  test('resting: countdown range + staleDate at rest end', () => {
    const p = buildLiveActivityPayload({ activeWorkout: workout(), lastSetCompletedAt: T0 + 60000, restTargetSec: 90, now: T0 + 70000 });
    expect(p.state.restStart).toBe((T0 + 60000) / 1000);
    expect(p.state.restEnd).toBe((T0 + 150000) / 1000);
    expect(p.state.restOver).toBe(false);
    expect(p.staleAtMs).toBe(T0 + 150000);
    expect(msUntilRestEnd(p, T0 + 70000)).toBe(80000);
  });

  test('rest over flips colour flag and clears staleDate', () => {
    const p = buildLiveActivityPayload({ activeWorkout: workout(), lastSetCompletedAt: T0, restTargetSec: 30, now: T0 + 31000 });
    expect(p.state.restOver).toBe(true);
    expect(p.staleAtMs).toBe(0);
    expect(msUntilRestEnd(p)).toBeNull();
  });

  test('changing rest target moves rest end', () => {
    const a = buildLiveActivityPayload({ activeWorkout: workout(), lastSetCompletedAt: T0, restTargetSec: 60, now: T0 });
    const b = buildLiveActivityPayload({ activeWorkout: workout(), lastSetCompletedAt: T0, restTargetSec: 120, now: T0 });
    expect(b.state.restEnd - a.state.restEnd).toBe(60);
  });

  test('starting a set mid-rest drops the rest and shows the set in progress', () => {
    const p = buildLiveActivityPayload({
      activeWorkout: workout(),
      lastSetCompletedAt: T0,
      restTargetSec: 90,
      playingSet: { exerciseIndex: 1, setIndex: 0, startTime: T0 + 10 },
      now: T0 + 20,
    });
    expect(p.state.restEnd).toBeUndefined();
    expect(p.state.exerciseName).toBe('Fly');
    expect(p.state.detail).toBe('12 reps');
    expect(p.state.setStart).toBe((T0 + 10) / 1000);
    expect(p.state.targetExerciseIndex).toBe(1);
    expect(p.state).toMatchObject({ hasNext: true, nextExerciseName: 'Bench', nextSetIndex: 1 });
  });

  test('empty and finished workouts', () => {
    expect(buildLiveActivityPayload({ activeWorkout: workout({ exercises: [] }), now: T0 }).state.exerciseName).toBe('No exercises yet');
    const done = workout({ exercises: [{ name: 'Row', sets: [{ completedAt: 1 }] }], routineName: undefined });
    const p = buildLiveActivityPayload({ activeWorkout: done, now: T0 });
    expect(p.state.detail).toBe('All sets done');
    expect(p.state.hasTarget).toBe(false);
    expect(p.state.canComplete).toBe(false);
    expect(p.workoutName).toBe('Workout');
  });
});

describe('sync service', () => {
  test('no native module (web/android/old build) is a no-op', async () => {
    __setNativeModuleForTests(null);
    await expect(syncLiveActivity({ activeWorkout: workout() })).resolves.toBeUndefined();
    await expect(endLiveActivity()).resolves.toBeUndefined();
    expect(isLiveActivitySupported()).toBe(false);
  });

  test('upserts once, skips identical payloads, force re-sends', async () => {
    const n = mockNative();
    __setNativeModuleForTests(n);
    const input = { activeWorkout: workout(), now: T0 };
    syncLiveActivity(input);
    syncLiveActivity(input);
    await flush();
    expect(n.upsert).toHaveBeenCalledTimes(1);
    const [id, name, json, stale] = n.upsert.mock.calls[0];
    expect(id).toBe('wk_1');
    expect(name).toBe('Push Day');
    expect(JSON.parse(json).exerciseName).toBe('Bench');
    expect(stale).toBe(0);
    syncLiveActivity(input, { force: true });
    await flush();
    expect(n.upsert).toHaveBeenCalledTimes(2);
    resetLiveActivityCache();
    syncLiveActivity(input);
    await flush();
    expect(n.upsert).toHaveBeenCalledTimes(3);
  });

  test('workout ending ends the activity once', async () => {
    const n = mockNative();
    __setNativeModuleForTests(n);
    syncLiveActivity({ activeWorkout: workout(), now: T0 });
    syncLiveActivity({ activeWorkout: null });
    syncLiveActivity({ activeWorkout: null });
    endLiveActivity();
    await flush();
    expect(n.endAll).toHaveBeenCalledTimes(1);
    endLiveActivity({ force: true });
    await flush();
    expect(n.endAll).toHaveBeenCalledTimes(2);
  });

  test('launch with no workout ends stale activities (forced first sync)', async () => {
    const n = mockNative();
    __setNativeModuleForTests(n);
    syncLiveActivity({ activeWorkout: null }, { force: true });
    await flush();
    expect(n.endAll).toHaveBeenCalledTimes(1);
  });

  test('disabled Live Activities: retries on the next sync instead of caching', async () => {
    const n = mockNative({ enabled: false });
    __setNativeModuleForTests(n);
    const input = { activeWorkout: workout(), now: T0 };
    syncLiveActivity(input);
    await flush();
    syncLiveActivity(input);
    await flush();
    expect(n.upsert).toHaveBeenCalledTimes(2);
  });

  test('native errors are swallowed and later calls still run', async () => {
    const n = mockNative();
    n.upsert.mockRejectedValueOnce(new Error('boom'));
    __setNativeModuleForTests(n);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    syncLiveActivity({ activeWorkout: workout(), now: T0 });
    await flush();
    syncLiveActivity({ activeWorkout: workout(), now: T0 + 1, lastSetCompletedAt: T0, restTargetSec: 60 });
    await flush();
    expect(n.upsert).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('lock-screen actions', () => {
  beforeEach(() => __setNativeModuleForTests(null));
  const act = (over = {}) => ({
    id: 'a1', type: 'start', workoutId: 'wk_1', exerciseId: 'ex_bench', exerciseIndex: 0, setIndex: 1, at: T0, ...over,
  });
  const ctx = (over = {}) => ({ activeWorkout: workout(), playingSet: null, lastSetCompletedAt: null, now: T0 + 1000, ...over });

  test('parse: dedupes by id, drops junk, sorts by time', () => {
    const raw = JSON.stringify([act({ id: 'b', at: 5 }), act({ id: 'a', at: 2 }), act({ id: 'a', at: 2 }), { id: 'x', type: 'nuke' }, null]);
    expect(parsePendingActions(raw).map((a) => a.id)).toEqual(['a', 'b']);
    // same ids delivered again (e.g. event + foreground both drain) are ignored
    expect(parsePendingActions(raw)).toEqual([]);
    expect(parsePendingActions('not json')).toEqual([]);
    expect(parsePendingActions(undefined)).toEqual([]);
  });

  test('consume: reads native queue, no-op without module', () => {
    expect(consumePendingActions()).toEqual([]);
    const n = { ...mockNative(), consumePendingActions: jest.fn(() => JSON.stringify([act({ id: 'c1' })])) };
    __setNativeModuleForTests(n);
    expect(consumePendingActions().map((a) => a.id)).toEqual(['c1']);
    n.consumePendingActions.mockImplementation(() => { throw new Error('boom'); });
    expect(consumePendingActions()).toEqual([]);
  });

  test('start the next set (also while resting)', () => {
    expect(planLiveAction(act(), ctx())).toEqual({ kind: 'start', exerciseIndex: 0, setIndex: 1 });
    expect(planLiveAction(act(), ctx({ lastSetCompletedAt: T0 }))).toEqual({ kind: 'start', exerciseIndex: 0, setIndex: 1 });
  });

  test('start: double tap / other set running / already completed are skipped', () => {
    const playing = { exerciseIndex: 0, setIndex: 1, startTime: T0 };
    expect(planLiveAction(act(), ctx({ playingSet: playing })).reason).toBe('already-started');
    expect(planLiveAction(act(), ctx({ playingSet: { exerciseIndex: 1, setIndex: 0 } })).reason).toBe('other-set-in-progress');
    expect(planLiveAction(act({ setIndex: 0 }), ctx()).reason).toBe('already-completed');
  });

  test('complete only the set in progress, with reps', () => {
    const playing = { exerciseIndex: 0, setIndex: 1, startTime: T0 };
    expect(planLiveAction(act({ type: 'complete' }), ctx({ playingSet: playing }))).toEqual({ kind: 'complete', exerciseIndex: 0, setIndex: 1 });
    expect(planLiveAction(act({ type: 'complete' }), ctx()).reason).toBe('not-in-progress');
    const noReps = workout();
    noReps.exercises[0].sets[1].reps = '';
    expect(planLiveAction(act({ type: 'complete' }), ctx({ activeWorkout: noReps, playingSet: playing })).reason).toBe('no-reps');
  });

  test('second complete tap after the set is done is a no-op', () => {
    const w = workout();
    w.exercises[0].sets[1].completedAt = T0 + 500;
    expect(planLiveAction(act({ type: 'complete' }), ctx({ activeWorkout: w, lastSetCompletedAt: T0 + 500 })).reason).toBe('already-completed');
  });

  test('targets by exercise id when the list was reordered', () => {
    const w = workout();
    w.exercises.reverse();
    expect(planLiveAction(act(), ctx({ activeWorkout: w }))).toEqual({ kind: 'start', exerciseIndex: 1, setIndex: 1 });
    expect(planLiveAction(act({ exerciseId: 'ex_gone' }), ctx()).reason).toBe('set-missing');
    expect(planLiveAction(act({ setIndex: 9 }), ctx()).reason).toBe('set-missing');
  });

  test('skip rest only while resting; cancel only the running set', () => {
    expect(planLiveAction(act({ type: 'skipRest' }), ctx({ lastSetCompletedAt: T0 }))).toEqual({ kind: 'skipRest' });
    expect(planLiveAction(act({ type: 'skipRest' }), ctx()).reason).toBe('not-resting');
    const playing = { exerciseIndex: 0, setIndex: 1, startTime: T0 };
    expect(planLiveAction(act({ type: 'cancelSet' }), ctx({ playingSet: playing })).kind).toBe('cancelSet');
    expect(planLiveAction(act({ type: 'cancelSet' }), ctx()).reason).toBe('not-in-progress');
  });

  test('stale: other/finished workout, expired, empty workout', () => {
    expect(planLiveAction(act(), ctx({ activeWorkout: null })).reason).toBe('no-workout');
    expect(planLiveAction(act({ workoutId: 'wk_old' }), ctx()).reason).toBe('other-workout');
    expect(planLiveAction(act(), ctx({ now: T0 + ACTION_MAX_AGE_MS + 1 })).reason).toBe('expired');
    expect(planLiveAction(act(), ctx({ activeWorkout: workout({ exercises: [] }) })).reason).toBe('set-missing');
  });
});
