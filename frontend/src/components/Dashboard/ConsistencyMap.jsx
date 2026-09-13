import React, { useMemo, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Share as RNShare } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  parseISO,
  startOfDay,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  isAfter,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Share2 } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const ROW_H = 10;
const GUTTER = 2;
const MONTH_GAP = 12;
const MONTH_LABEL = 16;
const MAX_OFFSET = 23;

const generateMonthGrid = (date, countsMap) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weeks = [];
  let currentWeek = Array(7).fill(null);
  const today = startOfDay(new Date());

  daysInMonth.forEach((day) => {
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const timestamp = startOfDay(day).getTime();
    const data = countsMap.get(timestamp) || { count: 0, hasRestDay: false, hasRealWorkout: false };
    currentWeek[adjustedDay] = {
      date: day,
      hasWorkout: data.count > 0,
      isRestOnly: data.hasRestDay && !data.hasRealWorkout,
      isFuture: isAfter(day, today),
    };
    if (adjustedDay === 6) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }
  });
  if (currentWeek.some((d) => d !== null)) weeks.push(currentWeek);
  return weeks;
};

export default function ConsistencyMap({ onMapClick }) {
  const { workoutHistory } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const mapRef = useRef(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const countsMap = useMemo(() => {
    const map = new Map();
    workoutHistory.forEach((w) => {
      const d = startOfDay(parseISO(w.timestamp)).getTime();
      const existing = map.get(d) || { count: 0, hasRestDay: false, hasRealWorkout: false };
      const isRest = w.exercises && w.exercises.length === 0;
      if (isRest) existing.hasRestDay = true;
      else existing.hasRealWorkout = true;
      existing.count += 1;
      map.set(d, existing);
    });
    return map;
  }, [workoutHistory]);

  const { displayMonths, activeDaysInChunk, score, yearLabel } = useMemo(() => {
    const now = startOfDay(new Date());
    const dates = [subMonths(now, monthOffset + 1), subMonths(now, monthOffset)];
    let activeDays = 0;
    let validDays = 0;

    const generatedMonths = dates.map((date) => {
      const grid = generateMonthGrid(date, countsMap);
      const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
      days.forEach((d) => {
        if (!isAfter(d, now)) {
          const data = countsMap.get(d.getTime());
          const isRestOnly = data && data.hasRestDay && !data.hasRealWorkout;
          if (!isRestOnly) validDays++;
          if (data && data.hasRealWorkout) activeDays++;
        }
      });
      return { name: format(date, 'MMM'), grid, year: format(date, 'yyyy') };
    });

    return {
      displayMonths: generatedMonths,
      activeDaysInChunk: activeDays,
      score: Math.min(Math.round((activeDays / (validDays || 1)) * 100), 100),
      yearLabel: generatedMonths[generatedMonths.length - 1].year,
    };
  }, [countsMap, monthOffset]);

  const handleShare = async () => {
    try {
      if (mapRef.current && Platform.OS !== 'web') {
        const uri = await captureRef(mapRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My TrackIt Consistency' });
          return;
        }
      }
      await RNShare.share({ message: 'Check out my workout consistency on TrackIt!' });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cellColor = (day) => {
    if (!day) return 'transparent';
    if (day.isFuture) return colors.heatmapFuture;
    if (day.isRestOnly) return colors.heatmapRest;
    if (day.hasWorkout) return colors.heatmapWork;
    return colors.heatmapEmpty;
  };

  const canGoOlder = monthOffset < MAX_OFFSET;
  const canGoNewer = monthOffset > 0;

  return (
    <View style={{ marginTop: 16 }}>
      <View ref={mapRef} collapsable={false} style={styles.panel}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Consistency</Text>
          <View style={styles.actions}>
            <View style={styles.nav}>
              <Pressable
                onPress={() => setMonthOffset((p) => Math.min(p + 1, MAX_OFFSET))}
                disabled={!canGoOlder}
                accessibilityLabel="Older months"
                style={[styles.navBtn, !canGoOlder && { opacity: 0.3 }]}
              >
                <ChevronLeft size={16} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.year} numberOfLines={1}>
                {yearLabel}
              </Text>
              <Pressable
                onPress={() => setMonthOffset((p) => Math.max(p - 1, 0))}
                disabled={!canGoNewer}
                accessibilityLabel="Newer months"
                style={[styles.navBtn, !canGoNewer && { opacity: 0.3 }]}
              >
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            </View>
            <Pressable onPress={onMapClick} style={styles.historyBtn} accessibilityLabel="History">
              <Text style={styles.historyText}>History</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={styles.iconBtn}
              accessibilityLabel="Share consistency"
            >
              <Share2 size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.statValRow}>
              <Flame size={14} color={colors.textMuted} />
              <Text style={styles.statVal}>{score}%</Text>
            </View>
            <Text style={styles.statLbl}>Score</Text>
          </View>
          <View style={styles.statRule} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{activeDaysInChunk}</Text>
            <Text style={styles.statLbl}>Days</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.calRow}>
          <View style={styles.yAxis}>
            {weekdays.map((day, i) => (
              <Text key={i} style={[styles.yLabel, i === weekdays.length - 1 && { marginBottom: 0 }]}>
                {i % 2 === 0 ? day : ''}
              </Text>
            ))}
          </View>
          <View style={styles.months}>
            {displayMonths.map((monthData, idx) => (
              <View key={`${monthData.name}-${idx}`} style={styles.month}>
                <Text style={styles.monthName}>{monthData.name}</Text>
                <View style={styles.grid}>
                  {monthData.grid.map((week, wIdx) => (
                    <View
                      key={wIdx}
                      style={[styles.weekCol, wIdx === monthData.grid.length - 1 && { marginRight: 0 }]}
                    >
                      {week.map((day, dIdx) => (
                        <View
                          key={dIdx}
                          style={[
                            styles.cell,
                            dIdx === week.length - 1 && { marginBottom: 0 },
                            { backgroundColor: cellColor(day) },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: HIT,
      gap: 8,
    },
    title: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flexShrink: 0,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    historyBtn: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 12,
    },
    stat: { gap: 2 },
    statValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statVal: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 20, letterSpacing: -0.4 },
    statLbl: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    statRule: { width: 1, height: 28, backgroundColor: colors.border },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 2,
      minHeight: 32,
    },
    navBtn: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
    year: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 13,
      minWidth: 40,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 14,
      marginBottom: 14,
    },
    calRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    yAxis: { width: 12, paddingTop: MONTH_LABEL },
    yLabel: {
      height: ROW_H,
      marginBottom: GUTTER,
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: fonts.bold,
      textAlign: 'center',
      lineHeight: ROW_H,
    },
    months: { flexDirection: 'row', alignItems: 'flex-start', gap: MONTH_GAP, flex: 1 },
    month: { flex: 1, minWidth: 0 },
    monthName: {
      height: MONTH_LABEL,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: MONTH_LABEL,
    },
    grid: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
    weekCol: { flex: 1, minWidth: 0, marginRight: GUTTER },
    cell: {
      width: '100%',
      height: ROW_H,
      marginBottom: GUTTER,
      borderRadius: 2,
    },
  });
}
