import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
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
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function CalendarView({ onDayClick, onBack }) {
  const { workoutHistory } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.back}>
            <ChevronLeft size={24} color={colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.pageTitle}>History</Text>
        </View>
      </View>

      <View style={styles.panel}>
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
            const fill = isFuture
              ? colors.heatmapFuture
              : isRestOnly
                ? colors.heatmapRest
                : hasWorkout
                  ? colors.heatmapWork
                  : colors.heatmapEmpty;
            const numColor = hasWorkout && !isRestOnly ? colors.background : colors.textMuted;
            return (
              <View key={i} style={styles.daySlot}>
                <Pressable
                  onPress={() => hasWorkout && onDayClick(dateKey)}
                  disabled={!hasWorkout}
                  style={[
                    styles.day,
                    { backgroundColor: fill },
                    isDayToday && styles.dayToday,
                  ]}
                >
                  <Text style={[styles.dayNum, { color: isDayToday && !hasWorkout ? colors.text : numColor }]}>
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 120 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 8 },
  backText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  pageTitle: { color: colors.text, fontFamily: fonts.black, fontSize: 24 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  navBtn: { padding: 8 },
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
  daySlot: { width: '14.285%', alignItems: 'center', paddingVertical: 6 },
  day: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1, borderColor: colors.text },
  dayNum: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
});
}
