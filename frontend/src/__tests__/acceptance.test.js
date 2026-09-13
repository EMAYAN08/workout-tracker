import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStore } from '../db/store';
import { buildBackup, parseBackup, normalizeWorkout } from '../db/schema';
import { convertWeight, calculateVolume, getPreviousPerformance } from '../utils/calculations';
import { searchCatalog } from '../data/catalog';
import { buildMockSnapshot } from '../data/mockData';
import { findNextIncompleteSet, formatRestClock } from '../notifications';

beforeEach(async () => {
  await localStore.resetForTests();
  AsyncStorage._reset();
  await localStore.init();
});

afterEach(async () => {
  await localStore.resetForTests();
  AsyncStorage._reset();
});

describe('UAT: create routine', () => {
  test('a user can create a named routine with catalog exercises', async () => {
    const bench = searchCatalog('barbell bench press')[0];
    const ohp = searchCatalog('overhead press')[0];
    expect(bench.name).toMatch(/Bench/);
    const saved = await localStore.upsertRoutine({
      id: 'rt_push',
      name: 'Push Day',
      exercises: [
        { ...bench, defaultSets: [{ reps: 8, weight: 135, type: 'Working' }] },
        { ...ohp, defaultSets: [{ reps: 8, weight: 95, type: 'Working' }] },
      ],
    });
    expect(saved.id).toBe('rt_push');
    expect(localStore.routines).toHaveLength(1);
    expect(localStore.routines[0].exercises).toHaveLength(2);
    expect(localStore.routines[0].exercises[0].defaultSets[0].weight).toBe(135);
  });
});

describe('UAT: add custom exercise', () => {
  test('a user can add a custom movement and attach it to a routine', async () => {
    const custom = await localStore.upsertCustomExercise({
      id: 'c_hex',
      name: 'Hex Bar Deadlift',
      muscleGroup: 'back',
      defaultSets: [{ reps: 5, weight: 225, type: 'Working' }],
      unitSaved: 'lbs',
    });
    expect(custom.name).toBe('Hex Bar Deadlift');
    const hits = searchCatalog('hex bar', localStore.customExercises);
    expect(hits[0].id).toBe('c_hex');

    await localStore.upsertRoutine({
      id: 'rt_pull',
      name: 'Pull',
      exercises: [custom],
    });
    expect(localStore.routines[0].exercises[0].id).toBe('c_hex');
  });

  test('deleting a custom exercise removes it from routines but not history', async () => {
    await localStore.upsertCustomExercise({ id: 'c_hex', name: 'Hex Bar Deadlift', muscleGroup: 'back' });
    await localStore.upsertRoutine({
      id: 'rt_pull',
      name: 'Pull',
      exercises: [{ id: 'c_hex', name: 'Hex Bar Deadlift', muscleGroup: 'back' }],
    });
    await localStore.upsertWorkout({
      id: 'wk1',
      timestamp: '2026-01-01T00:00:00.000Z',
      exercises: [{ id: 'c_hex', name: 'Hex Bar Deadlift', muscleGroup: 'back', sets: [{ weight: 225, reps: 5 }] }],
    });
    await localStore.deleteCustomExercise('c_hex');
    expect(localStore.customExercises).toEqual([]);
    expect(localStore.routines[0].exercises).toEqual([]);
    expect(localStore.workouts[0].exercises[0].id).toBe('c_hex');
  });
});

describe('UAT: save workout', () => {
  test('finishing a session persists a normalized workout with sets and duration', async () => {
    const saved = await localStore.upsertWorkout({
      id: 'wk_live',
      startTime: '2026-09-12T18:00:00.000Z',
      endTime: '2026-09-12T19:10:00.000Z',
      duration: 4200,
      unitSaved: 'lbs',
      routineId: 'rt_push',
      routineName: 'Push Day',
      exercises: [
        {
          id: 'ex_barbell_bench_press',
          name: 'Barbell Bench Press',
          muscleGroup: 'chest',
          sets: [
            { weight: 135, reps: 8, type: 'Working', completedAt: 1 },
            { weight: 155, reps: 6, type: 'Working', completedAt: 2 },
          ],
        },
      ],
    });
    expect(saved.timestamp).toBe('2026-09-12T18:00:00.000Z');
    expect(saved.duration).toBe(4200);
    expect(saved.exercises[0].sets).toHaveLength(2);
    expect(calculateVolume(saved.exercises[0].sets)).toBe(135 * 8 + 155 * 6);
    await localStore.flush();
    const disk = JSON.parse(await AsyncStorage.getItem('trackit_local_v1'));
    expect(disk.workouts[0].id).toBe('wk_live');
  });

  test('previous performance reads the saved session as last + PR', async () => {
    await localStore.upsertWorkout({
      id: 'wk_old',
      timestamp: '2026-08-01T00:00:00.000Z',
      unitSaved: 'lbs',
      exercises: [{ id: 'ex_squat', sets: [{ weight: 225, reps: 5 }] }],
    });
    await localStore.upsertWorkout({
      id: 'wk_new',
      timestamp: '2026-09-01T00:00:00.000Z',
      unitSaved: 'lbs',
      exercises: [{ id: 'ex_squat', sets: [{ weight: 185, reps: 5 }] }],
    });
    const perf = getPreviousPerformance('ex_squat', localStore.workouts, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(185);
    expect(perf.allTimePR).toBe(225);
  });
});

describe('UAT: export / import merge and replace', () => {
  async function seedPhone() {
    await localStore.upsertWorkout({
      id: 'phone_w',
      timestamp: '2026-01-01T00:00:00.000Z',
      routineName: 'Phone only',
      exercises: [],
    });
    await localStore.upsertRoutine({ id: 'phone_r', name: 'Phone Push', exercises: [] });
    await localStore.upsertCustomExercise({ id: 'phone_c', name: 'Phone Curl', muscleGroup: 'arms' });
  }

  const incoming = {
    workouts: [
      { id: 'phone_w', timestamp: '2026-01-01T00:00:00.000Z', routineName: 'Overwritten', exercises: [] },
      { id: 'backup_w', timestamp: '2026-02-01T00:00:00.000Z', routineName: 'Imported', exercises: [] },
    ],
    routines: [{ id: 'backup_r', name: 'Imported Pull', exercises: [] }],
    customExercises: [{ id: 'backup_c', name: 'Imported Raise', muscleGroup: 'shoulders' }],
    unit: 'kgs',
    restTargetSec: 75,
  };

  test('export builds a TrackIt envelope that parseBackup understands', async () => {
    await seedPhone();
    const file = buildBackup({
      workouts: localStore.workouts,
      routines: localStore.routines,
      customExercises: localStore.customExercises,
      unit: 'lbs',
      restTargetSec: 90,
    });
    expect(file.app).toBe('trackit');
    expect(file.version).toBe(1);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.workouts[0].id).toBe('phone_w');
    expect(parsed.unit).toBe('lbs');
  });

  test('import merge keeps unmatched phone rows and overwrites matching ids', async () => {
    await seedPhone();
    const parsed = parseBackup(buildBackup(incoming));
    await localStore.mergeAll(parsed);
    const workoutIds = localStore.workouts.map((w) => w.id).sort();
    expect(workoutIds).toEqual(['backup_w', 'phone_w']);
    expect(localStore.workouts.find((w) => w.id === 'phone_w').routineName).toBe('Overwritten');
    expect(localStore.routines.map((r) => r.id).sort()).toEqual(['backup_r', 'phone_r']);
    expect(localStore.customExercises.map((e) => e.id).sort()).toEqual(['backup_c', 'phone_c']);
  });

  test('import replace wipes the phone first', async () => {
    await seedPhone();
    const parsed = parseBackup(buildBackup(incoming));
    await localStore.replaceAll(parsed);
    expect(localStore.workouts.map((w) => w.id).sort()).toEqual(['backup_w', 'phone_w']);
    expect(localStore.routines.map((r) => r.id)).toEqual(['backup_r']);
    expect(localStore.customExercises.map((e) => e.id)).toEqual(['backup_c']);
    expect(localStore.routines.find((r) => r.id === 'phone_r')).toBeUndefined();
  });
});

describe('UAT: wipe all data', () => {
  test('replaceAll empty deletes workouts, routines, and custom exercises', async () => {
    await localStore.upsertWorkout({ id: 'w', timestamp: '2026-01-01T00:00:00.000Z' });
    await localStore.upsertRoutine({ id: 'r', name: 'Push' });
    await localStore.upsertCustomExercise({ id: 'c', name: 'Hex', muscleGroup: 'back' });
    await localStore.replaceAll({ workouts: [], routines: [], customExercises: [] });
    expect(localStore.workouts).toEqual([]);
    expect(localStore.routines).toEqual([]);
    expect(localStore.customExercises).toEqual([]);
    const disk = JSON.parse(await AsyncStorage.getItem('trackit_local_v1'));
    expect(disk.workouts).toEqual([]);
  });
});

describe('UAT: unit conversion', () => {
  test('toggling lbs → kgs converts displayed working weights', () => {
    const lbs = 135;
    const kgs = convertWeight(lbs, 'lbs', 'kgs');
    expect(kgs).toBe(61.23);
    expect(convertWeight(kgs, 'kgs', 'lbs')).toBe(135);
  });

  test('a kgs-saved workout still reports PR in the current lbs unit', async () => {
    await localStore.upsertWorkout({
      id: 'wk_kgs',
      timestamp: '2026-01-01T00:00:00.000Z',
      unitSaved: 'kgs',
      exercises: [{ id: 'ex_squat', sets: [{ weight: 100, reps: 1 }] }],
    });
    const perf = getPreviousPerformance('ex_squat', localStore.workouts, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(convertWeight(100, 'kgs', 'lbs'));
    expect(perf.allTimePR).toBe(220.5);
  });
});

describe('UAT: rest-day workout with empty exercises', () => {
  test('a rest day can be saved and reloaded with zero volume', async () => {
    const rest = await localStore.upsertWorkout({
      id: 'wk_rest',
      timestamp: '2026-09-06T00:00:00.000Z',
      duration: 0,
      routineName: 'Rest Day',
      unitSaved: 'lbs',
      exercises: [],
    });
    expect(rest.exercises).toEqual([]);
    expect(rest.duration).toBe(0);
    expect(calculateVolume(rest.exercises)).toBe(0);
    expect(findNextIncompleteSet(rest)).toBeNull();

    const parsed = parseBackup([rest]);
    expect(parsed.workouts[0].routineName).toBe('Rest Day');
    expect(parsed.workouts[0].exercises).toEqual([]);
  });

  test('normalizeWorkout keeps empty exercise lists', () => {
    const w = normalizeWorkout({
      id: 'wk_rest',
      timestamp: '2026-09-06T00:00:00.000Z',
      duration: 0,
      routineName: 'Rest Day',
      exercises: [],
    });
    expect(w.exercises).toEqual([]);
  });
});

describe('UAT: mock snapshot shape', () => {
  test('demo snapshot is a full training log the UI can render', () => {
    const snap = buildMockSnapshot('lbs');
    expect(snap.workouts.length).toBeGreaterThan(0);
    expect(snap.routines.length).toBe(3);
    expect(snap.customExercises.length).toBe(3);
    expect(snap.routines.every((r) => Array.isArray(r.exercises))).toBe(true);
    expect(snap.workouts.every((w) => typeof w.timestamp === 'string')).toBe(true);
    expect(snap.workouts.every((w) => Array.isArray(w.exercises))).toBe(true);
    expect(snap.customExercises.every((e) => e.unitSaved === 'lbs')).toBe(true);
  });

  test('active-workout helpers still work against a mock session', () => {
    const snap = buildMockSnapshot('lbs');
    const session = snap.workouts.find((w) => w.exercises.length > 0);
    const incomplete = {
      ...session,
      exercises: session.exercises.map((ex, i) => ({
        ...ex,
        sets: ex.sets.map((s, si) => ({ ...s, completedAt: i === 0 && si === 0 ? null : s.completedAt })),
      })),
    };
    const next = findNextIncompleteSet(incomplete);
    expect(next.setLabel).toBe('Set 1');
    expect(formatRestClock(90)).toBe('1:30');
  });
});
