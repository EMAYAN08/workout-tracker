import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fonts } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const ICON_LIGHT = require('../../../assets/icon-light.png');
const ICON_DARK = require('../../../assets/icon-dark.png');

export default function TrackHitMark({ colors, style }) {
  const theme = useTheme();
  const isDark = theme?.isDark ?? true;
  const ink = colors?.text || theme?.colors?.text || '#F4F4F2';
  return (
    <View style={[styles.row, style]}>
      <Image
        source={isDark ? ICON_DARK : ICON_LIGHT}
        style={styles.icon}
        contentFit="cover"
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
    paddingTop: 14,
  },
  icon: { width: 28, height: 28, borderRadius: 7 },
  word: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 1.4,
  },
});
