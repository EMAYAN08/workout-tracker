import React, { useState, useRef, useMemo } from 'react';
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
  LayoutDashboard,
  Database,
  ClipboardList,
  Settings as SettingsIcon,
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
import Settings from './components/Settings/Settings';
import { fonts, radius, HIT } from './theme';
import { LOGO } from './config';
import { haptic } from './haptics';

const TAB_ORDER = ['routines', 'custom_exercises', 'dashboard', 'settings'];

export default function AppContent() {
  const {
    hydrated,
    activeWorkout,
    finishWorkout,
    cancelWorkout,
    unit,
    completedWorkout,
    setCompletedWorkout,
  } = useWorkout();
  const { colors, tabBarHidden } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const fade = useRef(new Animated.Value(1)).current;

  const [currentTab, setCurrentTab] = useState('routines');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const navRef = useRef({
    activeWorkout,
    tabBarHidden,
    currentTab,
    navigateTab: () => {},
  });

  const navigateTab = (newTab) => {
    if (newTab === currentTab) return;
    haptic('selection');
    Animated.timing(fade, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setCurrentTab(newTab);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  navRef.current = { activeWorkout, tabBarHidden, currentTab, navigateTab };

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-50, 50])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          const nav = navRef.current;
          if (nav.activeWorkout || nav.tabBarHidden) return;
          if (nav.currentTab === 'workout-detail' && e.translationX > 50) {
            nav.navigateTab('calendar');
            return;
          }
          if (nav.currentTab === 'calendar' && e.translationX > 50) {
            nav.navigateTab('dashboard');
            return;
          }
          const idx = TAB_ORDER.indexOf(nav.currentTab);
          if (idx === -1) return;
          if (e.translationX < -50 && idx < TAB_ORDER.length - 1) {
            nav.navigateTab(TAB_ORDER[idx + 1]);
          } else if (e.translationX > 50 && idx > 0) {
            nav.navigateTab(TAB_ORDER[idx - 1]);
          }
        }),
    []
  );

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const renderBody = () => {
    if (activeWorkout) return <ActiveWorkout />;
    if (currentTab === 'custom_exercises') return <CustomExercises />;
    if (currentTab === 'routines') return <RoutinesMain />;
    if (currentTab === 'settings') return <Settings />;
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
    return <RoutinesMain />;
  };

  const tabs = [
    { id: 'routines', label: 'Routines', Icon: ClipboardList },
    { id: 'custom_exercises', label: 'Exercises', Icon: Database },
    { id: 'dashboard', label: 'You', Icon: LayoutDashboard },
    { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  ];

  if (completedWorkout) {
    return (
      <View style={styles.root}>
        <WorkoutSummary
          data={completedWorkout}
          onClose={() => setCompletedWorkout(null)}
          unit={unit}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigateTab('routines')} style={styles.brand} hitSlop={8}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={styles.brandText}>TrackIt</Text>
        </Pressable>
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
          {activeWorkout.exercises.length > 0 && (
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
              <Text style={styles.finishText}>{isFinishing ? 'Finishing...' : 'Finish'}</Text>
            </Pressable>
          )}
        </View>
      )}

      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.main, { opacity: fade }]}>{renderBody()}</Animated.View>
      </GestureDetector>

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
