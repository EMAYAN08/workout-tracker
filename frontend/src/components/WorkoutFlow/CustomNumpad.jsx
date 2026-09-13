import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform, Easing, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

export default function CustomNumpad({ activeInput, onClose, onUpdate, value }) {
  const insets = useSafeAreaInsets();
  const { colors, setTabBarHidden } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const freshRef = useRef(true);
  const targetRef = useRef(null);
  const draftRef = useRef(String(value ?? ''));
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const originY = useRef(0);
  const tracking = useRef(false);
  const closing = useRef(false);
  const lastInput = useRef(activeInput);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [mounted, setMounted] = useState(!!activeInput);
  const nativeDriver = Platform.OS !== 'web';
  const keypadOpen = !!activeInput;

  if (activeInput) lastInput.current = activeInput;
  const input = activeInput || lastInput.current;
  const targetId = input ? input.targetId || input.field : null;

  if (targetRef.current !== targetId) {
    targetRef.current = targetId;
    freshRef.current = true;
    draftRef.current = String(value ?? '');
  }

  const animateIn = useCallback(() => {
    closing.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: nativeDriver,
      damping: 26,
      stiffness: 280,
      mass: 0.82,
    }).start();
  }, [nativeDriver, translateY]);

  const animateOut = useCallback(
    (then) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(translateY, {
        toValue: SHEET_H,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: nativeDriver,
      }).start(({ finished }) => {
        closing.current = false;
        if (finished) {
          setMounted(false);
          then?.();
        }
      });
    },
    [nativeDriver, translateY]
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
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: nativeDriver,
        damping: 24,
        stiffness: 320,
        mass: 0.7,
      }).start();
    },
    [close, nativeDriver, translateY]
  );

  const settleRef = useRef(settle);
  settleRef.current = settle;

  useLayoutEffect(() => {
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
        setMounted(true);
      }
    } else if (mounted && !closing.current) {
      animateOut();
    }
  }, [keypadOpen, mounted, animateIn, animateOut, translateY]);

  useEffect(() => {
    if (mounted && keypadOpen) animateIn();
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

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
    };
    const onMove = (e) => {
      if (!tracking.current) return;
      e.preventDefault?.();
      const dy = Math.max(0, e.clientY - originY.current);
      if (dy > 2) translateY.setValue(dy);
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
  }, [mounted, translateY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(12)
        .failOffsetX([-40, 40])
        .onUpdate((e) => {
          translateY.setValue(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          settle(e.translationY, e.velocityY);
        }),
    [settle, translateY]
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

  if (!mounted || !input) return null;

  const keyProps = { colors, styles };

  return (
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
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
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
