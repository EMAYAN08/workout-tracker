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
import { BlurView } from 'expo-blur';
import {
  Activity,
  LayoutDashboard,
  Database,
  ClipboardList,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useWorkout } from './context/WorkoutContext';
import { useTheme } from './context/ThemeContext';
import ActiveWorkout from './components/WorkoutFlow/ActiveWorkout';
import WorkoutSummary from './components/WorkoutFlow/WorkoutSummary';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import CustomExercises from './components/CustomExercises/CustomExercises';
import RoutinesMain from './components/Routines/RoutinesMain';
import CalendarView from './components/Calendar/CalendarView';
import WorkoutDetailView from './components/Calendar/WorkoutDetailView';
import { fonts, radius, HIT } from './theme';
import { LOGO } from './config';
import { haptic } from './haptics';

const TAB_ORDER = ['home', 'routines', 'custom_exercises', 'dashboard'];

export default function AppContent() {
  const {
    hydrated,
    username,
    login,
    activeWorkout,
    startWorkout,
    finishWorkout,
    cancelWorkout,
    unit,
    toggleUnit,
    completedWorkout,
    setCompletedWorkout,
    refreshAll,
  } = useWorkout();
  const { colors, isDark, toggleTheme } = useTheme();
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

  if (!username) {
    return <Login onLogin={login} />;
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
    .runOnJS(true)
    .activeOffsetX([-50, 50])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (activeWorkout) return;
      const idx = TAB_ORDER.indexOf(currentTab);
      if (idx === -1) return;
      if (e.translationX < -50 && idx < TAB_ORDER.length - 1) {
        navigateTab(TAB_ORDER[idx + 1]);
      } else if (e.translationX > 50 && idx > 0) {
        navigateTab(TAB_ORDER[idx - 1]);
      }
    });

  const renderBody = () => {
    if (activeWorkout) return <ActiveWorkout />;
    if (currentTab === 'home') {
      return (
        <View style={styles.home}>
          <Text style={styles.kicker}>Session</Text>
          <Text style={styles.homeTitle}>Ready{'\n'}to lift.</Text>
          <Text style={styles.homeSub}>Log every set with quiet precision.</Text>
          <Pressable
            onPress={() => {
              haptic('medium');
              startWorkout();
            }}
            style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.96 }] }]}
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
    { id: 'dashboard', label: 'Profile', Icon: LayoutDashboard },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigateTab('home')} style={styles.brand} hitSlop={8}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={styles.brandText}>
            Track<Text style={{ color: colors.accent }}>It</Text>
          </Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              haptic('light');
              refreshAll();
            }}
            style={({ pressed }) => [styles.iconCircle, pressed && { opacity: 0.55 }]}
          >
            <RefreshCw size={18} color={colors.text} strokeWidth={2} />
          </Pressable>

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
            <View style={[styles.unitPill, { left: unit === 'lbs' ? 2 : 40 }]} />
            <Text style={[styles.unitLabel, unit === 'lbs' && styles.unitLabelOn]}>LB</Text>
            <Text style={[styles.unitLabel, unit === 'kgs' && styles.unitLabelOn]}>KG</Text>
          </Pressable>
        </View>
      </View>

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

      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.main, { opacity: fade }]}>{renderBody()}</Animated.View>
      </GestureDetector>

      {!activeWorkout && (
        <View style={styles.navWrap}>
          <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={styles.navBlur}>
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
          </BlurView>
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
      zIndex: 40,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: HIT },
    logo: { width: 28, height: 28, borderRadius: 7 },
    brandText: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 20,
      letterSpacing: -0.5,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconCircle: {
      width: HIT,
      height: HIT,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitToggle: {
      width: 80,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
    },
    unitPill: {
      position: 'absolute',
      top: 2,
      width: 38,
      height: 28,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    unitLabel: {
      width: 40,
      textAlign: 'center',
      fontSize: 12,
      fontFamily: fonts.semibold,
      letterSpacing: 0.3,
      color: colors.textMuted,
      zIndex: 1,
    },
    unitLabelOn: { color: colors.text },
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
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerSoft,
    },
    cancelText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 17 },
    finishBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      minHeight: HIT,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 17 },
    main: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center' },
    home: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: 120,
    },
    kicker: {
      color: colors.accent,
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    homeTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 48,
      lineHeight: 50,
      letterSpacing: 0.35,
      marginBottom: 10,
    },
    homeSub: {
      color: colors.textMuted,
      fontSize: 17,
      lineHeight: 22,
      fontFamily: fonts.regular,
      marginBottom: 32,
      maxWidth: 280,
    },
    startBtn: {
      backgroundColor: colors.accent,
      minHeight: 52,
      paddingHorizontal: 24,
      borderRadius: 14,
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startBtnText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.4 },
    link: {
      color: colors.accent,
      fontFamily: fonts.regular,
      fontSize: 16,
    },
    navWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    navBlur: {
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
