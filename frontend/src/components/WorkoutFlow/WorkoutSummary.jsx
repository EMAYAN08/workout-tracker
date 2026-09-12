import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform, Share as RNShare } from 'react-native';
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
import { colors, fonts, radius } from '../../theme';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutSummary({ data, onClose, unit }) {
  const cardRef = useRef(null);
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
    <View style={styles.overlay}>
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <Pressable onPress={onClose} style={[styles.cornerBtn, { left: 12 }]}>
          <X size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={handleShare} style={[styles.cornerBtn, { right: 12 }]}>
          <Share2 size={18} color={colors.primary} />
        </Pressable>

        <View
          style={[
            styles.iconBox,
            isRest
              ? { backgroundColor: 'rgba(96,165,250,0.15)', borderColor: 'rgba(59,130,246,0.2)' }
              : { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.2)' },
          ]}
        >
          {isRest ? (
            <BatteryCharging size={32} color="#60a5fa" />
          ) : (
            <CheckCircle size={32} color="#10B981" />
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
                <Flame size={18} color="#f59e0b" />
                <Text style={styles.statVal}>{totalSets}</Text>
                <Text style={styles.statLbl}>Sets</Text>
              </View>
              <View style={styles.stat}>
                <Weight size={18} color={colors.primary} />
                <Text style={styles.statVal} numberOfLines={1}>
                  {convertWeight(totalVolume, data.unitSaved, unit)}
                </Text>
                <Text style={styles.statLbl}>Volume</Text>
              </View>
            </>
          ) : (
            <View style={styles.restStat}>
              <Coffee size={18} color="#60a5fa" />
              <Text style={styles.restStatText}>Rest & Recover</Text>
              <Moon size={18} color="#60a5fa" />
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
            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(10,10,10,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(23,23,23,0.95)',
    borderRadius: 24,
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
    padding: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(38,38,38,0.85)',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 22,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  routine: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  stats: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
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
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 16,
    padding: 12,
  },
  restStatText: { color: '#60a5fa', fontFamily: fonts.black, fontSize: 13, textTransform: 'uppercase' },
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
    borderRadius: 12,
    backgroundColor: 'rgba(38,38,38,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, textTransform: 'capitalize' },
  footer: {
    width: '100%',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: colors.text, fontFamily: fonts.black, fontSize: 12, textTransform: 'uppercase' },
  date: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase' },
});
