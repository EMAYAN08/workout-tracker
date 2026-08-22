import React, { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Plus, Minus, Timer, History, Trash2, Check, Dumbbell, Search, X, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPreviousPerformance } from '../../utils/calculations';
import CustomNumpad from './CustomNumpad';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const StepperInput = ({ value, onChange, step = 1, placeholder }) => (
  <div className="flex items-center w-full bg-surface-light rounded-lg overflow-hidden border border-border focus-within:border-primary transition-colors">
    <button onClick={() => onChange(String(Number(value || 0) - step))} className="w-8 shrink-0 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold text-lg select-none flex items-center justify-center">-</button>
    <input 
      type="number" 
      inputMode="decimal"
      pattern="[0-9]*"
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 w-full bg-transparent text-center font-mono font-bold py-2 text-text focus:outline-none placeholder-textMuted/50 hide-arrows text-sm sm:text-base px-0"
      placeholder={placeholder}
    />
    <button onClick={() => onChange(String(Number(value || 0) + step))} className="w-8 shrink-0 py-2 text-textMuted hover:text-text hover:bg-white/5 active:bg-white/10 transition-colors font-bold text-lg select-none flex items-center justify-center">+</button>
  </div>
);

export default function ActiveWorkout() {
  const { 
    activeWorkout, workoutDuration, 
    addExercise, updateSet, reorderActiveExercise, completeSet, uncompleteSet, addSetToExercise, removeSet, 
    restTimer, stopRestTimer, unit, workoutHistory,
    createCustomExercise
  } = useWorkout();

  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(0);
  const [activeInput, setActiveInput] = useState(null);
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
    <div className={`px-4 flex flex-col gap-4 w-full relative transition-all duration-300 ${activeInput ? 'pb-[300px]' : 'pb-0'}`}>
      
            {/* Global Timer Ribbon */}
      <div className="sticky top-0 z-40 -mx-4 px-6 py-2 mb-2 bg-background/95 backdrop-blur-md border-b border-white/5 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-0.5">Workout</span>
          <div className="flex items-center gap-1.5 text-primary">
            <Timer size={14} />
            <span className="font-mono font-bold text-base leading-none">{formatTime(workoutDuration)}</span>
          </div>
        </div>
        
        {restTimer > 0 && (
          <div className="flex flex-col items-end animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-0.5">Resting</span>
            <div className="flex items-center gap-2 text-blue-400">
              <Timer size={14} />
              <span className="font-mono font-bold text-base leading-none">{formatTime(restTimer)}</span>
              <button 
                onClick={() => stopRestTimer()} 
                className="p-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors ml-1"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeWorkout.exercises.length === 0 && (
        <div className="mx-2 panel p-4 bg-emerald-500/10 border-emerald-500/20 text-center flex flex-col items-center justify-center gap-2 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-1 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="text-2xl">🛋️</span>
          </div>
          <h3 className="text-emerald-400 font-black text-lg tracking-tight">Rest Day Logging</h3>
          <p className="text-emerald-500/80 font-bold text-sm leading-snug max-w-[200px]">
            Tap "Log Rest Day" above to record a recovery day.
          </p>
        </div>
      )}

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
                  
                </div>
                <p className="text-xs font-semibold text-textMuted mt-0.5">
                  <span className={completedSetsCount === ex.sets.length && ex.sets.length > 0 ? "text-green-500" : ""}>{completedSetsCount}</span> / {ex.sets.length} Sets Completed
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {idx > 0 && (
                  <button onClick={() => reorderActiveExercise(idx, 'up')} className="p-1.5 text-textMuted hover:text-text transition-colors">
                    <ArrowUp size={16} />
                  </button>
                )}
                {idx < activeWorkout.exercises.length - 1 && (
                  <button onClick={() => reorderActiveExercise(idx, 'down')} className="p-1.5 text-textMuted hover:text-text transition-colors">
                    <ArrowDown size={16} />
                  </button>
                )}
                <button className="p-1.5 text-textMuted transition-colors ml-1" style={{ pointerEvents: 'none' }}>
                  <ChevronDown size={18} />
                </button>
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
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {idx > 0 && (
                    <button onClick={() => reorderActiveExercise(idx, 'up')} className="p-1.5 text-textMuted hover:text-text transition-colors">
                      <ArrowUp size={16} />
                    </button>
                  )}
                  {idx < activeWorkout.exercises.length - 1 && (
                    <button onClick={() => reorderActiveExercise(idx, 'down')} className="p-1.5 text-textMuted hover:text-text transition-colors">
                      <ArrowDown size={16} />
                    </button>
                  )}
                  <button className="p-1.5 text-textMuted transition-colors ml-1" style={{ pointerEvents: 'none' }}>
                    <ChevronUp size={18} />
                  </button>
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
                        <div 
    onClick={() => setActiveInput({ eIdx: idx, sIdx: sIdx, field: 'weight' })}
    className={`flex items-center justify-center w-full bg-surface-light rounded-lg border transition-colors h-10 cursor-pointer ${activeInput?.eIdx === idx && activeInput?.sIdx === sIdx && activeInput?.field === 'weight' ? 'border-primary ring-1 ring-primary/50 text-primary bg-primary/10' : 'border-border text-text'}`}
  >
    <span className="font-mono font-bold text-base">{set.weight || <span className="text-textMuted/50">-</span>}</span>
  </div>
                      </div>
                      <div className="flex-1 px-1">
                        <div 
    onClick={() => setActiveInput({ eIdx: idx, sIdx: sIdx, field: 'reps' })}
    className={`flex items-center justify-center w-full bg-surface-light rounded-lg border transition-colors h-10 cursor-pointer ${activeInput?.eIdx === idx && activeInput?.sIdx === sIdx && activeInput?.field === 'reps' ? 'border-primary ring-1 ring-primary/50 text-primary bg-primary/10' : 'border-border text-text'}`}
  >
    <span className="font-mono font-bold text-base">{set.reps || <span className="text-textMuted/50">-</span>}</span>
  </div>
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
                            if (set.reps) completeSet(idx, sIdx);
                          }}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${set.reps ? 'bg-surface hover:bg-primary hover:text-white text-textMuted' : 'bg-surface text-textMuted/30 cursor-not-allowed'}`}
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
                  className="flex-1 py-3 text-sm font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 backdrop-blur-md rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                >
                  <Plus size={16} /> New Set
                </button>
                {idx < activeWorkout.exercises.length - 1 && (
                  <button 
                    onClick={() => {
                      setExpandedExerciseIndex(idx + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-3 text-sm font-bold text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 backdrop-blur-md rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
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
            className="w-full py-4 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 backdrop-blur-md transition-all shadow-[0_0_12px_rgba(59,130,246,0.1)]"
          >
            <Plus size={20} /> Add Exercise
          </motion.button>
        ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-40 bg-background flex flex-col pb-24 sm:pb-6"
        >
          <div className="p-4 pt-safe shrink-0 border-b border-border/50 bg-surface/50 backdrop-blur-xl flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search exercise..."
                className="w-full bg-surface-light border border-border/50 rounded-2xl pl-12 pr-4 py-3.5 text-text font-bold focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsSearching(false)}
              className="p-3.5 text-textMuted hover:text-text rounded-2xl bg-surface-light border border-border/50 min-w-touch min-h-touch flex items-center justify-center shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">
            {/* Scrollable Container strictly maxed to ~5 items */}
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {searchResults.map(ex => (
                  <button 
                    key={ex.id}
                    onClick={() => handleAddExercise(ex)}
                    className="w-full flex items-center justify-between gap-4 p-4 bg-surface-light/40 hover:bg-surface-light rounded-3xl transition-all text-left min-h-touch group shrink-0 border border-border/10"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm overflow-hidden">
                        {ex.gifUrl ? (
                          <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover mix-blend-screen opacity-90" loading="lazy" style={{ filter: 'grayscale(100%) contrast(1.2)' }} />
                        ) : (
                          <Dumbbell size={24} className="text-primary opacity-80" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-text font-bold text-base leading-snug truncate">{ex.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Dumbbell size={12} className="text-textMuted" />
                          <span className="text-xs font-semibold text-textMuted truncate">Dumbbell</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-black uppercase tracking-widest">{ex.muscleGroup}</span>
                      <ChevronDown size={16} className="text-textMuted -rotate-90 opacity-50" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <Search size={48} className="text-textMuted mb-4" />
                <p className="text-text font-bold">Search for an exercise</p>
                <p className="text-textMuted text-sm mt-1">Type at least 1 character</p>
              </div>
            )}

            {/* Add Custom Exercise strictly below the list */}
            {searchQuery.length > 0 && (
              <div className="shrink-0 bg-surface-light p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3 w-full">
                  <select
                    value={newMuscleGroup}
                    onChange={(e) => setNewMuscleGroup(e.target.value)}
                    className="w-1/3 bg-background border border-border/50 rounded-xl px-3 py-3.5 text-sm text-text font-bold focus:outline-none focus:border-primary capitalize min-h-touch"
                  >
                    {muscleGroups.map(mg => (
                      <option key={mg} value={mg}>{mg}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateCustom}
                    disabled={isCreatingCustom || searchQuery.trim().length < 1}
                    className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-touch shadow-lg shadow-primary/20"
                  >
                    {isCreatingCustom ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={18} className="shrink-0" />}
                    <span className="truncate">Add Custom Exercise</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      
      <CustomNumpad 
        activeInput={activeInput ? {
          field: activeInput.field,
          onChangeField: (field) => setActiveInput(prev => ({ ...prev, field })),
          onNext: () => {
            const ex = activeWorkout.exercises[activeInput.eIdx];
            if (activeInput.field === 'weight') {
              setActiveInput(prev => ({ ...prev, field: 'reps' }));
            } else if (activeInput.sIdx < ex.sets.length - 1) {
              setActiveInput({ eIdx: activeInput.eIdx, sIdx: activeInput.sIdx + 1, field: 'weight' });
            } else if (activeInput.eIdx < activeWorkout.exercises.length - 1) {
              setActiveInput({ eIdx: activeInput.eIdx + 1, sIdx: 0, field: 'weight' });
              setExpandedExerciseIndex(activeInput.eIdx + 1);
            } else {
              setActiveInput(null);
            }
          }
        } : null}
        value={activeInput ? activeWorkout.exercises[activeInput.eIdx].sets[activeInput.sIdx][activeInput.field] : ''}
        onUpdate={(val) => {
          if (activeInput) {
            updateSet(activeInput.eIdx, activeInput.sIdx, activeInput.field, val);
          }
        }}
        onClose={() => setActiveInput(null)}
      />
    </div>
  );
}

