import { miniWorkoutCopy } from '../utils/miniWorkout';

describe('miniWorkoutCopy', () => {
  test('uses the routine name and next incomplete set', () => {
    const copy = miniWorkoutCopy(
      {
        routineName: 'Push Day',
        exercises: [
          { name: 'Bench Press', sets: [{ completedAt: 1 }, { completedAt: null }] },
        ],
      },
      null
    );
    expect(copy.heading).toBe('Push Day');
    expect(copy.detail).toBe('Bench Press · Set 2');
  });

  test('prefers the playing set as current', () => {
    const copy = miniWorkoutCopy(
      {
        routineName: 'Pull',
        exercises: [
          { name: 'Row', sets: [{ completedAt: null }] },
          { name: 'Pull-Up', sets: [{ completedAt: null }] },
        ],
      },
      { exerciseIndex: 1, setIndex: 0 }
    );
    expect(copy.detail).toBe('Pull-Up · Set 1');
  });

  test('falls back when empty or finished', () => {
    expect(miniWorkoutCopy({ exercises: [] }, null).detail).toBe('Add an exercise');
    expect(
      miniWorkoutCopy(
        { exercises: [{ name: 'Squat', sets: [{ completedAt: 1 }] }] },
        null
      ).detail
    ).toBe('All sets logged');
  });
});
