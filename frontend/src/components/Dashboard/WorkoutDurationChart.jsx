import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useWorkout } from '../../context/WorkoutContext';
import InfoPopover from './InfoPopover';
import AreaChart from '../charts/AreaChart';
import { colors, fonts } from '../../theme';

export default function WorkoutDurationChart() {
  const { workoutHistory } = useWorkout();
  const [displayUnit, setDisplayUnit] = useState('mins');

  const chartData = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    const grouped = {};
    workoutHistory.forEach((wk) => {
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      const dateKey = format(parseISO(timeStr), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, durationSec: 0 };
      grouped[dateKey].durationSec += wk.duration || 0;
    });
    return Object.keys(grouped)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((dateKey) => {
        const d = grouped[dateKey];
        return {
          date: format(parseISO(dateKey), 'MMM dd'),
          value:
            displayUnit === 'mins'
              ? Math.round(d.durationSec / 60)
              : Number((d.durationSec / 3600).toFixed(1)),
        };
      })
      .filter((d) => d.value > 0);
  }, [workoutHistory, displayUnit]);

  const averageValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.value, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  return (
    <View style={{ marginTop: 8, paddingBottom: 8 }}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={20} color="#f59e0b" />
          <Text style={styles.title}>Workout Duration</Text>
        </View>
        <InfoPopover
          title="Workout Duration"
          description="Track how much time you spend working out each day. The dashed line shows your average duration over this period."
          color="amber"
        />
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Time Unit</Text>
            <View style={styles.toggle}>
              {['mins', 'hrs'].map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setDisplayUnit(u)}
                  style={[styles.toggleBtn, displayUnit === u && styles.toggleOn]}
                >
                  <Text style={[styles.toggleText, displayUnit === u && { color: '#f59e0b' }]}>
                    {u === 'mins' ? 'Minutes' : 'Hours'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {chartData.length > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Average</Text>
              <Text style={styles.avg}>
                {averageValue} <Text style={styles.avgUnit}>{displayUnit}</Text>
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.panel, { marginTop: 10, paddingVertical: 8 }]}>
        <AreaChart
          data={chartData}
          color="#f59e0b"
          unit={displayUnit}
          averageLine={averageValue}
          emptySubtitle="Log more workouts to see your duration trends."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  title: { color: colors.text, fontFamily: fonts.black, fontSize: 18 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleOn: { backgroundColor: colors.surfaceLight },
  toggleText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12 },
  avg: { color: colors.text, fontFamily: fonts.black, fontSize: 18 },
  avgUnit: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.regular },
});
