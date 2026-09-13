import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText, TSpan } from 'react-native-svg';
import { subMonths, subYears, isAfter } from 'date-fns';
import { calculateVolume, convertWeight } from '../../utils/calculations';
import { useWorkout } from '../../context/WorkoutContext';
import { Select } from '../ui/primitives';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const CATEGORY_META = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'core', label: 'Core' },
  { id: 'arms', label: 'Arms' },
];

const mapMuscleGroup = (rawGroup) => {
  const g = (rawGroup || '').toLowerCase();
  if (g.includes('chest')) return 'chest';
  if (g.includes('back')) return 'back';
  if (g.includes('leg') || g.includes('calf') || g.includes('glute')) return 'legs';
  if (g.includes('shoulder') || g.includes('deltoid')) return 'shoulders';
  if (g.includes('waist') || g.includes('core') || g.includes('abs')) return 'core';
  if (g.includes('arm') || g.includes('bicep') || g.includes('tricep') || g.includes('forearm')) return 'arms';
  return null;
};

function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };
  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

export default function StrengthChart() {
  const { workoutHistory, unit } = useWorkout();
  const { colors, muscleColors } = useTheme();
  const styles = makeStyles(colors);
  const CATEGORIES = CATEGORY_META.map((c) => ({ ...c, color: muscleColors[c.id] }));
  const emptyFill = colors.chartEmpty;
  const ringFills = colors.chartRings || [
    colors.surface3,
    colors.borderStrong,
    colors.textSubtle,
    colors.textMuted,
    colors.chartAccent || colors.text,
  ];
  const [metric, setMetric] = useState('volume');
  const [timeRange, setTimeRange] = useState('3m');

  const timeOptions = [
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last 1 Year' },
    { value: 'lifetime', label: 'Lifetime' },
  ];
  const metricOptions = [
    { value: 'frequency', label: 'Workout Frequency' },
    { value: 'load', label: 'Muscular Load' },
    { value: 'volume', label: 'Total Volume' },
  ];

  const stats = useMemo(() => {
    const data = {
      chest: { volume: 0, frequency: new Set(), load: 0 },
      back: { volume: 0, frequency: new Set(), load: 0 },
      legs: { volume: 0, frequency: new Set(), load: 0 },
      shoulders: { volume: 0, frequency: new Set(), load: 0 },
      core: { volume: 0, frequency: new Set(), load: 0 },
      arms: { volume: 0, frequency: new Set(), load: 0 },
    };
    if (!workoutHistory) return data;
    const now = new Date();
    let cutoffDate = null;
    if (timeRange === '3m') cutoffDate = subMonths(now, 3);
    if (timeRange === '6m') cutoffDate = subMonths(now, 6);
    if (timeRange === '1y') cutoffDate = subYears(now, 1);
    const filteredHistory = cutoffDate
      ? workoutHistory.filter((wk) => {
          const t = wk.timestamp || wk.startTime;
          return t ? isAfter(new Date(t), cutoffDate) : false;
        })
      : workoutHistory;
    let totalGlobalVolume = 0;
    filteredHistory.forEach((wk) => {
      wk.exercises?.forEach((ex) => {
        const cat = mapMuscleGroup(ex.muscleGroup);
        if (cat && data[cat]) {
          const vol = calculateVolume(ex.sets);
          const standardVol = wk.unitSaved === 'kgs' ? convertWeight(vol, 'kgs', 'lbs') : vol;
          data[cat].volume += standardVol;
          totalGlobalVolume += standardVol;
          data[cat].frequency.add(wk.id);
        }
      });
    });
    Object.keys(data).forEach((cat) => {
      data[cat].load = totalGlobalVolume > 0 ? Math.round((data[cat].volume / totalGlobalVolume) * 100) : 0;
    });
    return data;
  }, [workoutHistory, timeRange]);

  const maxValues = useMemo(
    () => ({
      volume: Math.max(...Object.values(stats).map((d) => d.volume), 0),
      frequency: Math.max(...Object.values(stats).map((d) => d.frequency.size), 0),
      load: Math.max(...Object.values(stats).map((d) => d.load), 0),
    }),
    [stats]
  );

  const chartValues = useMemo(() => {
    return CATEGORIES.map((cat) => {
      let rawVal = 0;
      let displayStr = '';
      if (metric === 'volume') {
        rawVal = stats[cat.id].volume;
        const converted = convertWeight(rawVal, 'lbs', unit);
        displayStr = converted > 1000 ? `${(converted / 1000).toFixed(2)}K ${unit}` : `${converted} ${unit}`;
      } else if (metric === 'frequency') {
        rawVal = stats[cat.id].frequency.size;
        displayStr = `${rawVal} session${rawVal !== 1 ? 's' : ''}`;
      } else {
        rawVal = stats[cat.id].load;
        displayStr = `${rawVal}%`;
      }
      const max = maxValues[metric];
      let level = 0;
      if (max > 0) {
        level = Math.round((rawVal / max) * 5);
        if (level === 0 && rawVal > 0) level = 1;
        if (level > 5) level = 5;
      }
      return { ...cat, value: rawVal, displayStr, level };
    });
  }, [stats, metric, unit, maxValues]);

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.heading}>Strength</Text>
      <View style={styles.panel}>
        <View style={styles.controls}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Select value={metric} onChange={setMetric} options={metricOptions} />
          </View>
          <View style={{ flex: 1 }}>
            <Select value={timeRange} onChange={setTimeRange} options={timeOptions} />
          </View>
        </View>
        <View style={{ height: 300, alignItems: 'center' }}>
          <Svg width="100%" height="100%" viewBox="0 0 400 400">
            {chartValues.map((cat, i) => {
              const angleSpan = 360 / 6;
              const centerAngle = i * angleSpan;
              const startAngle = centerAngle - angleSpan / 2;
              const endAngle = centerAngle + angleSpan / 2;
              return (
                <React.Fragment key={cat.id}>
                  {[...Array(5)].map((_, ringIndex) => {
                    const rLevel = ringIndex + 1;
                    const iRadius = 36 + ringIndex * 22;
                    const oRadius = iRadius + 20;
                    const isFilled = rLevel <= cat.level;
                    return (
                      <Path
                        key={ringIndex}
                        d={describeArc(200, 200, iRadius, oRadius, startAngle, endAngle)}
                        fill={isFilled ? ringFills[ringIndex] : emptyFill}
                        stroke={colors.border}
                        strokeWidth="1.25"
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
            {chartValues.map((cat, i) => {
              const angleSpan = 360 / 6;
              const centerAngle = i * angleSpan;
              const textRadius = 172;
              const angleInRads = ((centerAngle - 90) * Math.PI) / 180;
              const tx = 200 + Math.cos(angleInRads) * textRadius;
              const ty = 200 + Math.sin(angleInRads) * textRadius;
              let textAnchor = 'middle';
              if (Math.abs(centerAngle) % 180 !== 0) {
                if (centerAngle < 180 && centerAngle > 0) textAnchor = 'start';
                if (centerAngle > 180) textAnchor = 'end';
              }
              const adjustedTx = textAnchor === 'start' ? tx + 4 : textAnchor === 'end' ? tx - 4 : tx;
              return (
                <SvgText key={`label-${cat.id}`} x={adjustedTx} y={ty} textAnchor={textAnchor}>
                  <TSpan
                    x={adjustedTx}
                    dy="-0.4em"
                    fill={colors.textMuted}
                    fontSize="15"
                    fontWeight="600"
                  >
                    {cat.displayStr}
                  </TSpan>
                  <TSpan x={adjustedTx} dy="1.4em" fill={colors.text} fontSize="16" fontWeight="600">
                    {cat.label}
                  </TSpan>
                </SvgText>
              );
            })}
          </Svg>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    heading: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    controls: { flexDirection: 'row', marginBottom: 12 },
  });
}
