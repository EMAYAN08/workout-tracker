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
  Dumbbell,
  RefreshCw,
  Menu,
} from 'lucide-react-native';
import { useWorkout } from './context/WorkoutContext';
import ActiveWorkout from './components/WorkoutFlow/ActiveWorkout';
import WorkoutSummary from './components/WorkoutFlow/WorkoutSummary';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import CustomExercises from './components/CustomExercises/CustomExercises';
import RoutinesMain from './components/Routines/RoutinesMain';
import CalendarView from './components/Calendar/CalendarView';
import WorkoutDetailView from './components/Calendar/WorkoutDetailView';
import { colors, fonts } from './theme';
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
  const insets = useSafeAreaInsets();

  const [currentTab, setCurrentTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
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
          <Dumbbell size={64} color={colors.primary} strokeWidth={1.5} />
          <Text style={styles.homeTitle}>Ready to Lift?</Text>
          <Text style={styles.homeSub}>Track your workout and get stronger.</Text>
          <Pressable
            onPress={startWorkout}
            style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.startBtnText}>Start Empty Workout</Text>
          </Pressable>
          <Pressable onPress={() => navigateTab('routines')} style={{ marginTop: 24 }}>
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
            Track<Text style={{ color: colors.primary }}>It</Text>
          </Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable onPress={refreshAll} style={styles.iconCircle}>
            <RefreshCw size={18} color={colors.primary} />
          </Pressable>

          <Pressable onPress={toggleUnit} style={styles.unitToggle}>
            <Animated.View
              style={[
                styles.unitPill,
                { transform: [{ translateX: unit === 'lbs' ? 2 : 42 }] },
              ]}
            />
            <Text style={[styles.unitLabel, unit === 'lbs' && styles.unitLabelOn, { left: 2 }]}>
              LBS
            </Text>
            <Text style={[styles.unitLabel, unit === 'kgs' && styles.unitLabelOn, { left: 42 }]}>
              KGS
            </Text>
          </Pressable>

          {activeWorkout && (
            <View style={styles.workoutActions}>
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
                style={[styles.finishBtn, isFinishing && { opacity: 0.5 }]}
              >
                {isFinishing && (
                  <ActivityIndicator size={12} color={colors.primary} style={{ marginRight: 6 }} />
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
        </View>
      </View>

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
        <View style={[styles.navWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={() => !isNavVisible && setIsNavVisible(true)}
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
                      <t.Icon
                        size={22}
                        color={active ? colors.primary : colors.textMuted}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <Text style={[styles.navLabel, active && { color: colors.primary }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Menu size={24} color={colors.primary} strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 40,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 6 },
  brandText: { color: colors.text, fontFamily: fonts.black, fontSize: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  unitToggle: {
    width: 80,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    overflow: 'hidden',
  },
  unitPill: {
    position: 'absolute',
    top: 2,
    width: 36,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  unitLabel: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 30,
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 10,
    fontFamily: fonts.black,
    letterSpacing: 1,
    color: 'rgba(59,130,246,0.7)',
  },
  unitLabelOn: { color: '#fff' },
  workoutActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelText: { color: '#ef4444', fontFamily: fonts.bold, fontSize: 12 },
  finishBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  finishText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12 },
  main: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center' },
  home: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  homeTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 28,
    marginTop: 20,
    marginBottom: 8,
  },
  homeSub: { color: colors.textMuted, fontSize: 16, marginBottom: 36, textAlign: 'center' },
  startBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  startBtnText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 18 },
  link: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  navPill: {
    width: '100%',
    maxWidth: 380,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(23,23,23,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPillMin: { width: 56, height: 56 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 64, height: '100%' },
  navLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 10, marginTop: 4 },
});
