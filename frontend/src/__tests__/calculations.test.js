import {
  convertWeight,
  calculate1RM,
  getBest1RM,
  calculateVolume,
  getPreviousPerformance,
} from '../utils/calculations';

describe('convertWeight', () => {
  test('lbs to kgs rounds to 2 decimals', () => {
    expect(convertWeight(100, 'lbs', 'kgs')).toBe(45.36);
    expect(convertWeight(1, 'lbs', 'kgs')).toBe(0.45);
    expect(convertWeight(45, 'lbs', 'kgs')).toBe(20.41);
  });

  test('kgs to lbs rounds to 1 decimal', () => {
    expect(convertWeight(100, 'kgs', 'lbs')).toBe(220.5);
    expect(convertWeight(1, 'kgs', 'lbs')).toBe(2.2);
    expect(convertWeight(45.36, 'kgs', 'lbs')).toBe(100);
  });

  test('same-unit lbs rounds to 1 decimal', () => {
    expect(convertWeight(10.16, 'lbs', 'lbs')).toBe(10.2);
    expect(convertWeight(10.14, 'lbs', 'lbs')).toBe(10.1);
    expect(convertWeight(225, 'lbs', 'lbs')).toBe(225);
  });

  test('same-unit kgs rounds to 2 decimals', () => {
    expect(convertWeight(10.16, 'kgs', 'kgs')).toBe(10.16);
    expect(convertWeight(10.159, 'kgs', 'kgs')).toBe(10.16);
    expect(convertWeight(80, 'kgs', 'kgs')).toBe(80);
  });

  test('zero stays zero in every direction', () => {
    expect(convertWeight(0, 'lbs', 'kgs')).toBe(0);
    expect(convertWeight(0, 'kgs', 'lbs')).toBe(0);
    expect(convertWeight(0, 'lbs', 'lbs')).toBe(0);
    expect(convertWeight(0, 'kgs', 'kgs')).toBe(0);
  });

  test('invalid / missing weight becomes 0', () => {
    expect(convertWeight(undefined, 'lbs', 'kgs')).toBe(0);
    expect(convertWeight(null, 'lbs', 'kgs')).toBe(0);
    expect(convertWeight('', 'lbs', 'kgs')).toBe(0);
    expect(convertWeight('abc', 'lbs', 'kgs')).toBe(0);
    expect(convertWeight(NaN, 'kgs', 'lbs')).toBe(0);
  });

  test('numeric strings convert', () => {
    expect(convertWeight('100', 'lbs', 'kgs')).toBe(45.36);
    expect(convertWeight('80', 'kgs', 'lbs')).toBe(176.4);
  });

  test('negative weights convert (not clamped)', () => {
    expect(convertWeight(-10, 'lbs', 'kgs')).toBe(-4.54);
    expect(convertWeight(-10, 'kgs', 'lbs')).toBe(-22);
  });

  test('unknown unit pair returns the numeric weight', () => {
    expect(convertWeight(50, 'lbs', 'stone')).toBe(50);
    expect(convertWeight(50, 'stone', 'kgs')).toBe(50);
  });
});

describe('calculate1RM (Brzycki)', () => {
  test('standard Brzycki rounding', () => {
    // 100 / (1.0278 - 0.0278 * 5) = 100 / 0.8888 ≈ 112.51 → 113
    expect(calculate1RM(100, 5)).toBe(113);
    // 100 / (1.0278 - 0.278) = 100 / 0.7498 ≈ 133.37 → 133
    expect(calculate1RM(100, 10)).toBe(133);
    expect(calculate1RM(225, 3)).toBe(238);
  });

  test('reps = 1 returns the weight unrounded by the formula', () => {
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(135.5, 1)).toBe(135.5);
  });

  test('reps = 0, negative, or missing returns 0', () => {
    expect(calculate1RM(100, 0)).toBe(0);
    expect(calculate1RM(100, -3)).toBe(0);
    expect(calculate1RM(100, null)).toBe(0);
    expect(calculate1RM(100, undefined)).toBe(0);
    expect(calculate1RM(100, '')).toBe(0);
  });

  test('missing / zero / invalid weight returns 0', () => {
    expect(calculate1RM(0, 5)).toBe(0);
    expect(calculate1RM(null, 5)).toBe(0);
    expect(calculate1RM(undefined, 5)).toBe(0);
    expect(calculate1RM('', 5)).toBe(0);
  });

  test('high reps (>=37) stay finite and positive', () => {
    const at37 = calculate1RM(100, 37);
    expect(Number.isFinite(at37)).toBe(true);
    expect(at37).toBeGreaterThan(0);
    expect(at37).toBe(Math.round(100 * (1 + 37 / 30)));

    const at38 = calculate1RM(100, 38);
    expect(at38).toBeGreaterThan(0);
    expect(Number.isFinite(at38)).toBe(true);

    const at36 = calculate1RM(100, 36);
    expect(at36).toBeGreaterThan(100);
  });
});

describe('getBest1RM', () => {
  test('empty / null / undefined returns 0', () => {
    expect(getBest1RM([])).toBe(0);
    expect(getBest1RM(null)).toBe(0);
    expect(getBest1RM(undefined)).toBe(0);
  });

  test('returns the highest 1RM among sets', () => {
    const sets = [
      { weight: 100, reps: 1 },
      { weight: 80, reps: 5 },
      { weight: 90, reps: 3 },
    ];
    expect(getBest1RM(sets)).toBe(100);
  });

  test('sets with missing weight are skipped', () => {
    expect(getBest1RM([{ reps: 5 }, { weight: 50, reps: 1 }])).toBe(50);
  });

  test('skips null rows and non-positive values', () => {
    expect(getBest1RM([null, { weight: 0, reps: 5 }, { weight: 80, reps: 1 }])).toBe(80);
  });
});

describe('calculateVolume', () => {
  test('empty / null / undefined returns 0', () => {
    expect(calculateVolume([])).toBe(0);
    expect(calculateVolume(null)).toBe(0);
    expect(calculateVolume(undefined)).toBe(0);
  });

  test('sums weight * reps', () => {
    expect(
      calculateVolume([
        { weight: 100, reps: 5 },
        { weight: 80, reps: 8 },
      ])
    ).toBe(1140);
  });

  test('zero reps or zero weight contribute 0', () => {
    expect(calculateVolume([{ weight: 100, reps: 0 }])).toBe(0);
    expect(calculateVolume([{ weight: 0, reps: 10 }])).toBe(0);
  });

  test('missing fields contribute 0 not NaN', () => {
    expect(calculateVolume([{}])).toBe(0);
    expect(calculateVolume([{ weight: 100 }])).toBe(0);
    expect(calculateVolume([{ reps: 10 }])).toBe(0);
  });

  test('numeric strings coerce', () => {
    expect(calculateVolume([{ weight: '10', reps: '2' }])).toBe(20);
  });
});

describe('getPreviousPerformance', () => {
  const squat = (id, weight, reps, extra = {}) => ({
    id,
    exercises: [{ id: 'ex_squat', sets: [{ weight, reps, type: 'Working' }] }],
    ...extra,
  });

  test('empty / null history returns null', () => {
    expect(getPreviousPerformance('ex_squat', [])).toBeNull();
    expect(getPreviousPerformance('ex_squat', null)).toBeNull();
    expect(getPreviousPerformance('ex_squat', undefined)).toBeNull();
  });

  test('no matching exercise returns null', () => {
    expect(getPreviousPerformance('ex_squat', [squat('w1', 200, 5, { timestamp: '2024-01-01', exercises: [] })])).toBeNull();
    expect(
      getPreviousPerformance('ex_bench', [
        squat('w1', 200, 5, { timestamp: '2024-01-01' }),
      ])
    ).toBeNull();
  });

  test('last session vs all-time PR (history unsorted)', () => {
    const history = [
      { id: 'old', timestamp: '2024-01-01T00:00:00.000Z', unitSaved: 'lbs', exercises: [{ id: 'ex_squat', sets: [{ weight: 200, reps: 5 }] }] },
      { id: 'new', timestamp: '2024-06-01T00:00:00.000Z', unitSaved: 'lbs', exercises: [{ id: 'ex_squat', sets: [{ weight: 180, reps: 5 }] }] },
    ];
    const perf = getPreviousPerformance('ex_squat', history, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(180);
    expect(perf.allTimePR).toBe(200);
    expect(perf.allTime1RM).toBe(calculate1RM(200, 5));
  });

  test('converts historical units into currentUnit', () => {
    const history = [
      { id: 'old', timestamp: '2024-01-01T00:00:00.000Z', unitSaved: 'lbs', exercises: [{ id: 'ex_squat', sets: [{ weight: 200, reps: 5 }] }] },
      { id: 'new', timestamp: '2024-06-01T00:00:00.000Z', unitSaved: 'kgs', exercises: [{ id: 'ex_squat', sets: [{ weight: 80, reps: 5 }] }] },
    ];
    const perf = getPreviousPerformance('ex_squat', history, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(convertWeight(80, 'kgs', 'lbs'));
    expect(perf.allTimePR).toBe(200);
    expect(perf.allTime1RM).toBe(calculate1RM(200, 5));
  });

  test('defaults history unit to lbs when unitSaved is missing', () => {
    const history = [
      { id: 'w', timestamp: '2024-01-01T00:00:00.000Z', exercises: [{ id: 'ex_squat', sets: [{ weight: 135, reps: 1 }] }] },
    ];
    const perf = getPreviousPerformance('ex_squat', history, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(135);
    expect(perf.allTimePR).toBe(135);
    expect(perf.allTime1RM).toBe(135);
  });

  test('skips workouts whose matching exercise has empty sets', () => {
    const history = [
      { id: 'empty', timestamp: '2024-06-01T00:00:00.000Z', exercises: [{ id: 'ex_squat', sets: [] }] },
      { id: 'hit', timestamp: '2024-01-01T00:00:00.000Z', exercises: [{ id: 'ex_squat', sets: [{ weight: 155, reps: 1 }] }] },
    ];
    const perf = getPreviousPerformance('ex_squat', history, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(155);
  });

  test('throws when a matching exercise has no sets property (documented)', () => {
    const history = [
      { id: 'w', timestamp: '2024-01-01T00:00:00.000Z', exercises: [{ id: 'ex_squat' }] },
    ];
    expect(() => getPreviousPerformance('ex_squat', history, 'lbs')).toThrow();
  });

  test('session max uses heaviest set, 1RM uses best converted set', () => {
    const history = [
      {
        id: 'w',
        timestamp: '2024-01-01T00:00:00.000Z',
        unitSaved: 'lbs',
        exercises: [
          {
            id: 'ex_squat',
            sets: [
              { weight: 135, reps: 8 },
              { weight: 185, reps: 1 },
            ],
          },
        ],
      },
    ];
    const perf = getPreviousPerformance('ex_squat', history, 'lbs');
    expect(perf.lastSessionHeaviest).toBe(185);
    expect(perf.allTimePR).toBe(185);
    expect(perf.allTime1RM).toBe(185);
  });
});
