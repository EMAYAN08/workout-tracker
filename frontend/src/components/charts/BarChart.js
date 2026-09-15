import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { Activity } from 'lucide-react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { haptic } from '../../haptics';

function lum(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexAlpha(hex, a) {
  const h = String(hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function niceMax(max) {
  if (!(max > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const top = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return top * pow;
}

function barPath(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return '';
  const radius = Math.min(r, w / 2, h);
  if (radius <= 0.4) {
    return `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`;
  }
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    'Z',
  ].join(' ');
}

function formatValue(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  if (Number.isInteger(n) || Math.abs(n) >= 100) return String(Math.round(n));
  return String(Number(n.toFixed(1)));
}

export default function BarChart({
  data = [],
  color,
  unit = '',
  height = 248,
  emptyTitle = 'Not enough data',
  emptySubtitle = 'Log this more than once to see progression.',
  totalLabel = 'Total',
}) {
  const { colors } = useTheme();
  const fill = color || colors.chartAccent || colors.text;
  const styles = useMemo(() => makeStyles(colors, fill), [colors, fill]);
  const [boxW, setBoxW] = useState(0);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const chartRef = useRef(null);
  const width = Math.max(200, boxW || 0);

  useEffect(() => {
    selectedRef.current = null;
    setSelected(null);
  }, [data]);

  const hasBars = (data || []).some((d) => Number(d.value) > 0);

  const chart = useMemo(() => {
    if (!hasBars || !data.length || width < 40) return null;
    const padL = 6;
    const padR = 44;
    const padT = 78;
    const padB = 26;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const values = data.map((d) => Number(d.value) || 0);
    const peak = Math.max(...values);
    const yMax = niceMax(peak);
    const n = data.length;
    const slot = innerW / n;
    const barW = Math.max(2.5, Math.min(13, slot * 0.58));
    const bars = data.map((d, i) => {
      const v = Number(d.value) || 0;
      const h = yMax > 0 ? (v / yMax) * innerH : 0;
      const cx = padL + slot * i + slot / 2;
      const x = cx - barW / 2;
      const y = padT + innerH - h;
      return { ...d, i, v, x, y, h, cx, barW };
    });
    const yTicks = [yMax, yMax / 2, 0].map((v, i) => ({
      value: formatValue(v),
      y: padT + (i / 2) * innerH,
    }));
    const xIdx = [];
    if (n <= 6) {
      for (let i = 0; i < n; i++) xIdx.push(i);
    } else {
      const marks = 5;
      for (let m = 0; m < marks; m++) {
        xIdx.push(Math.round((m * (n - 1)) / (marks - 1)));
      }
    }
    return { padL, padR, padT, padB, innerW, innerH, bars, yTicks, xIdx, yMax, barW };
  }, [data, hasBars, width, height]);

  chartRef.current = chart;

  const pick = (locationX) => {
    const c = chartRef.current;
    if (!c) return;
    const i = Math.max(0, Math.min(c.bars.length - 1, Math.floor((locationX - c.padL) / (c.innerW / c.bars.length))));
    if (selectedRef.current !== i) {
      selectedRef.current = i;
      setSelected(i);
      haptic('selection');
    }
  };

  const sel = chart && selected != null ? chart.bars[selected] : null;

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
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        >
          <Svg width={width} height={height} pointerEvents="none">
            {chart.yTicks.map((t, i) => (
              <React.Fragment key={`y-${i}`}>
                <Line
                  x1={chart.padL}
                  x2={width - chart.padR}
                  y1={t.y}
                  y2={t.y}
                  stroke={colors.chartGrid}
                  strokeWidth={1}
                />
                <SvgText
                  x={width - chart.padR + 8}
                  y={t.y + 4}
                  fill={colors.chartAxis}
                  fontSize="11"
                  textAnchor="start"
                >
                  {t.value}
                </SvgText>
              </React.Fragment>
            ))}
            {chart.xIdx.map((idx) => {
              const b = chart.bars[idx];
              return (
                <Line
                  key={`v-${idx}`}
                  x1={b.cx}
                  x2={b.cx}
                  y1={chart.padT}
                  y2={chart.padT + chart.innerH}
                  stroke={colors.chartGrid}
                  strokeDasharray="3 5"
                  strokeWidth={1}
                />
              );
            })}
            {chart.bars.map((b) => {
              if (b.h < 0.5) return null;
              const active = selected == null || selected === b.i;
              return (
                <Path
                  key={b.key || b.i}
                  d={barPath(b.x, b.y, b.barW, b.h, Math.min(3.5, b.barW / 2))}
                  fill={active ? fill : hexAlpha(fill, 0.28)}
                />
              );
            })}
            {chart.xIdx.map((idx) => {
              const b = chart.bars[idx];
              return (
                <SvgText
                  key={`x-${idx}`}
                  x={b.cx}
                  y={height - 8}
                  fill={colors.chartAxis}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {b.date}
                </SvgText>
              );
            })}
            {sel && sel.h > 0.5 && (
              <Line
                x1={sel.cx}
                x2={sel.cx}
                y1={56}
                y2={sel.y}
                stroke={fill}
                strokeWidth={1.5}
                opacity={0.85}
              />
            )}
          </Svg>
          {sel && (
            <View
              pointerEvents="none"
              style={[
                styles.tip,
                {
                  left: Math.min(Math.max(sel.cx - 62, 4), width - 128),
                },
              ]}
            >
              <Text style={styles.tipKicker}>{totalLabel}</Text>
              <Text style={styles.tipValue}>
                {formatValue(sel.v)}
                {unit ? <Text style={styles.tipUnit}> {unit}</Text> : null}
              </Text>
              <Text style={styles.tipDate}>{sel.fullDate || sel.date}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors, fill) {
  const onFill = lum(fill) > 0.55 ? '#141414' : '#F4F4F2';
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
    tip: {
      position: 'absolute',
      top: 4,
      minWidth: 112,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: fill,
      alignItems: 'center',
    },
    tipKicker: {
      color: onFill,
      opacity: 0.7,
      fontSize: 10,
      fontFamily: fonts.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    tipValue: {
      color: onFill,
      fontFamily: fonts.monoBold,
      fontSize: 22,
      letterSpacing: -0.4,
      marginTop: 1,
    },
    tipUnit: { fontSize: 13, fontFamily: fonts.regular, opacity: 0.8 },
    tipDate: {
      color: onFill,
      opacity: 0.72,
      fontSize: 12,
      fontFamily: fonts.regular,
      marginTop: 2,
    },
  });
}
