import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Modal } from 'react-native';
import { Trophy, X } from 'lucide-react-native';
import { fonts, radius } from '../../theme';

const GOLD = '#E8C96A';
const GOLD_DEEP = '#C4A04A';

export default function PrCelebration({ pr, onClose }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const lift = useRef(new Animated.Value(22)).current;
  const ring = useRef(new Animated.Value(0.86)).current;
  const ringOp = useRef(new Animated.Value(0.55)).current;
  const bar = useRef(new Animated.Value(1)).current;
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

    const barAnim = Animated.timing(bar, {
      toValue: 0,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    barAnim.start();
    const t = setTimeout(() => dismiss(), 5000);
    return () => {
      clearTimeout(t);
      barAnim.stop();
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
          <Pressable onPress={dismiss} style={styles.close} accessibilityLabel="Close">
            <X size={18} color="#C8C4B0" strokeWidth={2.4} />
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
                {
                  width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(7,7,7,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#141414',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GOLD_DEEP,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
    borderColor: GOLD,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: GOLD,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  name: {
    color: '#F4F4F2',
    fontFamily: fonts.semibold,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  hero: {
    color: GOLD,
    fontFamily: fonts.monoBold,
    fontSize: 42,
    letterSpacing: -1,
    marginTop: 6,
  },
  unit: {
    fontSize: 18,
    color: GOLD_DEEP,
    fontFamily: fonts.semibold,
  },
  kind: {
    color: '#C8C4B0',
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sub: {
    color: '#8A8A8A',
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  track: {
    height: 3,
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginTop: 18,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
});
