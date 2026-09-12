import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Activity,
  LayoutDashboard,
  Database,
  ClipboardList,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useWorkout } from './context/WorkoutContext';
import { useTheme } from './context/ThemeContext';
import ActiveWorkout from './components/WorkoutFlow/ActiveWorkout';
import WorkoutSummary from './components/WorkoutFlow/WorkoutSummary';
import Dashboard from './components/Dashboard/Dashboard';
import CustomExercises from './components/CustomExercises/CustomExercises';
import RoutinesMain from './components/Routines/RoutinesMain';
import CalendarView from './components/Calendar/CalendarView';
import WorkoutDetailView from './components/Calendar/WorkoutDetailView';
import { fonts, radius, HIT } from './theme';
import { LOGO } from './config';
import { haptic } from './haptics';

const TAB_ORDER = ['home', 'routines', 'custom_exercises', 'dashboard'];

const formatTime = (seconds) => {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function AppContent() {
  const {
    hydrated,
    activeWorkout,
    startWorkout,
    finishWorkout,
    cancelWorkout,
    unit,
    toggleUnit,
    completedWorkout,
    setCompletedWorkout,
    restTimer,
    restPaused,
    playingSet,
    restTargetSec,
    workoutHistory,
  } = useWorkout();
  const { colors, isDark, toggleTheme, tabBarHidden } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const fade = useRef(new Animated.Value(1)).current;

  const [currentTab, setCurrentTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const navigateTab = (newTab) => {
    if (newTab === currentTab) return;
    haptic('selection');
    Animated.timing(fade, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setCurrentTab(newTab);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const swipe = Gesture.Pan()
    .enabled(!activeWorkout && !tabBarHidden)
    .runOnJS(true)
    .activeOffsetX([-50, 50])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (activeWorkout) return;
      if (currentTab === 'workout-detail' && e.translationX > 50) {
        navigateTab('calendar');
        return;
      }
      if (currentTab === 'calendar' && e.translationX > 50) {
        navigateTab('dashboard');
        return;
      }
      const idx = TAB_ORDER.indexOf(currentTab);
      if (idx === -1) return;
      if (e.translationX < -50 && idx < TAB_ORDER.length - 1) {
        navigateTab(TAB_ORDER[idx + 1]);
      } else if (e.translationX > 50 && idx > 0) {
        navigateTab(TAB_ORDER[idx - 1]);
      }
    });

  const lastSession = workoutHistory.find((w) => w.exercises?.length > 0);
  const restRemaining = Math.max(0, restTargetSec - restTimer);
  const restReady = restTimer >= restTargetSec;

  const renderBody = () => {
    if (activeWorkout) return <ActiveWorkout />;
    if (currentTab === 'home') {
      return (
        <View style={styles.home}>
          <Text style={styles.kicker}>Session</Text>
          <Text style={styles.homeTitle}>Ready{'\n'}to lift.</Text>
          <Text style={styles.homeSub}>
            {lastSession
              ? `${lastSession.exercises.length} movements last time. Keep the chain.`
              : 'Every set lives on this phone. No cloud. No login.'}
          </Text>
          <Pressable
            onPress={() => {
              haptic('medium');
              startWorkout();
            }}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.82 }]}
          >
            <Text style={styles.startBtnText}>Start Empty Workout</Text>
          </Pressable>
          <Pressable
            onPress={() => navigateTab('routines')}
            hitSlop={8}
            style={{ marginTop: 16, minHeight: HIT, justifyContent: 'center' }}
          >
            <Text style={styles.link}>Or start from a routine</Text>
          </Pressable>
        </View>
      );
    }
    if (currentTab === 'custom_exercises') return <CustomExercises />;
    if (currentTab === 'routines') return <RoutinesMain />;
    if (currentTab === 'dashboard') return <Dashboard onMapClick={() => navigateTab('calendar')} />;
    if (currentTab === 'calendar') {
      return (
        <CalendarView
          onDayClick={(date) => {
            setSelectedDate(date);
            navigateTab('workout-detail');
          }}
          onBack={() => navigateTab('dashboard')}
        />
      );
    }
    if (currentTab === 'workout-detail') {
      return <WorkoutDetailView date={selectedDate} onBack={() => navigateTab('calendar')} />;
    }
    return <Dashboard onMapClick={() => navigateTab('calendar')} />;
  };

  const tabs = [
    { id: 'home', label: 'Workout', Icon: Activity },
    { id: 'routines', label: 'Routines', Icon: ClipboardList },
    { id: 'custom_exercises', label: 'Exercises', Icon: Database },
    { id: 'dashboard', label: 'You', Icon: LayoutDashboard },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigateTab('home')} style={styles.brand} hitSlop={8}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={styles.brandText}>TrackIt</Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              haptic('selection');
              toggleTheme();
            }}
            style={({ pressed }) => [styles.iconCircle, pressed && { opacity: 0.55 }]}
          >
            {isDark ? (
              <Sun size={18} color={colors.text} strokeWidth={2} />
            ) : (
              <Moon size={18} color={colors.text} strokeWidth={2} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              haptic('selection');
              toggleUnit();
            }}
            style={styles.unitToggle}
          >
            <View style={[styles.unitSeg, unit === 'lbs' && styles.unitSegOn]}>
              <Text style={[styles.unitLabel, unit === 'lbs' && styles.unitLabelOn]}>LB</Text>
            </View>
            <View style={[styles.unitSeg, unit === 'kgs' && styles.unitSegOn]}>
              <Text style={[styles.unitLabel, unit === 'kgs' && styles.unitLabelOn]}>KG</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {activeWorkout && (restTimer > 0 || restPaused) && !playingSet && (
        <View
          style={styles.islandWrap}
          pointerEvents="none"
          accessible
          accessibilityRole="timer"
          accessibilityLabel={
            restPaused
              ? `Rest paused, ${formatTime(restRemaining)} remaining`
              : restReady
                ? `Go, rest ${formatTime(restTimer)}`
                : `Rest ${formatTime(restRemaining)} remaining`
          }
        >
          <View style={styles.island}>
            <View
              style={[
                styles.islandDot,
                { backgroundColor: restPaused ? colors.textMuted : restReady ? colors.accent : colors.textMuted },
              ]}
            />
            <Text style={[styles.islandKicker, restReady && !restPaused && { color: colors.accent }]}>
              {restPaused ? 'PAUSE' : restReady ? 'GO' : 'REST'}
            </Text>
            <Text style={styles.islandTime}>{formatTime(restReady && !restPaused ? restTimer : restRemaining)}</Text>
          </View>
        </View>
      )}

      {activeWorkout && (
        <View style={styles.workoutBar}>
          <Pressable
            onPress={() => {
              haptic('warning');
              cancelWorkout();
            }}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={isFinishing}
            onPress={async () => {
              haptic('success');
              setIsFinishing(true);
              await finishWorkout();
              setIsFinishing(false);
            }}
            style={({ pressed }) => [styles.finishBtn, isFinishing && { opacity: 0.5 }, pressed && { opacity: 0.88 }]}
          >
            {isFinishing && (
              <ActivityIndicator size={14} color={colors.accentFg} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.finishText}>
              {isFinishing
                ? 'Finishing...'
                : activeWorkout.exercises.length === 0
                  ? 'Log Rest Day'
                  : 'Finish'}
            </Text>
          </Pressable>
        </View>
      )}

      {completedWorkout && (
        <WorkoutSummary
          data={completedWorkout}
          onClose={() => setCompletedWorkout(null)}
          unit={unit}
        />
      )}

      {activeWorkout || tabBarHidden ? (
        <Animated.View style={[styles.main, { opacity: fade }]}>{renderBody()}</Animated.View>
      ) : (
        <GestureDetector gesture={swipe}>
          <Animated.View style={[styles.main, { opacity: fade }]}>{renderBody()}</Animated.View>
        </GestureDetector>
      )}

      {!activeWorkout && !tabBarHidden && (
        <View style={styles.navWrap}>
          <View style={styles.navBar}>
            <View style={[styles.navRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              {tabs.map((t) => {
                const active =
                  currentTab === t.id ||
                  ((currentTab === 'calendar' || currentTab === 'workout-detail') && t.id === 'dashboard');
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => navigateTab(t.id)}
                    style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.6 }]}
                  >
                    <t.Icon
                      size={22}
                      color={active ? colors.accent : colors.textSubtle}
                      strokeWidth={active ? 2.4 : 1.8}
                    />
                    <Text style={[styles.navLabel, active && { color: colors.accent }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    boot: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 40,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: HIT },
    logo: { width: 24, height: 24, borderRadius: 2, borderWidth: 1, borderColor: colors.border },
    brandText: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 20,
      letterSpacing: -0.6,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconCircle: {
      width: HIT,
      height: HIT,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    unitToggle: {
      width: 96,
      height: HIT,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitSeg: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitSegOn: {
      backgroundColor: colors.text,
    },
    unitLabel: {
      fontSize: 12,
      fontFamily: fonts.semibold,
      letterSpacing: 0.4,
      color: colors.textMuted,
    },
    unitLabelOn: { color: colors.background },
    islandWrap: {
      alignItems: 'center',
      marginBottom: 6,
      zIndex: 50,
    },
    island: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderStrong,
      minWidth: 168,
    },
    islandDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
    },
    islandKicker: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 1.4,
    },
    islandTime: {
      color: colors.text,
      fontFamily: fonts.monoBold,
      fontSize: 16,
      marginLeft: 'auto',
    },
    workoutBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: colors.background,
    },
    cancelBtn: {
      minHeight: HIT,
      paddingHorizontal: 16,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    cancelText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
    finishBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      minHeight: HIT,
      borderRadius: radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 17 },
    main: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', overflow: 'visible' },
    home: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 120,
    },
    kicker: {
      color: colors.textSubtle,
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    homeTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 52,
      lineHeight: 54,
      letterSpacing: -1.6,
      marginBottom: 12,
    },
    homeSub: {
      color: colors.textMuted,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: fonts.regular,
      marginBottom: 32,
      maxWidth: 300,
    },
    startBtn: {
      width: '100%',
      maxWidth: 360,
      borderRadius: radius.sm,
      minHeight: HIT,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    startBtnText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.4 },
    link: {
      color: colors.textMuted,
      fontFamily: fonts.medium,
      fontSize: 16,
    },
    navWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    navBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.nav,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      paddingTop: 6,
      minHeight: 49,
    },
    navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 49, gap: 2 },
    navLabel: { color: colors.textSubtle, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.12 },
  });
}
