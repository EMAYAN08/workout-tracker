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
import { ChevronLeft, ChevronRight, Target, Flame, Share2 } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

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

  const { displayMonths, monthPairs, activeDaysInChunk, score, previousScore, yearLabel } = useMemo(() => {
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
      return { name: format(date, 'MMMM'), grid };
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
    };
  }, [countsMap, chunkOffset]);

  let trendColor = colors.textMuted;
  if (score > previousScore) trendColor = colors.accent;
  else if (score < previousScore) trendColor = colors.danger;

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
      <Pressable ref={mapRef} collapsable={false} onPress={onMapClick} style={styles.panel}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Consistency</Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleShare();
                }}
                hitSlop={8}
              >
                <Share2 size={16} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.scorePill, { borderColor: trendColor + '4D', backgroundColor: trendColor + '26' }]}>
                <Flame size={14} color={trendColor} />
                <Text style={[styles.scoreText, { color: trendColor }]}>Score: {score}%</Text>
              </View>
              <Text style={styles.daysText}>{activeDaysInChunk} Days</Text>
            </View>
          </View>
          <View style={styles.nav}>
            <Pressable
              onPress={() => setChunkOffset((p) => Math.min(p + 1, monthPairs.length - 1))}
              disabled={chunkOffset >= monthPairs.length - 1}
              style={{ padding: 6, opacity: chunkOffset >= monthPairs.length - 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={16} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.year}>{yearLabel}</Text>
            <Pressable
              onPress={() => setChunkOffset((p) => Math.max(p - 1, 0))}
              disabled={chunkOffset <= 0}
              style={{ padding: 6, opacity: chunkOffset <= 0 ? 0.3 : 1 }}
            >
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.calRow}>
          <View style={styles.yAxis}>
            {weekdays.map((day, i) => (
              <Text key={i} style={styles.yLabel}>
                {i % 2 === 0 ? day : ''}
              </Text>
            ))}
          </View>
          <View style={styles.months}>
            {displayMonths.map((monthData, idx) => (
              <View key={idx} style={styles.month}>
                <Text style={styles.monthName}>{monthData.name}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {monthData.grid.map((week, wIdx) => (
                    <View key={wIdx} style={{ gap: 4 }}>
                      {week.map((day, dIdx) => (
                        <View
                          key={dIdx}
                          style={[styles.cell, { backgroundColor: cellColor(day) }]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    scorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.xs,
      borderWidth: 1,
    },
    scoreText: { fontFamily: fonts.semibold, fontSize: 11, textTransform: 'uppercase' },
    daysText: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.medium },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    year: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12, minWidth: 40, textAlign: 'center' },
    calRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
    yAxis: { paddingTop: 22, gap: 4 },
    yLabel: {
      width: 12,
      height: 14,
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: fonts.bold,
      textAlign: 'center',
    },
    months: { flexDirection: 'row', gap: 20, flex: 1 },
    month: { gap: 10 },
    monthName: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    cell: { width: 14, height: 14, borderRadius: 2 },
  });
}