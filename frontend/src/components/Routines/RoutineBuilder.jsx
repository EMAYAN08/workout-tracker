import React, { useState, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Search, Plus, Save, X, Dumbbell, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoutineBuilder({ initialRoutine, onCancel, onSaveSuccess }) {
  const { createRoutine, updateRoutine, createCustomExercise, unit } = useWorkout();

  const [name, setName] = useState(initialRoutine?.name || '');
  const [exercises, setExercises] = useState(initialRoutine?.exercises || []);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');

  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  useEffect(() => {
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

  const handleAddExercise = (exercise) => {
    setExercises(prev => [...prev, {
      ...exercise,
      defaultSets: [{ reps: 10, weight: 0, type: 'Working' }]
    }]);
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

  const removeExercise = (index) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].defaultSets[setIndex][field] = value;
    setExercises(newExercises);
  };

  const addSet = (exerciseIndex) => {
    const newExercises = [...exercises];
    const prevSets = newExercises[exerciseIndex].defaultSets;
    const lastSet = prevSets.length > 0 ? prevSets[prevSets.length - 1] : { reps: 10, weight: 0, type: 'Working' };
    
    newExercises[exerciseIndex].defaultSets.push({ ...lastSet });
    setExercises(newExercises);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].defaultSets.splice(setIndex, 1);
    setExercises(newExercises);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Please enter a routine name.");
    if (exercises.length === 0) return alert("Please add at least one exercise.");

    const routineData = { name, exercises };
    
    if (initialRoutine) {
      await updateRoutine(initialRoutine.id, routineData);
    } else {
      await createRoutine(routineData);
    }
    
    onSaveSuccess();
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-text tracking-tight">
          {initialRoutine ? 'Edit Routine' : 'New Routine'}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-textMuted font-bold hover:bg-surface-light transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-light text-white font-black transition-transform active:scale-95 flex items-center gap-2"
          >
            <Save size={18} /> Save
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-2 block">Routine Name</label>
        <input 
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Push Day, Full Body"
          className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text font-bold focus:outline-none focus:border-primary transition-colors text-base"
        />
      </div>

      <div className="flex flex-col gap-3">
        {exercises.map((ex, exIdx) => (
          <div key={`${ex.id}-${exIdx}`} className="panel overflow-hidden relative">
            <div className="p-4 flex items-center justify-between bg-surface-light/50 border-b border-border">
              <div className="flex items-center gap-3">
                {ex.gifUrl ? (
                  <img src={ex.gifUrl} alt={ex.name} className="w-10 h-10 rounded-full object-cover bg-white" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center">
                    <Dumbbell size={16} className="text-textMuted" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-text capitalize">{ex.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">{ex.muscleGroup}</span>
                </div>
              </div>
              <button 
                onClick={() => removeExercise(exIdx)}
                className="p-2 text-textMuted hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-textMuted px-2 mb-1">
                <div className="col-span-1 text-center">SET</div>
                <div className="col-span-5 text-center">LBS/KGS</div>
                <div className="col-span-5 text-center">REPS</div>
                <div className="col-span-1 text-center"></div>
              </div>
              
              {ex.defaultSets?.map((set, sIdx) => (
                <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center font-mono font-bold text-textMuted">{sIdx + 1}</div>
                  <div className="col-span-5">
                    <input 
                      type="number"
                      value={set.weight || ''}
                      onChange={e => updateSet(exIdx, sIdx, 'weight', Number(e.target.value))}
                      placeholder="Weight"
                      className="w-full bg-surface-light rounded-lg px-3 py-2 text-center font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder-textMuted/50 hide-arrows text-base"
                    />
                  </div>
                  <div className="col-span-5">
                    <input 
                      type="number"
                      value={set.reps || ''}
                      onChange={e => updateSet(exIdx, sIdx, 'reps', Number(e.target.value))}
                      placeholder="Reps"
                      className="w-full bg-surface-light rounded-lg px-3 py-2 text-center font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder-textMuted/50 hide-arrows text-base"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button 
                      onClick={() => removeSet(exIdx, sIdx)}
                      className="text-textMuted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => addSet(exIdx)}
                className="mt-2 text-primary font-bold text-sm hover:text-primary-light transition-colors py-1 w-full flex items-center justify-center gap-1 bg-primary/5 rounded-lg border border-primary/10"
              >
                <Plus size={16} /> Add Set
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Exercise Trigger */}
      {!isSearching ? (
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsSearching(true)}
          className="mt-2 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-4 flex items-center justify-center gap-2 font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.1)]"
        >
          <Plus size={24} /> Add Exercise
        </motion.button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-4"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-text">Search Exercise</h3>
            <button onClick={() => setIsSearching(false)} className="text-textMuted hover:text-text">
              <X size={20} />
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Bench Press" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-xl pl-10 pr-4 py-3 text-text font-bold focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {searchResults.length > 0 ? (
              searchResults.map(ex => (
                <button 
                  key={ex.id}
                  onClick={() => handleAddExercise(ex)}
                  className="flex items-center gap-3 p-3 bg-surface-light hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-border text-left"
                >
                  {ex.gifUrl ? (
                    <img src={ex.gifUrl} alt={ex.name} className="w-12 h-12 rounded-full object-cover bg-white ring-2 ring-surface-light" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center ring-2 ring-surface-light">
                      <Dumbbell size={20} className="text-textMuted" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-text capitalize leading-tight">{ex.name}</h4>
                    <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">{ex.muscleGroup}</span>
                  </div>
                </button>
              ))
            ) : searchQuery.length > 2 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-textMuted font-semibold text-sm mb-3">No exercises found for "{searchQuery}"</p>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <select
                    value={newMuscleGroup}
                    onChange={(e) => setNewMuscleGroup(e.target.value)}
                    className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text font-semibold focus:outline-none focus:border-primary"
                  >
                    {muscleGroups.map(mg => (
                      <option key={mg} value={mg}>{mg}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateCustom}
                    disabled={isCreatingCustom}
                    className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isCreatingCustom ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={16} />}
                    Create Custom
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-textMuted text-sm font-semibold">
                Type at least 3 characters
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
