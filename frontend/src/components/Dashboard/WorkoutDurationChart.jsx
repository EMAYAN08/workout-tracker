import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { useTheme } from '../../context/ThemeContext';
import InfoPopover from './InfoPopover';
import BarChart from '../charts/BarChart';
import RangePills from '../charts/RangePills';
import { fonts, radius } from '../../theme';
import { filledBarSeries, barGranularity } from '../../utils/chartRange';

export default function WorkoutDurationChart({ onLockScroll, dismissRef, active = true }) {
  const { workoutHistory } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [displayUnit, setDisplayUnit] = useState('mins');
  const [range, setRange] = useState('1m');

  const chartData = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    const points = [];
    workoutHistory.forEach((wk) => {
      const date = new Date(wk.timestamp || wk.startTime);
      const secs = wk.duration || 0;
      if (!secs) return;
      points.push({
        date,
        value: displayUnit === 'mins' ? secs / 60 : secs / 3600,
      });
    });
    const series = filledBarSeries(points, range, 'sum');
    return series.map((d) => ({
      ...d,
      value: displayUnit === 'mins' ? Math.round(d.value) : Number(d.value.toFixed(1)),
    }));
  }, [workoutHistory, displayUnit, range]);

  const grain = barGranularity(range);
  const avgLabel = grain === 'day' ? 'Daily average' : grain === 'week' ? 'Weekly average' : 'Monthly average';

  const averageValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.value, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  return (
    <View style={{ marginTop: 8, paddingBottom: 8 }}>
      <InfoPopover
        title="Workout duration"
        description="Time spent training in this range. Tap or drag a bar to see that day’s total. Color follows your chart color in Settings."
      />

      <View style={[styles.panel, { marginTop: 10 }]}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Time unit</Text>
            <View style={styles.toggle}>
              {['mins', 'hrs'].map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setDisplayUnit(u)}
                  style={[styles.toggleBtn, displayUnit === u && styles.toggleOn]}
                >
                  <Text style={[styles.toggleText, displayUnit === u && styles.toggleTextOn]}>
                    {u === 'mins' ? 'Minutes' : 'Hours'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {chartData.some((d) => d.value > 0) && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>{avgLabel}</Text>
              <Text style={[styles.avg, { color: colors.chartAccent }]}>
                {averageValue}
                <Text style={styles.avgUnit}> {displayUnit}</Text>
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, { marginTop: 12 }]}>Range</Text>
        <RangePills value={range} onChange={setRange} />
      </View>

      <View style={[styles.panel, { marginTop: 10, paddingVertical: 8, overflow: 'hidden' }]}>
        <BarChart
          data={chartData}
          unit={displayUnit}
          color={colors.chartAccent}
          totalLabel="Total"
          emptySubtitle="Log more workouts to see your duration trends."
          onLockScroll={onLockScroll}
          dismissRef={dismissRef}
          active={active}
        />
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
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    toggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      minHeight: 44,
    },
    toggleBtn: {
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleOn: { backgroundColor: colors.text },
    toggleText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12 },
    toggleTextOn: { color: colors.background },
    avg: { fontFamily: fonts.monoBold, fontSize: 22, letterSpacing: -0.4 },
    avgUnit: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.regular },
  });
}
