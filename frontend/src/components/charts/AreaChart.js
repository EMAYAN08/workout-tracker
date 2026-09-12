import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { Activity } from 'lucide-react-native';

export default function AreaChart({
  data = [],
  color = '#4F46E5',
  unit = '',
  height = 260,
  emptyTitle = 'Not enough data',
  emptySubtitle = 'Log this more than once to see progression.',
  averageLine,
}) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.max(280, screenW - 48);
  const [activeIdx, setActiveIdx] = useState(null);

  const chart = useMemo(() => {
    if (!data || data.length < 2) return null;
    const padL = 42;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const values = data.map((d) => Number(d.value) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = data.map((d, i) => {
      const x = padL + (i / (data.length - 1)) * innerW;
      const y = padT + innerH - ((Number(d.value) || 0) - min) / span * innerH;
      return { x, y, ...d };
    });
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${padT + innerH} L ${points[0].x.toFixed(1)} ${padT + innerH} Z`;
    const yTicks = [max, (max + min) / 2, min].map((v, i) => ({
      value: Number(v.toFixed(v >= 100 ? 0 : 1)),
      y: padT + (i / 2) * innerH,
    }));
    const xTicks = points.filter((_, i) => {
      if (points.length <= 5) return true;
      const step = Math.ceil(points.length / 5);
      return i % step === 0 || i === points.length - 1;
    });
    return { padL, padT, innerH, innerW, points, line, area, yTicks, xTicks };
  }, [data, width, height]);

  if (!chart) {
    return (
      <View style={[styles.empty, { height }]}>
        <Activity size={32} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 10 }} />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptySub}>{emptySubtitle}</Text>
      </View>
    );
  }

  const tooltip = activeIdx != null ? chart.points[activeIdx] : null;

  return (
    <View>
      <Svg
        width={width}
        height={height}
        onPress={(e) => {
          const x = e.nativeEvent.locationX;
          let nearest = 0;
          let best = Infinity;
          chart.points.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < best) {
              best = d;
              nearest = i;
            }
          });
          setActiveIdx(nearest);
        }}
      >
        <Defs>
          <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="5%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="95%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {chart.yTicks.map((t, i) => (
          <React.Fragment key={i}>
            <Line
              x1={chart.padL}
              x2={chart.padL + chart.innerW}
              y1={t.y}
              y2={t.y}
              stroke="#3f3f46"
              strokeDasharray="3 3"
            />
            <SvgText
              x={chart.padL - 6}
              y={t.y + 4}
              fill="#a1a1aa"
              fontSize="10"
              fontWeight="bold"
              textAnchor="end"
            >
              {t.value}
            </SvgText>
          </React.Fragment>
        ))}
        {averageLine != null && data.length > 1 && (
          <Line
            x1={chart.padL}
            x2={chart.padL + chart.innerW}
            y1={
              chart.padT +
              chart.innerH -
              ((averageLine - Math.min(...data.map((d) => d.value))) /
                ((Math.max(...data.map((d) => d.value)) - Math.min(...data.map((d) => d.value))) || 1)) *
                chart.innerH
            }
            y2={
              chart.padT +
              chart.innerH -
              ((averageLine - Math.min(...data.map((d) => d.value))) /
                ((Math.max(...data.map((d) => d.value)) - Math.min(...data.map((d) => d.value))) || 1)) *
                chart.innerH
            }
            stroke={color}
            strokeDasharray="3 3"
            strokeWidth={2}
            opacity={0.5}
          />
        )}
        <Path d={chart.area} fill={`url(#grad-${color})`} />
        <Path d={chart.line} fill="none" stroke={color} strokeWidth={3} />
        {chart.xTicks.map((p, i) => (
          <SvgText
            key={i}
            x={p.x}
            y={height - 8}
            fill="#a1a1aa"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {p.date}
          </SvgText>
        ))}
        {tooltip && (
          <Circle
            cx={tooltip.x}
            cy={tooltip.y}
            r={6}
            fill={color}
            stroke="#18181b"
            strokeWidth={3}
          />
        )}
      </Svg>
      {tooltip && (
        <View style={[styles.tooltip, { borderColor: colors.border }]}>
          <Text style={styles.tooltipLabel}>{tooltip.date}</Text>
          <Text style={[styles.tooltipValue, { color }]}>
            {tooltip.value} <Text style={styles.tooltipUnit}>{unit}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  emptySub: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  tooltip: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tooltipLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tooltipValue: {
    fontFamily: fonts.black,
    fontSize: 18,
  },
  tooltipUnit: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
