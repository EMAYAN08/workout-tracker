import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { subDays, subMonths, subYears, isAfter } from 'date-fns';
import { calculateVolume, convertWeight } from '../../utils/calculations';
import { useWorkout } from '../../context/WorkoutContext';
import { Select } from '../ui/primitives';
import RangePills from '../charts/RangePills';
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

const STRENGTH_RANGES = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
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

const LABEL_W = 84;
const LABEL_H = 40;

function labelSlot(i, w, h) {
  const mid = (w - LABEL_W) / 2;
  const sideTop = Math.round(h * 0.18);
  const sideBot = Math.round(h * 0.58);
  switch (i) {
    case 0:
      return { left: mid, top: 0, width: LABEL_W, alignItems: 'center' };
    case 1:
      return { left: w - LABEL_W, top: sideTop, width: LABEL_W, alignItems: 'flex-end' };
    case 2:
      return { left: w - LABEL_W, top: sideBot, width: LABEL_W, alignItems: 'flex-end' };
    case 3:
      return { left: mid, top: h - LABEL_H, width: LABEL_W, alignItems: 'center' };
    case 4:
      return { left: 0, top: sideBot, width: LABEL_W, alignItems: 'flex-start' };
    default:
      return { left: 0, top: sideTop, width: LABEL_W, alignItems: 'flex-start' };
  }
}

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
  const [box, setBox] = useState({ w: 0, h: 380 });

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
    if (timeRange === '1m') cutoffDate = subDays(now, 30);
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
      let valueLine = '0';
      if (metric === 'volume') {
        rawVal = stats[cat.id].volume;
        const converted = convertWeight(rawVal, 'lbs', unit);
        valueLine = converted > 1000 ? `${(converted / 1000).toFixed(1)}K` : `${Math.round(converted)}`;
      } else if (metric === 'frequency') {
        rawVal = stats[cat.id].frequency.size;
        valueLine = `${rawVal}`;
      } else {
        rawVal = stats[cat.id].load;
        valueLine = `${rawVal}%`;
      }
      const max = maxValues[metric];
      let level = 0;
      if (max > 0) {
        level = Math.round((rawVal / max) * 5);
        if (level === 0 && rawVal > 0) level = 1;
        if (level > 5) level = 5;
      }
      return { ...cat, value: rawVal, valueLine, level };
    });
  }, [stats, metric, unit, maxValues]);

  const unitCaption = metric === 'frequency' ? 'sessions' : metric === 'volume' ? unit : 'share of volume';

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.heading}>Strength</Text>
      <View style={styles.panel}>
        <Select value={metric} onChange={setMetric} options={metricOptions} />
        <View style={{ marginTop: 10, marginBottom: 8 }}>
          <RangePills value={timeRange} onChange={setTimeRange} ranges={STRENGTH_RANGES} />
        </View>
        <View
          style={styles.radarWrap}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width && height) setBox({ w: width, h: height });
          }}
        >
          <View style={styles.radarInner}>
            <Svg width="100%" height="100%" viewBox="0 0 200 200">
              {chartValues.map((cat, i) => {
                const angleSpan = 360 / 6;
                const centerAngle = i * angleSpan;
                const startAngle = centerAngle - angleSpan / 2;
                const endAngle = centerAngle + angleSpan / 2;
                return (
                  <React.Fragment key={cat.id}>
                    {[...Array(5)].map((_, ringIndex) => {
                      const rLevel = ringIndex + 1;
                      const iRadius = 20 + ringIndex * 14.4;
                      const oRadius = iRadius + 12.8;
                      const isFilled = rLevel <= cat.level;
                      return (
                        <Path
                          key={ringIndex}
                          d={describeArc(100, 100, iRadius, oRadius, startAngle, endAngle)}
                          fill={isFilled ? ringFills[ringIndex] : emptyFill}
                          stroke={colors.border}
                          strokeWidth="1.1"
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
          {chartValues.map((cat, i) => {
            const pos = labelSlot(i, box.w || 320, box.h || 380);
            return (
              <View key={`label-${cat.id}`} pointerEvents="none" style={[styles.labelBox, pos]}>
                <Text style={styles.valueLine} numberOfLines={1}>
                  {cat.valueLine}
                </Text>
                <Text style={styles.nameLine} numberOfLines={1}>
                  {cat.label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.caption}>{unitCaption}</Text>
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
    radarWrap: {
      height: 380,
      marginTop: 8,
      position: 'relative',
    },
    radarInner: {
      position: 'absolute',
      left: 86,
      right: 86,
      top: 48,
      bottom: 48,
    },
    labelBox: {
      position: 'absolute',
      height: LABEL_H,
      justifyContent: 'center',
    },
    valueLine: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: fonts.semibold,
    },
    nameLine: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.semibold,
      marginTop: 1,
    },
    caption: {
      color: colors.textSubtle,
      fontSize: 11,
      fontFamily: fonts.medium,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 4,
    },
  });
}
