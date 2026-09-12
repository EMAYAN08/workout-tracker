import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronDown, Delete, ArrowRight } from 'lucide-react-native';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { haptic } from '../../haptics';

export default function CustomNumpad({ activeInput, onClose, onUpdate, value }) {
  const insets = useSafeAreaInsets();
  const { colors, setTabBarHidden } = useTheme();
  const styles = makeStyles(colors);
  const freshRef = useRef(true);
  const fieldRef = useRef(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const originY = useRef(0);
  const tracking = useRef(false);

  const nativeDriver = Platform.OS !== 'web';

  const close = useCallback(() => {
    haptic('selection');
    translateY.setValue(0);
    onClose?.();
  }, [onClose, translateY]);

  const settle = useCallback(
    (dy, vy = 0) => {
      tracking.current = false;
      if (dy > 36 || vy > 650) {
        close();
        return;
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: nativeDriver,
        speed: 28,
        bounciness: 0,
      }).start();
    },
    [close, translateY, nativeDriver]
  );

  const settleRef = useRef(settle);
  settleRef.current = settle;

  useLayoutEffect(() => {
    setTabBarHidden(!!activeInput);
    return () => setTabBarHidden(false);
  }, [activeInput, setTabBarHidden]);

  const keypadOpen = !!activeInput;
  useEffect(() => {
    if (keypadOpen) translateY.setValue(0);
  }, [keypadOpen, translateY]);

  useEffect(() => {
    if (!keypadOpen || typeof document === 'undefined') return undefined;
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
      const dy = Math.max(0, e.clientY - originY.current);
      if (dy > 4) translateY.setValue(dy);
    };
    const onUp = (e) => {
      if (!tracking.current) return;
      const dy = Math.max(0, (e.clientY ?? originY.current) - originY.current);
      settleRef.current(dy, 0);
    };
    const opts = { capture: true };
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
  }, [keypadOpen, translateY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(6)
        .failOffsetX([-28, 28])
        .onUpdate((e) => {
          translateY.setValue(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          settle(e.translationY, e.velocityY);
        }),
    [settle, translateY]
  );

  if (!activeInput) return null;

  if (fieldRef.current !== activeInput.field) {
    fieldRef.current = activeInput.field;
    freshRef.current = true;
  }

  const handleKeyPress = (key) => {
    haptic('selection');
    let currentVal = String(value ?? '');
    if (key === 'delete') {
      freshRef.current = false;
      onUpdate(currentVal.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (activeInput.field === 'reps') return;
      if (freshRef.current) {
        freshRef.current = false;
        onUpdate('0.');
        return;
      }
      if (!currentVal.includes('.')) onUpdate(currentVal + (currentVal.length === 0 ? '0.' : '.'));
      return;
    }
    if (key === '+' || key === '-') {
      freshRef.current = false;
      let num = parseFloat(currentVal) || 0;
      const step = activeInput.field === 'weight' ? 2.5 : 1;
      if (key === '+') num += step;
      if (key === '-') num = Math.max(0, num - step);
      onUpdate(String(Math.round(num * 100) / 100));
      return;
    }
    if (freshRef.current) {
      freshRef.current = false;
      onUpdate(key);
      return;
    }
    if (currentVal === '0' && key !== '.') onUpdate(key);
    else onUpdate(currentVal + key);
  };

  const Key = ({ label, onPress, style, children, flex, accessibilityLabel }) => (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.key,
        flex && { flex },
        style,
        pressed && { opacity: 0.85 },
      ]}
    >
      {children || <Text style={styles.keyText}>{label}</Text>}
    </Pressable>
  );

  const tabs = [
    { id: 'weight', label: 'Weight' },
    { id: 'reps', label: 'Reps' },
  ];

  return (
    <Animated.View
      nativeID="keypad-sheet"
      collapsable={false}
      style={[styles.sheet, { paddingBottom: 4, transform: [{ translateY }] }]}
    >
      <GestureDetector gesture={pan}>
        <View nativeID="keypad-handle" collapsable={false} style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
      </GestureDetector>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const active = activeInput.field === tab.id;
            return (
              <Pressable key={tab.id} onPress={() => activeInput.onChangeField(tab.id)} style={styles.tab}>
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
            <Key label="1" onPress={() => handleKeyPress('1')} />
            <Key label="2" onPress={() => handleKeyPress('2')} />
            <Key label="3" onPress={() => handleKeyPress('3')} />
            <Key onPress={close} accessibilityLabel="Dismiss keypad">
              <ChevronDown size={22} color={colors.text} />
            </Key>
          </View>
          <View style={styles.row}>
            <Key label="4" onPress={() => handleKeyPress('4')} />
            <Key label="5" onPress={() => handleKeyPress('5')} />
            <Key label="6" onPress={() => handleKeyPress('6')} />
            <View style={styles.split}>
              <Key label="-" onPress={() => handleKeyPress('-')} flex={1} style={styles.splitKey} />
              <Key label="+" onPress={() => handleKeyPress('+')} flex={1} style={styles.splitKey} />
            </View>
          </View>
          <View style={styles.rowBottom}>
            <View style={{ flex: 3 }}>
              <View style={styles.row}>
                <Key label="7" onPress={() => handleKeyPress('7')} />
                <Key label="8" onPress={() => handleKeyPress('8')} />
                <Key label="9" onPress={() => handleKeyPress('9')} />
              </View>
              <View style={[styles.row, { marginBottom: 0 }]}>
                <Key label="." onPress={() => handleKeyPress('.')} />
                <Key label="0" onPress={() => handleKeyPress('0')} />
                <Key onPress={() => handleKeyPress('delete')}>
                  <Delete size={22} color={colors.text} />
                </Key>
              </View>
            </View>
            <Pressable
              onPress={() => activeInput.onNext()}
              style={({ pressed }) => [styles.nextKey, pressed && { opacity: 0.82 }]}
            >
              <ArrowRight size={22} color={colors.accentFg} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
        <View style={{ height: Math.max(insets.bottom, 16) }} />
    </Animated.View>
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
