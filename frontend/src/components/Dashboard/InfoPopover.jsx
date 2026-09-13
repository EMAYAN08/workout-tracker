import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Info, ChevronUp } from 'lucide-react-native';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function InfoPopover({ title, description, size = 15 }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.heading}>{title}</Text>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityLabel={open ? 'Hide info' : 'Show info'}
          hitSlop={8}
          style={styles.infoBtn}
        >
          <Info size={size} color={open ? colors.accent : colors.textMuted} />
        </Pressable>
      </View>
      {open ? (
        <View style={styles.card}>
          <Text style={styles.body}>{description}</Text>
          <Pressable onPress={() => setOpen(false)} style={styles.hide} accessibilityLabel="Hide info">
            <ChevronUp size={14} color={colors.textMuted} />
            <Text style={styles.hideText}>Hide</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    heading: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    infoBtn: { width: HIT * 0.7, height: HIT * 0.7, alignItems: 'center', justifyContent: 'center' },
    card: {
      marginTop: 8,
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
    hide: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start', minHeight: 32 },
    hideText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12 },
  });
}
