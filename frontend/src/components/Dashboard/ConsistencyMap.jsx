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
import { CountUp } from '../ui/primitives';

const GUTTER = 4;
const MONTH_GAP = 24;
const MONTH_LABEL = 22;
const MAX_OFFSET = 23;
const Y_AXIS_W = 16;
const TARGET_CELL = 11;

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

export default function ConsistencyMap({ onMapClick, play = true }) {
  const { workoutHistory } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const mapRef = useRef(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [areaW, setAreaW] = useState(0);

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
      return { name: format(date, 'MMMM'), grid, year: format(date, 'yyyy') };
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
  const maxWeeks = Math.max(1, ...displayMonths.map((m) => m.grid.length));
  const monthW = areaW > 0 ? (areaW - MONTH_GAP) / 2 : 0;
  const fillSize = monthW > 0
    ? Math.floor((monthW - (maxWeeks - 1) * GUTTER) / maxWeeks)
    : TARGET_CELL;
  const cellSize = Math.max(8, Math.min(TARGET_CELL, fillSize));
  const cellRadius = Math.max(3, Math.round(cellSize * 0.28));
  const monthWidth = (weeks) => weeks * cellSize + Math.max(0, weeks - 1) * GUTTER;

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
              <Text style={styles.statVal}>
                <CountUp value={score} style={styles.statVal} play={play} />%
              </Text>
            </View>
            <Text style={styles.statLbl}>Score</Text>
          </View>
          <View style={styles.statRule} />
          <View style={styles.stat}>
            <CountUp value={activeDaysInChunk} style={styles.statVal} play={play} />
            <Text style={styles.statLbl}>Days</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View
          style={styles.calRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width - Y_AXIS_W - 8;
            if (w > 0 && Math.abs(w - areaW) > 1) setAreaW(w);
          }}
        >
          <View style={[styles.yAxis, { height: MONTH_LABEL + cellSize * 7 + GUTTER * 6 }]}>
            {weekdays.map((day, i) => (
              <Text
                key={i}
                style={[
                  styles.yLabel,
                  {
                    height: cellSize,
                    lineHeight: cellSize,
                    marginBottom: i === weekdays.length - 1 ? 0 : GUTTER,
                  },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.months}>
            {displayMonths.map((monthData, idx) => (
              <View
                key={`${monthData.name}-${idx}`}
                style={[styles.month, { width: monthWidth(monthData.grid.length) }]}
              >
                <Text style={styles.monthName}>{monthData.name}</Text>
                <View style={styles.grid}>
                  {monthData.grid.map((week, wIdx) => (
                    <View
                      key={wIdx}
                      style={[
                        styles.weekCol,
                        {
                          width: cellSize,
                          marginRight: wIdx === monthData.grid.length - 1 ? 0 : GUTTER,
                        },
                      ]}
                    >
                      {week.map((day, dIdx) => (
                        <View
                          key={dIdx}
                          style={[
                            styles.cell,
                            {
                              width: cellSize,
                              height: cellSize,
                              borderRadius: cellRadius,
                              marginBottom: dIdx === week.length - 1 ? 0 : GUTTER,
                              backgroundColor: cellColor(day),
                            },
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
    calRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8 },
    yAxis: { width: Y_AXIS_W, paddingTop: MONTH_LABEL, justifyContent: 'flex-start' },
    yLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.semibold,
      textAlign: 'center',
    },
    months: { flexDirection: 'row', alignItems: 'flex-start', gap: MONTH_GAP },
    month: {},
    monthName: {
      height: MONTH_LABEL,
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: fonts.medium,
      letterSpacing: 0.2,
      lineHeight: MONTH_LABEL,
      textAlign: 'center',
    },
    grid: { flexDirection: 'row', alignItems: 'flex-start' },
    weekCol: {},
    cell: {},
  });
}
