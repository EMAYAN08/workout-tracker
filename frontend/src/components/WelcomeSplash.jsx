import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme';
import { WELCOME_PHRASES } from '../data/welcomePhrases';
import { haptic } from '../haptics';

export default function WelcomeSplash({ onDone }) {
  const { colors, isDark } = useTheme();
  const phrase = useMemo(
    () => WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)],
    []
  );
  const [typed, setTyped] = useState('');
  const opacity = useRef(new Animated.Value(1)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(18)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const lineOp = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoY, { toValue: 0, damping: 16, stiffness: 140, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
    ]).start();
    const thud = setTimeout(() => haptic('medium'), 260);
    const fadeLine = setTimeout(() => {
      Animated.timing(lineOp, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }, 380);
    return () => {
      clearTimeout(thud);
      clearTimeout(fadeLine);
    };
  }, [logoOp, logoY, logoScale, lineOp]);

  useEffect(() => {
    let i = 0;
    let timer;
    const tick = () => {
      i += 1;
      const ch = phrase[i - 1];
      setTyped(phrase.slice(0, i));
      if (ch && ch !== ' ') {
        haptic(/[.,!?]/.test(ch) ? 'light' : 'selection');
      }
      if (i < phrase.length) {
        const wait = /[.,!?]/.test(ch) ? 160 : 36;
        timer = setTimeout(tick, wait);
      } else {
        haptic('success');
        timer = setTimeout(exit, 1200);
      }
    };
    timer = setTimeout(tick, 520);
    return () => clearTimeout(timer);
  }, [phrase]);

  const exit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone?.();
    });
  };

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFill,
        styles.wrap,
        { backgroundColor: colors.background, opacity },
      ]}
    >
      <Animated.View
        style={{
          opacity: logoOp,
          transform: [{ translateY: logoY }, { scale: logoScale }],
          alignItems: 'center',
        }}
      >
        <Image
          source={isDark ? require('../../assets/icon-dark.png') : require('../../assets/icon-light.png')}
          style={[styles.logo, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,20,20,0.08)' }]}
          contentFit="cover"
        />
        <Text style={[styles.mark, { color: colors.text }]}>TrackHit</Text>
      </Animated.View>
      <Animated.View style={[styles.lineRow, { opacity: lineOp }]}>
        <Text style={[styles.line, { color: colors.textMuted }]}>{typed}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 40,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
    borderWidth: 1,
  },
  mark: {
    marginTop: 18,
    fontFamily: fonts.regular,
    fontSize: 22,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  lineRow: {
    marginTop: 28,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: 17,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
