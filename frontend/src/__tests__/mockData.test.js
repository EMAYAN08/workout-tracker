import { buildMockSnapshot } from '../data/mockData';

describe('buildMockSnapshot', () => {
  test('returns workouts, routines, and customExercises', () => {
    const snap = buildMockSnapshot();
    expect(Array.isArray(snap.workouts)).toBe(true);
    expect(Array.isArray(snap.routines)).toBe(true);
    expect(Array.isArray(snap.customExercises)).toBe(true);
    expect(snap.workouts.length).toBeGreaterThan(10);
    expect(snap.routines).toHaveLength(3);
    expect(snap.customExercises).toHaveLength(3);
  });

  test('routines are Push / Pull / Leg templates with exercises', () => {
    const snap = buildMockSnapshot('lbs');
    expect(snap.routines.map((r) => r.name)).toEqual(['Push Day', 'Pull Day', 'Leg Day']);
    for (const r of snap.routines) {
      expect(r.id).toMatch(/^mock_r_/);
      expect(r.exercises.length).toBeGreaterThan(0);
      for (const ex of r.exercises) {
        expect(ex.unitSaved).toBe('lbs');
        expect(ex.defaultSets.length).toBe(3);
        expect(ex.defaultSets.every((s) => !s.completedAt)).toBe(true);
      }
    }
  });

  test('custom exercises have defaultSets and ids', () => {
    const snap = buildMockSnapshot();
    expect(snap.customExercises.map((e) => e.id).sort()).toEqual(['mock_c_cable', 'mock_c_hex', 'mock_c_split']);
    for (const ex of snap.customExercises) {
      expect(ex.defaultSets.length).toBe(3);
      expect(ex.name).toBeTruthy();
      expect(ex.muscleGroup).toBeTruthy();
    }
  });

  test('workout rows have the expected shape', () => {
    const snap = buildMockSnapshot('lbs');
    const working = snap.workouts.find((w) => w.exercises.length > 0);
    expect(working).toMatchObject({
      id: expect.stringMatching(/^mock_w_/),
      timestamp: expect.any(String),
      duration: expect.any(Number),
      unitSaved: 'lbs',
      routineName: expect.any(String),
    });
    expect(working.exercises[0].sets.length).toBe(3);
    expect(working.exercises[0].sets[0]).toEqual(
      expect.objectContaining({
        reps: expect.any(Number),
        weight: expect.any(Number),
        type: 'Working',
        completedAt: expect.any(Number),
      })
    );
  });

  test('kgs unit changes saved weights and unitSaved', () => {
    const lbs = buildMockSnapshot('lbs');
    const kgs = buildMockSnapshot('kgs');
    expect(kgs.workouts[0].unitSaved).toBe('kgs');
    expect(kgs.customExercises[0].unitSaved).toBe('kgs');
    const lbsW = lbs.workouts.find((w) => w.exercises[0]?.sets[0]?.weight);
    const kgsW = kgs.workouts.find((w) => w.exercises[0]?.sets[0]?.weight);
    expect(lbsW.exercises[0].sets[0].weight).toBeGreaterThan(kgsW.exercises[0].sets[0].weight);
  });

  test('rest-day workouts have empty exercises when generated on a Sunday', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-13T15:00:00.000Z')); // Sunday
    const snap = buildMockSnapshot();
    const rest = snap.workouts.filter((w) => w.routineName === 'Rest Day');
    expect(rest.length).toBeGreaterThan(0);
    for (const w of rest) {
      expect(w.exercises).toEqual([]);
      expect(w.duration).toBe(0);
      expect(w.id).toMatch(/^mock_w_rest_/);
    }
    jest.useRealTimers();
  });

  test('rest-day branch never fires on a Saturday (documented weekday bug)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-12T15:00:00.000Z')); // Saturday
    const snap = buildMockSnapshot();
    expect(snap.workouts.filter((w) => w.routineName === 'Rest Day')).toHaveLength(0);
    jest.useRealTimers();
  });

  test('defaults unit to lbs', () => {
    const snap = buildMockSnapshot();
    expect(snap.customExercises[0].unitSaved).toBe('lbs');
  });
});
