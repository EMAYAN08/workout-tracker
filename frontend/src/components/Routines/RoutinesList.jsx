import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Play, Plus, Edit2, Trash2, ClipboardList } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { confirmAction } from '../../dialog';

export default function RoutinesList({ onCreateNew, onEdit }) {
  const { routines, deleteRoutine, startWorkoutFromRoutine, activeWorkout } = useWorkout();
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.head}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={24} color={colors.text} />
            <Text style={styles.title}>My Routines</Text>
          </View>
          <Text style={styles.sub}>Build templates for faster logging</Text>
        </View>
        <Pressable onPress={onCreateNew} style={styles.plus}>
          <Plus size={24} color={colors.text} strokeWidth={3} />
        </Pressable>
      </View>

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
                <Pressable onPress={() => handleStartRoutine(routine)} style={styles.actPlay}>
                  <Play size={16} color={colors.accentFg} fill={colors.accentFg} />
                </Pressable>
                <Pressable onPress={() => onEdit(routine)} style={styles.actEdit}>
                  <Edit2 size={16} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    confirmAction('Delete routine', 'Delete this routine?', () => deleteRoutine(routine.id))
                  }
                  style={styles.actDel}
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
            {getRoutineCategories(routine.exercises).length > 0 && (
              <View style={styles.chips}>
                {getRoutineCategories(routine.exercises).map((cat) => (
                  <View key={cat} style={styles.chip}>
                    <Text style={styles.chipText}>{cat}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  scroll: { padding: 8, paddingBottom: 120 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 28, letterSpacing: 0.36 },
  sub: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13, marginTop: 4 },
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
    borderColor: colors.borderStrong,
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
