import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStore } from '../db/store';

const KEY = 'trackit_local_v1';

beforeEach(async () => {
  await localStore.resetForTests();
  AsyncStorage._reset();
});

afterEach(async () => {
  await localStore.resetForTests();
  AsyncStorage._reset();
});

describe('localStore.init', () => {
  test('starts empty when storage is blank', async () => {
    await localStore.init();
    expect(localStore.ready).toBe(true);
    expect(localStore.workouts).toEqual([]);
    expect(localStore.routines).toEqual([]);
    expect(localStore.customExercises).toEqual([]);
  });

  test('loads persisted collections and sorts workouts newest first', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        workouts: [
          { id: 'old', timestamp: '2024-01-01T00:00:00.000Z', exercises: [] },
          { id: 'new', timestamp: '2024-06-01T00:00:00.000Z', exercises: [] },
        ],
        routines: [{ id: 'r1', name: 'Push', exercises: [] }],
        customExercises: [{ id: 'c1', name: 'Hex', muscleGroup: 'back' }],
      })
    );
    await localStore.init();
    expect(localStore.workouts.map((w) => w.id)).toEqual(['new', 'old']);
    expect(localStore.routines[0].id).toBe('r1');
    expect(localStore.customExercises[0].id).toBe('c1');
  });

  test('invalid JSON does not throw and leaves collections empty', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    await localStore.init();
    expect(localStore.ready).toBe(true);
    expect(localStore.workouts).toEqual([]);
  });

  test('is idempotent while ready', async () => {
    await localStore.init();
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.init();
    expect(localStore.workouts).toHaveLength(1);
  });

  test('resetForTests allows a fresh init from storage', async () => {
    await localStore.init();
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.flush();
    await localStore.resetForTests();
    expect(localStore.ready).toBe(false);
    expect(localStore.workouts).toEqual([]);
    await localStore.init();
    expect(localStore.workouts[0].id).toBe('w1');
  });
});

describe('upsert / delete workouts', () => {
  beforeEach(async () => {
    await localStore.init();
  });

  test('inserts, normalizes, and sorts by timestamp', async () => {
    await localStore.upsertWorkout({ id: 'old', timestamp: '2024-01-01T00:00:00.000Z', exercises: [] });
    await localStore.upsertWorkout({ id: 'new', timestamp: '2024-06-01T00:00:00.000Z', exercises: [] });
    expect(localStore.workouts.map((w) => w.id)).toEqual(['new', 'old']);
    expect(localStore.workouts[0].unitSaved).toBe('lbs');
  });

  test('updates an existing id in place', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', routineName: 'A' });
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', routineName: 'B' });
    expect(localStore.workouts).toHaveLength(1);
    expect(localStore.workouts[0].routineName).toBe('B');
  });

  test('deleteWorkout removes by id and ignores empty id', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.deleteWorkout(undefined);
    expect(localStore.workouts).toHaveLength(1);
    await localStore.deleteWorkout('w1');
    expect(localStore.workouts).toEqual([]);
  });
});

describe('routines', () => {
  beforeEach(async () => {
    await localStore.init();
  });

  test('upsert inserts then updates', async () => {
    await localStore.upsertRoutine({ id: 'r1', name: 'Push' });
    await localStore.upsertRoutine({ id: 'r2', name: 'Pull' });
    await localStore.upsertRoutine({ id: 'r1', name: 'Push Heavy' });
    expect(localStore.routines.map((r) => r.name)).toEqual(['Push Heavy', 'Pull']);
  });

  test('deleteRoutine removes by id', async () => {
    await localStore.upsertRoutine({ id: 'r1', name: 'Push' });
    await localStore.deleteRoutine('r1');
    expect(localStore.routines).toEqual([]);
  });
});

describe('custom exercises', () => {
  beforeEach(async () => {
    await localStore.init();
  });

  test('upsert inserts then updates', async () => {
    await localStore.upsertCustomExercise({ id: 'c1', name: 'Hex', muscleGroup: 'back' });
    await localStore.upsertCustomExercise({ id: 'c1', name: 'Hex Bar', muscleGroup: 'back' });
    expect(localStore.customExercises).toHaveLength(1);
    expect(localStore.customExercises[0].name).toBe('Hex Bar');
  });

  test('deleteCustomExercise removes the exercise AND strips it from routines', async () => {
    await localStore.upsertCustomExercise({ id: 'c1', name: 'Hex', muscleGroup: 'back' });
    await localStore.upsertRoutine({
      id: 'r1',
      name: 'Pull',
      exercises: [
        { id: 'c1', name: 'Hex', muscleGroup: 'back' },
        { id: 'ex_row', name: 'Barbell Row', muscleGroup: 'back' },
      ],
    });
    await localStore.upsertRoutine({
      id: 'r2',
      name: 'Full',
      exercises: [{ id: 'c1', name: 'Hex', muscleGroup: 'back' }],
    });
    await localStore.deleteCustomExercise('c1');
    expect(localStore.customExercises).toEqual([]);
    expect(localStore.routines.find((r) => r.id === 'r1').exercises.map((e) => e.id)).toEqual(['ex_row']);
    expect(localStore.routines.find((r) => r.id === 'r2').exercises).toEqual([]);
  });
});

describe('replaceAll / mergeAll / persist', () => {
  beforeEach(async () => {
    await localStore.init();
  });

  test('replaceAll overwrites every collection and flushes', async () => {
    await localStore.upsertWorkout({ id: 'keep-me', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.replaceAll({
      workouts: [{ id: 'w2', timestamp: '2024-02-01T00:00:00.000Z', exercises: [] }],
      routines: [{ id: 'r2', name: 'New', exercises: [] }],
      customExercises: [{ id: 'c2', name: 'Sled', muscleGroup: 'other' }],
    });
    expect(localStore.workouts.map((w) => w.id)).toEqual(['w2']);
    expect(localStore.routines[0].id).toBe('r2');
    expect(localStore.customExercises[0].id).toBe('c2');
    const raw = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(raw.workouts[0].id).toBe('w2');
  });

  test('replaceAll with missing keys empties those collections', async () => {
    await localStore.upsertRoutine({ id: 'r1', name: 'Push' });
    await localStore.replaceAll({});
    expect(localStore.workouts).toEqual([]);
    expect(localStore.routines).toEqual([]);
    expect(localStore.customExercises).toEqual([]);
  });

  test('clearAll wipes memory and disk even if a persist is pending', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.upsertRoutine({ id: 'r1', name: 'Push' });
    await localStore.upsertCustomExercise({ id: 'c1', name: 'Hex', muscleGroup: 'back' });
    const wipe = localStore.clearAll();
    await wipe;
    await new Promise((r) => setTimeout(r, 80));
    expect(localStore.workouts).toEqual([]);
    expect(localStore.routines).toEqual([]);
    expect(localStore.customExercises).toEqual([]);
    const disk = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(disk.workouts).toEqual([]);
    expect(disk.routines).toEqual([]);
    expect(disk.customExercises).toEqual([]);
  });

  test('a later flush cannot resurrect rows after clearAll', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.flush();
    await localStore.upsertWorkout({ id: 'w2', timestamp: '2024-02-01T00:00:00.000Z' });
    await localStore.clearAll();
    await localStore.flush();
    const disk = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(disk.workouts).toEqual([]);
  });

  test('mergeAll upserts by id and keeps unmatched rows', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', routineName: 'A' });
    await localStore.upsertRoutine({ id: 'r1', name: 'Push' });
    await localStore.mergeAll({
      workouts: [{ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', routineName: 'A+' }, { id: 'w2', timestamp: '2024-02-01T00:00:00.000Z' }],
      routines: [{ id: 'r2', name: 'Pull' }],
      customExercises: [{ id: 'c1', name: 'Hex', muscleGroup: 'back' }],
    });
    expect(localStore.workouts.map((w) => w.id).sort()).toEqual(['w1', 'w2']);
    expect(localStore.workouts.find((w) => w.id === 'w1').routineName).toBe('A+');
    expect(localStore.routines.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    expect(localStore.customExercises[0].id).toBe('c1');
  });

  test('flush writes current memory to AsyncStorage', async () => {
    await localStore.upsertWorkout({ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z' });
    await localStore.flush();
    const dumped = AsyncStorage._dump();
    expect(JSON.parse(dumped[KEY]).workouts[0].id).toBe('w1');
  });
});
