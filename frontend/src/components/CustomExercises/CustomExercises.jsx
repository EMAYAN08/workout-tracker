import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { convertWeight } from '../../utils/calculations';
import { Dumbbell, Plus, X, Trash2, ChevronDown, ChevronUp, Edit2, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomNumpad from '../WorkoutFlow/CustomNumpad';

const CustomExerciseCard = ({ ex, onDelete, onEdit, unit, isExpanded, onToggle }) => {
  return (
    <div className="relative mb-2">
      <div className="relative z-10 bg-surface-light/40 shadow-sm rounded-3xl border border-border/10 flex flex-col w-full overflow-hidden transition-colors hover:border-primary/20">
        <div className="p-3 flex items-center justify-between gap-4 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Settings size={22} className="text-primary opacity-90" />
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
            <span className="px-2 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-bold capitalize">{ex.muscleGroup}</span>
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
  const [activeInput, setActiveInput] = useState(null);
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

  if (isCreating) {
    return (
      <div className={`flex flex-col gap-4 w-full transition-all duration-300 ${activeInput ? 'pb-[300px]' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black text-text tracking-tight">
            {editingId ? 'Edit Exercise' : 'New Exercise'}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg text-textMuted font-bold hover:bg-surface-light transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateSubmit}
              disabled={isSubmitting || !newName.trim()}
              className="bg-primary hover:bg-primary-light text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Save
            </button>
          </div>
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
                  <div 
                    onClick={() => setActiveInput({ index: i, field: 'weight' })}
                    className={`flex-1 bg-surface-light border rounded-xl px-3 py-2 flex items-center justify-between cursor-text transition-colors ${activeInput?.index === i && activeInput?.field === 'weight' ? 'border-primary ring-1 ring-primary/50 text-primary bg-primary/10' : 'border-border/50 text-text'}`}
                  >
                    <span className="text-xs font-bold text-textMuted uppercase">{unit}</span>
                    <div className="w-16 bg-transparent text-right font-mono font-bold text-text focus:outline-none">{s.weight || 0}</div>
                  </div>
                  <div 
                    onClick={() => setActiveInput({ index: i, field: 'reps' })}
                    className={`flex-1 bg-surface-light border rounded-xl px-3 py-2 flex items-center justify-between cursor-text transition-colors ${activeInput?.index === i && activeInput?.field === 'reps' ? 'border-primary ring-1 ring-primary/50 text-primary bg-primary/10' : 'border-border/50 text-text'}`}
                  >
                    <span className="text-xs font-bold text-textMuted">Reps</span>
                    <div className="w-16 bg-transparent text-right font-mono font-bold text-text focus:outline-none">{s.reps || 0}</div>
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

        {/* Custom Numpad */}
        <CustomNumpad 
          activeInput={activeInput ? {
            field: activeInput.field,
            onChangeField: (field) => setActiveInput(prev => ({ ...prev, field })),
            onNext: () => {
              if (activeInput.field === 'weight') {
                setActiveInput(prev => ({ ...prev, field: 'reps' }));
              } else if (activeInput.index < defaultSets.length - 1) {
                setActiveInput({ index: activeInput.index + 1, field: 'weight' });
              } else {
                setActiveInput(null);
              }
            }
          } : null}
          onClose={() => setActiveInput(null)}
          value={activeInput ? defaultSets[activeInput.index]?.[activeInput.field] : ''}
          onUpdate={(val) => {
            if (activeInput) {
              updateSet(activeInput.index, activeInput.field, val);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8 relative pt-0 mt-[-8px]">
      {/* Header section mimicking reference */}
      <div className="sticky top-0 z-20 bg-background pt-1 pb-2">
        {/* Header section mimicking reference */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h1 className="text-[clamp(24px,6vw,28px)] font-black text-white tracking-tight flex items-center gap-2">
              <Dumbbell className="text-primary w-6 h-6 sm:w-7 sm:h-7" /> Custom Exercises
            </h1>
            <p className="text-sm text-textMuted px-1 mt-1">Create your own exercise</p>
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewName('');
              setDefaultSets([{ reps: 0, weight: 0 }]);
              setIsCreating(true);
            }}
            className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center transition-all active:scale-95 shrink-0"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Search & Filter Dropdown */}
        <div className="flex gap-2 mb-4 px-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-[#1c1c1e] border-none rounded-2xl pl-11 pr-4 py-3.5 text-text font-semibold focus:outline-none focus:ring-1 focus:ring-border/50 placeholder:text-textMuted/70"
            />
          </div>
          
          <div className="relative shrink-0 w-32 sm:w-40">
            <select 
              value={selectedMuscleGroup}
              onChange={e => setSelectedMuscleGroup(e.target.value)}
              className="w-full bg-[#1c1c1e] text-text border-none rounded-2xl py-3.5 pl-4 pr-10 font-bold focus:outline-none focus:ring-1 focus:ring-border/50 appearance-none capitalize h-full truncate"
            >
              {filterGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {/* Results Header */}
      {searchQuery || selectedMuscleGroup !== 'All' ? (
        <p className="text-xs font-bold text-text mb-3 px-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span> {filteredExercises.length} Results</p>
      ) : null}

      <div className={`flex flex-col px-1 ${activeInput ? 'pb-[300px]' : ''}`}>
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
    </div>
  );
}
