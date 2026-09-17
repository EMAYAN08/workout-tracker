import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Platform, Linking, Switch } from 'react-native';
import { Moon, Sun, Scale, Palette, ChartLine, Timer, Download, Upload, Beaker, Trash2, Shield, LifeBuoy, MessageCircle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useWorkout } from '../../context/WorkoutContext';
import { Select, ScreenHeader, hideScroll } from '../ui/primitives';
import ColorPicker from '../ui/ColorPicker';
import {
  ACCENT_SWATCHES,
  CHART_SWATCHES,
  CUSTOM_COLOR_ID,
  fonts,
  radius,
  HIT,
} from '../../theme';
import { haptic } from '../../haptics';
import { confirmAction } from '../../dialog';

const SITE = 'https://emayan08.github.io/workout-tracker';

export default function Settings({ scrollRef }) {
  const {
    colors,
    isDark,
    scheme,
    setScheme,
    accentId,
    chartId,
    accentHex,
    chartHex,
    setAccentId,
    setChartId,
    setAccentCustom,
    setChartCustom,
  } = useTheme();
  const { unit, toggleUnit, restTargetSec, setRestTargetSec, exportData, importData, useMock, toggleMock, wipeAllData } = useWorkout();
  const styles = makeStyles(colors);
  const [busy, setBusy] = useState(false);

  const toast = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const res = await exportData();
      if (res?.ok) toast('Exported', `${res.count} workouts saved to a TrackHit backup file.`);
    } catch (err) {
      toast('Export failed', err.message || 'Could not write backup.');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const res = await importData();
      if (res?.cancelled) return;
      if (res?.ok) {
        toast(
          'Imported',
          `${res.mode === 'replace' ? 'Replaced' : 'Merged'} ${res.workouts} workouts, ${res.routines} routines, ${res.customExercises} custom exercises.`
        );
      }
    } catch (err) {
      toast('Import failed', err.message || 'That file does not look like a TrackHit / Mongo backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Settings" subtitle="Looks, units, rest, and backup." />
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scroll} {...hideScroll}>
      <Text style={styles.section}>Demo</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Beaker size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Mock data</Text>
          <Switch
            value={!!useMock}
            onValueChange={(on) => {
              haptic('selection');
              toggleMock(on);
            }}
            trackColor={{ false: colors.borderStrong, true: colors.accent }}
            thumbColor={Platform.OS === 'android' ? (useMock ? colors.accentFg : colors.surface) : '#FFFFFF'}
            ios_backgroundColor={colors.surface2}
            accessibilityLabel="Mock data"
            style={styles.switch}
          />
        </View>
        <Text style={[styles.hint, { marginBottom: 0 }]}>
          Preview a full training log without touching your real workouts. Turn it off anytime — nothing is saved.
        </Text>
      </View>

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.rowTight}>
          {isDark ? <Moon size={16} color={colors.textMuted} /> : <Sun size={16} color={colors.textMuted} />}
          <Text style={styles.rowLabel}>Theme</Text>
          <View style={styles.compactSeg}>
            {[
              { value: 'dark', Icon: Moon, label: 'Dark' },
              { value: 'light', Icon: Sun, label: 'Light' },
            ].map(({ value, Icon, label }) => {
              const on = scheme === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    haptic('selection');
                    setScheme(value);
                  }}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                  style={[styles.compactBtn, on && { backgroundColor: colors.text }]}
                >
                  <Icon size={14} color={on ? colors.background : colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.section}>Units</Text>
      <View style={styles.card}>
        <View style={styles.rowTight}>
          <Scale size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Weight</Text>
          <View style={styles.compactSeg}>
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
                  accessibilityLabel={u === 'lbs' ? 'Pounds' : 'Kilograms'}
                  accessibilityState={{ selected: on }}
                  style={[styles.compactBtn, on && { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.compactText, on && { color: colors.background }]}>
                    {u === 'lbs' ? 'LB' : 'KG'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.section}>Accent</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Palette size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>App color</Text>
          <Text style={styles.rowMeta}>
            {accentId === CUSTOM_COLOR_ID
              ? 'Custom'
              : ACCENT_SWATCHES.find((s) => s.id === accentId)?.label || 'Steel'}
          </Text>
        </View>
        <Text style={styles.hint}>Buttons, tabs, and rest timer. Pick a swatch or mix your own.</Text>
        <ColorPicker
          value={
            accentId === CUSTOM_COLOR_ID && accentHex
              ? accentHex
              : (ACCENT_SWATCHES.find((s) => s.id === accentId) || ACCENT_SWATCHES[0])[isDark ? 'dark' : 'light']
          }
          onChange={setAccentCustom}
          accessibilityLabel="Custom app color"
        />
        <ScrollView horizontal nestedScrollEnabled {...hideScroll} contentContainerStyle={styles.swatchRow}>
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
                style={styles.swatchItem}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    on && styles.swatchOn,
                  ]}
                />
                <Text style={[styles.swatchLbl, on && { color: colors.text }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.section}>Charts</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <ChartLine size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Graph color</Text>
          <Text style={styles.rowMeta}>
            {chartId === CUSTOM_COLOR_ID
              ? 'Custom'
              : CHART_SWATCHES.find((s) => s.id === chartId)?.label || 'Olive'}
          </Text>
        </View>
        <Text style={styles.hint}>Profile charts and the consistency map. Pick a swatch or mix your own.</Text>
        <ColorPicker
          value={
            chartId === CUSTOM_COLOR_ID && chartHex
              ? chartHex
              : (CHART_SWATCHES.find((s) => s.id === chartId) || CHART_SWATCHES[0])[isDark ? 'dark' : 'light']
          }
          onChange={setChartCustom}
          accessibilityLabel="Custom graph color"
        />
        <ScrollView horizontal nestedScrollEnabled {...hideScroll} contentContainerStyle={styles.swatchRow}>
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
                style={styles.swatchItem}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    on && styles.swatchOn,
                  ]}
                />
                <Text style={[styles.swatchLbl, on && { color: colors.text }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.section}>Rest timer</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Timer size={16} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Default rest</Text>
        </View>
        <Text style={styles.hint}>Starts after each set. Alerts you when rest is over.</Text>
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
      </View>

      <Text style={styles.section}>Backup</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Everything lives on this device. Export a JSON file and import it on another phone.
        </Text>
        <View style={styles.backupRow}>
          <Pressable disabled={busy} onPress={onExport} style={[styles.backupBtn, busy && { opacity: 0.5 }]}>
            <Download size={16} color={colors.accentFg} />
            <Text style={styles.backupText}>Export</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={onImport} style={[styles.backupBtnGhost, busy && { opacity: 0.5 }]}>
            <Upload size={16} color={colors.text} />
            <Text style={styles.backupGhostText}>Import</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>Legal</Text>
      <View style={styles.card}>
        {[
          { Icon: Shield, label: 'Privacy Policy', path: '/privacy/' },
          { Icon: LifeBuoy, label: 'Support', path: '/support/' },
          { Icon: MessageCircle, label: 'Feedback', path: '/feedback/' },
        ].map(({ Icon, label, path }, i, arr) => (
          <Pressable
            key={path}
            onPress={() => Linking.openURL(`${SITE}${path}`)}
            style={[styles.legalRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
            accessibilityRole="link"
            accessibilityLabel={`${label}, opens in browser`}
          >
            <Icon size={16} color={colors.textMuted} />
            <Text style={styles.rowLabel}>{label}</Text>
            <ExternalLink size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Danger</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Trash2 size={16} color={colors.danger} />
          <Text style={styles.rowLabel}>Wipe workout data</Text>
        </View>
        <Text style={styles.hint}>
          Deletes every workout, routine, and custom exercise stored on this phone. This action cannot be undone.
        </Text>
        <Pressable
          disabled={busy}
          onPress={() =>
            confirmAction(
              'Wipe all data?',
              'This permanently deletes your workouts, routines, and custom exercises on this device.',
              async () => {
                setBusy(true);
                try {
                  await wipeAllData();
                  toast('Wiped', 'This device is a clean slate.');
                } catch (err) {
                  toast('Wipe failed', err.message || 'Could not clear data.');
                } finally {
                  setBusy(false);
                }
              },
              { confirmLabel: 'Wipe', destructive: true }
            )
          }
          style={[styles.wipeBtn, busy && { opacity: 0.5 }]}
        >
          <Text style={styles.wipeText}>Delete all data</Text>
        </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 140 },
    section: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, minHeight: 32 },
    rowTight: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
    rowLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, flex: 1 },
    rowMeta: {
      color: colors.textMuted,
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginBottom: 12 },
    compactSeg: {
      flexDirection: 'row',
      height: 32,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      backgroundColor: colors.surface2,
    },
    compactBtn: {
      minWidth: 40,
      paddingHorizontal: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4 },
    switch: { transform: [{ scaleX: 0.86 }, { scaleY: 0.86 }] },
    swatchRow: { gap: 12, paddingVertical: 4, paddingRight: 8, marginTop: 12 },
    swatchItem: { alignItems: 'center', gap: 6, width: 52 },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    swatchOn: { borderColor: colors.text, borderWidth: 2 },
    swatchLbl: {
      color: colors.textSubtle,
      fontFamily: fonts.medium,
      fontSize: 10,
      textAlign: 'center',
    },
    backupRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    backupBtn: {
      flex: 1,
      minHeight: HIT,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    backupText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 15 },
    backupBtnGhost: {
      flex: 1,
      minHeight: HIT,
      borderRadius: radius.sm,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    backupGhostText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
    wipeBtn: {
      minHeight: HIT,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wipeText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 15 },
    legalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: HIT,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
}