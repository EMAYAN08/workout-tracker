import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform, Easing, Keyboard, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { ChevronDown, Delete, ArrowRight } from 'lucide-react-native';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { haptic } from '../../haptics';

const SHEET_H = 380;

function NumpadKey({ label, onPress, style, children, flex, accessibilityLabel, colors, styles }) {
  return (
    <Pressable
      onPress={onPress}
      delayPressIn={0}
      android_disableSound
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [styles.key, flex && { flex }, style, pressed && styles.keyPressed]}
    >
      {children || <Text style={styles.keyText}>{label}</Text>}
    </Pressable>
  );
}

function PreviewCard({ preview, field, value, colors, styles }) {
  if (!preview) return null;
  const sets = preview.sets || [];
  const unit = preview.unit || 'lbs';
  const activeIdx = preview.setIndex ?? 0;
  const readout = value === '' || value == null ? '—' : String(value);
  const readoutUnit = field === 'reps' ? 'reps' : unit;
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {preview.title || 'Exercise'}
          </Text>
          {preview.meta ? <Text style={styles.previewMeta}>{preview.meta}</Text> : null}
        </View>
        <View style={styles.readoutWrap}>
          <Text style={styles.readout} numberOfLines={1}>
            {readout}
          </Text>
          <Text style={styles.readoutUnit}>{readoutUnit}</Text>
        </View>
      </View>
      <View style={styles.previewCols}>
        <Text style={[styles.previewCol, { width: 36 }]}>Set</Text>
        <Text style={[styles.previewCol, { flex: 1 }]}>{unit}</Text>
        <Text style={[styles.previewCol, { flex: 1 }]}>Reps</Text>
      </View>
      <ScrollView
        style={styles.previewSets}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
      {sets.map((set, i) => {
        const wOn = i === activeIdx && field === 'weight';
        const rOn = i === activeIdx && field === 'reps';
        return (
          <View key={i} style={[styles.previewRow, i === activeIdx && styles.previewRowOn]}>
            <Text style={styles.previewIdx}>{i + 1}</Text>
            <Pressable
              onPress={() => preview.onSelectCell?.(i, 'weight')}
              style={[styles.previewCell, wOn && styles.previewCellOn]}
              accessibilityLabel={`Set ${i + 1} weight`}
            >
              <Text style={[styles.previewCellText, wOn && styles.previewCellTextOn]}>
                {set.weight === '' || set.weight == null ? '—' : String(set.weight)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => preview.onSelectCell?.(i, 'reps')}
              style={[styles.previewCell, rOn && styles.previewCellOn]}
              accessibilityLabel={`Set ${i + 1} reps`}
            >
              <Text style={[styles.previewCellText, rOn && styles.previewCellTextOn]}>
                {set.reps === '' || set.reps == null ? '—' : String(set.reps)}
              </Text>
            </Pressable>
          </View>
        );
      })}
      </ScrollView>
    </View>
  );
}

export default function CustomNumpad({ activeInput, onClose, onUpdate, value, preview, hostHeight = 0 }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, setTabBarHidden } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const freshRef = useRef(true);
  const targetRef = useRef(null);
  const draftRef = useRef(String(value ?? ''));
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const cardY = useRef(new Animated.Value(28)).current;
  const glassOpacity = useRef(new Animated.Value(0)).current;
  const originY = useRef(0);
  const tracking = useRef(false);
  const closing = useRef(false);
  const lastInput = useRef(activeInput);
  const lastPreview = useRef(preview);
  const lastValue = useRef(value);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [mounted, setMounted] = useState(!!activeInput);
  const nativeDriver = Platform.OS !== 'web';
  const keypadOpen = !!activeInput;

  if (activeInput) lastInput.current = activeInput;
  if (preview) lastPreview.current = preview;
  if (value !== undefined) lastValue.current = value;
  const input = activeInput || lastInput.current;
  const shownPreview = preview || lastPreview.current;
  const shownValue = activeInput ? value : lastValue.current;
  const targetId = input ? input.targetId || input.field : null;

  if (targetRef.current !== targetId) {
    targetRef.current = targetId;
    freshRef.current = true;
    draftRef.current = String(value ?? '');
  }

  const animateIn = useCallback(() => {
    closing.current = false;
    Animated.parallel([
      Animated.timing(glassOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.spring(cardY, {
        toValue: 0,
        useNativeDriver: nativeDriver,
        damping: 20,
        stiffness: 240,
        mass: 0.85,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: nativeDriver,
        damping: 24,
        stiffness: 260,
        mass: 0.85,
      }),
    ]).start();
  }, [nativeDriver, translateY, cardY, glassOpacity]);

  const animateOut = useCallback(
    (then) => {
      if (closing.current) return;
      closing.current = true;
      Animated.parallel([
        Animated.timing(glassOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(cardY, {
          toValue: 36,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(translateY, {
          toValue: SHEET_H,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
      ]).start(() => {
        closing.current = false;
        setMounted(false);
        then?.();
      });
    },
    [nativeDriver, translateY, cardY, glassOpacity]
  );

  const close = useCallback(() => {
    haptic('selection');
    animateOut(() => onClose?.());
  }, [animateOut, onClose]);

  const settle = useCallback(
    (dy, vy = 0) => {
      tracking.current = false;
      if (dy > 40 || vy > 700) {
        close();
        return;
      }
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: nativeDriver,
          damping: 24,
          stiffness: 320,
          mass: 0.7,
        }),
        Animated.spring(cardY, {
          toValue: 0,
          useNativeDriver: nativeDriver,
          damping: 24,
          stiffness: 320,
          mass: 0.7,
        }),
        Animated.spring(glassOpacity, {
          toValue: 1,
          useNativeDriver: nativeDriver,
          damping: 24,
          stiffness: 320,
          mass: 0.7,
        }),
      ]).start();
    },
    [close, nativeDriver, translateY, cardY, glassOpacity]
  );

  const settleRef = useRef(settle);
  settleRef.current = settle;

  useLayoutEffect(() => {
    if (keypadOpen) setMounted(true);
    setTabBarHidden(keypadOpen || mounted);
  }, [keypadOpen, mounted, setTabBarHidden]);

  useEffect(() => () => setTabBarHidden(false), [setTabBarHidden]);

  useEffect(() => {
    if (keypadOpen) {
      Keyboard.dismiss();
      if (closing.current) {
        closing.current = false;
        animateIn();
        return;
      }
      if (!mounted) {
        translateY.setValue(SHEET_H);
        cardY.setValue(28);
        glassOpacity.setValue(0);
        setMounted(true);
      }
    } else if (mounted && !closing.current) {
      animateOut();
    }
  }, [keypadOpen, mounted, animateIn, animateOut, translateY, cardY, glassOpacity]);

  useEffect(() => {
    if (mounted && keypadOpen) animateIn();
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragSheet = useCallback(
    (dy) => {
      const y = Math.max(0, dy);
      translateY.setValue(y);
      cardY.setValue(y * 0.22);
      glassOpacity.setValue(Math.max(0, 1 - y / 320));
    },
    [translateY, cardY, glassOpacity]
  );

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return undefined;
    const onDown = (e) => {
      const sheet = document.getElementById('keypad-sheet');
      if (!sheet) return;
      const r = sheet.getBoundingClientRect();
      if (e.clientY < r.top - 8 || e.clientY > r.bottom + 8) return;
      tracking.current = true;
      originY.current = e.clientY;
      translateY.stopAnimation();
      cardY.stopAnimation();
      glassOpacity.stopAnimation();
    };
    const onMove = (e) => {
      if (!tracking.current) return;
      e.preventDefault?.();
      dragSheet(e.clientY - originY.current);
    };
    const onUp = (e) => {
      if (!tracking.current) return;
      const dy = Math.max(0, (e.clientY ?? originY.current) - originY.current);
      settleRef.current(dy, 0);
    };
    const opts = { capture: true, passive: false };
    document.addEventListener('pointerdown', onDown, opts);
    document.addEventListener('pointermove', onMove, opts);
    document.addEventListener('pointerup', onUp, opts);
    document.addEventListener('pointercancel', onUp, opts);
    return () => {
      document.removeEventListener('pointerdown', onDown, opts);
      document.removeEventListener('pointermove', onMove, opts);
      document.removeEventListener('pointerup', onUp, opts);
      document.removeEventListener('pointercancel', onUp, opts);
    };
  }, [mounted, translateY, cardY, glassOpacity, dragSheet]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(12)
        .failOffsetX([-40, 40])
        .onUpdate((e) => {
          dragSheet(e.translationY);
        })
        .onEnd((e) => {
          settle(e.translationY, e.velocityY);
        }),
    [settle, dragSheet]
  );

  const commit = useCallback((next) => {
    draftRef.current = next;
    onUpdateRef.current?.(next);
  }, []);

  const handleKeyPress = useCallback(
    (key) => {
      const field = lastInput.current?.field;
      let currentVal = draftRef.current;
      if (key === 'delete') {
        freshRef.current = false;
        haptic('selection');
        commit(currentVal.slice(0, -1));
        return;
      }
      if (key === '.') {
        if (field === 'reps') return;
        if (freshRef.current) {
          freshRef.current = false;
          commit('0.');
          return;
        }
        if (!currentVal.includes('.')) commit(currentVal + (currentVal.length === 0 ? '0.' : '.'));
        return;
      }
      if (key === '+' || key === '-') {
        freshRef.current = false;
        haptic('selection');
        let num = parseFloat(currentVal) || 0;
        const step = field === 'weight' ? 2.5 : 1;
        if (key === '+') num += step;
        if (key === '-') num = Math.max(0, num - step);
        commit(String(Math.round(num * 100) / 100));
        return;
      }
      if (freshRef.current) {
        freshRef.current = false;
        commit(key);
        return;
      }
      if (currentVal === '0' && key !== '.') commit(key);
      else commit(currentVal + key);
    },
    [commit]
  );

  if (!input) return null;
  if (!keypadOpen && !mounted) return null;

  const keyProps = { colors, styles };
  const overlayH = hostHeight > 80 ? hostHeight : Math.round(Dimensions.get('window').height * 0.72);

  return (
    <View style={[styles.overlay, { height: overlayH }]} collapsable={false}>
      <Animated.View style={[styles.glass, { opacity: glassOpacity }]} pointerEvents="none">
        <BlurView
          intensity={isDark ? 58 : 42}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.glassTint,
            { backgroundColor: isDark ? 'rgba(6,6,8,0.42)' : 'rgba(255,255,255,0.32)' },
          ]}
        />
      </Animated.View>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss editor" />
      <Animated.View
        style={[styles.previewWrap, { transform: [{ translateY: cardY }] }]}
      >
        <PreviewCard preview={shownPreview} field={input.field} value={shownValue} colors={colors} styles={styles} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          nativeID="keypad-sheet"
          collapsable={false}
          style={[styles.sheet, { paddingBottom: 4, transform: [{ translateY }] }]}
        >
            <View nativeID="keypad-handle" collapsable={false} style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <View style={styles.tabs}>
              {[
                { id: 'weight', label: 'Weight' },
                { id: 'reps', label: 'Reps' },
              ].map((tab) => {
                const active = input.field === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    delayPressIn={0}
                    onPress={() => input.onChangeField?.(tab.id)}
                    style={styles.tab}
                  >
                    <Text style={[styles.tabLabel, !active && { color: colors.textMuted }]}>{tab.label}</Text>
                    {active ? (
                      <View style={styles.checkOn}>
                        <Text style={styles.checkOnText}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.checkOff} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.grid}>
              <View style={styles.row}>
                <NumpadKey label="1" onPress={() => handleKeyPress('1')} {...keyProps} />
                <NumpadKey label="2" onPress={() => handleKeyPress('2')} {...keyProps} />
                <NumpadKey label="3" onPress={() => handleKeyPress('3')} {...keyProps} />
                <NumpadKey onPress={close} accessibilityLabel="Dismiss keypad" {...keyProps}>
                  <ChevronDown size={22} color={colors.text} />
                </NumpadKey>
              </View>
              <View style={styles.row}>
                <NumpadKey label="4" onPress={() => handleKeyPress('4')} {...keyProps} />
                <NumpadKey label="5" onPress={() => handleKeyPress('5')} {...keyProps} />
                <NumpadKey label="6" onPress={() => handleKeyPress('6')} {...keyProps} />
                <View style={styles.split}>
                  <NumpadKey label="-" onPress={() => handleKeyPress('-')} flex={1} style={styles.splitKey} {...keyProps} />
                  <NumpadKey label="+" onPress={() => handleKeyPress('+')} flex={1} style={styles.splitKey} {...keyProps} />
                </View>
              </View>
              <View style={styles.rowBottom}>
                <View style={{ flex: 3 }}>
                  <View style={styles.row}>
                    <NumpadKey label="7" onPress={() => handleKeyPress('7')} {...keyProps} />
                    <NumpadKey label="8" onPress={() => handleKeyPress('8')} {...keyProps} />
                    <NumpadKey label="9" onPress={() => handleKeyPress('9')} {...keyProps} />
                  </View>
                  <View style={[styles.row, { marginBottom: 0 }]}>
                    <NumpadKey label="." onPress={() => handleKeyPress('.')} {...keyProps} />
                    <NumpadKey label="0" onPress={() => handleKeyPress('0')} {...keyProps} />
                    <NumpadKey onPress={() => handleKeyPress('delete')} {...keyProps}>
                      <Delete size={22} color={colors.text} />
                    </NumpadKey>
                  </View>
                </View>
                <Pressable
                  delayPressIn={0}
                  onPress={() => input.onNext?.()}
                  style={({ pressed }) => [styles.nextKey, pressed && styles.keyPressed]}
                >
                  <ArrowRight size={22} color={colors.accentFg} strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>
            <View style={{ height: Math.max(insets.bottom, 16) }} />
          </Animated.View>
        </GestureDetector>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 80,
      elevation: 24,
    },
    glass: {
      ...StyleSheet.absoluteFillObject,
    },
    glassTint: {
      ...StyleSheet.absoluteFillObject,
    },
    previewWrap: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 8,
    },
    previewCard: {
      flex: 1,
      minHeight: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      padding: 14,
      gap: 8,
    },
    previewHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 4 },
    previewTitle: { color: colors.text, fontFamily: fonts.black, fontSize: 20, textTransform: 'capitalize' },
    previewMeta: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 2,
    },
    readoutWrap: { alignItems: 'flex-end' },
    readout: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 32, lineHeight: 36 },
    readoutUnit: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    previewCols: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 },
    previewSets: { flex: 1 },
    previewCol: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.bold,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.sm,
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    previewRowOn: { backgroundColor: colors.accentSoftFill || colors.surface2 },
    previewIdx: {
      width: 36,
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontSize: 13,
    },
    previewCell: {
      flex: 1,
      marginHorizontal: 4,
      minHeight: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCellOn: { borderColor: colors.accent, backgroundColor: colors.surface },
    previewCellText: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 16 },
    previewCellTextOn: { color: colors.accent },
    sheet: {
      zIndex: 200,
      elevation: 24,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.borderStrong,
      paddingTop: 4,
    },
    handleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 10,
      paddingBottom: 12,
      minHeight: 36,
    },
    handle: { width: 44, height: 5, borderRadius: 2, backgroundColor: colors.borderStrong },
    tabs: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      minHeight: 44,
    },
    tabLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
    checkOn: {
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOnText: { color: colors.accentFg, fontSize: 11, fontFamily: fonts.bold },
    checkOff: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    grid: { padding: 12, gap: 6 },
    row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    rowBottom: { flexDirection: 'row', gap: 6 },
    key: {
      flex: 1,
      height: 52,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyPressed: { opacity: 0.85 },
    keyText: { color: colors.text, fontSize: 22, fontFamily: fonts.medium, fontVariant: ['tabular-nums'] },
    split: {
      flex: 1,
      flexDirection: 'row',
      height: 52,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    splitKey: { borderRadius: 0, height: 52, borderWidth: 0 },
    nextKey: {
      flex: 1,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
