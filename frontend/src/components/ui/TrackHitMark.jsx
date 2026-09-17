import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fonts } from '../../theme';

export default function TrackHitMark({ colors, style }) {
  return (
    <View style={[styles.row, style]}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.icon}
        contentFit="cover"
      />
      <Text style={[styles.word, { color: colors?.text || '#F4F4F2' }]}>TrackHit</Text>
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
