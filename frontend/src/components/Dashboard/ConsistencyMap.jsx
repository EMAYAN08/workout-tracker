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

const CELL = 11;
const GUTTER = 2;
const MONTH_GAP = 16;
const MONTH_LABEL = 16;
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
  const [chunkOffset, setChunkOffset] = useState(0);
  const monthsToShow = 2;

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

  const { displayMonths, monthPairs, activeDaysInChunk, score, yearLabel, rangeLabel } = useMemo(() => {
    const now = startOfDay(new Date());
    const pairs = [];
    for (let i = 0; i < 6; i++) {
      const dates = [];
      for (let j = monthsToShow - 1; j >= 0; j--) dates.push(subMonths(now, i * monthsToShow + j));
      pairs.push({ id: i, dates });
    }
    const activePair = pairs[chunkOffset] || pairs[0];
    const prevPair = pairs[chunkOffset + 1];
    let activeDays = 0;
    let validDays = 0;
    let prevActiveDays = 0;
    let prevValidDays = 0;

    const generatedMonths = activePair.dates.map((date) => {
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
      return { name: format(date, 'MMM'), grid };
    });

    if (prevPair) {
      prevPair.dates.forEach((date) => {
        const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
        days.forEach((d) => {
          if (!isAfter(d, now)) {
            const data = countsMap.get(d.getTime());
            const isRestOnly = data && data.hasRestDay && !data.hasRealWorkout;
            if (!isRestOnly) prevValidDays++;
            if (data && data.hasRealWorkout) prevActiveDays++;
          }
        });
      });
    }

    const calcScore = (act, val) => Math.min(Math.round((act / (val || 1)) * 100), 100);
    return {
      displayMonths: generatedMonths,
      monthPairs: pairs,
      activeDaysInChunk: activeDays,
      score: calcScore(activeDays, validDays),
      previousScore: prevPair ? calcScore(prevActiveDays, prevValidDays) : calcScore(activeDays, validDays),
      yearLabel: format(activePair.dates[activePair.dates.length - 1], 'yyyy'),
      rangeLabel: generatedMonths.map((m) => m.name).join(' – '),
    };
  }, [countsMap, chunkOffset]);

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

  return (
    <View style={{ marginTop: 16 }}>
      <View ref={mapRef} collapsable={false} style={styles.panel}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Consistency</Text>
          <View style={styles.actions}>
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
          <View style={{ flex: 1 }} />
          <View style={styles.nav}>
            <Pressable
              onPress={() => setChunkOffset((p) => Math.min(p + 1, monthPairs.length - 1))}
              disabled={chunkOffset >= monthPairs.length - 1}
              style={[styles.navBtn, chunkOffset >= monthPairs.length - 1 && { opacity: 0.3 }]}
            >
              <ChevronLeft size={16} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.year} numberOfLines={1}>
              {rangeLabel || yearLabel}
            </Text>
            <Pressable
              onPress={() => setChunkOffset((p) => Math.max(p - 1, 0))}
              disabled={chunkOffset <= 0}
              style={[styles.navBtn, chunkOffset <= 0 && { opacity: 0.3 }]}
            >
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
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
              <View key={idx} style={styles.month}>
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
    },
    title: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyBtn: {
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
    iconBtn: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
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
      minHeight: 36,
    },
    navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    year: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 12,
      minWidth: 72,
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
      height: CELL,
      marginBottom: GUTTER,
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: fonts.bold,
      textAlign: 'center',
      lineHeight: CELL,
    },
    months: { flexDirection: 'row', alignItems: 'flex-start', gap: MONTH_GAP, flex: 1 },
    month: { flexGrow: 0, flexShrink: 0 },
    monthName: {
      height: MONTH_LABEL,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: MONTH_LABEL,
    },
    grid: { flexDirection: 'row', alignItems: 'flex-start' },
    weekCol: { width: CELL, marginRight: GUTTER },
    cell: {
      width: CELL,
      height: CELL,
      marginBottom: GUTTER,
      borderRadius: 2,
    },
  });
}
