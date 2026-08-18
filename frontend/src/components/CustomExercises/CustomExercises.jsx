import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Dumbbell, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomExercises({ onNavigate }) {
  const { customExercises, createCustomExercise } = useWorkout();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  const groupedExercises = useMemo(() => {
    const groups = {};
    customExercises.forEach(ex => {
      const group = ex.muscleGroup || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(ex);
    });
    return groups;
  }, [customExercises]);

  const muscleGroupsList = Object.keys(groupedExercises).sort();

  const handleCreate = async () => {
    if (newName.trim().length < 3) return;
    setIsSubmitting(true);
    await createCustomExercise(newName.trim(), newMuscleGroup);
    setNewName('');
    setNewMuscleGroup('chest');
    setIsCreating(false);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8 relative">
      <div className="panel p-5 flex flex-col items-start gap-2">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl font-black text-text flex items-center gap-2 tracking-tight">
            <Dumbbell className="text-primary" size={28} /> Custom
          </h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary-light transition-colors"
          >
            <Plus size={16} /> Create
          </button>
        </div>
        <p className="text-sm text-textMuted">Exercises you have created manually.</p>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="panel p-5 flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-text">New Exercise</h3>
              <button onClick={() => setIsCreating(false)} className="text-textMuted hover:text-text"><X size={20} /></button>
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Exercise Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Hex Bar Deadlift"
                className="input-premium w-full py-2.5 px-3 text-sm"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Muscle Group</label>
              <select 
                value={newMuscleGroup} 
                onChange={e => setNewMuscleGroup(e.target.value)}
                className="input-premium w-full py-2.5 px-3 text-sm capitalize"
              >
                {muscleGroups.map(mg => <option key={mg} value={mg}>{mg}</option>)}
              </select>
            </div>
            
            <button 
              onClick={handleCreate}
              disabled={isSubmitting || newName.trim().length < 3}
              className="w-full py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-light transition-colors disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Creating...' : 'Save Custom Exercise'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {customExercises.length === 0 ? (
        <div className="panel p-8 flex flex-col items-center text-center mt-4">
          <Dumbbell size={48} className="text-primary opacity-20 mb-4" />
          <h3 className="text-xl font-bold text-text mb-2">No Custom Exercises</h3>
          <p className="text-sm text-textMuted max-w-[250px] mb-6">
            If you can't find an exercise in the database, you can create it here or during a workout.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {muscleGroupsList.map(group => (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-textMuted pl-2">{group}</h3>
              <div className="flex flex-col gap-2">
                {groupedExercises[group].map((ex, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={ex.id} 
                    className="panel p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center ring-2 ring-surface-light shrink-0">
                      <Dumbbell size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-text capitalize text-base truncate">{ex.name}</h4>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded shrink-0">Custom</span>
                      </div>
                      <p className="text-xs text-textMuted font-semibold capitalize">{ex.muscleGroup}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
