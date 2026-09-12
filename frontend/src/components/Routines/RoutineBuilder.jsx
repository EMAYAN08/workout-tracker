import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  Save,
  X,
  Dumbbell,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import CustomNumpad from '../WorkoutFlow/CustomNumpad';
import { convertWeight } from '../../utils/calculations';
import { Select, ScreenHeader, hideScroll } from '../ui/primitives';
import { alertMessage } from '../../dialog';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function RoutineBuilder({ initialRoutine, onCancel, onSaveSuccess }) {
  const { createRoutine, updateRoutine, createCustomExercise, updateCustomExercise, unit, searchExercises } =
    useWorkout();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [name, setName] = useState(initialRoutine?.name || '');
  const [newCustomExIds, setNewCustomExIds] = useState([]);
  const [exercises, setExercises] = useState(() => {
    if (!initialRoutine?.exercises) return [];
    return initialRoutine.exercises.map((ex) => ({
      ...ex,
      unitSaved: unit,
      defaultSets: (ex.defaultSets || []).map((s) => ({
        ...s,
        weight: convertWeight(s.weight, ex.unitSaved || 'lbs', unit),
      })),
    }));
  });
  const prevUnit = React.useRef(unit);
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInput, setActiveInput] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  useEffect(() => {
    if (prevUnit.current !== unit) {
      setExercises((prevExercises) =>
        prevExercises.map((ex) => ({
          ...ex,
          unitSaved: unit,
          defaultSets: (ex.defaultSets || []).map((s) => ({
            ...s,
            weight: convertWeight(s.weight, prevUnit.current, unit),
          })),
        }))
      );
      prevUnit.current = unit;
    }
  }, [unit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchResults(searchQuery.trim().length > 0 ? searchExercises(searchQuery) : []);
    }, 180);
    return () => clearTimeout(t);
  }, [searchQuery, searchExercises]);

  const handleAddExercise = (exercise) => {
    let initialSets = [{ reps: 10, weight: 0, type: 'Working' }];
    if (exercise.defaultSets && exercise.defaultSets.length > 0) {
      initialSets = exercise.defaultSets.map((s) => ({
        reps: s.reps || 10,
        weight: convertWeight(s.weight || 0, exercise.unitSaved || 'lbs', unit),
        type: 'Working',
      }));
    }
    const newItem = { ...exercise, unitSaved: unit, defaultSets: initialSets };
    setExercises((prev) => [...prev, newItem]);
    setExpandedExerciseIndex(exercises.length);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const moveExercise = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    setExercises((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setExpandedExerciseIndex((cur) => {
      if (cur === index) return target;
      if (cur === target) return index;
      return cur;
    });
  };

  const handleCreateCustom = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsCreatingCustom(true);
    const newEx = await createCustomExercise(trimmed, newMuscleGroup);
    if (newEx) {
      handleAddExercise(newEx);
      setNewCustomExIds((prev) => [...prev, newEx.id]);
    }
    setIsCreatingCustom(false);
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setExpandedExerciseIndex((cur) => {
      if (cur < 0) return cur;
      if (cur === index) return -1;
      if (cur > index) return cur - 1;
      return cur;
    });
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : {
              ...ex,
              defaultSets: (ex.defaultSets || []).map((s, j) => (j !== setIndex ? s : { ...s, [field]: value })),
            }
      )
    );
  };

  const addSet = (exerciseIndex) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const prevSets = ex.defaultSets || [];
        const lastSet = prevSets.length > 0 ? prevSets[prevSets.length - 1] : { reps: 10, weight: 0, type: 'Working' };
        return { ...ex, defaultSets: [...prevSets, { ...lastSet }] };
      })
    );
  };

  const removeSet = (exerciseIndex, setIndex) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const sets = ex.defaultSets || [];
        if (sets.length <= 1) return ex;
        return { ...ex, defaultSets: sets.filter((_, j) => j !== setIndex) };
      })
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alertMessage('Routine name', 'Please enter a routine name.');
      return;
    }
    setActiveInput(null);
    const routineData = { name: name.trim(), exercises };
    if (initialRoutine) await updateRoutine(initialRoutine.id, routineData);
    else await createRoutine(routineData);
    for (const ex of exercises) {
      if (newCustomExIds.includes(ex.id)) {
        await updateCustomExercise(ex.id, { defaultSets: ex.defaultSets });
      }
    }
    onSaveSuccess();
  };

  const queryEmpty = searchQuery.trim().length === 0;
  const customDisabled = isCreatingCustom || queryEmpty;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <ScreenHeader
        title={initialRoutine ? 'Edit Routine' : 'New Routine'}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onCancel} style={styles.cancel} accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.save} accessibilityLabel="Save">
              <Save size={16} color={colors.accentFg} />
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: activeInput ? 320 : 120 }}
        keyboardShouldPersistTaps="handled"
        {...hideScroll}
      >

        <View style={styles.panel}>
          <Text style={styles.label}>Routine Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day, Full Body"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        {exercises.length === 0 && (
          <View style={styles.restHint}>
            <Text style={styles.restHintText}>Saving with 0 exercises will create a Rest Day routine</Text>
          </View>
        )}

        {exercises.map((ex, exIdx) => {
          const isExpanded = expandedExerciseIndex === exIdx;
          const sets = ex.defaultSets || [];
          return (
            <View key={`${ex.id}-${exIdx}`} style={styles.card}>
              <View style={styles.cardHead}>
                <Pressable
                  onPress={() => setExpandedExerciseIndex(isExpanded ? -1 : exIdx)}
                  style={styles.cardHeadMain}
                  accessibilityLabel={isExpanded ? 'Collapse exercise' : 'Expand exercise'}
                >
                  {ex.gifUrl ? (
                    <Image source={{ uri: ex.gifUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbFallback}>
                      <Dumbbell size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exMg}>{ex.muscleGroup}</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={colors.textMuted} />
                  )}
                </Pressable>
                <View style={styles.cardActions}>
                  {exIdx > 0 && (
                    <Pressable
                      onPress={() => moveExercise(exIdx, 'up')}
                      accessibilityLabel="Move exercise up"
                      style={styles.iconHit}
                    >
                      <ArrowUp size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                  {exIdx < exercises.length - 1 && (
                    <Pressable
                      onPress={() => moveExercise(exIdx, 'down')}
                      accessibilityLabel="Move exercise down"
                      style={styles.iconHit}
                    >
                      <ArrowDown size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => removeExercise(exIdx)}
                    accessibilityLabel="Remove exercise"
                    style={styles.delEx}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
              {isExpanded && (
                <View style={{ padding: 14, gap: 8 }}>
                  <View style={styles.setHead}>
                    <Text style={[styles.th, { width: 32 }]}>SET</Text>
                    <Text style={[styles.th, { flex: 1 }]}>{unit === 'kgs' ? 'KG' : 'LB'}</Text>
                    <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
                    <View style={{ width: 32 }} />
                  </View>
                  {sets.map((set, sIdx) => {
                    const wOn =
                      activeInput?.exerciseIndex === exIdx &&
                      activeInput?.setIndex === sIdx &&
                      activeInput?.field === 'weight';
                    const rOn =
                      activeInput?.exerciseIndex === exIdx &&
                      activeInput?.setIndex === sIdx &&
                      activeInput?.field === 'reps';
                    const lastSet = sets.length <= 1;
                    const weightEmpty =
                      set.weight === '' || set.weight === null || set.weight === undefined || Number(set.weight) === 0;
                    const repsEmpty = set.reps === '' || set.reps === null || set.reps === undefined;
                    return (
                      <View key={sIdx} style={styles.setRow}>
                        <Text style={styles.setIdx}>{sIdx + 1}</Text>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setActiveInput({ exerciseIndex: exIdx, setIndex: sIdx, field: 'weight' });
                          }}
                          style={[styles.cell, wOn && styles.cellOn]}
                          accessibilityLabel="Weight"
                        >
                          <Text style={[styles.cellText, weightEmpty && { color: colors.textSubtle }]}>
                            {weightEmpty ? 'Weight' : String(set.weight)}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setActiveInput({ exerciseIndex: exIdx, setIndex: sIdx, field: 'reps' });
                          }}
                          style={[styles.cell, rOn && styles.cellOn]}
                          accessibilityLabel="Reps"
                        >
                          <Text style={[styles.cellText, repsEmpty && { color: colors.textSubtle }]}>
                            {repsEmpty ? 'Reps' : String(set.reps)}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeSet(exIdx, sIdx)}
                          disabled={lastSet}
                          accessibilityLabel="Remove set"
                          style={[styles.delSet, lastSet && { opacity: 0.35 }]}
                        >
                          <Trash2 size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                  <Pressable onPress={() => addSet(exIdx)} style={styles.addSet} accessibilityLabel="Add Set">
                    <Plus size={16} color={colors.text} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <Pressable onPress={() => setIsSearching(true)} style={styles.addEx} accessibilityLabel="Add Exercise">
          <Plus size={22} color={colors.text} />
          <Text style={styles.addExText}>Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={isSearching} animationType="slide" onRequestClose={() => setIsSearching(false)}>
        <View style={[styles.searchRoot, { paddingTop: insets.top }]}>
          <View style={styles.searchBar}>
            <View style={styles.searchWrap}>
              <Search size={20} color={colors.textMuted} />
              <TextInput
                autoFocus
                placeholder="Search exercise..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>
            <Pressable
              onPress={() => setIsSearching(false)}
              style={styles.searchClose}
              accessibilityLabel="Close search"
            >
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            {...hideScroll}
          >
            {searchResults.map((ex, i) => (
              <Pressable
                key={`${ex.id}-${i}`}
                onPress={() => handleAddExercise(ex)}
                style={styles.searchItem}
                accessibilityLabel={`Add ${ex.name}`}
              >
                <View style={styles.searchThumb}>
                  {ex.gifUrl ? (
                    <Image source={{ uri: ex.gifUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Dumbbell size={24} color={colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchName} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={styles.searchMeta}>{ex.muscleGroup || 'Exercise'}</Text>
                </View>
                <View style={styles.mgBadge}>
                  <Text style={styles.mgBadgeText}>{ex.muscleGroup}</Text>
                </View>
              </Pressable>
            ))}
            {searchResults.length === 0 && queryEmpty && (
              <View style={styles.emptySearch}>
                <Search size={48} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontFamily: fonts.bold, marginTop: 12 }}>
                  Search for an exercise
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Type at least 1 character</Text>
              </View>
            )}
            {searchResults.length === 0 && !queryEmpty && (
              <View style={styles.emptySearch}>
                <Search size={48} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontFamily: fonts.bold, marginTop: 12 }}>No results</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  Try another search or add a custom exercise
                </Text>
              </View>
            )}
            {searchQuery.length > 0 && (
            <View style={styles.customBox}>
              <Select
                value={newMuscleGroup}
                onChange={setNewMuscleGroup}
                options={muscleGroups.map((mg) => ({ value: mg, label: mg }))}
                style={{ width: 120 }}
              />
              <Pressable
                onPress={handleCreateCustom}
                disabled={customDisabled}
                accessibilityLabel="Add Custom Exercise"
                style={[styles.customAdd, customDisabled && { opacity: 0.5 }]}
              >
                {isCreatingCustom ? (
                  <ActivityIndicator color={colors.accentFg} />
                ) : (
                  <>
                    <Plus size={18} color={colors.accentFg} />
                    <Text style={{ color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 15 }}>
                      Add Custom Exercise
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <CustomNumpad
        activeInput={
          activeInput
            ? {
                field: activeInput.field,
                onChangeField: (field) => setActiveInput((prev) => (prev ? { ...prev, field } : prev)),
                onNext: () => {
                  const ex = exercises[activeInput.exerciseIndex];
                  if (!ex) {
                    setActiveInput(null);
                    return;
                  }
                  const sets = ex.defaultSets || [];
                  if (activeInput.field === 'weight') {
                    setActiveInput((prev) => (prev ? { ...prev, field: 'reps' } : prev));
                  } else if (activeInput.setIndex < sets.length - 1) {
                    setActiveInput({
                      exerciseIndex: activeInput.exerciseIndex,
                      setIndex: activeInput.setIndex + 1,
                      field: 'weight',
                    });
                  } else if (activeInput.exerciseIndex < exercises.length - 1) {
                    const nextIdx = activeInput.exerciseIndex + 1;
                    setExpandedExerciseIndex(nextIdx);
                    setActiveInput({
                      exerciseIndex: nextIdx,
                      setIndex: 0,
                      field: 'weight',
                    });
                  } else setActiveInput(null);
                },
              }
            : null
        }
        onClose={() => setActiveInput(null)}
        value={
          activeInput
            ? exercises[activeInput.exerciseIndex]?.defaultSets?.[activeInput.setIndex]?.[activeInput.field]
            : ''
        }
        onUpdate={(val) => {
          if (!activeInput) return;
          const ex = exercises[activeInput.exerciseIndex];
          if (!ex?.defaultSets?.[activeInput.setIndex]) return;
          updateSet(activeInput.exerciseIndex, activeInput.setIndex, activeInput.field, val);
        }}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: colors.text, fontFamily: fonts.black, fontSize: 24 },
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      minHeight: HIT,
      borderRadius: radius.sm,
    },
    saveText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 15 },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
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
    restHint: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: 14,
      marginBottom: 10,
    },
    restHintText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: 'hidden',
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 8,
      paddingLeft: 12,
      backgroundColor: colors.surface2,
    },
    cardHeadMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: HIT,
    },
    cardActions: { flexDirection: 'row', alignItems: 'center' },
    iconHit: {
      width: HIT,
      height: HIT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface },
    thumbFallback: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exName: { color: colors.text, fontFamily: fonts.bold, textTransform: 'capitalize' },
    exMg: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    delEx: {
      width: HIT,
      height: HIT,
      marginLeft: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    setHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    th: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.bold,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    setIdx: { width: 32, textAlign: 'center', color: colors.textMuted, fontFamily: fonts.bold },
    cell: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 10,
      minHeight: HIT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellOn: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
    cellText: { color: colors.text, fontFamily: fonts.monoBold },
    delSet: {
      width: HIT,
      height: HIT,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderRadius: radius.sm,
    },
    addSet: {
      marginTop: 6,
      paddingVertical: 8,
      minHeight: HIT,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    addSetText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
    addEx: {
      marginTop: 8,
      minHeight: HIT,
      borderRadius: radius.sm,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    addExText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
    searchRoot: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceLight,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 16, paddingVertical: 12 },
    searchClose: {
      width: HIT,
      height: HIT,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchThumb: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchName: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
    searchMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    mgBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mgBadgeText: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.black,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    emptySearch: { alignItems: 'center', paddingVertical: 48, opacity: 0.6 },
    customBox: {
      marginTop: 8,
      backgroundColor: colors.surfaceLight,
      borderRadius: radius.sm,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    customAdd: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingVertical: 14,
      minHeight: HIT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
  });
}
