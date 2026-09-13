import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Share as RNShare,
  ScrollView,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle,
  Clock,
  Weight,
  Flame,
  X,
  Share2,
  Dumbbell,
  BatteryCharging,
  Coffee,
  Moon,
} from 'lucide-react-native';
import { convertWeight } from '../../utils/calculations';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { MuscleTag } from '../ui/primitives';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutSummary({ data, onClose, unit }) {
  const cardRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!data) return null;

  const exercises = data.exercises || [];
  const isRest = exercises.length === 0;

  let totalVolume = 0;
  let totalSets = 0;
  exercises.forEach((ex) => {
    ex.sets?.forEach((s) => {
      if (s.completedAt && s.type !== 'Warmup') {
        totalSets++;
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }
    });
  });
  const forgotToCheck = totalSets === 0 && exercises.some((ex) => ex.sets?.length > 0);
  if (forgotToCheck) {
    totalSets = 0;
    totalVolume = 0;
    exercises.forEach((ex) => {
      ex.sets?.forEach((s) => {
        if (s.type !== 'Warmup') {
          totalSets++;
          totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      });
    });
  }

  const handleShare = async () => {
    try {
      if (cardRef.current && Platform.OS !== 'web') {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'TrackIt Workout' });
          return;
        }
      }
      await RNShare.share({
        message: `Just crushed my ${data.routineName || 'TrackIt'} workout!`,
      });
    } catch (err) {
      console.error('Failed to share:', err);
      Alert.alert('Share', 'Could not share the image.');
    }
  };

  const muscles = [...new Set(exercises.map((ex) => ex.muscleGroup).filter(Boolean))];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close summary">
          <X size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Summary</Text>
        <Pressable onPress={handleShare} style={styles.iconBtn} accessibilityLabel="Share workout">
          <Share2 size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View ref={cardRef} collapsable={false} style={styles.body}>
          <View style={styles.iconBox}>
            {isRest ? (
              <BatteryCharging size={32} color={colors.textMuted} />
            ) : (
              <CheckCircle size={32} color={colors.textMuted} />
            )}
          </View>
          <Text style={styles.title}>{isRest ? 'Rest Day Logged' : 'Workout Complete'}</Text>
          {!!data.routineName && <Text style={styles.routine}>{data.routineName}</Text>}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Clock size={18} color={colors.textMuted} />
              <Text style={styles.statVal}>{formatTime(data.duration)}</Text>
              <Text style={styles.statLbl}>Time</Text>
            </View>
            {!isRest ? (
              <>
                <View style={styles.stat}>
                  <Flame size={18} color={colors.textMuted} />
                  <Text style={styles.statVal}>{totalSets}</Text>
                  <Text style={styles.statLbl}>Sets</Text>
                </View>
                <View style={styles.stat}>
                  <Weight size={18} color={colors.textMuted} />
                  <Text style={styles.statVal} numberOfLines={1}>
                    {convertWeight(totalVolume, data.unitSaved, unit)}
                  </Text>
                  <Text style={styles.statLbl}>Volume</Text>
                </View>
              </>
            ) : (
              <View style={styles.restStat}>
                <Coffee size={18} color={colors.textMuted} />
                <Text style={styles.restStatText}>Rest & Recover</Text>
                <Moon size={18} color={colors.textMuted} />
              </View>
            )}
          </View>

          {!isRest && (
            <View style={{ width: '100%', marginTop: 8 }}>
              <Text style={styles.sectionLbl}>Targeted Muscles</Text>
              <View style={styles.chips}>
                {muscles.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>No muscles targeted</Text>
                ) : (
                  muscles.map((m) => <MuscleTag key={m} group={m} />)
                )}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.7 }}>
              <Dumbbell size={14} color={colors.text} />
              <Text style={styles.brand}>TrackIt</Text>
            </View>
            <Text style={styles.date}>
              {new Date(data.endTime || Date.now()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable onPress={onClose} style={styles.doneBtn} accessibilityLabel="Done">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      minHeight: HIT,
    },
    topTitle: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    iconBtn: {
      width: HIT,
      height: HIT,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    body: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
    },
    iconBox: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 28,
      letterSpacing: -0.6,
      textAlign: 'center',
    },
    routine: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    stats: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 },
    stat: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 6,
    },
    statVal: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 18 },
    statLbl: {
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    restStat: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
    },
    restStatText: { color: colors.text, fontFamily: fonts.black, fontSize: 13, textTransform: 'uppercase' },
    sectionLbl: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: fonts.bold,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, textTransform: 'capitalize' },
    footer: {
      width: '100%',
      paddingTop: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brand: { color: colors.text, fontFamily: fonts.black, fontSize: 12, textTransform: 'uppercase' },
    date: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.medium },
    bottom: {
      paddingHorizontal: 20,
      paddingTop: 8,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    doneBtn: {
      width: '100%',
      minHeight: HIT,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 17 },
  });
}
