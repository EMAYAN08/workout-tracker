import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { ChevronLeft, Clock, Activity, Dumbbell, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateVolume, convertWeight } from '../../utils/calculations';
import { motion } from 'framer-motion';

const ExerciseImage = ({ src, alt }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded-lg bg-surface-light border border-border flex items-center justify-center text-primary shrink-0">
        <Dumbbell size={24} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-12 h-12 rounded-lg bg-surface-light object-cover border border-border shrink-0"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
};

export default function WorkoutDetailView({ date, onBack }) {
  const { workoutHistory, unit } = useWorkout();

  const dayWorkouts = useMemo(() => {
    if (!workoutHistory || !date) return [];
    return workoutHistory.filter(wk => {
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      return format(parseISO(timeStr), 'yyyy-MM-dd') === date;
    });
  }, [workoutHistory, date]);

  if (!date || dayWorkouts.length === 0) {
    return (
      <div className="flex flex-col w-full h-full pb-8">
        <button onClick={onBack} className="flex items-center gap-1 text-textMuted hover:text-text mb-6 mt-4">
          <ChevronLeft size={20} /> Back to Calendar
        </button>
        <div className="flex-1 flex items-center justify-center text-textMuted">
          No workouts found for this date.
        </div>
      </div>
    );
  }

  // Aggregate stats across all workouts on this day
  const totalDuration = dayWorkouts.reduce((acc, wk) => acc + (wk.duration || 0), 0);
  const totalVolume = dayWorkouts.reduce((acc, wk) => {
    return acc + (wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0);
  }, 0);

  const displayDate = format(parseISO(date), 'EEEE, MMMM do, yyyy');

  return (
    <div className="flex flex-col w-full h-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1 px-3 py-1.5 bg-surface-light hover:bg-surface rounded-full transition-colors text-sm font-bold text-text"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="mb-6 px-2">
        <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight mb-2">
          {displayDate}
        </h1>
        <div className="flex items-center gap-4 text-sm font-bold text-textMuted">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-primary" />
            {Math.round(totalDuration / 60)} mins
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={16} className="text-primary" />
            {convertWeight(totalVolume, 'lbs', unit).toLocaleString()} {unit}
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell size={16} className="text-primary" />
            {dayWorkouts.reduce((acc, wk) => acc + wk.exercises.length, 0)} Exercises
          </div>
        </div>
      </div>

      {/* Workouts List */}
      <div className="flex flex-col gap-6">
        {dayWorkouts.map((workout, wIdx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: wIdx * 0.1 }}
            key={workout.id || wIdx} 
            className="panel p-0 overflow-hidden"
          >
            <div className="bg-surface-light p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text">
                {workout.routineName || `Workout ${wIdx + 1}`}
              </h3>
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                {workout.startTime ? format(new Date(workout.startTime), 'h:mm a') : 'Completed'}
              </span>
            </div>
            
            <div className="p-4 flex flex-col gap-6">
              {workout.exercises.map((exercise, eIdx) => (
                <div key={exercise.id || eIdx} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <ExerciseImage src={exercise.gifUrl} alt={exercise.name} />
                    <div>
                      <h4 className="font-bold text-text capitalize">{exercise.name}</h4>
                      <p className="text-xs font-bold text-textMuted uppercase tracking-wider">{exercise.muscleGroup}</p>
                    </div>
                  </div>

                  <div className="bg-surface-light rounded-xl p-3 border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-textMuted text-xs uppercase tracking-wider">
                          <th className="text-left font-bold pb-2 w-16">Set</th>
                          <th className="text-center font-bold pb-2">Weight</th>
                          <th className="text-center font-bold pb-2">Reps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercise.sets.map((set, sIdx) => {
                          const convertedWeight = convertWeight(set.weight, workout.unitSaved || 'lbs', unit);
                          return (
                            <tr key={sIdx} className="border-t border-border/50">
                              <td className="py-2 text-textMuted font-bold">{sIdx + 1}</td>
                              <td className="py-2 text-center font-mono font-bold text-text">
                                {convertedWeight} <span className="text-xs text-textMuted font-sans">{unit}</span>
                              </td>
                              <td className="py-2 text-center font-mono font-bold text-text">
                                {set.reps}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
