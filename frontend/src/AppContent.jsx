import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
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
import { haptic } from './haptics';

function TabPane({ active, children }) {
  return (
    <View
      collapsable={false}
      pointerEvents={active ? 'auto' : 'none'}
      style={
        active
          ? { flex: 1 }
          : { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0 }
      }
    >
      {children}
    </View>
  );
}

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

  const [currentTab, setCurrentTab] = useState('routines');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const navigateTab = (newTab) => {
    if (newTab === currentTab) return;
    haptic('selection');
    setCurrentTab(newTab);
  };

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const tabs = [
    { id: 'routines', label: 'Routines', Icon: ClipboardList },
    { id: 'custom_exercises', label: 'Exercises', Icon: Database },
    { id: 'dashboard', label: 'Profile', Icon: User },
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

  const onProfile = currentTab === 'dashboard' || currentTab === 'calendar' || currentTab === 'workout-detail';

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
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

      <View style={styles.main}>
        {activeWorkout ? (
          <ActiveWorkout />
        ) : (
          <>
            <TabPane active={currentTab === 'routines'}>
              <RoutinesMain />
            </TabPane>
            <TabPane active={currentTab === 'custom_exercises'}>
              <CustomExercises />
            </TabPane>
            <TabPane active={currentTab === 'dashboard'}>
              <Dashboard visible={currentTab === 'dashboard'} onMapClick={() => navigateTab('calendar')} />
            </TabPane>
            <TabPane active={currentTab === 'settings'}>
              <Settings />
            </TabPane>
            {currentTab === 'calendar' && (
              <CalendarView
                onDayClick={(date) => {
                  setSelectedDate(date);
                  navigateTab('workout-detail');
                }}
                onBack={() => navigateTab('dashboard')}
              />
            )}
            {currentTab === 'workout-detail' && (
              <WorkoutDetailView date={selectedDate} onBack={() => navigateTab('calendar')} />
            )}
          </>
        )}
      </View>

      {!activeWorkout && !tabBarHidden && (
        <View style={styles.navWrap}>
          <View style={styles.navBar}>
            <View style={[styles.navRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              {tabs.map((t) => {
                const active = t.id === 'dashboard' ? onProfile : currentTab === t.id;
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
    main: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', overflow: 'hidden', position: 'relative' },
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
