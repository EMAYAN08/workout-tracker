import { detectPersonalRecord } from '../utils/pr';

const squat = (weight, reps, extra = {}) => ({
  weight,
  reps,
  completedAt: extra.completedAt ?? null,
});

const exercise = (sets) => ({
  id: 'ex_squat',
  name: 'Barbell Back Squat',
  sets,
});

describe('detectPersonalRecord', () => {
  test('returns null for empty or zero load', () => {
    expect(
      detectPersonalRecord({
        exercise: exercise([squat(0, 5)]),
        set: squat(0, 5),
        setIndex: 0,
        history: [],
        currentExercises: [],
      })
    ).toBeNull();
    expect(
      detectPersonalRecord({
        exercise: exercise([squat(135, 0)]),
        set: squat(135, 0),
        setIndex: 0,
        history: [],
      })
    ).toBeNull();
  });

  test('first completed set is a weight and e1RM PR', () => {
    const set = squat(135, 5);
    const pr = detectPersonalRecord({
      exercise: exercise([set]),
      set,
      setIndex: 0,
      history: [],
      currentExercises: [exercise([set])],
      unit: 'lbs',
    });
    expect(pr.weightPr).toBe(true);
    expect(pr.rmPr).toBe(true);
    expect(pr.weight).toBe(135);
    expect(pr.name).toBe('Barbell Back Squat');
  });

  test('does not fire when at or below history PR', () => {
    const history = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        unitSaved: 'lbs',
        exercises: [{ id: 'ex_squat', sets: [squat(225, 3, { completedAt: 1 })] }],
      },
    ];
    const set = squat(185, 5);
    expect(
      detectPersonalRecord({
        exercise: exercise([set]),
        set,
        setIndex: 0,
        history,
        currentExercises: [exercise([set])],
      })
    ).toBeNull();
  });

  test('fires weight PR when heaviest all-time is beaten', () => {
    const history = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        unitSaved: 'lbs',
        exercises: [{ id: 'ex_squat', sets: [squat(185, 5, { completedAt: 1 })] }],
      },
    ];
    const set = squat(205, 3);
    const pr = detectPersonalRecord({
      exercise: exercise([set]),
      set,
      setIndex: 0,
      history,
      currentExercises: [exercise([set])],
    });
    expect(pr.weightPr).toBe(true);
    expect(pr.weight).toBe(205);
  });

  test('same weight more reps can be an e1RM PR only', () => {
    const history = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        unitSaved: 'lbs',
        exercises: [{ id: 'ex_squat', sets: [squat(185, 3, { completedAt: 1 })] }],
      },
    ];
    const set = squat(185, 8);
    const pr = detectPersonalRecord({
      exercise: exercise([set]),
      set,
      setIndex: 0,
      history,
      currentExercises: [exercise([set])],
    });
    expect(pr).not.toBeNull();
    expect(pr.weightPr).toBe(false);
    expect(pr.rmPr).toBe(true);
  });

  test('uses already-completed sets in the current session', () => {
    const sets = [squat(185, 5, { completedAt: 1 }), squat(225, 3)];
    const ex = exercise(sets);
    const pr = detectPersonalRecord({
      exercise: ex,
      set: sets[1],
      setIndex: 1,
      history: [],
      currentExercises: [ex],
    });
    expect(pr.weightPr).toBe(true);
    expect(pr.weight).toBe(225);
  });
});
