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
    <button onClick={() => onChange(String(Number(value || 0) - step))} className="min-w-touch min-h-touch px-3 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold text-lg select-none">-</button>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 w-full bg-transparent text-center font-mono font-bold py-2 text-text focus:outline-none placeholder-textMuted/50 hide-arrows text-base"
      placeholder={placeholder}
    />
    <button onClick={() => onChange(String(Number(value || 0) + step))} className="min-w-touch min-h-touch px-3 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold text-lg select-none">+</button>
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
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/exercises/search?q=${encodeURIComponent(searchQuery)}`);
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
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
        >
          <div className="p-4 pt-safe flex items-center gap-3 border-b border-border/50 bg-surface/50">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search exercise..."
                className="w-full bg-surface-light border border-border rounded-xl pl-10 pr-4 py-3 text-text font-bold focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsSearching(false)}
              className="p-3 text-textMuted hover:text-text rounded-full bg-surface-light min-w-touch min-h-touch flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pb-safe">
            {searchResults.map(res => (
              <button 
                key={res.id} 
                onClick={() => handleAddExercise(res)}
                className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-light rounded-xl transition-colors border border-transparent hover:border-border text-left min-h-touch"
              >
                {res.gifUrl ? (
                  <img src={res.gifUrl} alt={res.name} className="w-12 h-12 rounded-full object-cover bg-white ring-2 ring-surface-light shrink-0" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center ring-2 ring-surface-light shrink-0">
                    <Dumbbell size={20} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4 className="font-bold text-text capitalize text-sm leading-snug">{res.name}</h4>
                    {res.isCustom && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Custom</span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-textMuted tracking-wider">{res.muscleGroup}</p>
                </div>
              </button>
            ))}
            
            {searchQuery.length > 0 && (
              <div className="flex flex-col items-center justify-center py-6 mt-4 border-t border-border/50 bg-surface/30 rounded-xl px-4">
                <p className="text-textMuted font-semibold text-sm mb-4 text-center">Didn't find what you're looking for?</p>
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <select
                    value={newMuscleGroup}
                    onChange={(e) => setNewMuscleGroup(e.target.value)}
                    className="w-1/3 bg-surface-light border border-border rounded-xl px-3 py-3 text-sm text-text font-semibold focus:outline-none focus:border-primary capitalize min-h-touch"
                  >
                    {muscleGroups.map(mg => (
                      <option key={mg} value={mg}>{mg}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateCustom}
                    disabled={isCreatingCustom || searchQuery.trim().length < 1}
                    className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-touch truncate shadow-lg shadow-primary/20"
                  >
                    {isCreatingCustom ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={18} className="shrink-0" />}
                    <span className="truncate">Create "{searchQuery}"</span>
                  </button>
                </div>
              </div>
            )}
            
            {searchResults.length === 0 && searchQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 opacity-50 py-12">
                <Search size={48} className="text-textMuted mb-4" />
                <p className="text-text font-bold">Search for an exercise</p>
                <p className="text-textMuted text-sm mt-1">Type at least 1 character</p>
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
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 bg-blue-500/20 backdrop-blur-xl text-white p-1.5 pl-4 rounded-full shadow-[0_8px_32px_rgba(59,130,246,0.3)] flex items-center gap-3 z-50 border border-blue-400/30"
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
