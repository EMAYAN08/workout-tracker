import React, { useMemo, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Activity, Dumbbell, Moon, Share2 } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useWorkout } from '../../context/WorkoutContext';
import { calculateVolume, convertWeight } from '../../utils/calculations';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { ScreenHeader, hideScroll } from '../ui/primitives';
import TrackItMark from '../ui/TrackItMark';
import { titleCase } from '../../utils/format';
import { haptic } from '../../haptics';
import { shareWorkoutDayPdf } from '../../utils/workoutDayPdf';
import { shareViewAsPdf } from '../../utils/shareShot';

const ExerciseImage = ({ src }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <View style={styles.thumbFallback}>
        <Dumbbell size={24} color={colors.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={styles.thumb}
      contentFit="cover"
      onError={() => setError(true)}
    />
  );
};

export default function WorkoutDetailView({ date, onBack }) {
  const { workoutHistory, unit } = useWorkout();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef(null);

  const dayWorkouts = useMemo(() => {
    if (!workoutHistory || !date) return [];
    return workoutHistory.filter((wk) => {
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      return format(parseISO(timeStr), 'yyyy-MM-dd') === date;
    });
  }, [workoutHistory, date]);

  if (!date || dayWorkouts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ScreenHeader title="History" onBack={onBack} />
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
          No workouts found for this date.
        </Text>
      </View>
    );
  }

  const totalDuration = dayWorkouts.reduce((acc, wk) => acc + (wk.duration || 0), 0);
  const totalVolume = dayWorkouts.reduce(
    (acc, wk) =>
      acc +
      convertWeight(
        wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0,
        wk.unitSaved || 'lbs',
        unit
      ),
    0
  );
  const displayDate = format(parseISO(date), 'MMM d, yyyy');

  const handleSharePdf = async () => {
    if (sharing || !dayWorkouts.length) return;
    setSharing(true);
    haptic('selection');
    try {
      if (Platform.OS === 'web') {
        await shareWorkoutDayPdf({ date, dayWorkouts, unit, colors, isDark });
      } else {
        await shareViewAsPdf(shotRef, {
          filename: `TrackIt-${date}.pdf`,
          background: colors.background,
        });
      }
    } catch (err) {
      console.error('PDF share failed:', err);
      Alert.alert('Share', 'Could not create the PDF.');
    } finally {
      setSharing(false);
    }
  };

  const shareBtn = (
    <Pressable
      onPress={handleSharePdf}
      disabled={sharing}
      accessibilityLabel="Share workout PDF"
      style={{ width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center', opacity: sharing ? 0.4 : 1 }}
    >
      <Share2 size={20} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={displayDate} onBack={onBack} right={shareBtn} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} {...hideScroll}>
      <View ref={shotRef} collapsable={false} style={styles.shot}>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>{Math.round(totalDuration / 60)} mins</Text>
        </View>
        <View style={styles.metaItem}>
          <Activity size={16} color={colors.chartAccent || colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.chartAccent || colors.textMuted }]}>
            {Math.round(totalVolume).toLocaleString()} {unit}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Dumbbell size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {dayWorkouts.reduce((acc, wk) => acc + wk.exercises.length, 0)} Exercises
          </Text>
        </View>
      </View>

      {dayWorkouts.map((workout, wIdx) => (
        <View key={workout.id || wIdx} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>
              {workout.exercises.length === 0 ? 'Rest Day' : workout.routineName || `Workout ${wIdx + 1}`}
            </Text>
            <Text style={styles.cardTime}>
              {workout.startTime ? format(new Date(workout.startTime), 'h:mm a') : 'Completed'}
            </Text>
          </View>
          <View style={{ padding: 16, gap: 20 }}>
            {workout.exercises.length === 0 ? (
              <View style={styles.restBox}>
                <Moon size={28} color={colors.textMuted} />
                <Text style={styles.restTitle}>Active Recovery Logged</Text>
                <Text style={styles.restSub}>
                  You took a well-deserved rest day to let your muscles recover and grow.
                </Text>
              </View>
            ) : (
              workout.exercises.map((exercise, eIdx) => (
                <View key={exercise.id || eIdx} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ExerciseImage src={exercise.gifUrl} />
                    <View>
                      <Text style={styles.exName}>{exercise.name}</Text>
                      <Text style={styles.exMg}>{titleCase(exercise.muscleGroup)}</Text>
                    </View>
                  </View>
                  <View style={styles.table}>
                    <View style={styles.tHead}>
                      <Text style={[styles.th, { width: 48, textAlign: 'left' }]}>Set</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Weight</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Reps</Text>
                    </View>
                    {exercise.sets.map((set, sIdx) => {
                      const convertedWeight = convertWeight(set.weight, workout.unitSaved || 'lbs', unit);
                      return (
                        <View key={sIdx} style={styles.tRow}>
                          <Text style={[styles.tdMuted, { width: 48 }]}>{sIdx + 1}</Text>
                          <Text style={[styles.td, { flex: 1, color: colors.chartAccent || colors.text }]}>
                            {convertedWeight} <Text style={styles.unit}>{unit}</Text>
                          </Text>
                          <Text style={[styles.td, { flex: 1 }]}>{set.reps}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      ))}
      <TrackItMark colors={colors} />
      </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 120 },
  shot: { backgroundColor: colors.background },
  emptyWrap: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardHead: {
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  cardTime: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase' },
  restBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  restTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  restSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceLight },
  thumbFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exName: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, textTransform: 'capitalize' },
  exMg: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  table: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tHead: { flexDirection: 'row', marginBottom: 6 },
  th: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  td: { color: colors.text, fontFamily: fonts.bold, textAlign: 'center' },
  tdMuted: { color: colors.textMuted, fontFamily: fonts.bold },
  unit: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.regular },
});
}
