import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Dumbbell, Plus, Trash2, Search, Settings, ChevronDown } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { convertWeight } from '../../utils/calculations';
import CustomNumpad from '../WorkoutFlow/CustomNumpad';
import { Select } from '../ui/primitives';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const CustomExerciseCard = ({ ex, onDelete, onEdit, unit, isExpanded, onToggle }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
  <View style={styles.card}>
    <Pressable onPress={onToggle} style={styles.cardHead}>
      <View style={styles.cardIcon}>
        <Settings size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text style={styles.cardMeta}>Custom</Text>
      </View>
      <View style={styles.mgBadge}>
        <Text style={styles.mgBadgeText}>{ex.muscleGroup}</Text>
      </View>
      <ChevronDown
        size={18}
        color={colors.textMuted}
        style={{ transform: [{ rotate: isExpanded ? '180deg' : '-90deg' }] }}
      />
    </Pressable>
    {isExpanded && (
      <View style={styles.cardBody}>
        <View style={styles.actionRow}>
          <Text style={styles.tinyLbl}>Actions & Sets</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onEdit(ex)} style={styles.editBtn}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(ex.id)} style={styles.delBtn}>
              <Text style={styles.delText}>Delete</Text>
            </Pressable>
          </View>
        </View>
        {(ex.defaultSets?.length > 0 ? ex.defaultSets : [{ reps: 10, weight: 0, type: 'Working' }]).map(
          (s, i) => (
            <View key={i} style={styles.setLine}>
              <Text style={styles.setLbl}>Set {i + 1}</Text>
              <Text style={styles.setVal}>
                {convertWeight(s.weight || 0, ex.unitSaved || 'lbs', unit)} {unit} - {s.reps || 10} Reps
              </Text>
            </View>
          )
        )}
      </View>
    )}
  </View>
  );
};

export default function CustomExercises() {
  const { customExercises, createCustomExercise, deleteCustomExercise, updateCustomExercise, unit } =
    useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

  const filteredExercises = useMemo(
    () =>
      customExercises
        .filter((ex) => {
          const matchesSearch =
            ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesGroup = selectedMuscleGroup === 'All' || ex.muscleGroup === selectedMuscleGroup;
          return matchesSearch && matchesGroup;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customExercises, searchQuery, selectedMuscleGroup]
  );

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
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: activeInput ? 320 : 120 }}>
          <View style={styles.formHead}>
            <Text style={styles.pageTitle}>{editingId ? 'Edit Exercise' : 'New Exercise'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setIsCreating(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateSubmit}
                disabled={isSubmitting || !newName.trim()}
                style={[styles.save, (isSubmitting || !newName.trim()) && { opacity: 0.5 }]}
              >
                {isSubmitting && <ActivityIndicator color={colors.accentFg} size={14} />}
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.label}>Exercise Name</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Hex Bar Deadlift"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Muscle Group</Text>
          <Select
            value={newMuscleGroup}
            onChange={setNewMuscleGroup}
            options={muscleGroups.map((mg) => ({ value: mg, label: mg }))}
          />
          <Text style={[styles.label, { marginTop: 16 }]}>Default Sets</Text>
          {defaultSets.map((s, i) => (
            <View key={i} style={styles.setEdit}>
              <Pressable
                onPress={() => setActiveInput({ index: i, field: 'weight' })}
                style={[
                  styles.setCell,
                  activeInput?.index === i && activeInput?.field === 'weight' && styles.setCellOn,
                ]}
              >
                <Text style={styles.tinyLbl}>{unit}</Text>
                <Text style={styles.cellVal}>{s.weight || 0}</Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveInput({ index: i, field: 'reps' })}
                style={[
                  styles.setCell,
                  activeInput?.index === i && activeInput?.field === 'reps' && styles.setCellOn,
                ]}
              >
                <Text style={styles.tinyLbl}>Reps</Text>
                <Text style={styles.cellVal}>{s.reps || 0}</Text>
              </Pressable>
              <Pressable
                onPress={() => removeSet(i)}
                disabled={defaultSets.length === 1}
                style={{ padding: 8, opacity: defaultSets.length === 1 ? 0.3 : 1 }}
              >
                <Trash2 size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addSet} style={styles.addSet}>
            <Plus size={14} color={colors.textMuted} />
            <Text style={styles.addSetText}>Add Default Set</Text>
          </Pressable>
        </ScrollView>
        <CustomNumpad
          activeInput={
            activeInput
              ? {
                  field: activeInput.field,
                  onChangeField: (field) => setActiveInput((prev) => ({ ...prev, field })),
                  onNext: () => {
                    if (activeInput.field === 'weight') {
                      setActiveInput((prev) => ({ ...prev, field: 'reps' }));
                    } else if (activeInput.index < defaultSets.length - 1) {
                      setActiveInput({ index: activeInput.index + 1, field: 'weight' });
                    } else setActiveInput(null);
                  },
                }
              : null
          }
          onClose={() => setActiveInput(null)}
          value={activeInput ? defaultSets[activeInput.index]?.[activeInput.field] : ''}
          onUpdate={(val) => activeInput && updateSet(activeInput.index, activeInput.field, val)}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: 120 }} stickyHeaderIndices={[0]}>
      <View style={styles.sticky}>
        <View style={styles.formHead}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Dumbbell size={24} color={colors.primary} />
              <Text style={styles.pageTitle}>Custom Exercises</Text>
            </View>
            <Text style={styles.sub}>Create your own exercise</Text>
          </View>
          <Pressable
            onPress={() => {
              setEditingId(null);
              setNewName('');
              setDefaultSets([{ reps: 0, weight: 0 }]);
              setIsCreating(true);
            }}
            style={styles.plusBtn}
          >
            <Plus size={24} color={colors.primary} strokeWidth={3} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor="rgba(161,161,170,0.7)"
              style={styles.searchInput}
            />
          </View>
          <View style={{ width: 120 }}>
            <Select
              value={selectedMuscleGroup}
              onChange={setSelectedMuscleGroup}
              options={filterGroups.map((g) => ({ value: g, label: g }))}
            />
          </View>
        </View>
      </View>
      {(searchQuery || selectedMuscleGroup !== 'All') && (
        <Text style={styles.results}>●  {filteredExercises.length} Results</Text>
      )}
      {filteredExercises.length === 0 ? (
        <View style={styles.empty}>
          <Dumbbell size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No custom exercises found.</Text>
        </View>
      ) : (
        filteredExercises.map((ex) => (
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
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  sticky: { backgroundColor: colors.background, paddingBottom: 8 },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pageTitle: { color: colors.text, fontFamily: fonts.black, fontSize: 24 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 12 },
  results: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textTransform: 'capitalize' },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: fonts.semibold },
  mgBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mgBadgeText: { color: colors.primary, fontSize: 10, fontFamily: fonts.bold, textTransform: 'capitalize' },
  cardBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tinyLbl: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase' },
  editBtn: { backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  editText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 12 },
  delBtn: { backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  delText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 12 },
  setLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setLbl: { color: colors.textMuted, fontFamily: fonts.bold },
  setVal: { color: colors.text, fontFamily: fonts.bold },
  empty: { alignItems: 'center', paddingVertical: 48, opacity: 0.5 },
  emptyText: { color: colors.text, fontFamily: fonts.bold, marginTop: 12 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  cancel: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelText: { color: colors.textMuted, fontFamily: fonts.bold },
  save: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveText: { color: colors.accentFg, fontFamily: fonts.bold },
  setEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setCell: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setCellOn: { borderColor: colors.primary, backgroundColor: 'rgba(59,130,246,0.1)' },
  cellVal: { color: colors.text, fontFamily: fonts.bold },
  addSet: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  addSetText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12 },
});
}

