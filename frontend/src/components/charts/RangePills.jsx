import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, radius } from '../../theme';
import { CHART_RANGES } from '../../utils/chartRange';

export default function RangePills({ value, onChange, ranges = CHART_RANGES }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surface2, borderColor: colors.border },
      ]}
    >
      {ranges.map((r) => {
        const on = r.value === value;
        return (
          <Pressable
            key={r.value}
            onPress={() => onChange(r.value)}
            accessibilityLabel={r.label}
            style={[styles.pill, on && { backgroundColor: colors.text }]}
          >
            <Text
              style={[
                styles.text,
                { color: on ? colors.background : colors.textMuted, fontFamily: fonts.semibold },
              ]}
            >
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 36,
    alignSelf: 'flex-start',
  },
  pill: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12, letterSpacing: 0.3 },
});
