import { formatRestClock, findNextIncompleteSet } from '../notifications';

describe('formatRestClock', () => {
  test('formats mm:ss with zero-padded seconds', () => {
    expect(formatRestClock(0)).toBe('0:00');
    expect(formatRestClock(5)).toBe('0:05');
    expect(formatRestClock(59)).toBe('0:59');
    expect(formatRestClock(60)).toBe('1:00');
    expect(formatRestClock(90)).toBe('1:30');
    expect(formatRestClock(600)).toBe('10:00');
    expect(formatRestClock(3723)).toBe('62:03');
  });

  test('floors fractional seconds', () => {
    expect(formatRestClock(90.9)).toBe('1:30');
    expect(formatRestClock(1.2)).toBe('0:01');
  });

  test('clamps negatives to 0:00', () => {
    expect(formatRestClock(-1)).toBe('0:00');
    expect(formatRestClock(-90)).toBe('0:00');
  });

  test('invalid values become 0:00', () => {
    expect(formatRestClock(undefined)).toBe('0:00');
    expect(formatRestClock(null)).toBe('0:00');
    expect(formatRestClock('')).toBe('0:00');
    expect(formatRestClock('abc')).toBe('0:00');
    expect(formatRestClock(NaN)).toBe('0:00');
  });

  test('numeric strings parse', () => {
    expect(formatRestClock('75')).toBe('1:15');
  });
});

describe('findNextIncompleteSet', () => {
  test('null / missing exercises returns null', () => {
    expect(findNextIncompleteSet(null)).toBeNull();
    expect(findNextIncompleteSet(undefined)).toBeNull();
    expect(findNextIncompleteSet({})).toBeNull();
    expect(findNextIncompleteSet({ exercises: [] })).toBeNull();
  });

  test('returns the first set without completedAt', () => {
    const workout = {
      exercises: [
        {
          name: 'Bench',
          sets: [
            { completedAt: 1 },
            { completedAt: null, weight: 135 },
          ],
        },
      ],
    };
    expect(findNextIncompleteSet(workout)).toEqual({
      exerciseIndex: 0,
      setIndex: 1,
      name: 'Bench',
      setNumber: 2,
      setLabel: 'Set 2',
    });
  });

  test('walks later exercises when earlier ones are complete', () => {
    const workout = {
      exercises: [
        { name: 'Bench', sets: [{ completedAt: 1 }, { completedAt: 2 }] },
        { name: 'OHP', sets: [{ completedAt: undefined }] },
      ],
    };
    expect(findNextIncompleteSet(workout)).toMatchObject({
      exerciseIndex: 1,
      setIndex: 0,
      name: 'OHP',
      setNumber: 1,
      setLabel: 'Set 1',
    });
  });

  test('treats missing sets as empty and missing name as Exercise', () => {
    const workout = {
      exercises: [
        { name: 'Bench' },
        { sets: [{ completedAt: null }] },
      ],
    };
    expect(findNextIncompleteSet(workout)).toMatchObject({
      exerciseIndex: 1,
      setIndex: 0,
      name: 'Exercise',
      setLabel: 'Set 1',
    });
  });

  test('all complete returns null', () => {
    const workout = {
      exercises: [{ name: 'Bench', sets: [{ completedAt: Date.now() }] }],
    };
    expect(findNextIncompleteSet(workout)).toBeNull();
  });
});
