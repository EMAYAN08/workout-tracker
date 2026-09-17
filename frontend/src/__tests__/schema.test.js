import { normalizeWorkout, normalizeRoutine, normalizeCustomExercise, parseBackup, buildBackup } from '../db/schema';

describe('normalizeWorkout', () => {
  test('fills defaults for an empty payload', () => {
    const w = normalizeWorkout({});
    expect(w.id).toMatch(/^wk_/);
    expect(typeof w.timestamp).toBe('string');
    expect(w.endTime).toBeNull();
    expect(w.duration).toBe(0);
    expect(w.unitSaved).toBe('lbs');
    expect(w.routineId).toBeNull();
    expect(w.routineName).toBeNull();
    expect(w.exercises).toEqual([]);
  });

  test('reads Mongo $oid / $date and mongoose _id', () => {
    const w = normalizeWorkout({
      _id: { $oid: '507f1f77bcf86cd799439011' },
      timestamp: { $date: '2024-06-01T10:00:00.000Z' },
      endTime: { $date: '2024-06-01T11:00:00.000Z' },
      durationSeconds: 3600,
      unitSaved: 'kgs',
      exercises: [
        {
          _id: { $oid: 'exoid' },
          name: 'Bench',
          bodyPart: 'Chest',
          sets: [{ reps: '8', weight: '60', type: 'Working' }],
        },
      ],
    });
    expect(w.id).toBe('507f1f77bcf86cd799439011');
    expect(w.timestamp).toBe('2024-06-01T10:00:00.000Z');
    expect(w.endTime).toBe('2024-06-01T11:00:00.000Z');
    expect(w.duration).toBe(3600);
    expect(w.unitSaved).toBe('kgs');
    expect(w.exercises[0].id).toBe('exoid');
    expect(w.exercises[0].muscleGroup).toBe('chest');
    expect(w.exercises[0].sets[0]).toMatchObject({ reps: 8, weight: 60, type: 'Working', restTimeTaken: 0, completedAt: null });
  });

  test('timestamp falls back through startTime / createdAt / date', () => {
    expect(normalizeWorkout({ startTime: '2024-01-02T00:00:00.000Z' }).timestamp).toBe('2024-01-02T00:00:00.000Z');
    expect(normalizeWorkout({ createdAt: '2024-01-03T00:00:00.000Z' }).timestamp).toBe('2024-01-03T00:00:00.000Z');
    expect(normalizeWorkout({ date: 0 }).timestamp).toBe(new Date(0).toISOString());
  });

  test('numeric ids become strings; invalid unit becomes lbs', () => {
    const w = normalizeWorkout({ id: 42, unitSaved: 'stone' });
    expect(w.id).toBe('42');
    expect(w.unitSaved).toBe('lbs');
  });

  test('Date objects and numeric epoch become ISO', () => {
    const d = new Date('2024-05-01T00:00:00.000Z');
    expect(normalizeWorkout({ timestamp: d }).timestamp).toBe(d.toISOString());
    expect(normalizeWorkout({ timestamp: d.getTime() }).timestamp).toBe(d.toISOString());
  });

  test('invalid timestamp falls back to now', () => {
    const before = Date.now();
    const w = normalizeWorkout({ timestamp: 'not-a-date' });
    const after = Date.now();
    const t = new Date(w.timestamp).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after + 5);
  });
});

describe('normalizeRoutine / normalizeCustomExercise', () => {
  test('routine defaults and defaultSets', () => {
    const r = normalizeRoutine({});
    expect(r.id).toMatch(/^rt_/);
    expect(r.name).toBe('Routine');
    expect(r.exercises).toEqual([]);
  });

  test('routine exercises get defaultSets when missing', () => {
    const r = normalizeRoutine({
      id: 'rt1',
      name: 'Push',
      exercises: [{ id: 'ex1', name: 'Bench', muscleGroup: 'Chest' }],
    });
    expect(r.exercises[0].muscleGroup).toBe('chest');
    expect(r.exercises[0].defaultSets).toEqual([{ reps: 10, weight: 0, type: 'Working' }]);
    expect(r.exercises[0].sets).toBeUndefined();
  });

  test('custom exercise reuses exercise normalizer', () => {
    const ex = normalizeCustomExercise({
      id: 'c1',
      name: 'Hex Bar Deadlift',
      muscleGroup: 'back',
      defaultSets: [{ reps: 5, weight: 185, type: 'Working' }],
      unitSaved: 'kgs',
    });
    expect(ex).toMatchObject({
      id: 'c1',
      name: 'Hex Bar Deadlift',
      muscleGroup: 'back',
      unitSaved: 'kgs',
    });
    expect(ex.defaultSets[0].weight).toBe(185);
  });

  test('missing name becomes Exercise', () => {
    expect(normalizeCustomExercise({}).name).toBe('Exercise');
  });
});

describe('parseBackup', () => {
  test('parses a TrackHit envelope (object and JSON string)', () => {
    const envelope = {
      version: 1,
      app: 'trackit',
      unit: 'kgs',
      restTargetSec: 120,
      workouts: [{ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', exercises: [] }],
      routines: [{ id: 'r1', name: 'Push', exercises: [] }],
      customExercises: [{ id: 'c1', name: 'Hex', muscleGroup: 'back' }],
    };
    const parsed = parseBackup(envelope);
    expect(parsed.workouts[0].id).toBe('w1');
    expect(parsed.routines[0].name).toBe('Push');
    expect(parsed.customExercises[0].name).toBe('Hex');
    expect(parsed.unit).toBe('kgs');
    expect(parsed.restTargetSec).toBe(120);

    const fromString = parseBackup(JSON.stringify(envelope));
    expect(fromString.workouts[0].id).toBe('w1');
    expect(fromString.unit).toBe('kgs');
  });

  test('accepts alternate keys including Mongo customexercises', () => {
    const parsed = parseBackup({
      Workouts: [{ id: 'w2', timestamp: '2024-02-01T00:00:00.000Z' }],
      Routines: [{ id: 'r2', name: 'Pull' }],
      customexercises: [{ id: 'c2', name: 'Cable raise' }],
    });
    expect(parsed.workouts[0].id).toBe('w2');
    expect(parsed.routines[0].id).toBe('r2');
    expect(parsed.customExercises[0].id).toBe('c2');
  });

  test('reads mongoose { documents } collections', () => {
    const parsed = parseBackup({
      workouts: {
        documents: [
          {
            _id: { $oid: 'wkoid' },
            timestamp: { $date: '2024-03-01T00:00:00.000Z' },
            exercises: [],
          },
        ],
      },
      routines: { documents: [{ _id: { $oid: 'rtoid' }, name: 'Legs', exercises: [] }] },
      customExercises: { docs: [{ _id: { $oid: 'cxoid' }, name: 'Sled', muscleGroup: 'other' }] },
    });
    expect(parsed.workouts[0].id).toBe('wkoid');
    expect(parsed.workouts[0].timestamp).toBe('2024-03-01T00:00:00.000Z');
    expect(parsed.routines[0].id).toBe('rtoid');
    expect(parsed.customExercises[0].id).toBe('cxoid');
  });

  test('raw workout array (timestamp / duration)', () => {
    const parsed = parseBackup([
      { id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', exercises: [] },
      { id: 'w2', duration: 0, exercises: [], routineName: 'Rest Day' },
    ]);
    expect(parsed.workouts).toHaveLength(2);
    expect(parsed.routines).toEqual([]);
    expect(parsed.customExercises).toEqual([]);
    expect(parsed.workouts[1].routineName).toBe('Rest Day');
  });

  test('raw routines array (name + exercises, no timestamp)', () => {
    const parsed = parseBackup([
      { id: 'r1', name: 'Push Day', exercises: [{ name: 'Bench' }] },
    ]);
    expect(parsed.routines).toHaveLength(1);
    expect(parsed.workouts).toEqual([]);
    expect(parsed.customExercises).toEqual([]);
    expect(parsed.routines[0].exercises[0].name).toBe('Bench');
  });

  test('raw custom-exercise array fallback', () => {
    const parsed = parseBackup([{ id: 'c1', name: 'Hex Bar', muscleGroup: 'back' }]);
    expect(parsed.customExercises).toHaveLength(1);
    expect(parsed.customExercises[0].name).toBe('Hex Bar');
    expect(parsed.workouts).toEqual([]);
    expect(parsed.routines).toEqual([]);
  });

  test('empty object yields empty collections', () => {
    const parsed = parseBackup({});
    expect(parsed.workouts).toEqual([]);
    expect(parsed.routines).toEqual([]);
    expect(parsed.customExercises).toEqual([]);
    expect(parsed.unit).toBeUndefined();
    expect(parsed.restTargetSec).toBeUndefined();
  });

  test('invalid unit is dropped; non-finite rest is dropped', () => {
    const parsed = parseBackup({ unit: 'stone', restTargetSec: 'nope', workouts: [] });
    expect(parsed.unit).toBeUndefined();
    expect(parsed.restTargetSec).toBeUndefined();
  });

  test('workoutHistory alias', () => {
    const parsed = parseBackup({
      workoutHistory: [{ id: 'wh1', timestamp: '2024-04-01T00:00:00.000Z', exercises: [] }],
    });
    expect(parsed.workouts[0].id).toBe('wh1');
  });
});

describe('buildBackup', () => {
  test('wraps a TrackHit envelope with defaults', () => {
    const before = Date.now();
    const backup = buildBackup({
      workouts: [{ id: 'w' }],
      routines: [{ id: 'r' }],
      customExercises: [{ id: 'c' }],
    });
    expect(backup.version).toBe(1);
    expect(backup.app).toBe('trackit');
    expect(backup.unit).toBe('lbs');
    expect(backup.restTargetSec).toBe(90);
    expect(backup.workouts).toEqual([{ id: 'w' }]);
    expect(backup.routines).toEqual([{ id: 'r' }]);
    expect(backup.customExercises).toEqual([{ id: 'c' }]);
    const exported = new Date(backup.exportedAt).getTime();
    expect(exported).toBeGreaterThanOrEqual(before);
  });

  test('passes through unit and restTargetSec', () => {
    const backup = buildBackup({
      workouts: [],
      routines: [],
      customExercises: [],
      unit: 'kgs',
      restTargetSec: 150,
    });
    expect(backup.unit).toBe('kgs');
    expect(backup.restTargetSec).toBe(150);
  });

  test('restTargetSec of 0 collapses to 90 (documented falsy default)', () => {
    const backup = buildBackup({
      workouts: [],
      routines: [],
      customExercises: [],
      restTargetSec: 0,
    });
    expect(backup.restTargetSec).toBe(90);
  });

  test('round-trips through parseBackup', () => {
    const original = buildBackup({
      workouts: [{ id: 'w1', timestamp: '2024-01-01T00:00:00.000Z', exercises: [] }],
      routines: [{ id: 'r1', name: 'Push', exercises: [] }],
      customExercises: [{ id: 'c1', name: 'Hex', muscleGroup: 'back' }],
      unit: 'kgs',
      restTargetSec: 75,
    });
    const parsed = parseBackup(JSON.stringify(original));
    expect(parsed.workouts[0].id).toBe('w1');
    expect(parsed.routines[0].id).toBe('r1');
    expect(parsed.customExercises[0].id).toBe('c1');
    expect(parsed.unit).toBe('kgs');
    expect(parsed.restTargetSec).toBe(75);
  });
});
