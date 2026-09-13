import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Info, ChevronUp } from 'lucide-react-native';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function InfoPopover({ title, description, size = 15 }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setOpen((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.heading}>{title}</Text>
        <Pressable
          onPress={toggle}
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
          <Pressable onPress={toggle} style={styles.hide} accessibilityLabel="Hide info">
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
    wrap: { width: '100%', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
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
      marginTop: 10,
      marginBottom: 12,
      backgroundColor: colors.surface2,
      borderRadius: radius.md || radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
    hide: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start', minHeight: 36 },
    hideText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12 },
  });
}
