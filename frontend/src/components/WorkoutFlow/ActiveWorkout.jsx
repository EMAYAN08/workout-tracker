import React, { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Plus, Minus, Timer, History, Trash2, Check, Dumbbell, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPreviousPerformance } from '../../utils/calculations';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const StepperInput = ({ value, onChange, step = 1, placeholder }) => (
  <div className="flex items-center w-full bg-surface-light rounded-lg overflow-hidden border border-border focus-within:border-primary transition-colors">
    <button onClick={() => onChange(String(Number(value || 0) - step))} className="px-3 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold">-</button>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 w-full bg-transparent text-center font-mono font-bold py-2 text-text focus:outline-none placeholder-textMuted/50 hide-arrows"
      placeholder={placeholder}
    />
    <button onClick={() => onChange(String(Number(value || 0) + step))} className="px-3 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold">+</button>
  </div>
);

export default function ActiveWorkout() {
  const { 
    activeWorkout, workoutDuration, 
    addExercise, updateSet, completeSet, uncompleteSet, addSetToExercise, removeSet, 
    restTimer, setRestTimer, unit, workoutHistory,
    createCustomExercise
  } = useWorkout();

  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  
  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await fetch(`http://localhost:5000/api/exercises/search?q=${encodeURIComponent(searchQuery)}`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          setSearchResults(data);
        } catch (err) {
          console.error("Search failed", err);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!activeWorkout) return null;

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleAddExercise = (exercise) => {
    addExercise(exercise);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateCustom = async () => {
    setIsCreatingCustom(true);
    const newEx = await createCustomExercise(searchQuery, newMuscleGroup);
    if (newEx) {
      handleAddExercise(newEx);
    }
    setIsCreatingCustom(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full relative pt-2">
      
      {/* Global Timer Ribbon */}
      <div className="flex justify-between items-center px-2 mb-2 text-textMuted text-sm font-semibold">
        <span className="flex items-center gap-1.5"><Timer size={16} className="text-primary" /> Workout Time</span>
        <span className="font-mono text-primary font-bold">{formatTime(workoutDuration)}</span>
      </div>

      {/* Exercises */}
      {activeWorkout.exercises.map((ex, idx) => {
        const prevPerformance = getPreviousPerformance(ex.id, workoutHistory, unit);
        const isExpanded = idx === expandedExerciseIndex;
        const completedSetsCount = ex.sets.filter(s => s.completedAt).length;

        if (!isExpanded) {
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setExpandedExerciseIndex(idx)}
              className="panel p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-light/50 transition-colors border border-transparent hover:border-white/5 group"
            >
              {ex.gifUrl ? (
                <img src={ex.gifUrl} alt={ex.name} className="w-12 h-12 rounded-lg object-cover bg-white/5 opacity-70 group-hover:opacity-100 transition-opacity" loading="lazy" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface-light flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <Dumbbell size={20} className="text-textMuted" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text capitalize line-clamp-1 group-hover:text-primary transition-colors">{ex.name}</h3>
                  {ex.isCustom && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">Custom</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-textMuted mt-0.5">
                  <span className={completedSetsCount === ex.sets.length && ex.sets.length > 0 ? "text-green-500" : ""}>{completedSetsCount}</span> / {ex.sets.length} Sets Completed
                </p>
              </div>
              <div className="text-textMuted/30 group-hover:text-primary/50 px-2 transition-colors">
                <Plus size={20} />
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel overflow-hidden relative ring-1 ring-primary/20 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
          >
            {/* Header */}
            <div 
              onClick={() => setExpandedExerciseIndex(null)}
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-surface-light/30 transition-colors group"
            >
              {ex.gifUrl ? (
                <img src={ex.gifUrl} alt={ex.name} className="w-12 h-12 rounded-full object-cover bg-white ring-2 ring-surface-light" loading="lazy" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center ring-2 ring-surface-light">
                  <Dumbbell size={20} className="text-textMuted" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text capitalize leading-tight group-hover:text-primary transition-colors">{ex.name}</h3>
                  {ex.isCustom && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">Custom</span>
                  )}
                </div>
                {prevPerformance ? (
                  <p className="text-xs font-semibold text-textMuted mt-0.5 flex flex-wrap gap-x-2 gap-y-1 items-center">
                    <span className="text-primary font-bold">PR: {prevPerformance.allTimePR} {unit}</span>
                    <span className="text-textMuted/50">|</span>
                    <span className="text-text">Last: {prevPerformance.lastSessionHeaviest} {unit}</span>
                    <span className="text-textMuted/50">|</span>
                    <span className="text-textMuted">Est 1RM: {prevPerformance.allTime1RM} {unit}</span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-textMuted mt-0.5 capitalize">{ex.muscleGroup}</p>
                )}
              </div>
              <div className="text-textMuted/30 group-hover:text-primary/50 px-2 transition-colors">
                <Minus size={20} />
              </div>
            </div>
            
            <div className="px-2 pb-4">
              {/* Sets Table Header */}
              <div className="flex items-center px-4 py-2 text-xs font-bold text-textMuted uppercase tracking-wider mb-1">
                <div className="w-12 text-center">Set</div>
                <div className="flex-1 text-center">kg/lbs</div>
                <div className="flex-1 text-center">Reps</div>
                <div className="w-16 text-center"><Check size={16} className="mx-auto" /></div>
              </div>

              {/* Sets */}
              {ex.sets.map((set, sIdx) => {
                if (set.completedAt) {
                  return (
                    <div key={sIdx} className="flex items-center px-4 py-1.5 mb-1 bg-accent/10 rounded-lg group">
                      <div className="w-12 text-center font-bold text-sm text-textMuted">{sIdx + 1}</div>
                      <div className="flex-1 text-center font-mono font-bold text-text bg-transparent">{set.weight}</div>
                      <div className="flex-1 text-center font-mono font-bold text-text bg-transparent">{set.reps}</div>
                      <div className="w-16 flex justify-center items-center gap-1">
                        <button 
                          onClick={() => uncompleteSet(idx, sIdx)}
                          className="w-6 h-6 rounded flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Undo Set"
                        >
                          <X size={14} />
                        </button>
                        <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-background shadow-sm">
                          <Check size={18} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={sIdx} className="flex items-center px-4 py-2 mt-1 bg-surface-light/30 rounded-lg">
                      <div className="w-12 text-center font-bold text-sm text-textMuted">{sIdx + 1}</div>
                      <div className="flex-1 px-1">
                        <StepperInput 
                          value={set.weight} 
                          onChange={(val) => updateSet(idx, sIdx, 'weight', val)}
                          step={2.5}
                          placeholder="-"
                        />
                      </div>
                      <div className="flex-1 px-1">
                        <StepperInput 
                          value={set.reps} 
                          onChange={(val) => updateSet(idx, sIdx, 'reps', val)}
                          step={1}
                          placeholder="-"
                        />
                      </div>
                      <div className="w-16 flex justify-center items-center gap-1">
                        <button 
                          onClick={() => removeSet(idx, sIdx)}
                          className="w-6 h-6 rounded flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Remove Set"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (set.weight && set.reps) completeSet(idx, sIdx);
                          }}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${set.weight && set.reps ? 'bg-surface hover:bg-primary hover:text-white text-textMuted' : 'bg-surface text-textMuted/30 cursor-not-allowed'}`}
                        >
                          <Check size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                }
              })}

              <div className="px-4 mt-4 mb-2 flex gap-2">
                <button 
                  onClick={() => addSetToExercise(idx)}
                  className="flex-1 py-3 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> New Set
                </button>
                {idx < activeWorkout.exercises.length - 1 && (
                  <button 
                    onClick={() => {
                      setExpandedExerciseIndex(idx + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-3 text-sm font-bold text-white bg-primary hover:bg-primary-light rounded-xl transition-colors shadow-lg shadow-primary/20"
                  >
                    Next Exercise
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Add Exercise Area */}
      {!isSearching ? (
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsSearching(true)}
          className="w-full py-4 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <Plus size={20} strokeWidth={2.5} />
          Add Exercise
        </motion.button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          <div className="app-header p-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search exercise..."
                className="w-full bg-surface-light py-3 pl-10 pr-4 rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              />
            </div>
            <button 
              onClick={() => setIsSearching(false)}
              className="p-2 text-textMuted hover:text-text rounded-full bg-surface-light"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {searchResults.map(res => (
              <button 
                key={res.id} 
                onClick={() => handleAddExercise(res)}
                className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-surface-light transition-colors text-left"
              >
                {res.gifUrl ? (
                  <img src={res.gifUrl} alt={res.name} className="w-12 h-12 rounded-full object-cover bg-white" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center">
                    <Dumbbell size={20} className="text-textMuted" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-text capitalize text-base">{res.name}</h4>
                    {res.isCustom && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">Custom</span>
                    )}
                  </div>
                  <p className="text-xs text-textMuted font-semibold mt-0.5 capitalize">{res.muscleGroup}</p>
                </div>
              </button>
            ))}
            
            {searchResults.length === 0 && searchQuery.length > 2 && (
              <p className="text-center text-textMuted mt-4 mb-2 font-semibold">No exercises found.</p>
            )}
            
            {searchQuery.length > 2 && (
              <div className="mt-4 mb-8 panel p-6 flex flex-col items-center text-center">
                <Dumbbell size={32} className="text-primary opacity-50 mb-3" />
                <h3 className="text-lg font-bold text-text mb-1">Create Custom Exercise</h3>
                <p className="text-sm text-textMuted mb-6">Create "{searchQuery}" as a custom exercise to use anytime.</p>
                
                <div className="w-full max-w-xs space-y-4">
                  <div className="text-left">
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
                    onClick={handleCreateCustom}
                    disabled={isCreatingCustom}
                    className="w-full py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-light transition-colors disabled:opacity-50"
                  >
                    {isCreatingCustom ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Floating Rest Timer Pill */}
      <AnimatePresence>
        {restTimer > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 bg-blue-500/20 backdrop-blur-xl text-white p-1.5 pl-4 rounded-full shadow-[0_8px_32px_rgba(59,130,246,0.3)] flex items-center gap-3 z-50 border border-blue-400/30"
          >
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-white/80" />
              <span className="font-mono text-lg font-black tracking-tight">{formatTime(restTimer)}</span>
            </div>
            
            <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setRestTimer(prev => prev + 30)} 
                className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
              >
                +30s
              </button>
              <button 
                onClick={() => setRestTimer(0)} 
                className="p-1.5 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition-colors"
                title="Skip Rest"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
