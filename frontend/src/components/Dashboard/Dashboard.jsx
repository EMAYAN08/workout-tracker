import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Activity, TrendingUp, Flame, Trophy } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useWorkout } from '../../context/WorkoutContext';
import { useTheme } from '../../context/ThemeContext';
import { getBest1RM, calculateVolume, convertWeight } from '../../utils/calculations';
import ConsistencyMap from './ConsistencyMap';
import InfoPopover from './InfoPopover';
import WorkoutDurationChart from './WorkoutDurationChart';
import StrengthChart from './StrengthChart';
import AreaChart from '../charts/AreaChart';
import { Select } from '../ui/primitives';
import { fonts, radius } from '../../theme';

const StatCard = ({ icon: Icon, title, value, unit, description, colors, styles }) => {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon size={14} color={colors.accent} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {open ? (
        <>
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
          <Text style={styles.statDesc}>{description}</Text>
        </>
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
          data.push({ date, value: Number(convertWeight(rm, wk.unitSaved || 'lbs', unit).toFixed(1)) });
        } else {
          const vol = calculateVolume(ex.sets);
          data.push({ date, value: Number(convertWeight(vol, wk.unitSaved || 'lbs', unit).toFixed(1)) });
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
        data.push({ date, value: Number(convertWeight(maxWeight, wk.unitSaved || 'lbs', unit).toFixed(1)) });
      }
    });
    return data.reverse();
  }, [workoutHistory, weightExerciseId, unit]);

  const totalVolume = workoutHistory.reduce((acc, wk) => {
    const vol = wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0;
    return acc + convertWeight(vol, wk.unitSaved || 'lbs', unit);
  }, 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.profile}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hey {username || 'User'}.</Text>
          <Text style={styles.sub}>Lifetime stats, quietly arranged.</Text>
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
          description="The total number of workout sessions you've logged."
          colors={colors}
          styles={styles}
        />
        <StatCard
          icon={TrendingUp}
          title="Total Volume"
          value={totalVolume}
          unit={unit}
          description="Total weight lifted across all your workouts."
          colors={colors}
          styles={styles}
        />
        <StatCard
          icon={Flame}
          title="Current Streak"
          value={current}
          unit="Days"
          description="Current number of consecutive days you've logged a workout."
          colors={colors}
          styles={styles}
        />
        <StatCard
          icon={Trophy}
          title="Best Streak"
          value={best}
          unit="Days"
          description="Your all-time longest streak of consecutive workout days."
          colors={colors}
          styles={styles}
        />
      </View>

      <ConsistencyMap onMapClick={onMapClick} />
      <StrengthChart />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Exercise progression</Text>
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
        <AreaChart data={chartData} color={colors.accent} unit={unit} />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Max weight</Text>
        <InfoPopover
          title="Max Weight Progression"
          description="Focus purely on strength. This chart plots the absolute heaviest single set you lifted during each workout for the selected exercise."
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
        <AreaChart data={weightChartData} color={colors.accent} unit={unit} />
      </View>

      <WorkoutDurationChart />
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 120, gap: 12 },
    profile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    hello: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 28,
      letterSpacing: -0.8,
      textTransform: 'capitalize',
    },
    sub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
    logout: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger + '33',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.sm,
    },
    logoutText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      minHeight: 104,
    },
    statIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      backgroundColor: colors.accentSoft,
    },
    statTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    statValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 },
    statVal: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 22, letterSpacing: -0.4 },
    statUnit: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.medium },
    statDesc: { color: colors.text, fontSize: 12, fontFamily: fonts.regular, marginTop: 8, lineHeight: 18 },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    sectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.3 },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
  });
}
