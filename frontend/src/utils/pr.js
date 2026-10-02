import { calculate1RM, getPreviousPerformance } from './calculations';

export function detectPersonalRecord({
  exercise,
  set,
  setIndex,
  history,
  currentExercises,
  unit = 'lbs',
}) {
  const weight = Number(set?.weight) || 0;
  const reps = Number(set?.reps) || 0;
  if (weight <= 0 || reps <= 0) return null;

  const prev = getPreviousPerformance(exercise?.id, history, unit);
  let bestW = prev?.allTimePR || 0;
  let bestRm = prev?.allTime1RM || 0;

  (currentExercises || []).forEach((ex) => {
    if (ex.id !== exercise.id) return;
    (ex.sets || []).forEach((s, i) => {
      if (i === setIndex && ex === exercise) return;
      if (!s?.completedAt) return;
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      if (w > bestW) bestW = w;
      const rm = calculate1RM(w, r);
      if (rm > bestRm) bestRm = rm;
    });
  });

  const e1rm = calculate1RM(weight, reps);
  const weightPr = weight > bestW;
  const rmPr = e1rm > bestRm;
  if (!weightPr && !rmPr) return null;

  return {
    name: exercise.name || 'Exercise',
    unit,
    weight,
    reps,
    e1rm,
    weightPr,
    rmPr,
    previousWeight: bestW,
    previousE1rm: bestRm,
  };
}
