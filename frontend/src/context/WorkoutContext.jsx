import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { convertWeight } from '../utils/calculations';
import { moveItem } from '../utils/reorder';
import { differenceInDays, parseISO, startOfDay, subDays } from 'date-fns';
import { getItem, setItem, removeItem } from '../storage';
import { localStore } from '../db/store';
import { searchCatalog } from '../data/catalog';
import { buildMockSnapshot } from '../data/mockData';
import { exportBackup, pickBackupFile, confirmImportMode } from '../db/backup';
import {
  scheduleRestNotification,
  cancelRestNotification,
  tickRestNotification,
  presentRestDone,
  findNextIncompleteSet,
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
  const [playingSet, setPlayingSet] = useState(null);
  const [setTimer, setSetTimer] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const newlyCreatedCustomExIds = useRef([]);
  const [routines, setRoutines] = useState([]);
  const [useMock, setUseMock] = useState(false);

  const mockSnap = useMemo(() => buildMockSnapshot(unit), [unit]);
  const shownHistory = useMock ? mockSnap.workouts : workoutHistory;
  const shownRoutines = useMock ? mockSnap.routines : routines;
  const shownExercises = useMock ? mockSnap.customExercises : customExercises;

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
        const [savedUnit, savedActive, savedDuration, savedLastSet, savedPlaying, savedRest, savedMock] =
          await Promise.all([
            getItem('workout_unit'),
            getItem('workout_active'),
            getItem('workout_duration'),
            getItem('workout_last_set_time'),
            getItem('workout_playing_set'),
            getItem('workout_rest_target'),
            getItem('workout_mock_on'),
          ]);
        if (savedUnit) setUnit(savedUnit);
        if (savedActive) setActiveWorkout(JSON.parse(savedActive));
        if (savedDuration) setWorkoutDuration(parseInt(savedDuration, 10));
        if (savedLastSet) setLastSetCompletedAt(parseInt(savedLastSet, 10));
        if (savedPlaying) setPlayingSet(JSON.parse(savedPlaying));
        if (savedRest) setRestTargetSec(parseInt(savedRest, 10) || 90);
        if (savedMock === '1') setUseMock(true);
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
    const t = setTimeout(() => {
      if (activeWorkout) setItem('workout_active', JSON.stringify(activeWorkout));
      else removeItem('workout_active');
    }, 400);
    return () => clearTimeout(t);
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
  }, [lastSetCompletedAt]);

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
    setPlayingSet(null);
    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      exercises: [],
    });
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
  };

  const startWorkoutFromRoutine = (routine) => {
    if (!routine) return;
    cancelRestNotification();
    setPlayingSet(null);
    const source = Array.isArray(routine.exercises) ? routine.exercises : [];
    const populatedExercises = source
      .filter(Boolean)
      .map((ex) => {
        const pastWorkout = (workoutHistory || []).find((wk) =>
          wk.exercises?.some((e) => e.id === ex.id && e.sets?.length > 0)
        );
        const prevPerformance = pastWorkout ? pastWorkout.exercises.find((e) => e.id === ex.id) : null;
        const pastSets = prevPerformance?.sets || [];
        const defaultSetsCount = (ex.defaultSets || []).length || 3;
        let initialSets = [];

        if (pastSets.length > 0) {
          const pastUnit = pastWorkout.unitSaved || 'lbs';
          for (let i = 0; i < defaultSetsCount; i++) {
            const pastSet = pastSets[i] || pastSets[pastSets.length - 1] || {};
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
              type: ds?.type || 'Working',
              weight: ds?.weight ? String(convertWeight(ds.weight, ex.unitSaved || 'lbs', unit)) : '',
              reps: ds?.reps ? String(ds.reps) : '',
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
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex, ei) => {
          if (ei !== exerciseIndex) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, si) => {
              if (si === setIndex) return { ...s, [field]: value };
              if (setIndex === 0 && si > 0 && !s.completedAt) return { ...s, [field]: value };
              return s;
            }),
          };
        }),
      };
    });
  };

  const reorderActiveExercise = (from, to) => {
    if (!activeWorkout) return;
    if (typeof to !== 'number') {
      const direction = to;
      const index = from;
      const target = direction === 'up' ? index - 1 : index + 1;
      to = target;
      from = index;
    }
    setActiveWorkout((prev) => {
      const next = moveItem(prev.exercises, from, to);
      if (next === prev.exercises) return prev;
      return { ...prev, exercises: next };
    });
  };

  const restMeta = (workout = activeWorkout) => {
    const next = findNextIncompleteSet(workout);
    return {
      exerciseName: next?.name || workout?.exercises?.[workout.exercises.length - 1]?.name || 'TrackHit',
      setLabel: next?.setLabel || 'Next set',
      next,
    };
  };

  const pushRestNotice = (seconds, workout = activeWorkout) => {
    const meta = restMeta(workout);
    return scheduleRestNotification({
      seconds,
      exerciseName: meta.exerciseName,
      setLabel: meta.setLabel,
    });
  };

  const startSet = (exerciseIndex, setIndex) => {
    vibrate();
    cancelRestNotification();
    setLastSetCompletedAt(null);
    setPlayingSet({ exerciseIndex, setIndex, startTime: Date.now() });
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
    setLastSetCompletedAt(now);
    pushRestNotice(restTargetSec, nextWorkout);
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
    if (shownHistory.length === 0) return { current: 0, best: 0 };
    const dates = [
      ...new Set(
        shownHistory.map((w) => {
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
    const yesterday = startOfDay(subDays(new Date(), 1)).getTime();
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        if (differenceInDays(dates[i - 1], dates[i]) === 1) {
          currentStreak++;
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
  };

  const searchExercises = (query) => searchCatalog(query, shownExercises);

  const toggleMock = async (on) => {
    setUseMock(!!on);
    await setItem('workout_mock_on', on ? '1' : '0');
  };

  const wipeAllData = async () => {
    await cancelRestNotification();
    setActiveWorkout(null);
    setCompletedWorkout(null);
    setPlayingSet(null);
    setLastSetCompletedAt(null);
    setWorkoutDuration(0);
    await localStore.replaceAll({ workouts: [], routines: [], customExercises: [] });
    setUseMock(false);
    await setItem('workout_mock_on', '0');
    syncFromStore();
    await Promise.all([
      removeItem('workout_active'),
      removeItem('workout_duration'),
      removeItem('workout_last_set_time'),
      removeItem('workout_playing_set'),
    ]);
    return { ok: true };
  };

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

  useEffect(() => {
    if (!lastSetCompletedAt || playingSet) return undefined;
    const meta = restMeta();
    let liveCleared = false;
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - lastSetCompletedAt) / 1000));
      const remaining = restTargetSec - elapsed;
      if (remaining <= 0) {
        if (!liveCleared) {
          liveCleared = true;
          presentRestDone({
            exerciseName: meta.exerciseName,
            setLabel: meta.setLabel,
          });
          vibrate('success');
        }
        return;
      }
      tickRestNotification({
        remainingSec: remaining,
        totalSec: restTargetSec,
        exerciseName: meta.exerciseName,
        setLabel: meta.setLabel,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSetCompletedAt, restTargetSec, playingSet, activeWorkout]);

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
        isResting: !!lastSetCompletedAt && !playingSet,
        stopRestTimer,
        playingSet,
        setTimer,
        startSet,
        cancelSet,
        workoutHistory: shownHistory,
        customExercises: shownExercises,
        createCustomExercise,
        deleteCustomExercise,
        updateCustomExercise,
        routines: shownRoutines,
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
        useMock,
        toggleMock,
        wipeAllData,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
