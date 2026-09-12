import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Activity } from 'lucide-react-native';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

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
  const [activeIdx, setActiveIdx] = useState(null);
  const width = Math.max(200, boxW || 0);

  const chart = useMemo(() => {
    if (!data || data.length < 2 || width < 40) return null;
    const padL = 40;
    const padR = 10;
    const padT = 14;
    const padB = 26;
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
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const yTicks = [max, (max + min) / 2, min].map((v, i) => ({
      value: Number(v.toFixed(v >= 100 ? 0 : 1)),
      y: padT + (i / 2) * innerH,
    }));
    const xTicks = points.filter((_, i) => {
      if (points.length <= 5) return true;
      const step = Math.ceil(points.length / 5);
      return i % step === 0 || i === points.length - 1;
    });
    return { padL, padT, innerH, innerW, points, line, yTicks, xTicks, min, span };
  }, [data, width, height]);

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
            <Path d={chart.line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {chart.xTicks.map((p, i) => (
              <SvgText key={i} x={p.x} y={height - 8} fill={colors.chartAxis} fontSize="11" textAnchor="middle">
                {p.date}
              </SvgText>
            ))}
            {activeIdx != null && chart.points[activeIdx] && (
              <Circle
                cx={chart.points[activeIdx].x}
                cy={chart.points[activeIdx].y}
                r={5}
                fill={stroke}
                stroke={colors.chartDotStroke}
                strokeWidth={3}
              />
            )}
          </Svg>
          {activeIdx != null && chart.points[activeIdx] && (
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.min(Math.max(chart.points[activeIdx].x - 44, 8), width - 100),
                },
              ]}
            >
              <Text style={styles.tooltipLabel}>{chart.points[activeIdx].date}</Text>
              <Text style={styles.tooltipValue}>
                {chart.points[activeIdx].value}
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
