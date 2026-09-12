import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Play,
  Plus,
  Timer,
  Trash2,
  Check,
  Dumbbell,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { getPreviousPerformance } from '../../utils/calculations';
import CustomNumpad from './CustomNumpad';
import { API_URL } from '../../config';
import { colors, fonts, radius } from '../../theme';
import { Select } from '../ui/primitives';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function ActiveWorkout() {
  const {
    activeWorkout,
    workoutDuration,
    addExercise,
    updateSet,
    reorderActiveExercise,
    completeSet,
    uncompleteSet,
    addSetToExercise,
    removeSet,
    removeActiveExercise,
    restTimer,
    stopRestTimer,
    unit,
    workoutHistory,
    playingSet,
    setTimer,
    startSet,
    createCustomExercise,
  } = useWorkout();
  const insets = useSafeAreaInsets();

  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(0);
  const [activeInput, setActiveInput] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newMuscleGroup, setNewMuscleGroup] = useState('chest');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await fetch(`${API_URL}/api/exercises/search?q=${encodeURIComponent(searchQuery)}`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Search failed', err);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (!activeWorkout) return null;

  const handleAddExercise = (exercise) => {
    addExercise(exercise);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateCustom = async () => {
    setIsCreatingCustom(true);
    const newEx = await createCustomExercise(searchQuery, newMuscleGroup);
    if (newEx) handleAddExercise(newEx);
    setIsCreatingCustom(false);
  };

  const Thumb = ({ uri }) =>
    uri ? (
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
    ) : (
      <View style={[styles.thumb, styles.thumbFallback]}>
        <Dumbbell size={20} color={colors.textMuted} />
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.timerBar}>
        <View>
          <Text style={styles.timerLabel}>Workout</Text>
          <View style={styles.timerRow}>
            <Timer size={14} color={colors.primary} />
            <Text style={styles.timerValue}>{formatTime(workoutDuration)}</Text>
          </View>
        </View>
        {playingSet ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.timerLabel, { color: 'rgba(52,211,153,0.8)' }]}>Set Time</Text>
            <View style={styles.timerRow}>
              <Timer size={14} color="#34d399" />
              <Text style={[styles.timerValue, { color: '#34d399' }]}>{formatTime(setTimer)}</Text>
            </View>
          </View>
        ) : restTimer > 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.timerLabel, { color: 'rgba(96,165,250,0.8)' }]}>Resting</Text>
            <View style={styles.timerRow}>
              <Timer size={14} color="#60a5fa" />
              <Text style={[styles.timerValue, { color: '#60a5fa' }]}>{formatTime(restTimer)}</Text>
              <Pressable onPress={stopRestTimer} style={styles.stopRest}>
                <X size={12} color="#60a5fa" strokeWidth={3} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: activeInput ? 320 : 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeWorkout.exercises.length === 0 && (
          <View style={styles.restCard}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🛋️</Text>
            <Text style={styles.restTitle}>Rest Day Logging</Text>
            <Text style={styles.restSub}>Tap "Log Rest Day" above to record a recovery day.</Text>
          </View>
        )}

        {activeWorkout.exercises.map((ex, idx) => {
          const prevPerformance = getPreviousPerformance(ex.id, workoutHistory, unit);
          const isExpanded = idx === expandedExerciseIndex;
          const completedSetsCount = ex.sets.filter((s) => s.completedAt).length;

          const reorderBtns = (
            <View style={styles.rowBtns}>
              {idx > 0 && (
                <Pressable onPress={() => reorderActiveExercise(idx, 'up')} style={styles.iconHit}>
                  <ArrowUp size={16} color={colors.textMuted} />
                </Pressable>
              )}
              {idx < activeWorkout.exercises.length - 1 && (
                <Pressable onPress={() => reorderActiveExercise(idx, 'down')} style={styles.iconHit}>
                  <ArrowDown size={16} color={colors.textMuted} />
                </Pressable>
              )}
              <Pressable
                onPress={() => removeActiveExercise(idx)}
                style={styles.iconHit}
              >
                <Trash2 size={16} color="rgba(239,68,68,0.8)" />
              </Pressable>
              {isExpanded ? (
                <ChevronUp size={18} color={colors.textMuted} />
              ) : (
                <ChevronDown size={18} color={colors.textMuted} />
              )}
            </View>
          );

          if (!isExpanded) {
            return (
              <Pressable
                key={idx}
                onPress={() => setExpandedExerciseIndex(idx)}
                style={styles.card}
              >
                <Thumb uri={ex.gifUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={styles.exMeta}>
                    <Text
                      style={
                        completedSetsCount === ex.sets.length && ex.sets.length > 0
                          ? { color: '#22c55e' }
                          : null
                      }
                    >
                      {completedSetsCount}
                    </Text>
                    {' / '}
                    {ex.sets.length} Sets Completed
                  </Text>
                </View>
                {reorderBtns}
              </Pressable>
            );
          }

          return (
            <View key={idx} style={[styles.card, styles.cardExpanded, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <Pressable onPress={() => setExpandedExerciseIndex(null)} style={styles.exHeader}>
                <Thumb uri={ex.gifUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  {prevPerformance ? (
                    <Text style={styles.exMeta}>
                      <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
                        PR: {prevPerformance.allTimePR} {unit}
                      </Text>
                      {'  |  '}Last: {prevPerformance.lastSessionHeaviest} {unit}
                      {'  |  '}Est 1RM: {prevPerformance.allTime1RM} {unit}
                    </Text>
                  ) : (
                    <Text style={[styles.exMeta, { textTransform: 'capitalize' }]}>{ex.muscleGroup}</Text>
                  )}
                </View>
                {reorderBtns}
              </Pressable>

              <View style={styles.setHead}>
                <Text style={[styles.setHeadText, { width: 36, textAlign: 'center' }]}>Set</Text>
                <Text style={[styles.setHeadText, { flex: 1, textAlign: 'center' }]}>kg/lbs</Text>
                <Text style={[styles.setHeadText, { flex: 1, textAlign: 'center' }]}>Reps</Text>
                <View style={{ width: 64, alignItems: 'center' }}>
                  <Check size={16} color={colors.textMuted} />
                </View>
              </View>

              {ex.sets.map((set, sIdx) => {
                if (set.completedAt) {
                  return (
                    <View key={sIdx} style={[styles.setRow, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                      <Text style={styles.setIdx}>{sIdx + 1}</Text>
                      <Text style={styles.setVal}>{String(set.weight)}</Text>
                      <Text style={styles.setVal}>{String(set.reps)}</Text>
                      <View style={styles.setActions}>
                        <Pressable onPress={() => uncompleteSet(idx, sIdx)} style={styles.iconHit}>
                          <X size={14} color="rgba(239,68,68,0.7)" />
                        </Pressable>
                        <View style={styles.doneMark}>
                          <Check size={18} color={colors.background} strokeWidth={3} />
                        </View>
                      </View>
                    </View>
                  );
                }
                const isPlaying = playingSet && playingSet.exerciseIndex === idx && playingSet.setIndex === sIdx;
                const wActive = activeInput?.eIdx === idx && activeInput?.sIdx === sIdx && activeInput?.field === 'weight';
                const rActive = activeInput?.eIdx === idx && activeInput?.sIdx === sIdx && activeInput?.field === 'reps';
                return (
                  <View key={sIdx} style={styles.setRow}>
                    <Text style={styles.setIdx}>{sIdx + 1}</Text>
                    <Pressable
                      onPress={() => setActiveInput({ eIdx: idx, sIdx, field: 'weight' })}
                      style={[styles.cell, wActive && styles.cellActive]}
                    >
                      <Text style={[styles.cellText, !set.weight && { color: 'rgba(161,161,170,0.5)' }]}>
                        {set.weight || '-'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveInput({ eIdx: idx, sIdx, field: 'reps' })}
                      style={[styles.cell, rActive && styles.cellActive]}
                    >
                      <Text style={[styles.cellText, !set.reps && { color: 'rgba(161,161,170,0.5)' }]}>
                        {set.reps || '-'}
                      </Text>
                    </Pressable>
                    <View style={styles.setActions}>
                      <Pressable onPress={() => removeSet(idx, sIdx)} style={styles.iconHit}>
                        <Trash2 size={14} color="rgba(239,68,68,0.6)" />
                      </Pressable>
                      {isPlaying ? (
                        <Pressable
                          onPress={() => {
                            if (set.reps) completeSet(idx, sIdx);
                          }}
                          style={[styles.playBtn, set.reps ? styles.playReady : styles.playDisabled]}
                        >
                          <Check size={18} color={set.reps ? '#34d399' : 'rgba(161,161,170,0.3)'} strokeWidth={3} />
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => startSet(idx, sIdx)} style={styles.playBtn}>
                          <Play size={16} color={colors.primary} strokeWidth={3} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}

              <View style={styles.addRow}>
                <Pressable onPress={() => addSetToExercise(idx)} style={styles.addSetBtn}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addSetText}>New Set</Text>
                </Pressable>
                {idx < activeWorkout.exercises.length - 1 && (
                  <Pressable
                    onPress={() => setExpandedExerciseIndex(idx + 1)}
                    style={styles.addSetBtn}
                  >
                    <Text style={styles.addSetText}>Next Exercise</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <Pressable onPress={() => setIsSearching(true)} style={styles.addExBtn}>
          <Plus size={20} color={colors.primary} />
          <Text style={styles.addExText}>Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={isSearching} animationType="slide" onRequestClose={() => setIsSearching(false)}>
        <View style={[styles.searchRoot, { paddingTop: insets.top }]}>
          <View style={styles.searchBar}>
            <View style={styles.searchInputWrap}>
              <Search size={20} color={colors.textMuted} style={{ marginLeft: 14 }} />
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercise..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>
            <Pressable onPress={() => setIsSearching(false)} style={styles.searchClose}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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
                  <Text style={styles.searchMeta}>Dumbbell</Text>
                </View>
                <View style={styles.mgBadge}>
                  <Text style={styles.mgBadgeText}>{ex.muscleGroup}</Text>
                </View>
              </Pressable>
            ))}
            {searchResults.length === 0 && searchQuery.length === 0 && (
              <View style={styles.emptySearch}>
                <Search size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Search for an exercise</Text>
                <Text style={styles.emptySub}>Type at least 1 character</Text>
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
                  style={[styles.customAdd, (isCreatingCustom || searchQuery.trim().length < 1) && { opacity: 0.5 }]}
                >
                  {isCreatingCustom ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Plus size={18} color="#fff" />
                      <Text style={styles.customAddText}>Add Custom Exercise</Text>
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
                  const ex = activeWorkout.exercises[activeInput.eIdx];
                  if (activeInput.field === 'weight') {
                    setActiveInput((prev) => ({ ...prev, field: 'reps' }));
                  } else if (activeInput.sIdx < ex.sets.length - 1) {
                    setActiveInput({ eIdx: activeInput.eIdx, sIdx: activeInput.sIdx + 1, field: 'weight' });
                  } else if (activeInput.eIdx < activeWorkout.exercises.length - 1) {
                    setActiveInput({ eIdx: activeInput.eIdx + 1, sIdx: 0, field: 'weight' });
                    setExpandedExerciseIndex(activeInput.eIdx + 1);
                  } else {
                    setActiveInput(null);
                  }
                },
              }
            : null
        }
        value={
          activeInput
            ? activeWorkout.exercises[activeInput.eIdx].sets[activeInput.sIdx][activeInput.field]
            : ''
        }
        onUpdate={(val) => {
          if (activeInput) updateSet(activeInput.eIdx, activeInput.sIdx, activeInput.field, val);
        }}
        onClose={() => setActiveInput(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  timerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: colors.background,
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 16 },
  stopRest: {
    marginLeft: 4,
    padding: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  restCard: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  restTitle: { color: '#34d399', fontFamily: fonts.black, fontSize: 18 },
  restSub: { color: 'rgba(16,185,129,0.8)', fontFamily: fonts.bold, fontSize: 13, textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardExpanded: { borderColor: 'rgba(59,130,246,0.25)' },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight },
  exName: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textTransform: 'capitalize' },
  exMeta: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12, marginTop: 2 },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  rowBtns: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconHit: { padding: 6 },
  setHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  setHeadText: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(38,38,38,0.35)',
  },
  setIdx: { width: 36, textAlign: 'center', color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13 },
  setVal: { flex: 1, textAlign: 'center', color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  cell: {
    flex: 1,
    marginHorizontal: 4,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: colors.primary, backgroundColor: 'rgba(59,130,246,0.1)' },
  cellText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  setActions: { width: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  doneMark: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playReady: { backgroundColor: 'rgba(16,185,129,0.2)' },
  playDisabled: { backgroundColor: colors.surface },
  addRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, marginTop: 12, marginBottom: 4 },
  addSetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addSetText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
  addExBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
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
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
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
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchName: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  searchMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: fonts.semibold },
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
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, marginTop: 12 },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
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
  customAddText: { color: '#fff', fontFamily: fonts.bold, fontSize: 13 },
});
