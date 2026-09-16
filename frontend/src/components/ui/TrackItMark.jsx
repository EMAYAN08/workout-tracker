import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fonts } from '../../theme';

export default function TrackItMark({ colors, style }) {
  return (
    <View style={[styles.row, style]}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.icon}
        contentFit="cover"
      />
      <Text style={[styles.word, { color: colors?.textMuted || '#9A9A96' }]}>TrackIt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 12,
  },
  icon: { width: 16, height: 16, borderRadius: 4 },
  word: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
});
