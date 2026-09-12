import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search, Activity, TrendingUp, Flame, Trophy } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useWorkout } from '../../context/WorkoutContext';
import { getBest1RM, calculateVolume, convertWeight } from '../../utils/calculations';
import ConsistencyMap from './ConsistencyMap';
import InfoPopover from './InfoPopover';
import WorkoutDurationChart from './WorkoutDurationChart';
import StrengthChart from './StrengthChart';
import AreaChart from '../charts/AreaChart';
import { Select } from '../ui/primitives';
import { colors, fonts } from '../../theme';

const StatCard = ({ icon: Icon, title, value, unit, iconBg, iconColor, description }) => {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Icon size={14} color={iconColor} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {open ? (
        <Text style={styles.statDesc}>{description}</Text>
      ) : (
        <View style={styles.statValRow}>
          <Text style={styles.statVal} numberOfLines={1}>
            {typeof value === 'number'
              ? value % 1 !== 0
                ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
                : Math.floor(value).toLocaleString()
              : value}
          </Text>
          {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
        </View>
      )}
    </Pressable>
  );
};

export default function Dashboard({ onMapClick }) {
  const { username, logout, workoutHistory, unit, getStreaks } = useWorkout();
  const { current, best } = getStreaks();
  const [metric, setMetric] = useState('1rm');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [weightExerciseId, setWeightExerciseId] = useState('');

  const uniqueExercises = useMemo(() => {
    const exercisesMap = new Map();
    workoutHistory.forEach((wk) => {
      wk.exercises?.forEach((ex) => {
        if (!exercisesMap.has(ex.id)) exercisesMap.set(ex.id, ex.name);
      });
    });
    return Array.from(exercisesMap.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [workoutHistory]);

  React.useEffect(() => {
    if (uniqueExercises.length > 0) {
      if (!selectedExerciseId) setSelectedExerciseId(uniqueExercises[0].value);
      if (!weightExerciseId) setWeightExerciseId(uniqueExercises[0].value);
    }
  }, [uniqueExercises, selectedExerciseId, weightExerciseId]);

  const chartData = useMemo(() => {
    if (!selectedExerciseId || workoutHistory.length === 0) return [];
    const data = [];
    workoutHistory.forEach((wk) => {
      const ex = wk.exercises?.find((e) => e.id === selectedExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        const date = format(parseISO(wk.timestamp), 'MMM d');
        if (metric === '1rm') {
          const rm = getBest1RM(ex.sets);
          data.push({ date, value: Number(convertWeight(rm, 'lbs', unit).toFixed(1)) });
        } else {
          const vol = calculateVolume(ex.sets);
          data.push({ date, value: Number(convertWeight(vol, 'lbs', unit).toFixed(1)) });
        }
      }
    });
    return data.reverse();
  }, [workoutHistory, selectedExerciseId, metric, unit]);

  const weightChartData = useMemo(() => {
    if (!weightExerciseId || workoutHistory.length === 0) return [];
    const data = [];
    workoutHistory.forEach((wk) => {
      const ex = wk.exercises?.find((e) => e.id === weightExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        const date = format(parseISO(wk.timestamp), 'MMM d');
        const maxWeight = Math.max(...ex.sets.map((s) => s.weight || 0));
        data.push({ date, value: Number(convertWeight(maxWeight, 'lbs', unit).toFixed(1)) });
      }
    });
    return data.reverse();
  }, [workoutHistory, weightExerciseId, unit]);

  const totalVolume = convertWeight(
    workoutHistory.reduce(
      (acc, wk) => acc + (wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0),
      0
    ),
    'lbs',
    unit
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.profile}>
        <View>
          <Text style={styles.hello}>Hey {username || 'User'} 👋</Text>
          <Text style={styles.sub}>Here are your lifetime stats</Text>
        </View>
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <StatCard
          icon={Activity}
          title="Total Workouts"
          value={workoutHistory.filter((w) => w.exercises && w.exercises.length > 0).length}
          iconBg="rgba(59,130,246,0.2)"
          iconColor={colors.primary}
          description="The total number of workout sessions you've logged."
        />
        <StatCard
          icon={TrendingUp}
          title="Total Volume"
          value={totalVolume}
          unit={unit}
          iconBg="rgba(59,130,246,0.2)"
          iconColor="#3b82f6"
          description="Total weight lifted across all your workouts."
        />
        <StatCard
          icon={Flame}
          title="Current Streak"
          value={current}
          unit="Days"
          iconBg="rgba(249,115,22,0.2)"
          iconColor="#f97316"
          description="Current number of consecutive days you've logged a workout."
        />
        <StatCard
          icon={Trophy}
          title="Best Streak"
          value={best}
          unit="Days"
          iconBg="rgba(234,179,8,0.2)"
          iconColor="#eab308"
          description="Your all-time longest streak of consecutive workout days."
        />
      </View>

      <ConsistencyMap onMapClick={onMapClick} />
      <StrengthChart />

      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Exercise Progression</Text>
        </View>
        <InfoPopover
          title="Exercise Progression"
          description="Track your performance over time. 'Total Volume' shows the total weight lifted across all sets. 'Est. 1RM' calculates your theoretical 1-rep maximum based on your heaviest sets."
        />
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>Exercise</Text>
        <Select
          value={selectedExerciseId}
          onChange={setSelectedExerciseId}
          options={uniqueExercises.length > 0 ? uniqueExercises : [{ value: 'none', label: 'No Exercises' }]}
        />
        <Text style={[styles.label, { marginTop: 12 }]}>Metric</Text>
        <Select
          value={metric}
          onChange={setMetric}
          options={[
            { value: '1rm', label: 'Est. 1RM' },
            { value: 'volume', label: 'Volume' },
          ]}
        />
      </View>
      <View style={[styles.panel, { marginTop: 10 }]}>
        <AreaChart data={chartData} color="#4F46E5" unit={unit} />
      </View>

      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Activity size={20} color="#10B981" />
          <Text style={styles.sectionTitle}>Max Weight Progression</Text>
        </View>
        <InfoPopover
          title="Max Weight Progression"
          description="Focus purely on strength. This chart plots the absolute heaviest single set you lifted during each workout for the selected exercise."
          color="emerald"
        />
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>Exercise</Text>
        <Select
          value={weightExerciseId}
          onChange={setWeightExerciseId}
          options={uniqueExercises.length > 0 ? uniqueExercises : [{ value: 'none', label: 'No Exercises' }]}
        />
      </View>
      <View style={[styles.panel, { marginTop: 10 }]}>
        <AreaChart data={weightChartData} color="#10B981" unit={unit} />
      </View>

      <WorkoutDurationChart />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 120, gap: 12 },
  profile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 4 },
  hello: { color: colors.text, fontFamily: fonts.black, fontSize: 26, textTransform: 'capitalize' },
  sub: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13, marginTop: 4 },
  logout: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#f87171', fontFamily: fonts.bold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 96,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 },
  statVal: { color: colors.text, fontFamily: fonts.black, fontSize: 22 },
  statUnit: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.semibold },
  statDesc: { color: colors.text, fontSize: 12, fontFamily: fonts.semibold, marginTop: 8 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.black, fontSize: 18 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
});
