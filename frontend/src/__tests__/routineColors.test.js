import {
  ROUTINE_PALETTE,
  CUSTOM_COLOR,
  REST_KEY,
  CUSTOM_KEY,
  routineKeyForWorkout,
  labelForWorkout,
  createRoutineColorResolver,
  dayRoutineEntries,
  legendEntries,
} from '../utils/routineColors';
import { buildMockSnapshot } from '../data/mockData';

const routines = [
  { id: 'r1', name: 'Push Day 1' },
  { id: 'r2', name: 'Push Day 2' },
  { id: 'r3', name: 'Pull Day 1' },
  { id: 'r4', name: 'Pull Day 2' },
];
const ex = [{ name: 'Bench', sets: [] }];

test('palette has at least 10 distinct colours', () => {
  expect(new Set(ROUTINE_PALETTE).size).toBeGreaterThanOrEqual(10);
  expect(ROUTINE_PALETTE).not.toContain(CUSTOM_COLOR);
});

test('keys: id preferred, normalized name fallback, custom, rest', () => {
  expect(routineKeyForWorkout({ routineId: 'r1', routineName: 'X', exercises: ex })).toBe('id:r1');
  expect(routineKeyForWorkout({ routineName: '  Push   DAY 1 ', exercises: ex })).toBe('name:push day 1');
  expect(routineKeyForWorkout({ exercises: ex })).toBe(CUSTOM_KEY);
  expect(routineKeyForWorkout({ routineName: 'Rest Day', exercises: [] })).toBe(REST_KEY);
  expect(labelForWorkout({ exercises: ex })).toBe('Custom workout');
  expect(labelForWorkout({ exercises: [] })).toBe('Rest day');
});

test('each routine gets a distinct, stable colour in list order', () => {
  const c = createRoutineColorResolver(routines);
  const cols = routines.map((r) => c(`id:${r.id}`));
  expect(new Set(cols).size).toBe(4);
  expect(cols).toEqual(ROUTINE_PALETTE.slice(0, 4));
  expect(createRoutineColorResolver(routines)('id:r3')).toBe(cols[2]);
  // name-only workout of an existing routine shares its colour
  expect(c('name:pull day 1')).toBe(cols[2]);
});

test('deleted routines hash deterministically to an unused slot', () => {
  const a = createRoutineColorResolver(routines)('id:gone');
  const b = createRoutineColorResolver(routines)('id:gone');
  expect(a).toBe(b);
  expect(ROUTINE_PALETTE.slice(0, 4)).not.toContain(a);
});

test('custom and rest colours', () => {
  const c = createRoutineColorResolver(routines, { restColor: '#333' });
  expect(c(CUSTOM_KEY)).toBe(CUSTOM_COLOR);
  expect(c(REST_KEY)).toBe('#333');
});

test('day entries dedupe and cap at 3', () => {
  const c = createRoutineColorResolver(routines);
  const day = [
    { routineId: 'r1', routineName: 'Push Day 1', exercises: ex },
    { routineId: 'r1', routineName: 'Push Day 1', exercises: ex },
    { routineId: 'r2', routineName: 'Push Day 2', exercises: ex },
    { exercises: ex },
    { routineId: 'r3', routineName: 'Pull Day 1', exercises: ex },
  ];
  const e = dayRoutineEntries(day, c);
  expect(e.map((x) => x.label)).toEqual(['Push Day 1', 'Push Day 2', 'Custom workout']);
});

test('legend uses most recent saved name (renamed routine) and sorts', () => {
  const c = createRoutineColorResolver(routines);
  const l = legendEntries(
    [
      { routineId: 'r1', routineName: 'Old Push', timestamp: '2026-10-01T10:00:00Z', exercises: ex },
      { routineId: 'r1', routineName: 'Push Day 1', timestamp: '2026-10-05T10:00:00Z', exercises: ex },
      { routineId: 'r2', routineName: 'Push Day 2', timestamp: '2026-10-02T10:00:00Z', exercises: ex },
      { exercises: [], timestamp: '2026-10-03T10:00:00Z' },
      { exercises: ex, timestamp: '2026-10-04T10:00:00Z' },
    ],
    c
  );
  expect(l.map((x) => x.label)).toEqual(['Push Day 1', 'Push Day 2', 'Custom workout', 'Rest day']);
  expect(l[0].count).toBe(2);
});

test('mock data shows varied routine colours', () => {
  const snap = buildMockSnapshot('kgs');
  const c = createRoutineColorResolver(snap.routines);
  const cols = new Set(snap.workouts.filter((w) => w.exercises.length).map((w) => c(routineKeyForWorkout(w))));
  expect(cols.size).toBeGreaterThanOrEqual(3);
});
