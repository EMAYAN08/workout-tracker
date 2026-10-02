// Constants
const LBS_TO_KGS = 0.453592;

// Display conversion utility
export const convertWeight = (weight, fromUnit, toUnit) => {
  const n = Number(weight) || 0;
  if (fromUnit === toUnit) {
    return toUnit === 'kgs' ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
  }
  if (fromUnit === 'lbs' && toUnit === 'kgs') return Math.round(n * LBS_TO_KGS * 100) / 100;
  if (fromUnit === 'kgs' && toUnit === 'lbs') return Math.round((n / LBS_TO_KGS) * 10) / 10;
  return n;
};

// Calculate 1 Rep Max using the Brzycki Formula
export const calculate1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (!w || r <= 0) return 0;
  if (r === 1) return w;
  // Brzycki formula: weight / (1.0278 - 0.0278 * reps)
  // Denominator hits 0 around 37 reps and goes negative after that.
  if (r >= 37) return Math.round(w * (1 + r / 30));
  const denom = 1.0278 - 0.0278 * r;
  if (denom <= 0) return Math.round(w * (1 + r / 30));
  const result = Math.round(w / denom);
  if (!Number.isFinite(result) || result < 0) return Math.round(w * (1 + r / 30));
  return result;
};

// Get the highest 1RM from an array of sets
export const getBest1RM = (sets) => {
  if (!sets || sets.length === 0) return 0;
  const rms = [];
  for (const s of sets) {
    if (!s) continue;
    const w = Number(s.weight);
    const r = Number(s.reps);
    if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) continue;
    const rm = calculate1RM(w, r);
    if (!Number.isFinite(rm) || rm < 0) continue;
    rms.push(rm);
  }
  if (rms.length === 0) return 0;
  return Math.max(...rms);
};

// Calculate total volume (weight * reps) for an array of sets
export const calculateVolume = (sets) => {
  if (!sets || sets.length === 0) return 0;
  return sets.reduce((total, s) => total + ((Number(s?.weight) || 0) * (Number(s?.reps) || 0)), 0);
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
