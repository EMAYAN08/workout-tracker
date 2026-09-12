import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
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
import { API_URL } from '../../config';
import { Select } from '../ui/primitives';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function RoutineBuilder({ initialRoutine, onCancel, onSaveSuccess }) {
  const { createRoutine, updateRoutine, createCustomExercise, updateCustomExercise, customExercises, unit } =
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
          defaultSets: ex.defaultSets.map((s) => ({
            ...s,
            weight: convertWeight(s.weight, prevUnit.current, unit),
          })),
        }))
      );
      prevUnit.current = unit;
    }
  }, [unit]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.length > 0) {
        try {
          const query = searchQuery.toLowerCase();
          const localMatches = (customExercises || []).filter(
            (ex) =>
              ex.name.toLowerCase().includes(query) ||
              (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(query))
          );
          const res = await fetch(`${API_URL}/api/exercises/search?q=${encodeURIComponent(searchQuery)}`);
          let data = [];
          if (res.ok) data = await res.json();
          const localIds = new Set(localMatches.map((l) => l.id));
          const apiMatches = (Array.isArray(data) ? data : []).filter((apiEx) => !localIds.has(apiEx.id));
          setSearchResults([...localMatches, ...apiMatches]);
        } catch (err) {
          console.error('Search failed', err);
          const query = searchQuery.toLowerCase();
          setSearchResults(
            (customExercises || []).filter(
              (ex) =>
                ex.name.toLowerCase().includes(query) ||
                (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(query))
            )
          );
        }
      } else setSearchResults([]);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery, customExercises]);

  const handleAddExercise = (exercise) => {
    let initialSets = [{ reps: 10, weight: 0, type: 'Working' }];
    if (exercise.defaultSets && exercise.defaultSets.length > 0) {
      initialSets = exercise.defaultSets.map((s) => ({
        reps: s.reps || 10,
        weight: convertWeight(s.weight || 0, exercise.unitSaved || 'lbs', unit),
        type: 'Working',
      }));
    }
    setExercises((prev) => {
      const next = [...prev, { ...exercise, unitSaved: unit, defaultSets: initialSets }];
      setExpandedExerciseIndex(next.length - 1);
      return next;
    });
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const moveExercise = (index, direction) => {
    setExercises((prev) => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        if (expandedExerciseIndex === index) setExpandedExerciseIndex(index - 1);
        else if (expandedExerciseIndex === index - 1) setExpandedExerciseIndex(index);
      } else if (direction === 'down' && index < next.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
        if (expandedExerciseIndex === index) setExpandedExerciseIndex(index + 1);
        else if (expandedExerciseIndex === index + 1) setExpandedExerciseIndex(index);
      }
      return next;
    });
  };

  const handleCreateCustom = async () => {
    setIsCreatingCustom(true);
    const newEx = await createCustomExercise(searchQuery, newMuscleGroup);
    if (newEx) {
      handleAddExercise(newEx);
      setNewCustomExIds((prev) => [...prev, newEx.id]);
    }
    setIsCreatingCustom(false);
  };

  const removeExercise = (index) => setExercises((prev) => prev.filter((_, i) => i !== index));
  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const next = [...exercises];
    next[exerciseIndex].defaultSets[setIndex][field] = value;
    setExercises(next);
  };
  const addSet = (exerciseIndex) => {
    const next = [...exercises];
    const prevSets = next[exerciseIndex].defaultSets;
    const lastSet = prevSets.length > 0 ? prevSets[prevSets.length - 1] : { reps: 10, weight: 0, type: 'Working' };
    next[exerciseIndex].defaultSets.push({ ...lastSet });
    setExercises(next);
  };
  const removeSet = (exerciseIndex, setIndex) => {
    const next = [...exercises];
    next[exerciseIndex].defaultSets.splice(setIndex, 1);
    setExercises(next);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Routine name', 'Please enter a routine name.');
      return;
    }
    const routineData = { name, exercises };
    if (initialRoutine) await updateRoutine(initialRoutine.id, routineData);
    else await createRoutine(routineData);
    for (const ex of exercises) {
      if (newCustomExIds.includes(ex.id)) {
        await updateCustomExercise(ex.id, { defaultSets: ex.defaultSets });
      }
    }
    onSaveSuccess();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: activeInput ? 320 : 120 }}>
        <View style={styles.head}>
          <Text style={styles.title}>{initialRoutine ? 'Edit Routine' : 'New Routine'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onCancel} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.save}>
              <Save size={16} color={colors.primary} />
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>

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
          return (
            <View key={`${ex.id}-${exIdx}`} style={styles.card}>
              <Pressable
                onPress={() => setExpandedExerciseIndex(isExpanded ? -1 : exIdx)}
                style={styles.cardHead}
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {exIdx > 0 && (
                    <Pressable onPress={() => moveExercise(exIdx, 'up')} style={{ padding: 6 }}>
                      <ArrowUp size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                  {exIdx < exercises.length - 1 && (
                    <Pressable onPress={() => moveExercise(exIdx, 'down')} style={{ padding: 6 }}>
                      <ArrowDown size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeExercise(exIdx)} style={styles.delEx}>
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={colors.textMuted} />
                  )}
                </View>
              </Pressable>
              {isExpanded && (
                <View style={{ padding: 14, gap: 8 }}>
                  <View style={styles.setHead}>
                    <Text style={[styles.th, { width: 32 }]}>SET</Text>
                    <Text style={[styles.th, { flex: 1 }]}>LBS/KGS</Text>
                    <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
                    <View style={{ width: 32 }} />
                  </View>
                  {ex.defaultSets?.map((set, sIdx) => {
                    const wOn =
                      activeInput?.exerciseIndex === exIdx &&
                      activeInput?.setIndex === sIdx &&
                      activeInput?.field === 'weight';
                    const rOn =
                      activeInput?.exerciseIndex === exIdx &&
                      activeInput?.setIndex === sIdx &&
                      activeInput?.field === 'reps';
                    return (
                      <View key={sIdx} style={styles.setRow}>
                        <Text style={styles.setIdx}>{sIdx + 1}</Text>
                        <Pressable
                          onPress={() => setActiveInput({ exerciseIndex: exIdx, setIndex: sIdx, field: 'weight' })}
                          style={[styles.cell, wOn && styles.cellOn]}
                        >
                          <Text style={[styles.cellText, !set.weight && { color: 'rgba(161,161,170,0.5)' }]}>
                            {set.weight || 'Weight'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setActiveInput({ exerciseIndex: exIdx, setIndex: sIdx, field: 'reps' })}
                          style={[styles.cell, rOn && styles.cellOn]}
                        >
                          <Text style={[styles.cellText, !set.reps && { color: 'rgba(161,161,170,0.5)' }]}>
                            {set.reps || 'Reps'}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => removeSet(exIdx, sIdx)} style={styles.delSet}>
                          <Trash2 size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                  <Pressable onPress={() => addSet(exIdx)} style={styles.addSet}>
                    <Plus size={16} color={colors.primary} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <Pressable onPress={() => setIsSearching(true)} style={styles.addEx}>
          <Plus size={22} color={colors.primary} />
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
            <Pressable onPress={() => setIsSearching(false)} style={styles.searchClose}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {searchResults.map((ex) => (
              <Pressable key={ex.id} onPress={() => handleAddExercise(ex)} style={styles.searchItem}>
                <View style={styles.searchThumb}>
                  {ex.gifUrl ? (
                    <Image source={{ uri: ex.gifUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Dumbbell size={24} color={colors.primary} />
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
            {searchResults.length === 0 && searchQuery.length === 0 && (
              <View style={styles.emptySearch}>
                <Search size={48} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontFamily: fonts.bold, marginTop: 12 }}>
                  Search for an exercise
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Type at least 1 character</Text>
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
                  disabled={isCreatingCustom || searchQuery.trim().length < 1}
                  style={[styles.customAdd, (isCreatingCustom || !searchQuery.trim()) && { opacity: 0.5 }]}
                >
                  {isCreatingCustom ? (
                    <ActivityIndicator color={colors.accentFg} />
                  ) : (
                    <>
                      <Plus size={18} color={colors.accentFg} />
                      <Text style={{ color: colors.accentFg, fontFamily: fonts.bold, fontSize: 13 }}>Add Custom Exercise</Text>
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
                onChangeField: (field) => setActiveInput((prev) => ({ ...prev, field })),
                onNext: () => {
                  const ex = exercises[activeInput.exerciseIndex];
                  if (activeInput.field === 'weight') {
                    setActiveInput((prev) => ({ ...prev, field: 'reps' }));
                  } else if (activeInput.setIndex < ex.defaultSets.length - 1) {
                    setActiveInput({
                      exerciseIndex: activeInput.exerciseIndex,
                      setIndex: activeInput.setIndex + 1,
                      field: 'weight',
                    });
                  } else if (activeInput.exerciseIndex < exercises.length - 1) {
                    setActiveInput({
                      exerciseIndex: activeInput.exerciseIndex + 1,
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
            ? exercises[activeInput.exerciseIndex]?.defaultSets[activeInput.setIndex]?.[activeInput.field]
            : ''
        }
        onUpdate={(val) => {
          if (activeInput) updateSet(activeInput.exerciseIndex, activeInput.setIndex, activeInput.field, val);
        }}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: colors.text, fontFamily: fonts.black, fontSize: 24 },
  cancel: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: colors.textMuted, fontFamily: fonts.bold },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: { color: colors.primary, fontFamily: fonts.black },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  restHint: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  restHintText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface2,
  },
  thumb: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface },
  thumbFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    padding: 6,
    marginLeft: 4,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
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
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cellOn: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  cellText: { color: colors.text, fontFamily: fonts.bold },
  delSet: {
    width: 32,
    padding: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 6,
  },
  addSet: {
    marginTop: 6,
    paddingVertical: 8,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addSetText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
  addEx: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addExText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 16 },
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 16, paddingVertical: 12 },
  searchClose: {
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface2,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchName: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  searchMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  mgBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mgBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fonts.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySearch: { alignItems: 'center', paddingVertical: 48, opacity: 0.6 },
  customBox: {
    marginTop: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customAdd: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
}

