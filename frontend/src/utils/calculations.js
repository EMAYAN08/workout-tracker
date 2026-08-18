// Constants
const LBS_TO_KGS = 0.453592;

// Display conversion utility
export const convertWeight = (weight, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return Math.round(weight * 10) / 10;
  if (fromUnit === 'lbs' && toUnit === 'kgs') return Math.round(weight * LBS_TO_KGS * 10) / 10;
  if (fromUnit === 'kgs' && toUnit === 'lbs') return Math.round(weight / LBS_TO_KGS * 10) / 10;
  return weight;
};

// Calculate 1 Rep Max using the Brzycki Formula
export const calculate1RM = (weight, reps) => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  // Brzycki formula: weight / (1.0278 - 0.0278 * reps)
  return Math.round(weight / (1.0278 - 0.0278 * reps));
};

// Get the highest 1RM from an array of sets
export const getBest1RM = (sets) => {
  if (!sets || sets.length === 0) return 0;
  return Math.max(...sets.map(s => calculate1RM(s.weight, s.reps)));
};

// Calculate total volume (weight * reps) for an array of sets
export const calculateVolume = (sets) => {
  if (!sets || sets.length === 0) return 0;
  return sets.reduce((total, s) => total + (s.weight * s.reps), 0);
};

export const getPreviousPerformance = (exerciseId, history, currentUnit = 'lbs') => {
  if (!history || history.length === 0) return null;
  
  let lastSessionHeaviest = null;
  let allTimePR = 0;
  let allTime1RM = 0;
  
  // History is assumed to be sorted by date descending
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  for (const workout of sortedHistory) {
    const foundExercise = workout.exercises?.find(ex => ex.id === exerciseId);
    if (foundExercise && foundExercise.sets.length > 0) {
      
      const historyUnit = workout.unitSaved || 'lbs';
      
      // Convert historical weights to the user's current unit
      const sessionMax = Math.max(...foundExercise.sets.map(s => 
        convertWeight(Number(s.weight) || 0, historyUnit, currentUnit)
      ));
      
      // best 1RM requires calculation on the actual converted weights
      const session1RM = Math.max(...foundExercise.sets.map(s => {
        const convertedW = convertWeight(Number(s.weight) || 0, historyUnit, currentUnit);
        return calculate1RM(convertedW, Number(s.reps) || 0);
      }));
      
      // The first matching workout is the most recent (last session)
      if (lastSessionHeaviest === null) {
        lastSessionHeaviest = sessionMax;
      }
      
      if (sessionMax > allTimePR) allTimePR = sessionMax;
      if (session1RM > allTime1RM) allTime1RM = session1RM;
    }
  }

  if (lastSessionHeaviest === null) return null;

  return {
    allTimePR,
    allTime1RM,
    lastSessionHeaviest
  };
};
