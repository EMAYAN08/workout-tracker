import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform, Share as RNShare, Modal } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
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

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutSummary({ data, onClose, unit }) {
  const cardRef = useRef(null);
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <Pressable onPress={onClose} style={[styles.cornerBtn, { left: 12 }]}>
          <X size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={handleShare} style={[styles.cornerBtn, { right: 12 }]}>
          <Share2 size={18} color={colors.textMuted} />
        </Pressable>

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
                muscles.map((m) => (
                  <View key={m} style={styles.chip}>
                    <Text style={styles.chipText}>{m}</Text>
                  </View>
                ))
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
            {new Date(data.endTime || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  cornerBtn: {
    position: 'absolute',
    top: 12,
    zIndex: 2,
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    marginTop: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  routine: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  stats: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statVal: { color: colors.text, fontFamily: fonts.black, fontSize: 18 },
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, textTransform: 'capitalize' },
  footer: {
    width: '100%',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: colors.text, fontFamily: fonts.black, fontSize: 12, textTransform: 'uppercase' },
  date: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.medium },
  doneBtn: {
    marginTop: 8,
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
