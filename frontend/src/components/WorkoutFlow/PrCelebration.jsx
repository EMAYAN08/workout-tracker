import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, X } from 'lucide-react-native';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const GOLD_DARK = '#E8C96A';
const GOLD_DARK_DEEP = '#C4A04A';
const GOLD_LIGHT = '#B8923A';
const GOLD_LIGHT_DEEP = '#8A6E28';

export default function PrCelebration({ pr, onClose }) {
  const { colors, isDark } = useTheme();
  const gold = isDark ? GOLD_DARK : GOLD_LIGHT;
  const goldDeep = isDark ? GOLD_DARK_DEEP : GOLD_LIGHT_DEEP;
  const styles = useMemo(() => makeStyles(colors, isDark, gold, goldDeep), [colors, isDark, gold, goldDeep]);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const lift = useRef(new Animated.Value(22)).current;
  const ring = useRef(new Animated.Value(0.86)).current;
  const ringOp = useRef(new Animated.Value(0.55)).current;
  const bar = useRef(new Animated.Value(1)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const closed = useRef(false);

  useEffect(() => {
    if (!pr) return undefined;
    closed.current = false;
    opacity.setValue(0);
    scale.setValue(0.7);
    lift.setValue(22);
    ring.setValue(0.86);
    ringOp.setValue(0.5);
    bar.setValue(1);
    shine.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 6.2, tension: 78, useNativeDriver: true }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(ring, {
          toValue: 1.28,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ringOp, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const shineAnim = Animated.sequence([
      Animated.delay(340),
      Animated.timing(shine, {
        toValue: 1,
        duration: 980,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    shineAnim.start();

    const barAnim = Animated.timing(bar, {
      toValue: 0,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    barAnim.start();
    const t = setTimeout(() => dismiss(), 5000);
    return () => {
      clearTimeout(t);
      barAnim.stop();
      shineAnim.stop();
    };
  }, [pr]);

  const dismiss = () => {
    if (closed.current) return;
    closed.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose?.();
    });
  };

  if (!pr) return null;

  const hero = pr.weightPr ? pr.weight : pr.e1rm;
  const heroLabel = pr.weightPr ? 'Weight PR' : 'e1RM PR';
  const sub =
    pr.weightPr && pr.rmPr
      ? `e1RM ${pr.e1rm} ${pr.unit}`
      : pr.weightPr
        ? `${pr.reps} reps`
        : `${pr.weight} ${pr.unit} × ${pr.reps}`;

  const shineX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-240, 320],
  });

  const shineColors = isDark
    ? ['transparent', 'rgba(255,236,180,0.0)', 'rgba(255,244,210,0.22)', 'rgba(255,255,255,0.38)', 'rgba(255,236,180,0.12)', 'transparent']
    : ['transparent', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.45)', 'rgba(255,252,240,0.7)', 'rgba(232,201,106,0.18)', 'transparent'];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.veil, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss PR" />
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: lift }, { scale }] },
          ]}
        >
          <View pointerEvents="none" style={styles.shineClip}>
            <Animated.View
              style={[
                styles.shineBand,
                { transform: [{ translateX: shineX }, { rotate: '26deg' }] },
              ]}
            >
              <LinearGradient
                colors={shineColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          <Pressable onPress={dismiss} style={styles.close} accessibilityLabel="Close">
            <X size={18} color={colors.textMuted} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.badgeWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                { opacity: ringOp, transform: [{ scale: ring }] },
              ]}
            />
            <View style={styles.badge}>
              <Trophy size={34} color="#1A1408" strokeWidth={2.2} />
            </View>
          </View>

          <Text style={styles.kicker}>Personal record</Text>
          <Text style={styles.name} numberOfLines={2}>
            {pr.name}
          </Text>
          <Text style={styles.hero}>
            {hero}
            <Text style={styles.unit}> {pr.unit}</Text>
          </Text>
          <Text style={styles.kind}>{heroLabel}</Text>
          <Text style={styles.sub}>{sub}</Text>

          <View style={styles.track}>
            <Animated.View
              style={[
                styles.fill,
                { transform: [{ scaleX: bar }] },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(colors, isDark, gold, goldDeep) {
  return StyleSheet.create({
    veil: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(7,7,7,0.72)' : 'rgba(20,20,20,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: isDark ? '#141414' : colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: goldDeep,
      paddingTop: 28,
      paddingBottom: 18,
      paddingHorizontal: 22,
      alignItems: 'center',
      overflow: 'hidden',
    },
    shineClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
      zIndex: 3,
    },
    shineBand: {
      position: 'absolute',
      top: -80,
      bottom: -80,
      width: 88,
      opacity: isDark ? 0.85 : 0.7,
    },
    close: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4,
    },
    badgeWrap: {
      width: 96,
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    ring: {
      position: 'absolute',
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      borderColor: gold,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      color: gold,
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    name: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 18,
      textAlign: 'center',
      marginTop: 8,
    },
    hero: {
      color: gold,
      fontFamily: fonts.monoBold,
      fontSize: 42,
      letterSpacing: -1,
      marginTop: 6,
    },
    unit: {
      fontSize: 18,
      color: goldDeep,
      fontFamily: fonts.semibold,
    },
    kind: {
      color: colors.textMuted,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    sub: {
      color: colors.textSubtle,
      fontFamily: fonts.regular,
      fontSize: 13,
      marginTop: 4,
    },
    track: {
      height: 3,
      width: '100%',
      backgroundColor: isDark ? '#2A2A2A' : colors.surface3,
      borderRadius: 2,
      marginTop: 18,
      overflow: 'hidden',
    },
    fill: {
      height: 3,
      width: '100%',
      backgroundColor: gold,
      borderRadius: 2,
      transformOrigin: '0% 50%',
    },
  });
}
