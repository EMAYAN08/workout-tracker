import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
  Menu,
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
import { fonts, radius } from './theme';
import { LOGO } from './config';

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
  const styles = makeStyles(colors, isDark);

  const [currentTab, setCurrentTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

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
    setCurrentTab(newTab);
    setIsNavVisible(true);
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

  const handleScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (Math.abs(y - lastScrollY.current) > 15) setIsNavVisible(false);
    lastScrollY.current = y;
  };

  const renderBody = () => {
    if (activeWorkout) return <ActiveWorkout />;
    if (currentTab === 'home') {
      return (
        <View style={styles.home}>
          <Text style={styles.kicker}>Session</Text>
          <Text style={styles.homeTitle}>Ready{'\n'}to lift.</Text>
          <Text style={styles.homeSub}>Log sets with quiet precision. No noise, just work.</Text>
          <Pressable
            onPress={startWorkout}
            style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.startBtnText}>Start empty workout</Text>
          </Pressable>
          <Pressable onPress={() => navigateTab('routines')} style={{ marginTop: 20, padding: 8 }}>
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => navigateTab('home')} style={styles.brand}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={styles.brandText}>
            Track<Text style={{ color: colors.accent }}>It</Text>
          </Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable onPress={refreshAll} style={styles.iconCircle}>
            <RefreshCw size={16} color={colors.text} strokeWidth={2} />
          </Pressable>

          <Pressable onPress={toggleTheme} style={styles.iconCircle}>
            {isDark ? (
              <Sun size={16} color={colors.text} strokeWidth={2} />
            ) : (
              <Moon size={16} color={colors.text} strokeWidth={2} />
            )}
          </Pressable>

          <Pressable onPress={toggleUnit} style={styles.unitToggle}>
            <View
              style={[
                styles.unitPill,
                { left: unit === 'lbs' ? 2 : 38 },
              ]}
            />
            <Text style={[styles.unitLabel, unit === 'lbs' && styles.unitLabelOn]}>LBS</Text>
            <Text style={[styles.unitLabel, unit === 'kgs' && styles.unitLabelOn]}>KGS</Text>
          </Pressable>
        </View>
      </View>

      {activeWorkout && (
        <View style={styles.workoutBar}>
          <Pressable onPress={cancelWorkout} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={isFinishing}
            onPress={async () => {
              setIsFinishing(true);
              await finishWorkout();
              setIsFinishing(false);
            }}
            style={[styles.finishBtn, { flex: 1 }, isFinishing && { opacity: 0.5 }]}
          >
            {isFinishing && (
              <ActivityIndicator size={12} color={colors.accentFg} style={{ marginRight: 6 }} />
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
        <View style={styles.main}>{renderBody()}</View>
      </GestureDetector>

      {!activeWorkout && (
        <View style={[styles.navWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={() => !isNavVisible && setIsNavVisible(true)}
            style={[styles.navOuter, !isNavVisible && styles.navOuterMin]}
          >
            <BlurView
              intensity={48}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.navPill, !isNavVisible && styles.navPillMin]}
            >
              {isNavVisible ? (
                <View style={styles.navRow}>
                  {tabs.map((t) => {
                    const active =
                      currentTab === t.id ||
                      ((currentTab === 'calendar' || currentTab === 'workout-detail') &&
                        t.id === 'dashboard');
                    return (
                      <Pressable key={t.id} onPress={() => navigateTab(t.id)} style={styles.navItem}>
                        <View style={[styles.navIconWrap, active && styles.navIconActive]}>
                          <t.Icon
                            size={18}
                            color={active ? colors.accentFg : colors.textMuted}
                            strokeWidth={active ? 2.4 : 1.8}
                          />
                        </View>
                        <Text style={[styles.navLabel, active && { color: colors.text }]}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Menu size={20} color={colors.text} strokeWidth={2} />
              )}
            </BlurView>
          </Pressable>
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
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 40,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logo: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
    brandText: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 18,
      letterSpacing: -0.4,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitToggle: {
      width: 76,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
    },
    unitPill: {
      position: 'absolute',
      top: 2,
      width: 36,
      height: 26,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    unitLabel: {
      width: 38,
      textAlign: 'center',
      fontSize: 10,
      fontFamily: fonts.bold,
      letterSpacing: 0.6,
      color: colors.textMuted,
      zIndex: 1,
    },
    unitLabelOn: { color: colors.accentFg },
    workoutBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    cancelBtn: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger + '33',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: radius.sm,
    },
    cancelText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 12 },
    finishBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    finishText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 12 },
    main: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center' },
    home: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: 96,
    },
    kicker: {
      color: colors.accent,
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    homeTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontSize: 48,
      lineHeight: 50,
      letterSpacing: -1.6,
      marginBottom: 12,
    },
    homeSub: {
      color: colors.textMuted,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: fonts.regular,
      marginBottom: 36,
      maxWidth: 280,
    },
    startBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: radius.md,
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
    },
    startBtnText: { color: colors.accentFg, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.2 },
    link: {
      color: colors.textMuted,
      fontFamily: fonts.medium,
      fontSize: 14,
      textDecorationLine: 'underline',
      textDecorationColor: colors.borderStrong,
    },
    navWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    navOuter: {
      width: '100%',
      maxWidth: 400,
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    navOuterMin: { width: 52, height: 52, borderRadius: radius.lg, maxWidth: 52 },
    navPill: {
      width: '100%',
      height: 68,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass,
    },
    navPillMin: { width: 52, height: 52 },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      paddingHorizontal: 6,
    },
    navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%', gap: 4 },
    navIconWrap: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIconActive: { backgroundColor: colors.accent },
    navLabel: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.2 },
  });
}
