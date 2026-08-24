import React from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Play, Plus, Edit2, Trash2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoutinesList({ onCreateNew, onEdit }) {
  const { routines, deleteRoutine, startWorkoutFromRoutine, activeWorkout } = useWorkout();

  const handleStartRoutine = (routine) => {
    if (activeWorkout) {
      if (!window.confirm("You already have an active workout. Do you want to overwrite it?")) {
        return;
      }
    }
    startWorkoutFromRoutine(routine);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteRoutine(id);
  };

    const getRoutineCategories = (exercises) => {
      if (!exercises) return [];
      const categories = new Set();
      exercises.forEach(ex => {
        if (ex.muscleGroup) categories.add(ex.muscleGroup);
      });
      return Array.from(categories);
    };

    return (
      <div className="flex flex-col w-full relative pt-0 mt-[-8px]">
      <div className="sticky top-0 z-20 bg-background pt-1 pb-4">
        <div className="flex items-center justify-between mb-1 px-1">
          <div>
            <h2 className="text-[clamp(24px,6vw,28px)] font-black text-white tracking-tight flex items-center gap-2">
              <ClipboardList className="text-primary w-6 h-6 sm:w-7 sm:h-7" /> My Routines
            </h2>
          </div>
          <button 
            onClick={onCreateNew}
            className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center transition-all active:scale-95 shrink-0"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
        <p className="text-sm text-textMuted font-semibold px-1">Build templates for faster logging</p>
      </div>
  
        <div className="flex flex-col gap-3 mt-2">
          {routines.length === 0 ? (
            <div className="panel p-8 flex flex-col items-center justify-center text-center">
              <ClipboardList size={40} className="text-textMuted/30 mb-3" />
              <p className="text-text font-bold mb-1">No routines yet</p>
              <p className="text-sm text-textMuted">Create your first routine to easily start a structured workout.</p>
            </div>
          ) : (
            routines.map((routine, i) => (
              <motion.div
                key={routine.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="panel p-4 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-text">{routine.name}</h3>
                    <p className="text-xs text-textMuted font-semibold mt-1">
                      {routine.exercises?.length || 0} exercises
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleStartRoutine(routine)}
                      className="p-2 text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/40 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all rounded-lg"
                      title="Start Routine"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                    <button 
                      onClick={() => onEdit(routine)}
                      className="p-2 text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 backdrop-blur-md transition-all rounded-lg"
                      title="Edit Routine"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, routine.id)}
                      className="p-2 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 backdrop-blur-md transition-all rounded-lg"
                      title="Delete Routine"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {getRoutineCategories(routine.exercises).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-[-4px]">
                    {getRoutineCategories(routine.exercises).map(cat => (
                      <span key={cat} className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-md backdrop-blur-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
