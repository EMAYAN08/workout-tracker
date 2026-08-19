import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Dumbbell, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SwipeableExercise = ({ ex, onDelete, unit }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="relative overflow-hidden rounded-xl bg-red-500 mb-2">
      {/* Delete Background Button */}
      <div className="absolute top-0 bottom-0 right-0 w-20 flex items-center justify-center">
        <button onClick={() => onDelete(ex.id)} className="w-full h-full flex flex-col items-center justify-center text-white">
          <Trash2 size={20} />
          <span className="text-[10px] font-bold mt-1">Delete</span>
        </button>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div 
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.2}
        className="relative z-10 bg-surface shadow-sm rounded-xl border border-border flex flex-col"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center ring-2 ring-surface-light shrink-0">
            <Dumbbell size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-text capitalize text-base truncate">{ex.name}</h4>
              <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded shrink-0">Custom</span>
            </div>
            <p className="text-xs text-textMuted font-semibold capitalize flex items-center gap-2">
              {ex.muscleGroup}
              {ex.defaultSets && ex.defaultSets.length > 0 && (
                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {ex.defaultSets.length} Sets
                </span>
              )}
            </p>
          </div>
          <div className="text-textMuted opacity-50 shrink-0 pr-2">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
        
        {/* Expanded View */}
        <AnimatePresence>
          {expanded && ex.defaultSets && ex.defaultSets.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 overflow-hidden"
            >
               <div className="pt-3 border-t border-border mt-1">
                 <h5 className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-2">Default Sets</h5>
                 <div className="flex flex-col gap-1.5">
                   {ex.defaultSets.map((s, i) => (
                     <div key={i} className="flex justify-between items-center text-sm font-mono bg-surface-light px-3 py-1.5 rounded-lg border border-border/50">
                       <span className="text-textMuted font-bold">Set {i+1}</span>
                       <span className="text-text font-bold">{s.weight} <span className="text-xs text-textMuted uppercase">{unit}</span> × {s.reps}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default function CustomExercises({ onNavigate }) {
  const { customExercises, createCustomExercise, deleteCustomExercise, unit } = useWorkout();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const [defaultSets, setDefaultSets] = useState([{ reps: 0, weight: 0 }]);
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
    await createCustomExercise(newName.trim(), newMuscleGroup, defaultSets);
    setNewName('');
    setNewMuscleGroup('chest');
    setDefaultSets([{ reps: 0, weight: 0 }]);
    setIsCreating(false);
    setIsSubmitting(false);
  };

  const updateSet = (index, field, value) => {
    const newSets = [...defaultSets];
    newSets[index][field] = Number(value);
    setDefaultSets(newSets);
  };

  const removeSet = (index) => {
    setDefaultSets(defaultSets.filter((_, i) => i !== index));
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
            className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary-light transition-colors min-h-touch"
          >
            <Plus size={16} /> Create
          </button>
        </div>
        <p className="text-sm text-textMuted">Swipe left on an exercise to delete it.</p>
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
              <h3 className="font-bold text-text text-lg">New Custom Exercise</h3>
              <button onClick={() => setIsCreating(false)} className="text-textMuted hover:text-text min-h-touch min-w-touch flex justify-center items-center"><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Exercise Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Hex Bar Deadlift"
                  className="input-premium w-full py-2.5 px-3"
                />
              </div>
              
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Muscle Group</label>
                <select 
                  value={newMuscleGroup} 
                  onChange={e => setNewMuscleGroup(e.target.value)}
                  className="input-premium w-full py-2.5 px-3 capitalize"
                >
                  {muscleGroups.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-2 border-t border-border pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted block">Default Sets (Optional)</label>
                <button onClick={() => setDefaultSets([...defaultSets, { reps: 0, weight: 0 }])} className="text-xs font-bold text-primary hover:text-primary-light flex items-center gap-1 min-h-touch px-2">
                  <Plus size={14} /> Add Set
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                {defaultSets.map((set, sIdx) => (
                  <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center font-mono font-bold text-textMuted text-xs">{sIdx + 1}</div>
                    <div className="col-span-5">
                      <input 
                        type="number"
                        value={set.weight || ''}
                        onChange={e => updateSet(sIdx, 'weight', e.target.value)}
                        placeholder={"Weight " + unit}
                        className="w-full bg-surface-light rounded-lg px-2 py-2 text-center font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder-textMuted/50 hide-arrows text-base"
                      />
                    </div>
                    <div className="col-span-5">
                      <input 
                        type="number"
                        value={set.reps || ''}
                        onChange={e => updateSet(sIdx, 'reps', e.target.value)}
                        placeholder="Reps"
                        className="w-full bg-surface-light rounded-lg px-2 py-2 text-center font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder-textMuted/50 hide-arrows text-base"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button 
                        onClick={() => removeSet(sIdx)}
                        className="text-textMuted hover:text-red-500 transition-colors p-1 min-h-touch min-w-touch flex justify-center items-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={handleCreate}
              disabled={isSubmitting || newName.trim().length < 3}
              className="w-full py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-light transition-colors disabled:opacity-50 mt-4 min-h-touch"
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
            Create an exercise to set up default sets, reps, and weights!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {muscleGroupsList.map(group => (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-textMuted pl-2">{group}</h3>
              <div className="flex flex-col">
                {groupedExercises[group].map((ex, idx) => (
                  <SwipeableExercise key={ex.id} ex={ex} onDelete={deleteCustomExercise} unit={unit} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
