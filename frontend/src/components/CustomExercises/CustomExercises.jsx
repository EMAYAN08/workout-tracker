import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Dumbbell, Plus, Trash2, Search, ChevronDown } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { convertWeight } from '../../utils/calculations';
import CustomNumpad from '../WorkoutFlow/CustomNumpad';
import { Select, ScreenHeader, hideScroll, MuscleTag } from '../ui/primitives';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { titleCase } from '../../utils/format';

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];
const FILTER_GROUPS = ['All', ...MUSCLE_GROUPS];

const blankSet = () => ({ reps: 0, weight: 0, type: 'Working' });

const cloneSets = (sets) =>
  (Array.isArray(sets) && sets.length > 0 ? sets : [blankSet()]).map((s) => ({
    type: s.type || 'Working',
    reps: s.reps ?? 0,
    weight: s.weight ?? 0,
  }));

const numericSets = (sets) =>
  cloneSets(sets).map((s) => ({
    ...s,
    reps: Number(s.reps) || 0,
    weight: Number(s.weight) || 0,
  }));

// Survive remount when the keypad hides the tab bar (parent swaps wrappers).
const draft = {
  isCreating: false,
  activeInput: null,
  editingId: null,
  activeExerciseId: null,
  searchQuery: '',
  selectedMuscleGroup: 'All',
  newName: '',
  newMuscleGroup: 'chest',
  defaultSets: [blankSet()],
};

function useDraftState(key) {
  const [value, setValue] = useState(() => draft[key]);
  const set = (next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      draft[key] = resolved;
      return resolved;
    });
  };
  return [value, set];
}

const CustomExerciseCard = ({ ex, onDelete, onEdit, unit, isExpanded, onToggle }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const sets = ex.defaultSets?.length > 0 ? ex.defaultSets : [blankSet()];
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHead} accessibilityLabel={`Toggle ${ex.name}`}>
        <View style={styles.cardIcon}>
          <Dumbbell size={22} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {ex.name}
          </Text>
          <Text style={styles.cardMeta}>Custom</Text>
        </View>
        <MuscleTag group={ex.muscleGroup} />
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
            <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
              <Pressable onPress={() => onEdit(ex)} style={styles.editBtn} accessibilityLabel="Edit exercise">
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(ex.id)}
                style={styles.delBtn}
                accessibilityLabel="Delete exercise"
              >
                <Text style={styles.delText}>Delete</Text>
              </Pressable>
            </View>
          </View>
          {sets.map((s, i) => (
            <View key={i} style={styles.setLine}>
              <Text style={styles.setLbl}>Set {i + 1}</Text>
              <Text style={styles.setVal}>
                {convertWeight(s.weight ?? 0, ex.unitSaved || 'lbs', unit)} {unit} - {s.reps ?? 0} Reps
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default function CustomExercises({ scrollRef, popRef }) {
  const { customExercises, createCustomExercise, deleteCustomExercise, updateCustomExercise, unit } =
    useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [isCreating, setIsCreating] = useDraftState('isCreating');
  const [hostH, setHostH] = useState(0);
  const [activeInput, setActiveInput] = useDraftState('activeInput');
  const [editingId, setEditingId] = useDraftState('editingId');
  const [activeExerciseId, setActiveExerciseId] = useDraftState('activeExerciseId');
  const [searchQuery, setSearchQuery] = useDraftState('searchQuery');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useDraftState('selectedMuscleGroup');
  const [newName, setNewName] = useDraftState('newName');
  const [newMuscleGroup, setNewMuscleGroup] = useDraftState('newMuscleGroup');
  const [defaultSets, setDefaultSets] = useDraftState('defaultSets');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customExercises
      .filter((ex) => {
        const name = (ex.name || '').toLowerCase();
        const group = (ex.muscleGroup || '').toLowerCase();
        const matchesSearch = !q || name.includes(q) || group.includes(q);
        const matchesGroup =
          selectedMuscleGroup === 'All' || group === String(selectedMuscleGroup || '').toLowerCase();
        return matchesSearch && matchesGroup;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customExercises, searchQuery, selectedMuscleGroup]);

  const applyBlankForm = () => {
    setEditingId(null);
    setNewName('');
    setNewMuscleGroup('chest');
    setDefaultSets([blankSet()]);
    setActiveInput(null);
  };

  const resetForm = () => {
    setIsCreating(false);
    applyBlankForm();
  };

  useEffect(() => {
    if (!popRef) return undefined;
    popRef.current = () => resetForm();
    return () => {
      popRef.current = null;
    };
  });

  const startCreate = () => {
    applyBlankForm();
    setIsCreating(true);
  };

  const handleEditInit = (ex) => {
    setEditingId(ex.id);
    setNewName(ex.name || '');
    setNewMuscleGroup(ex.muscleGroup || 'chest');
    setDefaultSets(cloneSets(ex.defaultSets));
    setActiveInput(null);
    setIsCreating(true);
  };

  const handleCreateSubmit = async () => {
    const name = newName.trim();
    if (!name) return;
    const setsToSave = numericSets(defaultSets);
    setIsSubmitting(true);
    setActiveInput(null);
    try {
      if (editingId) {
        await updateCustomExercise(editingId, {
          name,
          muscleGroup: newMuscleGroup,
          defaultSets: setsToSave,
          unitSaved: unit,
        });
      } else {
        await createCustomExercise(name, newMuscleGroup, setsToSave);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSet = () => setDefaultSets((prev) => [...prev, blankSet()]);

  const updateSet = (index, field, value) => {
    setDefaultSets((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    });
  };

  const removeSet = (index) => {
    setDefaultSets((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveInput((prev) => {
      if (!prev) return null;
      if (prev.index === index) return null;
      if (prev.index > index) return { ...prev, index: prev.index - 1 };
      return prev;
    });
  };

  const activeSet = activeInput ? defaultSets[activeInput.index] : undefined;
  const keypadOpen = !!(activeInput && activeSet);

  if (isCreating) {
    const canSave = !!newName.trim() && !isSubmitting;
    return (
      <View style={{ flex: 1, position: 'relative' }}>
        <ScreenHeader
          title={editingId ? 'Edit Exercise' : 'New Exercise'}
          right={
            <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
              <Pressable onPress={resetForm} style={styles.cancel} accessibilityLabel="Cancel">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateSubmit}
                disabled={!canSave}
                accessibilityLabel="Save"
                style={[styles.save, !canSave && { opacity: 0.5 }]}
              >
                {isSubmitting && <ActivityIndicator color={colors.accentFg} size={14} />}
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          }
        />
        <View
          style={{ flex: 1, position: 'relative' }}
          onLayout={(e) => {
            const next = Math.round(e.nativeEvent.layout.height);
            if (next > 0 && next !== hostH) setHostH(next);
          }}
        >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!keypadOpen}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          {...hideScroll}
        >
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
            options={MUSCLE_GROUPS.map((mg) => ({ value: mg, label: titleCase(mg) }))}
          />
          <Text style={[styles.label, { marginTop: 16 }]}>Default Sets</Text>
          {defaultSets.map((s, i) => (
            <View key={i} style={styles.setEdit}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveInput({ index: i, field: 'weight' });
                }}
                accessibilityLabel={`Set ${i + 1} weight`}
                style={[
                  styles.setCell,
                  keypadOpen && activeInput.index === i && activeInput.field === 'weight' && styles.setCellOn,
                ]}
              >
                <Text style={styles.tinyLbl}>{unit}</Text>
                <Text style={styles.cellVal}>{s.weight || 0}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveInput({ index: i, field: 'reps' });
                }}
                accessibilityLabel={`Set ${i + 1} reps`}
                style={[
                  styles.setCell,
                  keypadOpen && activeInput.index === i && activeInput.field === 'reps' && styles.setCellOn,
                ]}
              >
                <Text style={styles.tinyLbl}>Reps</Text>
                <Text style={styles.cellVal}>{s.reps || 0}</Text>
              </Pressable>
              <Pressable
                onPress={() => removeSet(i)}
                disabled={defaultSets.length === 1}
                accessibilityLabel="Remove set"
                style={{
                  padding: 10,
                  minWidth: HIT,
                  minHeight: HIT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: defaultSets.length === 1 ? 0.3 : 1,
                }}
              >
                <Trash2 size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addSet} style={styles.addSet} accessibilityLabel="Add default set">
            <Plus size={14} color={colors.textMuted} />
            <Text style={styles.addSetText}>Add Default Set</Text>
          </Pressable>
        </ScrollView>
        <CustomNumpad
          activeInput={
            keypadOpen
              ? {
                  field: activeInput.field,
                  targetId: `${activeInput.index}-${activeInput.field}`,
                  onChangeField: (field) => setActiveInput((prev) => (prev ? { ...prev, field } : prev)),
                  onNext: () => {
                    if (activeInput.field === 'weight') {
                      setActiveInput((prev) => (prev ? { ...prev, field: 'reps' } : prev));
                    } else if (activeInput.index < defaultSets.length - 1) {
                      setActiveInput({ index: activeInput.index + 1, field: 'weight' });
                    } else setActiveInput(null);
                  },
                }
              : null
          }
          onClose={() => setActiveInput(null)}
          preview={
            keypadOpen
              ? {
                  title: newName.trim() || 'Custom exercise',
                  meta: titleCase(newMuscleGroup),
                  sets: defaultSets,
                  setIndex: activeInput.index,
                  unit,
                  onSelectCell: (i, field) => setActiveInput({ index: i, field }),
                }
              : null
          }
          value={keypadOpen ? activeSet?.[activeInput.field] ?? '' : ''}
          onUpdate={(val) => {
            if (!activeInput || activeInput.index == null || activeInput.index >= defaultSets.length) return;
            updateSet(activeInput.index, activeInput.field, val);
          }}
          hostHeight={hostH}
        />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Exercises"
        subtitle="Create your own exercise"
        right={
          <Pressable onPress={startCreate} style={styles.plusBtn} accessibilityLabel="Create exercise">
            <Plus size={24} color={colors.text} strokeWidth={3} />
          </Pressable>
        }
      />
      <View style={styles.searchBar}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterWrap}>
          <Select
            value={selectedMuscleGroup}
            onChange={setSelectedMuscleGroup}
            options={FILTER_GROUPS.map((g) => ({ value: g, label: g === 'All' ? 'All' : titleCase(g) }))}
          />
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
        {...hideScroll}
      >
      {(searchQuery.trim() || selectedMuscleGroup !== 'All') && (
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
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    plusBtn: {
      width: HIT,
      height: HIT,
      borderRadius: radius.sm,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    searchBar: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterWrap: { width: 128, flexShrink: 0 },
    searchInput: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 12 },
    results: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, marginBottom: 8 },
    card: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      overflow: 'hidden',
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardName: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textTransform: 'capitalize' },
    cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: fonts.semibold },
    mgBadge: {
      backgroundColor: 'transparent',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.xs,
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    mgBadgeText: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bold, textTransform: 'capitalize' },
    cardBody: {
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: 6,
    },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    tinyLbl: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase' },
    editBtn: {
      backgroundColor: 'transparent',
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: HIT,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      justifyContent: 'center',
    },
    editText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
    delBtn: {
      backgroundColor: 'transparent',
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: HIT,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      justifyContent: 'center',
    },
    delText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 13 },
    setLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.sm,
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
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: HIT,
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 16,
    },
    cancel: {
      paddingHorizontal: 14,
      minHeight: HIT,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.sm,
    },
    cancelText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
    save: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      minHeight: HIT,
      borderRadius: radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    saveText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 15 },
    setEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    setCell: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: HIT,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    setCellOn: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
    cellVal: { color: colors.text, fontFamily: fonts.bold },
    addSet: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: colors.borderStrong,
      borderRadius: radius.sm,
      paddingVertical: 10,
      minHeight: HIT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 4,
    },
    addSetText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12 },
  });
}
