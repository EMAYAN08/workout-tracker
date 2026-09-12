import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { convertWeight } from '../utils/calculations';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { getItem, setItem, removeItem } from '../storage';
import { localStore } from '../db/store';
import { searchCatalog } from '../data/catalog';
import { exportBackup, pickBackupFile, confirmImportMode } from '../db/backup';
import {
  scheduleRestNotification,
  cancelRestNotification,
  subscribeNotificationActions,
  findNextIncompleteSet,
  ACT_START,
  ACT_PAUSE,
  ACT_RESUME,
} from '../notifications';

const WorkoutContext = createContext();

async function vibrate(pattern = 'light') {
  try {
    if (pattern === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // web / simulator
  }
}

function snapshotFromStore() {
  return {
    workouts: localStore.workouts,
    routines: localStore.routines,
    customExercises: localStore.customExercises,
  };
}

export function WorkoutProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [unit, setUnit] = useState('lbs');
  const [restTargetSec, setRestTargetSec] = useState(90);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [completedWorkout, setCompletedWorkout] = useState(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [lastSetCompletedAt, setLastSetCompletedAt] = useState(null);
  const [restTimer, setRestTimer] = useState(0);
  const [restPaused, setRestPaused] = useState(false);
  const [restPausedElapsed, setRestPausedElapsed] = useState(0);
  const [playingSet, setPlayingSet] = useState(null);
  const [setTimer, setSetTimer] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const newlyCreatedCustomExIds = useRef([]);
  const [routines, setRoutines] = useState([]);

  const syncFromStore = () => {
    const snap = snapshotFromStore();
    setWorkoutHistory(snap.workouts);
    setRoutines(snap.routines);
    setCustomExercises(snap.customExercises);
  };

  useEffect(() => {
    (async () => {
      try {
        await localStore.init();
        syncFromStore();
        const [savedUnit, savedActive, savedDuration, savedLastSet, savedPlaying, savedRest] =
          await Promise.all([
            getItem('workout_unit'),
            getItem('workout_active'),
            getItem('workout_duration'),
            getItem('workout_last_set_time'),
            getItem('workout_playing_set'),
            getItem('workout_rest_target'),
          ]);
        if (savedUnit) setUnit(savedUnit);
        if (savedActive) setActiveWorkout(JSON.parse(savedActive));
        if (savedDuration) setWorkoutDuration(parseInt(savedDuration, 10));
        if (savedLastSet) setLastSetCompletedAt(parseInt(savedLastSet, 10));
        if (savedPlaying) setPlayingSet(JSON.parse(savedPlaying));
        if (savedRest) setRestTargetSec(parseInt(savedRest, 10) || 90);
      } catch (err) {
        console.error('hydrate failed', err);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (playingSet) setItem('workout_playing_set', JSON.stringify(playingSet));
    else removeItem('workout_playing_set');
  }, [playingSet, hydrated]);

  useEffect(() => {
    let interval;
    if (playingSet) {
      const updateSetTimer = () => {
        setSetTimer(Math.max(0, Math.floor((Date.now() - playingSet.startTime) / 1000)));
      };
      updateSetTimer();
      interval = setInterval(updateSetTimer, 1000);
    } else {
      setSetTimer(0);
    }
    return () => clearInterval(interval);
  }, [playingSet]);

  const createCustomExercise = async (name, muscleGroup, defaultSets = []) => {
    const setsToSave = defaultSets.length > 0 ? defaultSets : [{ reps: 10, weight: 0, type: 'Working' }];
    const tempId = 'c_' + Math.random().toString(36).substr(2, 9);
    const saved = await localStore.upsertCustomExercise({
      id: tempId,
      name,
      muscleGroup,
      defaultSets: setsToSave,
      unitSaved: unit,
    });
    setCustomExercises([...localStore.customExercises]);
    newlyCreatedCustomExIds.current.push(saved.id);
    return saved;
  };

  const deleteCustomExercise = async (id) => {
    await localStore.deleteCustomExercise(id);
    setCustomExercises([...localStore.customExercises]);
    setRoutines([...localStore.routines]);
  };

  const updateCustomExercise = async (id, payload) => {
    const current = localStore.customExercises.find((e) => e.id === id) || { id };
    const saved = await localStore.upsertCustomExercise({ ...current, ...payload, id });
    setCustomExercises([...localStore.customExercises]);
    const nextRoutines = localStore.routines.map((routine) => {
      if (!routine.exercises.some((ex) => ex.id === id)) return routine;
      const updated = {
        ...routine,
        exercises: routine.exercises.map((ex) => (ex.id === id ? { ...ex, ...saved } : ex)),
      };
      localStore.upsertRoutine(updated);
      return updated;
    });
    setRoutines(nextRoutines);
    return saved;
  };

  const createRoutine = async (routineData) => {
    const saved = await localStore.upsertRoutine({
      ...routineData,
      id: routineData.id || `rt_${Date.now()}`,
    });
    setRoutines([...localStore.routines]);
    return saved;
  };

  const deleteRoutine = async (id) => {
    await localStore.deleteRoutine(id);
    setRoutines([...localStore.routines]);
  };

  const updateRoutine = async (id, routineData) => {
    const saved = await localStore.upsertRoutine({ ...routineData, id });
    setRoutines([...localStore.routines]);
    return saved;
  };

  useEffect(() => {
    if (hydrated) setItem('workout_unit', unit);
  }, [unit, hydrated]);

  useEffect(() => {
    if (hydrated) setItem('workout_rest_target', String(restTargetSec));
  }, [restTargetSec, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeWorkout) setItem('workout_active', JSON.stringify(activeWorkout));
    else removeItem('workout_active');
  }, [activeWorkout, hydrated]);

  useEffect(() => {
    if (hydrated) setItem('workout_duration', workoutDuration.toString());
  }, [workoutDuration, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (lastSetCompletedAt) setItem('workout_last_set_time', lastSetCompletedAt.toString());
    else removeItem('workout_last_set_time');
  }, [lastSetCompletedAt, hydrated]);

  useEffect(() => {
    let interval;
    if (activeWorkout && activeWorkout.startTime) {
      setWorkoutDuration(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
      interval = setInterval(() => {
        setWorkoutDuration(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout]);

  useEffect(() => {
    let interval;
    if (restPaused) {
      setRestTimer(restPausedElapsed);
      return undefined;
    }
    if (lastSetCompletedAt) {
      const updateTimer = () => {
        const elapsed = Math.max(0, Math.floor((Date.now() - lastSetCompletedAt) / 1000));
        setRestTimer(elapsed);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setRestTimer(0);
    }
    return () => clearInterval(interval);
  }, [lastSetCompletedAt, restPaused, restPausedElapsed]);

  const toggleUnit = () => {
    const newUnit = unit === 'lbs' ? 'kgs' : 'lbs';
    if (activeWorkout) {
      setActiveWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            weight: convertWeight(s.weight, unit, newUnit),
          })),
        })),
      }));
    }
    setUnit(newUnit);
  };

  const startWorkout = () => {
    cancelRestNotification();
    setRestPaused(false);
    setRestPausedElapsed(0);
    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      exercises: [],
    });
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
  };

  const startWorkoutFromRoutine = (routine) => {
    const populatedExercises = routine.exercises.map((ex) => {
      const pastWorkout = workoutHistory.find((wk) =>
        wk.exercises?.some((e) => e.id === ex.id && e.sets?.length > 0)
      );
      const prevPerformance = pastWorkout ? pastWorkout.exercises.find((e) => e.id === ex.id) : null;
      const defaultSetsCount = (ex.defaultSets || []).length || 3;
      let initialSets = [];

      if (prevPerformance) {
        const pastUnit = pastWorkout.unitSaved || 'lbs';
        for (let i = 0; i < defaultSetsCount; i++) {
          const pastSet = prevPerformance.sets[i] || prevPerformance.sets[prevPerformance.sets.length - 1];
          initialSets.push({
            type: pastSet.type || 'Working',
            weight: pastSet.weight ? String(convertWeight(pastSet.weight, pastUnit, unit)) : '',
            reps: pastSet.reps ? String(pastSet.reps) : '',
            completedAt: null,
          });
        }
      } else {
        const setsToUse = ex.defaultSets || [];
        if (setsToUse.length > 0) {
          initialSets = setsToUse.map((ds) => ({
            type: ds.type || 'Working',
            weight: ds.weight ? String(convertWeight(ds.weight, ex.unitSaved || 'lbs', unit)) : '',
            reps: ds.reps ? String(ds.reps) : '',
            completedAt: null,
          }));
        } else {
          initialSets = Array(defaultSetsCount)
            .fill(null)
            .map(() => ({ type: 'Working', weight: '', reps: '', completedAt: null }));
        }
      }

      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        gifUrl: ex.gifUrl,
        sets: initialSets,
      };
    });

    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      routineId: routine.id,
      routineName: routine.name,
      exercises: populatedExercises,
    });
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
    setRestPaused(false);
    setRestPausedElapsed(0);
    cancelRestNotification();
  };

  const finishWorkout = async () => {
    await vibrate('success');
    await cancelRestNotification();
    try {
      const payload = {
        ...activeWorkout,
        timestamp: new Date(activeWorkout.startTime || Date.now()).toISOString(),
        endTime: Date.now(),
        duration: workoutDuration,
        unitSaved: unit,
      };
      const savedWorkout = await localStore.upsertWorkout(payload);
      for (const ex of activeWorkout.exercises || []) {
        if (newlyCreatedCustomExIds.current.includes(ex.id)) {
          const mappedSets = ex.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
            type: s.type || 'Working',
          }));
          if (mappedSets.length > 0) {
            await updateCustomExercise(ex.id, { defaultSets: mappedSets });
          }
        }
      }
      setWorkoutHistory([...localStore.workouts]);
      setCompletedWorkout(savedWorkout);
      setActiveWorkout(null);
      setWorkoutDuration(0);
      setLastSetCompletedAt(null);
      setRestPaused(false);
      setRestPausedElapsed(0);
      await cancelRestNotification();
      await removeItem('workout_active');
    } catch (e) {
      console.error('Failed to save workout', e);
    }
  };

  const cancelWorkout = async () => {
    await cancelRestNotification();
    setActiveWorkout(null);
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
    setRestPaused(false);
    setRestPausedElapsed(0);
  };

  const addExercise = (exercise) => {
    if (!activeWorkout) return;
    const pastWorkout = workoutHistory.find((wk) =>
      wk.exercises?.some((e) => e.id === exercise.id && e.sets?.length > 0)
    );
    const prevPerformance = pastWorkout ? pastWorkout.exercises.find((e) => e.id === exercise.id) : null;
    let initialSets = [];
    const defaultSetsCount = (exercise.defaultSets || []).length || 1;

    if (prevPerformance) {
      const pastUnit = pastWorkout.unitSaved || 'lbs';
      for (let i = 0; i < defaultSetsCount; i++) {
        const pastSet = prevPerformance.sets[i] || prevPerformance.sets[prevPerformance.sets.length - 1];
        initialSets.push({
          type: pastSet.type || 'Working',
          weight: pastSet.weight ? String(convertWeight(pastSet.weight, pastUnit, unit)) : '',
          reps: pastSet.reps ? String(pastSet.reps) : '',
          completedAt: null,
        });
      }
    } else if (exercise.defaultSets && exercise.defaultSets.length > 0) {
      initialSets = exercise.defaultSets.map((s) => ({
        reps: s.reps ? String(s.reps) : '',
        weight: s.weight ? String(convertWeight(s.weight, exercise.unitSaved || 'lbs', unit)) : '',
        type: s.type || 'Working',
        completedAt: null,
      }));
    } else {
      initialSets = [{ reps: '', weight: '', type: 'Working', completedAt: null }];
    }

    setActiveWorkout((prev) => ({
      ...prev,
      exercises: [...prev.exercises, { ...exercise, sets: initialSets }],
    }));
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
    if (setIndex === 0) {
      for (let i = 1; i < newExercises[exerciseIndex].sets.length; i++) {
        if (!newExercises[exerciseIndex].sets[i].completedAt) {
          newExercises[exerciseIndex].sets[i][field] = value;
        }
      }
    }
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
  };

  const reorderActiveExercise = (index, direction) => {
    if (!activeWorkout) return;
    setActiveWorkout((prev) => {
      const newExercises = [...prev.exercises];
      if (direction === 'up' && index > 0) {
        [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      } else if (direction === 'down' && index < newExercises.length - 1) {
        [newExercises[index + 1], newExercises[index]] = [newExercises[index], newExercises[index + 1]];
      }
      return { ...prev, exercises: newExercises };
    });
  };

  const restMeta = (workout = activeWorkout) => {
    const next = findNextIncompleteSet(workout);
    return {
      exerciseName: next?.name || workout?.exercises?.[workout.exercises.length - 1]?.name || 'TrackIt',
      setLabel: next?.setLabel || 'Next set',
      next,
    };
  };

  const pushRestNotice = (seconds, paused = false, workout = activeWorkout) => {
    const meta = restMeta(workout);
    return scheduleRestNotification({
      seconds,
      exerciseName: meta.exerciseName,
      setLabel: meta.setLabel,
      paused,
    });
  };

  const startSet = (exerciseIndex, setIndex) => {
    vibrate();
    cancelRestNotification();
    setRestPaused(false);
    setRestPausedElapsed(0);
    setLastSetCompletedAt(null);
    setPlayingSet({ exerciseIndex, setIndex, startTime: Date.now() });
  };

  const startNextSet = () => {
    const next = findNextIncompleteSet(activeWorkout);
    if (!next) {
      cancelRestNotification();
      setLastSetCompletedAt(null);
      setRestPaused(false);
      return false;
    }
    startSet(next.exerciseIndex, next.setIndex);
    return true;
  };

  const cancelSet = () => {
    setPlayingSet(null);
  };

  const completeSet = async (exerciseIndex, setIndex) => {
    vibrate();
    if (!activeWorkout) return;
    const now = Date.now();
    const restTimeTaken = lastSetCompletedAt ? Math.floor((now - lastSetCompletedAt) / 1000) : 0;
    const newExercises = activeWorkout.exercises.map((ex, ei) => {
      if (ei !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => {
          if (si !== setIndex) return s;
          return {
            ...s,
            weight: s.weight === '' || s.weight == null ? 0 : s.weight,
            restTimeTaken,
            completedAt: now,
          };
        }),
      };
    });
    const nextWorkout = { ...activeWorkout, exercises: newExercises };
    setActiveWorkout(nextWorkout);
    setPlayingSet(null);
    setRestPaused(false);
    setRestPausedElapsed(0);
    setLastSetCompletedAt(now);
    pushRestNotice(restTargetSec, false, nextWorkout);
  };

  const pauseRest = () => {
    if (restPaused) return;
    if (!lastSetCompletedAt && restTimer <= 0) return;
    const elapsed = lastSetCompletedAt
      ? Math.max(0, Math.floor((Date.now() - lastSetCompletedAt) / 1000))
      : restTimer;
    setRestPausedElapsed(elapsed);
    setRestPaused(true);
    setLastSetCompletedAt(null);
    const remaining = Math.max(0, restTargetSec - elapsed);
    pushRestNotice(remaining, true);
  };

  const resumeRest = () => {
    if (!restPaused) return;
    const elapsed = restPausedElapsed;
    setLastSetCompletedAt(Date.now() - elapsed * 1000);
    setRestPaused(false);
    const remaining = Math.max(1, restTargetSec - elapsed);
    pushRestNotice(remaining, false);
  };

  const uncompleteSet = (exerciseIndex, setIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex].completedAt = null;
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
  };

  const addSetToExercise = (exerciseIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    const sets = newExercises[exerciseIndex].sets;
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : { reps: '', weight: '', type: 'Working' };
    newExercises[exerciseIndex].sets.push({
      reps: lastSet.reps,
      weight: lastSet.weight,
      type: lastSet.type,
      completedAt: null,
    });
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
  };

  const removeActiveExercise = (exerciseIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises.splice(exerciseIndex, 1);
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
  };

  const removeSet = (exerciseIndex, setIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
  };

  const getStreaks = () => {
    if (workoutHistory.length === 0) return { current: 0, best: 0 };
    const dates = [
      ...new Set(
        workoutHistory.map((w) => {
          try {
            return startOfDay(parseISO(w.timestamp)).getTime();
          } catch {
            return startOfDay(new Date(w.timestamp)).getTime();
          }
        })
      ),
    ].sort((a, b) => b - a);

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = startOfDay(new Date()).getTime();
    let expectedDate = today;
    if (dates[0] === today || dates[0] === today - 86400000) {
      expectedDate = dates[0];
      for (let i = 0; i < dates.length; i++) {
        if (dates[i] === expectedDate) {
          currentStreak++;
          expectedDate -= 86400000;
        } else {
          break;
        }
      }
    }

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = differenceInDays(dates[i - 1], dates[i]);
        if (diff === 1) {
          tempStreak++;
        } else {
          if (tempStreak > bestStreak) bestStreak = tempStreak;
          tempStreak = 1;
        }
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    return { current: currentStreak, best: bestStreak };
  };

  const stopRestTimer = () => {
    cancelRestNotification();
    setLastSetCompletedAt(null);
    setRestPaused(false);
    setRestPausedElapsed(0);
  };

  const searchExercises = (query) => searchCatalog(query, customExercises);

  const exportData = async () =>
    exportBackup({
      workouts: workoutHistory,
      routines,
      customExercises,
      unit,
      restTargetSec,
    });

  const importData = async () => {
    const parsed = await pickBackupFile();
    if (!parsed) return { ok: false, cancelled: true };
    const mode = await confirmImportMode();
    if (!mode) return { ok: false, cancelled: true };
    if (mode === 'replace') {
      await localStore.replaceAll(parsed);
    } else {
      await localStore.mergeAll(parsed);
    }
    syncFromStore();
    if (parsed.unit) setUnit(parsed.unit);
    if (parsed.restTargetSec) setRestTargetSec(parsed.restTargetSec);
    return {
      ok: true,
      mode,
      workouts: parsed.workouts.length,
      routines: parsed.routines.length,
      customExercises: parsed.customExercises.length,
    };
  };

  const refreshAll = async () => {
    syncFromStore();
  };

  const actionRef = useRef({});
  actionRef.current = {
    startNextSet,
    pauseRest,
    resumeRest,
    pushRestNotice,
    restPaused,
    restPausedElapsed,
    restTargetSec,
    lastSetCompletedAt,
    playingSet,
    activeWorkout,
  };

  useEffect(() => {
    const unsub = subscribeNotificationActions((id) => {
      if (id === ACT_START) actionRef.current.startNextSet();
      else if (id === ACT_PAUSE) actionRef.current.pauseRest();
      else if (id === ACT_RESUME) actionRef.current.resumeRest();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background' && state !== 'inactive') return;
      const cur = actionRef.current;
      if (!cur.activeWorkout || cur.playingSet) return;
      if (cur.restPaused) {
        cur.pushRestNotice(Math.max(0, cur.restTargetSec - cur.restPausedElapsed), true);
        return;
      }
      if (cur.lastSetCompletedAt) {
        const elapsed = Math.max(0, Math.floor((Date.now() - cur.lastSetCompletedAt) / 1000));
        const remaining = Math.max(1, cur.restTargetSec - elapsed);
        cur.pushRestNotice(remaining, false);
      }
    });
    return () => {
      unsub();
      sub.remove();
    };
  }, []);

  return (
    <WorkoutContext.Provider
      value={{
        hydrated,
        unit,
        toggleUnit,
        restTargetSec,
        setRestTargetSec,
        activeWorkout,
        startWorkout,
        startWorkoutFromRoutine,
        finishWorkout,
        cancelWorkout,
        addExercise,
        updateSet,
        reorderActiveExercise,
        completeSet,
        uncompleteSet,
        addSetToExercise,
        removeSet,
        removeActiveExercise,
        workoutDuration,
        restTimer,
        restPaused,
        stopRestTimer,
        pauseRest,
        resumeRest,
        startNextSet,
        playingSet,
        setTimer,
        startSet,
        cancelSet,
        workoutHistory,
        customExercises,
        createCustomExercise,
        deleteCustomExercise,
        updateCustomExercise,
        routines,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        getStreaks,
        completedWorkout,
        setCompletedWorkout,
        refreshAll,
        searchExercises,
        exportData,
        importData,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
