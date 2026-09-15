import React, { useState, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Activity, TrendingUp, Flame, Trophy } from 'lucide-react-native';
import { Select, ScreenHeader, CountUp, hideScroll } from '../ui/primitives';
import { useWorkout } from '../../context/WorkoutContext';
import { useTheme } from '../../context/ThemeContext';
import { getBest1RM, calculateVolume, convertWeight } from '../../utils/calculations';
import ConsistencyMap from './ConsistencyMap';
import InfoPopover from './InfoPopover';
import WorkoutDurationChart from './WorkoutDurationChart';
import StrengthChart from './StrengthChart';
import AreaChart from '../charts/AreaChart';
import RangePills from '../charts/RangePills';
import { fonts, radius } from '../../theme';
import { seriesFromWorkouts } from '../../utils/chartRange';

const StatCard = ({ icon: Icon, iconColor, title, value, unit, description, colors, styles, fractionDigits, play }) => {
  const [open, setOpen] = useState(false);
  const numeric = typeof value === 'number';
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.statCard}>
      <View style={styles.statHead}>
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <View style={styles.statValRow}>
        {numeric ? (
          <CountUp value={value} style={styles.statVal} fractionDigits={fractionDigits || 0} play={play} />
        ) : (
          <Text style={styles.statVal} numberOfLines={1}>
            {value}
          </Text>
        )}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      {open ? <Text style={styles.statDesc}>{description}</Text> : null}
    </Pressable>
  );
};

export default function Dashboard({ onMapClick, visible = true, scrollRef }) {
  const { workoutHistory, unit, getStreaks, useMock } = useWorkout();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { current, best } = getStreaks();
  const [metric, setMetric] = useState('1rm');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [weightExerciseId, setWeightExerciseId] = useState('');
  const [progressRange, setProgressRange] = useState('3m');
  const [weightRange, setWeightRange] = useState('3m');
  const [profileScroll, setProfileScroll] = useState(true);
  const durationDismiss = useRef(null);

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
    const points = [];
    workoutHistory.forEach((wk) => {
      const ex = wk.exercises?.find((e) => e.id === selectedExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        const date = new Date(wk.timestamp);
        if (metric === '1rm') {
          const rm = getBest1RM(ex.sets);
          points.push({ date, value: Number(convertWeight(rm, wk.unitSaved || 'lbs', unit).toFixed(1)) });
        } else {
          const vol = calculateVolume(ex.sets);
          points.push({ date, value: Number(convertWeight(vol, wk.unitSaved || 'lbs', unit).toFixed(1)) });
        }
      }
    });
    return seriesFromWorkouts(points, progressRange, metric === 'volume' ? 'sum' : 'max');
  }, [workoutHistory, selectedExerciseId, metric, unit, progressRange]);

  const weightChartData = useMemo(() => {
    if (!weightExerciseId || workoutHistory.length === 0) return [];
    const points = [];
    workoutHistory.forEach((wk) => {
      const ex = wk.exercises?.find((e) => e.id === weightExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        const date = new Date(wk.timestamp);
        const maxWeight = Math.max(...ex.sets.map((s) => s.weight || 0));
        points.push({ date, value: Number(convertWeight(maxWeight, wk.unitSaved || 'lbs', unit).toFixed(1)) });
      }
    });
    return seriesFromWorkouts(points, weightRange, 'max');
  }, [workoutHistory, weightExerciseId, unit, weightRange]);

  const totalVolume = workoutHistory.reduce((acc, wk) => {
    const vol = wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0;
    return acc + convertWeight(vol, wk.unitSaved || 'lbs', unit);
  }, 0);

  const workoutCount = workoutHistory.filter((w) => w.exercises && w.exercises.length > 0).length;
  const volumeIsDecimal = totalVolume % 1 !== 0;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Profile" subtitle={useMock ? 'Demo data — toggle off in Settings.' : 'On this phone. Yours alone.'} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        scrollEnabled={profileScroll}
        onScrollBeginDrag={() => durationDismiss.current?.()}
        keyboardShouldPersistTaps="handled"
        {...hideScroll}
      >
        <View style={styles.grid}>
          <StatCard
            icon={Activity}
            iconColor={colors.accent}
            title="Total Workouts"
            value={workoutCount}
            description="The total number of workout sessions you've logged."
            colors={colors}
            styles={styles}
            play={visible}
          />
          <StatCard
            icon={TrendingUp}
            iconColor={colors.chartAccent}
            title="Total Volume"
            value={totalVolume}
            unit={unit}
            fractionDigits={volumeIsDecimal ? 1 : 0}
            description="Total weight lifted across all your workouts."
            colors={colors}
            styles={styles}
            play={visible}
          />
          <StatCard
            icon={Flame}
            iconColor="#E25C4A"
            title="Current Streak"
            value={current}
            unit="Days"
            description="Current number of consecutive days you've logged a workout."
            colors={colors}
            styles={styles}
            play={visible}
          />
          <StatCard
            icon={Trophy}
            iconColor="#D4B45A"
            title="Best Streak"
            value={best}
            unit="Days"
            description="Your all-time longest streak of consecutive workout days."
            colors={colors}
            styles={styles}
            play={visible}
          />
        </View>

        <ConsistencyMap onMapClick={onMapClick} play={visible} />
        <StrengthChart />

        <InfoPopover
          title="Exercise progression"
          description="Track your performance over time. 'Total Volume' shows the total weight lifted across all sets. 'Est. 1RM' calculates your theoretical 1-rep maximum based on your heaviest sets."
        />
        <View style={[styles.panel, { marginTop: 4 }]}>
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
          <Text style={[styles.label, { marginTop: 12 }]}>Range</Text>
          <RangePills value={progressRange} onChange={setProgressRange} />
        </View>
        <View style={[styles.panel, { marginTop: 10 }]}>
          <AreaChart data={chartData} unit={unit} active={visible} />
        </View>

        <InfoPopover
          title="Max weight"
          description="Focus purely on strength. This chart plots the absolute heaviest single set you lifted during each workout for the selected exercise."
        />
        <View style={[styles.panel, { marginTop: 4 }]}>
          <Text style={styles.label}>Exercise</Text>
          <Select
            value={weightExerciseId}
            onChange={setWeightExerciseId}
            options={uniqueExercises.length > 0 ? uniqueExercises : [{ value: 'none', label: 'No Exercises' }]}
          />
          <Text style={[styles.label, { marginTop: 12 }]}>Range</Text>
          <RangePills value={weightRange} onChange={setWeightRange} />
        </View>
        <View style={[styles.panel, { marginTop: 10 }]}>
          <AreaChart data={weightChartData} unit={unit} active={visible} />
        </View>

        <WorkoutDurationChart
          onLockScroll={setProfileScroll}
          dismissRef={durationDismiss}
          active={visible}
        />
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 140, gap: 12 },
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
    statHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
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
    sectionTitle: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
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