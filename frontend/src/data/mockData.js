import { addDays, formatISO, startOfDay, subDays } from 'date-fns';
import { EXERCISE_CATALOG } from './catalog';

const byGroup = (g) => EXERCISE_CATALOG.filter((e) => e.muscleGroup === g);

const TEMPLATES = [
  { name: 'Push Day', groups: ['chest', 'shoulders', 'arms'] },
  { name: 'Pull Day', groups: ['back', 'arms'] },
  { name: 'Leg Day', groups: ['legs', 'core'] },
];

function setsFor(i, unit) {
  const base = unit === 'kgs' ? 40 : 85;
  const w = base + (i % 7) * (unit === 'kgs' ? 2.5 : 5);
  return [
    { reps: 10, weight: w, type: 'Working', completedAt: Date.now() },
    { reps: 8, weight: w + (unit === 'kgs' ? 2.5 : 5), type: 'Working', completedAt: Date.now() },
    { reps: 6, weight: w + (unit === 'kgs' ? 5 : 10), type: 'Working', completedAt: Date.now() },
  ];
}

export function buildMockSnapshot(unit = 'lbs') {
  const today = startOfDay(new Date());
  const customExercises = [
    {
      id: 'mock_c_hex',
      name: 'Hex Bar Deadlift',
      muscleGroup: 'back',
      defaultSets: setsFor(3, unit),
      unitSaved: unit,
    },
    {
      id: 'mock_c_cable',
      name: 'Cable Lateral Raise',
      muscleGroup: 'shoulders',
      defaultSets: setsFor(1, unit),
      unitSaved: unit,
    },
    {
      id: 'mock_c_split',
      name: 'Front Foot Elevated Split Squat',
      muscleGroup: 'legs',
      defaultSets: setsFor(2, unit),
      unitSaved: unit,
    },
  ];

  const routines = TEMPLATES.map((t, ri) => {
    const exercises = t.groups.flatMap((g, gi) =>
      byGroup(g)
        .slice(0, 3)
        .map((ex, ei) => ({
          ...ex,
          unitSaved: unit,
          defaultSets: setsFor(ri + gi + ei, unit).map(({ completedAt, ...s }) => s),
        }))
    );
    return { id: `mock_r_${ri}`, name: t.name, exercises };
  });

  const workouts = [];
  for (let d = 0; d < 130; d++) {
    const date = subDays(today, d);
    const dow = date.getDay();
    if (dow === 0) {
      if (d % 14 === 0) {
        workouts.push({
          id: `mock_w_rest_${d}`,
          timestamp: formatISO(date),
          startTime: date.toISOString(),
          duration: 0,
          routineName: 'Rest Day',
          unitSaved: unit,
          exercises: [],
        });
      }
      continue;
    }
    if (dow === 6 && d % 2 === 1) continue;
    if (d % 9 === 4) continue;
    const tpl = TEMPLATES[d % 3];
    const pool = tpl.groups.flatMap((g) => byGroup(g)).slice(0, 6);
    const exercises = pool.slice(0, 4 + (d % 2)).map((ex, ei) => ({
      ...ex,
      unitSaved: unit,
      sets: setsFor(d + ei, unit),
    }));
    workouts.push({
      id: `mock_w_${d}`,
      timestamp: formatISO(addDays(date, 0)),
      startTime: new Date(date.getTime() + 18 * 3600 * 1000).toISOString(),
      duration: 2400 + (d % 5) * 420,
      routineName: tpl.name,
      unitSaved: unit,
      exercises,
    });
  }

  return { workouts, routines, customExercises };
}
