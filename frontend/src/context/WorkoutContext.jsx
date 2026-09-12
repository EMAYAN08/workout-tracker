import { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { convertWeight } from '../utils/calculations';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { API_URL } from '../config';
import { getItem, setItem, removeItem } from '../storage';

const WorkoutContext = createContext();

async function vibrate(pattern = 'light') {
  try {
    if (pattern === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // haptics not available (web / simulator)
  }
}

export function WorkoutProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [username, setUsername] = useState(null);

  const login = async (user) => {
    await setItem('workout_username', user);
    setUsername(user);
  };

  const logout = async () => {
    await removeItem('workout_username');
    setUsername(null);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const user = username || (await getItem('workout_username'));
    const url = new URL(API_URL + endpoint);
    if (user) url.searchParams.append('username', user);

    if (options.body && typeof options.body === 'string') {
      const bodyObj = JSON.parse(options.body);
      if (user) bodyObj.username = user;
      options.body = JSON.stringify(bodyObj);
    }

    return fetch(url.toString(), options);
  };

  const [unit, setUnit] = useState('lbs');
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
  const pushTaskIdRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedUnit, savedActive, savedDuration, savedLastSet, savedPlaying] =
          await Promise.all([
            getItem('workout_username'),
            getItem('workout_unit'),
            getItem('workout_active'),
            getItem('workout_duration'),
            getItem('workout_last_set_time'),
            getItem('workout_playing_set'),
          ]);
        if (savedUser) setUsername(savedUser);
        if (savedUnit) setUnit(savedUnit);
        if (savedActive) setActiveWorkout(JSON.parse(savedActive));
        if (savedDuration) setWorkoutDuration(parseInt(savedDuration, 10));
        if (savedLastSet) setLastSetCompletedAt(parseInt(savedLastSet, 10));
        if (savedPlaying) setPlayingSet(JSON.parse(savedPlaying));
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

  const fetchHistory = async () => {
    try {
      const res = await apiFetch(`/api/workouts`);
      const data = await res.json();
      setWorkoutHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchCustomExercises = async () => {
    try {
      const res = await apiFetch(`/api/exercises/custom`);
      const data = await res.json();
      setCustomExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch custom exercises', err);
    }
  };

  const fetchRoutines = async () => {
    try {
      const res = await apiFetch(`/api/routines`);
      const data = await res.json();
      setRoutines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch routines', err);
    }
  };

  const createCustomExercise = async (name, muscleGroup, defaultSets = []) => {
    try {
      const setsToSave = defaultSets.length > 0 ? defaultSets : [{ reps: 10, weight: 0, type: 'Working' }];
      const tempId = 'c_' + Math.random().toString(36).substr(2, 9);
      const payload = { id: tempId, name, muscleGroup, defaultSets: setsToSave, unitSaved: unit };
      const res = await apiFetch(`/api/exercises/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const newEx = await res.json();
      setCustomExercises((prev) => [...prev, newEx]);
      newlyCreatedCustomExIds.current.push(newEx.id);
      return newEx;
    } catch (err) {
      console.error('Failed to create custom exercise', err);
      return null;
    }
  };

  const deleteCustomExercise = async (id) => {
    try {
      await apiFetch(`/api/exercises/custom/${id}`, { method: 'DELETE' });
      setCustomExercises((prev) => prev.filter((ex) => ex.id !== id));
      setRoutines((prev) =>
        prev.map((routine) => ({
          ...routine,
          exercises: routine.exercises.filter((ex) => ex.id !== id),
        }))
      );
    } catch (err) {
      console.error('Failed to delete custom exercise', err);
    }
  };

  const updateCustomExercise = async (id, payload) => {
    try {
      const res = await apiFetch(`/api/exercises/custom/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      const updatedEx = await res.json();
      setCustomExercises((prev) => prev.map((ex) => (ex.id === id ? updatedEx : ex)));
      setRoutines((prev) =>
        prev.map((routine) => {
          if (!routine.exercises.some((ex) => ex.id === id)) return routine;
          return {
            ...routine,
            exercises: routine.exercises.map((ex) => (ex.id === id ? { ...ex, ...updatedEx } : ex)),
          };
        })
      );
      return updatedEx;
    } catch (err) {
      console.error('Failed to update custom exercise', err);
      return null;
    }
  };

  const createRoutine = async (routineData) => {
    try {
      const res = await apiFetch(`/api/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData),
      });
      if (!res.ok) throw new Error('Create failed');
      const newRoutine = await res.json();
      setRoutines((prev) => [...prev, newRoutine]);
      return newRoutine;
    } catch (err) {
      console.error('Failed to create routine', err);
      return null;
    }
  };

  const deleteRoutine = async (id) => {
    try {
      await apiFetch(`/api/routines/${id}`, { method: 'DELETE' });
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete routine', err);
    }
  };

  const updateRoutine = async (id, routineData) => {
    try {
      const res = await apiFetch(`/api/routines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData),
      });
      const updatedRoutine = await res.json();
      setRoutines((prev) => prev.map((r) => (r.id === id ? updatedRoutine : r)));
      return updatedRoutine;
    } catch (err) {
      console.error('Failed to update routine', err);
      return null;
    }
  };

  useEffect(() => {
    if (!hydrated || !username) return;
    fetchHistory();
    fetchCustomExercises();
    fetchRoutines();
  }, [hydrated, username]);

  useEffect(() => {
    if (hydrated) setItem('workout_unit', unit);
  }, [unit, hydrated]);

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
  };

  const finishWorkout = async () => {
    await vibrate('success');
    try {
      const payload = {
        ...activeWorkout,
        endTime: Date.now(),
        duration: workoutDuration,
        unitSaved: unit,
      };
      const res = await apiFetch(`/api/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const savedWorkout = await res.json();
      for (const ex of activeWorkout.exercises) {
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
      await fetchHistory();
      setCompletedWorkout(savedWorkout.workout || payload);
    } catch (e) {
      console.error('Failed to save workout', e);
    }
    setActiveWorkout(null);
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
    await removeItem('workout_active');
  };

  const cancelWorkout = async () => {
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

  const startSet = (exerciseIndex, setIndex) => {
    vibrate();
    setLastSetCompletedAt(null);
    setPlayingSet({ exerciseIndex, setIndex, startTime: Date.now() });
  };

  const cancelSet = () => {
    setPlayingSet(null);
  };

  const completeSet = async (exerciseIndex, setIndex) => {
    vibrate();
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    if (!newExercises[exerciseIndex].sets[setIndex].weight) {
      newExercises[exerciseIndex].sets[setIndex].weight = 0;
    }
    const restTimeTaken = lastSetCompletedAt ? Math.floor((Date.now() - lastSetCompletedAt) / 1000) : 0;
    newExercises[exerciseIndex].sets[setIndex].restTimeTaken = restTimeTaken;
    newExercises[exerciseIndex].sets[setIndex].completedAt = Date.now();
    setActiveWorkout((prev) => ({ ...prev, exercises: newExercises }));
    setPlayingSet(null);
    setLastSetCompletedAt(Date.now());
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
      ...new Set(workoutHistory.map((w) => startOfDay(parseISO(w.timestamp)).getTime())),
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
    setLastSetCompletedAt(null);
  };

  const refreshAll = async () => {
    if (!username) return;
    await Promise.all([fetchHistory(), fetchCustomExercises(), fetchRoutines()]);
  };

  return (
    <WorkoutContext.Provider
      value={{
        hydrated,
        username,
        login,
        logout,
        unit,
        toggleUnit,
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
        stopRestTimer,
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
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
