import React, { useMemo, useState, useId, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Activity } from 'lucide-react-native';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { smoothLine, pointOnSmoothLine } from '../../utils/chartPath';

export default function AreaChart({
  data = [],
  color,
  unit = '',
  height = 220,
  emptyTitle = 'Not enough data',
  emptySubtitle = 'Log this more than once to see progression.',
  averageLine,
}) {
  const { colors } = useTheme();
  const stroke = color || colors.chartAccent || colors.text;
  const styles = makeStyles(colors);
  const [boxW, setBoxW] = useState(0);
  const [cursor, setCursor] = useState(null);
  const width = Math.max(200, boxW || 0);
  const gid = `fill-${String(useId()).replace(/[^a-zA-Z0-9]/g, '')}`;
  const chartRef = useRef(null);

  const chart = useMemo(() => {
    if (!data || data.length < 2 || width < 40) return null;
    const padL = 40;
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
    const line = smoothLine(points);
    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x.toFixed(2)} ${(padT + innerH).toFixed(2)} L ${first.x.toFixed(2)} ${(padT + innerH).toFixed(2)} Z`;
    const yTicks = [max, (max + min) / 2, min].map((v, i) => ({
      value: Number(v.toFixed(v >= 100 ? 0 : 1)),
      y: padT + (i / 2) * innerH,
    }));
    const xTicks = points.filter((_, i) => {
      if (points.length <= 5) return true;
      const step = Math.ceil(points.length / 5);
      return i % step === 0 || i === points.length - 1;
    });
    return { padL, padT, innerH, innerW, points, line, area, yTicks, xTicks, min, span };
  }, [data, width, height]);

  chartRef.current = chart;

  const moveCursor = (locationX) => {
    const c = chartRef.current;
    if (!c) return;
    const next = pointOnSmoothLine(c.points, locationX);
    if (next) setCursor(next);
  };

  const formatValue = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    return Number.isInteger(n) || Math.abs(n) >= 100 ? Math.round(n) : Number(n.toFixed(1));
  };

  return (
    <View
      style={{ width: '100%' }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && Math.abs(w - boxW) > 1) setBoxW(w);
      }}
    >
      {!chart ? (
        <View style={[styles.empty, { height }]}>
          <Activity size={22} color={colors.textSubtle} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySub}>{emptySubtitle}</Text>
        </View>
      ) : (
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => moveCursor(e.nativeEvent.locationX)}
          onResponderMove={(e) => moveCursor(e.nativeEvent.locationX)}
        >
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
                <Stop offset="70%" stopColor={stroke} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            {chart.yTicks.map((t, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={chart.padL}
                  x2={chart.padL + chart.innerW}
                  y1={t.y}
                  y2={t.y}
                  stroke={colors.chartGrid}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={chart.padL - 6}
                  y={t.y + 4}
                  fill={colors.chartAxis}
                  fontSize="11"
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
                  ((averageLine - chart.min) / chart.span) * chart.innerH
                }
                y2={
                  chart.padT +
                  chart.innerH -
                  ((averageLine - chart.min) / chart.span) * chart.innerH
                }
                stroke={stroke}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                opacity={0.45}
              />
            )}
            <Path d={chart.area} fill={`url(#${gid})`} />
            <Path
              d={chart.line}
              fill="none"
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chart.xTicks.map((p, i) => (
              <SvgText key={i} x={p.x} y={height - 8} fill={colors.chartAxis} fontSize="11" textAnchor="middle">
                {p.date}
              </SvgText>
            ))}
            {cursor && (
              <>
                <Line
                  x1={cursor.x}
                  x2={cursor.x}
                  y1={chart.padT}
                  y2={chart.padT + chart.innerH}
                  stroke={stroke}
                  strokeWidth={1}
                  opacity={0.28}
                />
                <Circle
                  cx={cursor.x}
                  cy={cursor.y}
                  r={6}
                  fill={stroke}
                  stroke={colors.chartDotStroke}
                  strokeWidth={3}
                />
              </>
            )}
          </Svg>
          {cursor && (
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.min(Math.max(cursor.x - 44, 8), width - 100),
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.tooltipLabel}>{cursor.date}</Text>
              <Text style={styles.tooltipValue}>
                {formatValue(cursor.value)}
                <Text style={styles.tooltipUnit}> {unit}</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    empty: { alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
    emptySub: {
      color: colors.textMuted,
      fontFamily: fonts.regular,
      fontSize: 13,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    tooltip: {
      position: 'absolute',
      top: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    tooltipLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.medium,
      marginBottom: 1,
    },
    tooltipValue: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.text },
    tooltipUnit: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
  });
}
