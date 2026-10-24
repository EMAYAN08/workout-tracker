import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  startOfWeek,
  endOfWeek,
  isAfter,
} from 'date-fns';
import { useWorkout } from '../../context/WorkoutContext';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { ScreenHeader } from '../ui/primitives';
import {
  createRoutineColorResolver,
  dayRoutineEntries,
  legendEntries,
  REST_KEY,
} from '../../utils/routineColors';

export default function CalendarView({ onDayClick, onBack }) {
  const { workoutHistory, routines } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusKey, setFocusKey] = useState(null);

  const colorForKey = useMemo(
    () => createRoutineColorResolver(routines, { restColor: colors.heatmapRest }),
    [routines, colors.heatmapRest]
  );

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDate = startOfWeek(start, { weekStartsOn: 1 });
    const endDate = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const workoutsMap = useMemo(() => {
    const map = {};
    workoutHistory?.forEach((wk) => {
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      const d = format(parseISO(timeStr), 'yyyy-MM-dd');
      if (!map[d]) map[d] = [];
      map[d].push(wk);
    });
    return map;
  }, [workoutHistory]);

  const legend = useMemo(() => {
    const prefix = format(currentMonth, 'yyyy-MM');
    const monthWorkouts = Object.keys(workoutsMap)
      .filter((k) => k.startsWith(prefix))
      .flatMap((k) => workoutsMap[k]);
    return legendEntries(monthWorkouts, colorForKey);
  }, [workoutsMap, currentMonth, colorForKey]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const monthSwipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-28, 28])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (e.translationX < -40) setCurrentMonth((m) => addMonths(m, 1));
          else if (e.translationX > 40) setCurrentMonth((m) => subMonths(m, 1));
        }),
    []
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="History" onBack={onBack} />
      <View style={styles.body}>

      <GestureDetector gesture={monthSwipe}>
      <View style={styles.panel} collapsable={false}>
        <View style={styles.monthRow}>
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM')}{' '}
            <Text style={{ color: colors.textMuted, fontFamily: fonts.medium }}>
              {format(currentMonth, 'yyyy')}
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
              <ChevronLeft size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
              <ChevronRight size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((d, i) => (
            <Text key={i} style={styles.weekLbl}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {daysInMonth.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayWorkouts = workoutsMap[dateKey] || [];
            const hasWorkout = dayWorkouts.length > 0;
            const isRestOnly = hasWorkout && dayWorkouts.every((w) => w.exercises && w.exercises.length === 0);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const isFuture = isAfter(day, new Date()) && !isDayToday;
            if (!isCurrentMonth) {
              return <View key={i} style={styles.daySlot} />;
            }
            const entries = hasWorkout ? dayRoutineEntries(dayWorkouts, colorForKey, 3) : [];
            const dimmed = !!focusKey && hasWorkout && !entries.some((e) => e.key === focusKey);
            const fill = isFuture
              ? colors.heatmapFuture
              : hasWorkout
                ? entries[0].color
                : colors.heatmapEmpty;
            const numColor = hasWorkout && !isRestOnly ? '#FFFFFF' : colors.textMuted;
            const a11y = hasWorkout
              ? `${format(day, 'EEEE, MMMM d')}: ${entries.map((e) => e.label).join(', ')}${
                  dayWorkouts.length > 1 ? ` (${dayWorkouts.length} workouts)` : ''
                }. Open workout details`
              : format(day, 'EEEE, MMMM d') + ', no workout';
            return (
              <View key={i} style={styles.daySlot}>
                <Pressable
                  onPress={() => hasWorkout && onDayClick(dateKey)}
                  disabled={!hasWorkout}
                  accessibilityRole={hasWorkout ? 'button' : undefined}
                  accessibilityLabel={a11y}
                  style={[
                    styles.day,
                    { backgroundColor: fill, opacity: dimmed ? 0.25 : 1 },
                    isDayToday && styles.dayToday,
                  ]}
                >
                  {entries.length > 1 ? (
                    <View style={styles.splitRow} pointerEvents="none">
                      {entries.map((e) => (
                        <View key={e.key} style={{ flex: 1, backgroundColor: e.color }} />
                      ))}
                    </View>
                  ) : null}
                  <Text style={[styles.dayNum, { color: isDayToday && !hasWorkout ? colors.text : numColor }]}>
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
      </GestureDetector>

      {legend.length > 0 ? (
        <View style={styles.legend} accessibilityLabel="Routine colour legend">
          {legend.map((e) => {
            const active = focusKey === e.key;
            return (
              <Pressable
                key={e.key}
                onPress={() => setFocusKey((k) => (k === e.key ? null : e.key))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${e.label}, ${e.count} ${e.count === 1 ? 'day' : 'days'} this month. ${
                  active ? 'Tap to show all routines' : 'Tap to highlight'
                }`}
                style={[
                  styles.chip,
                  active && { borderColor: e.color, backgroundColor: colors.background },
                  !!focusKey && !active && { opacity: 0.5 },
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: e.color }, e.key === REST_KEY && styles.chipDotRest]} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {e.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    body: { flex: 1, padding: 16, paddingBottom: 120 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  navBtn: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLbl: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  daySlot: { width: '14.285%', alignItems: 'center', paddingVertical: 4 },
  day: {
    width: HIT,
    height: HIT,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  splitRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  chipDotRest: { borderWidth: 1, borderColor: colors.textMuted },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 12, flexShrink: 1 },
  dayToday: { borderWidth: 1, borderColor: colors.text },
  dayNum: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
});
}
