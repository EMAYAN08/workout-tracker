import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { convertWeight } from '../../utils/calculations';
import { Dumbbell, Plus, X, Trash2, ChevronDown, ChevronUp, Edit2, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomExerciseCard = ({ ex, onDelete, onEdit, unit, isExpanded, onToggle }) => {
  return (
    <div className="relative mb-2">
      <div className="relative z-10 bg-surface-light/40 shadow-sm rounded-3xl border border-border/10 flex flex-col w-full overflow-hidden transition-colors hover:border-primary/20">
        <div className="p-3 flex items-center justify-between gap-4 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-[#3b2d21] flex items-center justify-center shrink-0">
              <Settings size={22} className="text-[#fca966] opacity-90" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-text capitalize text-base leading-snug truncate">{ex.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Dumbbell size={10} className="text-textMuted" />
                <span className="text-xs font-semibold text-textMuted truncate capitalize">Custom</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-2 py-1 rounded-lg bg-[#3b2d21] text-[#fca966] text-[10px] font-bold capitalize">{ex.muscleGroup}</span>
            <ChevronDown size={18} className={`text-textMuted transition-transform duration-300 ${isExpanded ? 'rotate-180' : '-rotate-90'}`} />
          </div>
        </div>
        
        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 overflow-hidden bg-surface rounded-b-xl"
            >
               <div className="pt-3 border-t border-border mt-1">
                 <div className="flex items-center justify-between mb-3">
                   <h5 className="text-[10px] font-bold uppercase tracking-wider text-textMuted">Actions & Sets</h5>
                   <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onEdit(ex); }} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(ex.id); }} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold">Delete</button>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1.5">
                   {(ex.defaultSets && ex.defaultSets.length > 0 ? ex.defaultSets : [{ reps: 10, weight: 0, type: 'Working' }]).map((s, i) => (
                     <div key={i} className="flex justify-between items-center text-sm font-mono bg-surface-light px-3 py-1.5 rounded-lg border border-border/50">
                       <span className="text-textMuted font-bold">Set {i+1}</span>
                       <span className="text-text font-bold">
                         {convertWeight(s.weight || 0, ex.unitSaved || 'lbs', unit)} <span className="text-xs text-textMuted uppercase">{unit}</span> - {s.reps || 10} Reps
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function CustomExercises({ onNavigate }) {
  const { customExercises, createCustomExercise, deleteCustomExercise, updateCustomExercise, unit } = useWorkout();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeExerciseId, setActiveExerciseId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');
  
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const [defaultSets, setDefaultSets] = useState([{ reps: 0, weight: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];
  const filterGroups = ['All', ...muscleGroups];

  const filteredExercises = useMemo(() => {
    return customExercises.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGroup = selectedMuscleGroup === 'All' || ex.muscleGroup === selectedMuscleGroup;
      return matchesSearch && matchesGroup;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [customExercises, searchQuery, selectedMuscleGroup]);

  const activeMuscleGroupsCount = new Set(customExercises.map(ex => ex.muscleGroup)).size;

  const handleEditInit = (ex) => {
    setEditingId(ex.id);
    setNewName(ex.name);
    setNewMuscleGroup(ex.muscleGroup);
    setDefaultSets(ex.defaultSets?.length > 0 ? [...ex.defaultSets] : [{ reps: 0, weight: 0 }]);
    setIsCreating(true);
  };

  const handleCreateSubmit = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    if (editingId) {
      await updateCustomExercise(editingId, { name: newName, muscleGroup: newMuscleGroup, defaultSets });
    } else {
      await createCustomExercise(newName, newMuscleGroup, defaultSets);
    }
    setIsSubmitting(false);
    setIsCreating(false);
    setEditingId(null);
    setNewName('');
    setDefaultSets([{ reps: 0, weight: 0 }]);
  };

  const addSet = () => setDefaultSets([...defaultSets, { reps: 0, weight: 0 }]);
  const updateSet = (index, field, value) => {
    const newSets = [...defaultSets];
    newSets[index][field] = value;
    setDefaultSets(newSets);
  };
  const removeSet = (index) => setDefaultSets(defaultSets.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col w-full pb-8 relative pt-2">
      {/* Header section mimicking reference */}
      <div className="sticky top-0 z-20 bg-background pt-2 pb-2">
        {/* Header section mimicking reference */}
        <div className="flex items-center justify-between mb-1 px-1">
          <h1 className="text-[32px] font-black text-white tracking-tight">Custom Exercises</h1>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewName('');
              setDefaultSets([{ reps: 0, weight: 0 }]);
              setIsCreating(true);
            }}
            className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center transition-all active:scale-95"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
        <p className="text-sm text-textMuted px-1 mb-6">Create your own exercise</p>

        {/* Search Bar */}
        <div className="relative mb-5 px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises or muscle groups"
            className="w-full bg-[#1c1c1e] border-none rounded-2xl pl-12 pr-4 py-3.5 text-text font-semibold focus:outline-none focus:ring-1 focus:ring-border/50 placeholder:text-textMuted/70"
          />
        </div>

        {/* Muscle Group Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 -mx-4 sm:mx-0 pl-4 sm:pl-1 pr-4 sm:pr-0">
          {filterGroups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedMuscleGroup(group)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold capitalize transition-colors ${selectedMuscleGroup === group ? 'bg-[#fca966] text-black' : 'bg-[#1c1c1e] text-textMuted hover:text-white'}`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      {searchQuery || selectedMuscleGroup !== 'All' ? (
        <p className="text-xs font-bold text-text mb-3 px-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#fca966]"></span> {filteredExercises.length} Results</p>
      ) : null}

      <div className="flex flex-col px-1">
        {filteredExercises.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 opacity-50">
             <Dumbbell size={48} className="text-textMuted mb-4" />
             <p className="text-text font-bold">No custom exercises found.</p>
           </div>
        ) : (
          filteredExercises.map(ex => (
            <CustomExerciseCard 
              key={ex.id} 
              ex={ex} 
              unit={unit}
              onDelete={deleteCustomExercise}
              onEdit={handleEditInit}
              isExpanded={activeExerciseId === ex.id}
              onToggle={() => setActiveExerciseId(activeExerciseId === ex.id ? null : ex.id)}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-border/50 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-text text-xl">{editingId ? 'Edit Exercise' : 'New Exercise'}</h3>
                <button onClick={() => setIsCreating(false)} className="text-textMuted hover:text-text bg-surface-light p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-textMuted mb-1.5 block">Exercise Name</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Hex Bar Deadlift"
                    className="w-full bg-surface-light border border-border/50 rounded-xl px-4 py-3 text-text font-bold focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-textMuted mb-1.5 block">Muscle Group</label>
                  <select 
                    value={newMuscleGroup} 
                    onChange={e => setNewMuscleGroup(e.target.value)}
                    className="w-full bg-surface-light border border-border/50 rounded-xl px-4 py-3 text-text font-bold capitalize focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    {muscleGroups.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                  </select>
                </div>
  
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-textMuted">Default Sets</label>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {defaultSets.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <div className="flex-1 bg-surface-light border border-border/50 rounded-xl px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-textMuted">Reps</span>
                          <input 
                            type="number" min="0" value={s.reps} 
                            onChange={e => updateSet(i, 'reps', parseInt(e.target.value)||0)}
                            className="w-16 bg-transparent text-right font-mono font-bold text-text focus:outline-none"
                          />
                        </div>
                        <div className="flex-1 bg-surface-light border border-border/50 rounded-xl px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-textMuted uppercase">{unit}</span>
                          <input 
                            type="number" min="0" value={s.weight} 
                            onChange={e => updateSet(i, 'weight', parseFloat(e.target.value)||0)}
                            className="w-16 bg-transparent text-right font-mono font-bold text-text focus:outline-none"
                          />
                        </div>
                        <button onClick={() => removeSet(i)} disabled={defaultSets.length === 1} className="p-2 text-textMuted hover:text-red-400 disabled:opacity-30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    
                    <button onClick={addSet} className="w-full py-2.5 mt-1 border-2 border-dashed border-border/50 rounded-xl text-xs font-bold text-textMuted hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-1">
                      <Plus size={14} /> Add Default Set
                    </button>
                  </div>
                </div>
              </div>
  
              <button 
                onClick={handleCreateSubmit}
                disabled={isSubmitting || !newName.trim()}
                className="w-full mt-4 bg-primary hover:bg-primary-light text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 disabled:opacity-50 text-base"
              >
                {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Exercise')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
