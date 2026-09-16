import { findNextIncompleteSet } from '../notifications';

export function miniWorkoutCopy(workout, playingSet) {
  const heading = workout?.routineName?.trim() || 'Workout';
  const exercises = workout?.exercises || [];
  if (playingSet && exercises[playingSet.exerciseIndex]) {
    const ex = exercises[playingSet.exerciseIndex];
    return { heading, detail: `${ex.name || 'Exercise'} · Set ${playingSet.setIndex + 1}` };
  }
  const next = findNextIncompleteSet(workout);
  if (next) return { heading, detail: `${next.name} · ${next.setLabel}` };
  if (exercises.length) return { heading, detail: 'All sets logged' };
  return { heading, detail: 'Add an exercise' };
}
