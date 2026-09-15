import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Play, Plus, Edit2, Trash2, ClipboardList } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { confirmAction } from '../../dialog';
import { haptic } from '../../haptics';
import { ScreenHeader, hideScroll, MuscleTag } from '../ui/primitives';

export default function RoutinesList({ onCreateNew, onEdit, scrollRef }) {
  const { routines, deleteRoutine, startWorkoutFromRoutine, startWorkout, activeWorkout } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const handleStartRoutine = (routine) => {
    if (activeWorkout) {
      confirmAction(
        'Active workout',
        'You already have an active workout. Do you want to overwrite it?',
        () => startWorkoutFromRoutine(routine),
        { confirmLabel: 'Overwrite' }
      );
      return;
    }
    startWorkoutFromRoutine(routine);
  };

  const getRoutineCategories = (exercises) => {
    if (!exercises) return [];
    const categories = new Set();
    exercises.forEach((ex) => {
      if (ex.muscleGroup) categories.add(ex.muscleGroup);
    });
    return Array.from(categories);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Routines"
        subtitle="Build templates for faster logging"
        right={
          <Pressable onPress={onCreateNew} style={styles.plus} accessibilityLabel="New Routine">
            <Plus size={24} color={colors.text} strokeWidth={3} />
          </Pressable>
        }
      />
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scroll} {...hideScroll}>

      <Pressable
        onPress={() => {
          if (activeWorkout) {
            confirmAction(
              'Active workout',
              'You already have an active workout. Do you want to overwrite it?',
              () => startWorkout(),
              { confirmLabel: 'Overwrite' }
            );
            return;
          }
          startWorkout();
        }}
        style={styles.emptyStart}
        accessibilityLabel="Start empty workout"
      >
        <Play size={16} color={colors.accentFg} fill={colors.accentFg} />
        <Text style={styles.emptyStartText}>Start empty workout</Text>
      </Pressable>

      {routines.length === 0 ? (
        <View style={styles.empty}>
          <ClipboardList size={40} color={colors.textSubtle} />
          <Text style={styles.emptyTitle}>No routines yet</Text>
          <Text style={styles.emptySub}>Create your first routine to easily start a structured workout.</Text>
        </View>
      ) : (
        routines.map((routine) => (
          <View key={routine.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{routine.name}</Text>
                <Text style={styles.cardMeta}>{routine.exercises?.length || 0} exercises</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => handleStartRoutine(routine)}
                  style={styles.actPlay}
                  accessibilityLabel="Start routine"
                >
                  <Play size={16} color={colors.accentFg} fill={colors.accentFg} />
                </Pressable>
                <Pressable onPress={() => onEdit(routine)} style={styles.actEdit} accessibilityLabel="Edit routine">
                  <Edit2 size={16} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic('warning');
                    deleteRoutine(routine.id);
                  }}
                  style={styles.actDel}
                  accessibilityLabel="Delete routine"
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
            {getRoutineCategories(routine.exercises).length > 0 && (
              <View style={styles.chips}>
                {getRoutineCategories(routine.exercises).map((cat) => (
                  <MuscleTag key={cat} group={cat} />
                ))}
              </View>
            )}
          </View>
        ))
      )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 120 },
  plus: {
    width: HIT,
    height: HIT,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStart: {
    minHeight: HIT,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyStartText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 16 },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, marginTop: 10 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { color: colors.text, fontFamily: fonts.black, fontSize: 17 },
  cardMeta: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12, marginTop: 4 },
  actPlay: {
    width: HIT,
    height: HIT,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actEdit: {
    width: HIT,
    height: HIT,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actDel: {
    width: HIT,
    height: HIT,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.black,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
}
