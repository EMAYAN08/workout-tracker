import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const ICON_LIGHT = require('../../../assets/icon-light.png');
const ICON_DARK = require('../../../assets/icon-dark.png');

export default function TrackHitMark({ colors, style, onReady }) {
  const theme = useTheme();
  const isDark = theme?.isDark ?? true;
  const ink = colors?.text || theme?.colors?.text || '#F4F4F2';
  const fired = useRef(false);

  const notify = () => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  };

  useEffect(() => {
    const t = setTimeout(notify, 280);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.row, style]} collapsable={false}>
      <Image
        source={isDark ? ICON_DARK : ICON_LIGHT}
        style={[
          styles.icon,
          {
            backgroundColor: isDark ? '#111111' : '#F4F0E8',
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(20,20,20,0.14)',
          },
        ]}
        resizeMode="cover"
        fadeDuration={0}
        onLoad={notify}
        onLoadEnd={notify}
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.word, { color: ink }]}>TrackHit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 4 : 0,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  word: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 1.4,
  },
});
