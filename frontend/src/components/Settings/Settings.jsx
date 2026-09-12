import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Moon, Sun, Scale, Palette, ChartLine, Timer } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useWorkout } from '../../context/WorkoutContext';
import { Select } from '../ui/primitives';
import { ACCENT_SWATCHES, CHART_SWATCHES, fonts, radius, HIT } from '../../theme';
import { haptic } from '../../haptics';

export default function Settings() {
  const {
    colors,
    isDark,
    scheme,
    setScheme,
    accentId,
    chartId,
    setAccentId,
    setChartId,
  } = useTheme();
  const { unit, toggleUnit, restTargetSec, setRestTargetSec } = useWorkout();
  const styles = makeStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Looks, units, and rest — applied everywhere.</Text>

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          {isDark ? <Moon size={16} color={colors.textMuted} /> : <Sun size={16} color={colors.textMuted} />}
          <Text style={styles.rowLabel}>Theme</Text>
        </View>
        <View style={styles.seg}>
          {['dark', 'light'].map((mode) => {
            const on = scheme === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  haptic('selection');
                  setScheme(mode);
                }}
                style={[styles.segBtn, on && { backgroundColor: colors.text }]}
              >
                <Text style={[styles.segText, on && { color: colors.background }]}>
                  {mode === 'dark' ? 'Dark' : 'Light'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Units</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Scale size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Weight</Text>
        </View>
        <View style={styles.seg}>
          {['lbs', 'kgs'].map((u) => {
            const on = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => {
                  if (unit !== u) {
                    haptic('selection');
                    toggleUnit();
                  }
                }}
                style={[styles.segBtn, on && { backgroundColor: colors.text }]}
              >
                <Text style={[styles.segText, on && { color: colors.background }]}>
                  {u === 'lbs' ? 'LB' : 'KG'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Accent</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Palette size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>App color</Text>
          <Text style={styles.rowMeta}>
            {ACCENT_SWATCHES.find((s) => s.id === accentId)?.label || 'Steel'}
          </Text>
        </View>
        <Text style={styles.hint}>Buttons, active tabs, and rest timer.</Text>
        <View style={styles.swatches}>
          {ACCENT_SWATCHES.map((s) => {
            const hex = isDark ? s.dark : s.light;
            const on = accentId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  haptic('selection');
                  setAccentId(s.id);
                }}
                accessibilityLabel={`Accent ${s.label}`}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  on && styles.swatchOn,
                ]}
              />
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Charts</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <ChartLine size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Graph color</Text>
          <Text style={styles.rowMeta}>
            {CHART_SWATCHES.find((s) => s.id === chartId)?.label || 'Olive'}
          </Text>
        </View>
        <Text style={styles.hint}>You-tab charts only. Kept separate from the app accent.</Text>
        <View style={styles.swatches}>
          {CHART_SWATCHES.map((s) => {
            const hex = isDark ? s.dark : s.light;
            const on = chartId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  haptic('selection');
                  setChartId(s.id);
                }}
                accessibilityLabel={`Chart ${s.label}`}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  on && styles.swatchOn,
                ]}
              />
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Rest timer</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Timer size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Default rest</Text>
        </View>
        <Select
          value={String(restTargetSec)}
          onChange={(v) => setRestTargetSec(Number(v))}
          options={[
            { value: '60', label: '60 seconds' },
            { value: '90', label: '90 seconds' },
            { value: '120', label: '2 minutes' },
            { value: '180', label: '3 minutes' },
          ]}
        />
        <Text style={styles.hint}>Completing a set starts this countdown. A live lock-screen notice tracks the remaining time.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 140 },
    title: { color: colors.text, fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.8 },
    sub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginTop: 4, marginBottom: 20 },
    section: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 18,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, minHeight: 22 },
    rowLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, flex: 1 },
    rowMeta: {
      color: colors.textMuted,
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginBottom: 12 },
    seg: {
      flexDirection: 'row',
      height: HIT,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      backgroundColor: colors.surface2,
    },
    segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    segText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 0.4 },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    swatchOn: { borderColor: colors.text, borderWidth: 2 },
  });
}
