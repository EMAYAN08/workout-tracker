import {
  buildLiveActivityPayload,
  syncLiveActivity,
  endLiveActivity,
  resetLiveActivityCache,
  msUntilRestEnd,
  isLiveActivitySupported,
  MAX_WORKOUT_AGE_MS,
  __setNativeModuleForTests,
} from '../liveActivity';

const T0 = 1_700_000_000_000;
const workout = (over = {}) => ({
  id: 'wk_1',
  startTime: T0,
  routineName: 'Push Day',
  exercises: [
    { name: 'Bench', sets: [{ weight: '100', reps: '8', completedAt: T0 + 1 }, { weight: '100', reps: '8', completedAt: null }] },
    { name: 'Fly', sets: [{ weight: '', reps: '12', completedAt: null }] },
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
    expect(p.state.nextSet).toBe('Next: Set 2 · 100 kgs × 8');
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
    expect(p.state.nextSet).toBe('Set 1 in progress · 12 reps');
  });

  test('empty and finished workouts', () => {
    expect(buildLiveActivityPayload({ activeWorkout: workout({ exercises: [] }), now: T0 }).state.exerciseName).toBe('No exercises yet');
    const done = workout({ exercises: [{ name: 'Row', sets: [{ completedAt: 1 }] }], routineName: undefined });
    const p = buildLiveActivityPayload({ activeWorkout: done, now: T0 });
    expect(p.state.nextSet).toBe('All sets done');
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
