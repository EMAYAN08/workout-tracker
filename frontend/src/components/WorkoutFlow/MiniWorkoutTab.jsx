import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronUp, Timer } from 'lucide-react-native';
import { useWorkout } from '../../context/WorkoutContext';
import { useTheme } from '../../context/ThemeContext';
import { formatRestClock } from '../../notifications';
import { miniWorkoutCopy } from '../../utils/miniWorkout';
import { fonts, radius, HIT } from '../../theme';

export default function MiniWorkoutTab({ bottom = 72, onPress }) {
  const { colors, isDark } = useTheme();
  const { activeWorkout, workoutDuration, restTimer, restTargetSec, isResting, playingSet } = useWorkout();
  if (!activeWorkout) return null;

  const { heading, detail } = miniWorkoutCopy(activeWorkout, playingSet);
  const restRemaining = Math.max(0, restTargetSec - restTimer);
  const showRest = isResting && restRemaining > 0;
  const glassBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(20,20,20,0.12)';
  const glassFill = isDark ? 'rgba(18,18,18,0.55)' : 'rgba(255,255,255,0.58)';

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Resume workout"
      style={({ pressed }) => [styles.wrap, { bottom }, pressed && { opacity: 0.88 }]}
    >
      <BlurView
        intensity={isDark ? 44 : 58}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.glass, { borderColor: glassBorder, backgroundColor: glassFill }]}
      >
        <View style={styles.body}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heading, { color: colors.text }]} numberOfLines={1}>
              {heading}
            </Text>
            <Text style={[styles.detail, { color: colors.textMuted }]} numberOfLines={1}>
              {detail}
            </Text>
          </View>
          <View style={styles.times}>
            <View style={styles.timeRow}>
              <Timer size={12} color={colors.textMuted} />
              <Text style={[styles.clock, { color: colors.text }]}>{formatRestClock(workoutDuration)}</Text>
            </View>
            {showRest ? (
              <Text style={[styles.rest, { color: colors.accent }]}>{formatRestClock(restRemaining)}</Text>
            ) : null}
          </View>
          <View style={styles.chev}>
            <ChevronUp size={18} color={colors.textMuted} />
          </View>
        </View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 20,
    elevation: 20,
  },
  glass: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    minHeight: HIT + 4,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  times: { alignItems: 'flex-end', gap: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clock: { fontFamily: fonts.semibold, fontSize: 15, fontVariant: ['tabular-nums'] },
  rest: { fontFamily: fonts.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  chev: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
