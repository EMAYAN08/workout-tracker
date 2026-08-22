import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { convertWeight } from '../utils/calculations';
import { differenceInDays, parseISO, startOfDay, isSameDay } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  const [username, setUsername] = useState(() => localStorage.getItem('workout_username') || null);

  const login = (user) => {
    localStorage.setItem('workout_username', user);
    setUsername(user);
  };

  const logout = () => {
    localStorage.removeItem('workout_username');
    setUsername(null);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const user = username || localStorage.getItem('workout_username');
    const url = new URL(API_URL + endpoint);
    if (user) url.searchParams.append('username', user);
    
    if (options.body && typeof options.body === 'string') {
       const bodyObj = JSON.parse(options.body);
       if (user) bodyObj.username = user;
       options.body = JSON.stringify(bodyObj);
    }
    
    return fetch(url.toString(), options);
  };

  

  // Global preferences
  const [unit, setUnit] = useState(() => {
    return localStorage.getItem('workout_unit') || 'lbs';
  });

  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState(() => {
    const saved = localStorage.getItem('workout_active');
    return saved ? JSON.parse(saved) : null;
  });
  const [completedWorkout, setCompletedWorkout] = useState(null);

  // Global Timer
  const [workoutDuration, setWorkoutDuration] = useState(() => {
    const saved = localStorage.getItem('workout_duration');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Rest Timer
  const [lastSetCompletedAt, setLastSetCompletedAt] = useState(() => {
    const saved = localStorage.getItem('workout_last_set_time');
    return saved ? parseInt(saved, 10) : null;
  });
  const [restTimer, setRestTimer] = useState(0);

  // Workout History
  const [workoutHistory, setWorkoutHistory] = useState([]);
  
  // Custom Exercises
  const [customExercises, setCustomExercises] = useState([]);
  const newlyCreatedCustomExIds = useRef([]);

  // Routines
  const [routines, setRoutines] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await apiFetch(`/api/workouts`);
      const data = await res.json();
      setWorkoutHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchCustomExercises = async () => {
    try {
      const res = await apiFetch(`/api/exercises/custom`);
      const data = await res.json();
      setCustomExercises(data);
    } catch (err) {
      console.error("Failed to fetch custom exercises", err);
    }
  };

  const fetchRoutines = async () => {
    try {
      const res = await apiFetch(`/api/routines`);
      const data = await res.json();
      setRoutines(data);
    } catch (err) {
      console.error("Failed to fetch routines", err);
    }
  };

  const createCustomExercise = async (name, muscleGroup, defaultSets = []) => {
    try {
      const setsToSave = defaultSets.length > 0 ? defaultSets : [{ reps: 10, weight: 0, type: 'Working' }];
      // Generate a client-side ID since the backend expects one
      const tempId = 'c_' + Math.random().toString(36).substr(2, 9);
      const payload = { id: tempId, name, muscleGroup, defaultSets: setsToSave, unitSaved: unit };

      const res = await apiFetch(`/api/exercises/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newEx = await res.json();
      setCustomExercises(prev => [...prev, newEx]);
      newlyCreatedCustomExIds.current.push(newEx.id);
      return newEx;
    } catch (err) {
      console.error("Failed to create custom exercise", err);
      return null;
    }
  };

  const deleteCustomExercise = async (id) => {
    try {
      await apiFetch(`/api/exercises/custom/${id}`, {
        method: 'DELETE'
      });
      setCustomExercises(prev => prev.filter(ex => ex.id !== id));
      
      // Keep routines perfectly in sync visually
      setRoutines(prev => prev.map(routine => ({
        ...routine,
        exercises: routine.exercises.filter(ex => ex.id !== id)
      })));
    } catch (err) {
      console.error("Failed to delete custom exercise", err);
    }
  };

  const updateCustomExercise = async (id, payload) => {
    try {
      const res = await apiFetch(`/api/exercises/custom/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Update failed');
      const updatedEx = await res.json();
      setCustomExercises(prev => prev.map(ex => ex.id === id ? updatedEx : ex));
      
      // Keep routines perfectly in sync visually
      setRoutines(prev => prev.map(routine => {
        if (!routine.exercises.some(ex => ex.id === id)) return routine;
        return {
          ...routine,
          exercises: routine.exercises.map(ex => ex.id === id ? { ...ex, ...updatedEx } : ex)
        };
      }));
      
      return updatedEx;
    } catch (err) {
      console.error("Failed to update custom exercise", err);
      return null;
    }
  };

  const createRoutine = async (routineData) => {
    try {
      const res = await apiFetch(`/api/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData)
      });
      if (!res.ok) throw new Error('Create failed');
      const newRoutine = await res.json();
      setRoutines(prev => [...prev, newRoutine]);
      return newRoutine;
    } catch (err) {
      console.error("Failed to create routine", err);
      return null;
    }
  };

  const deleteRoutine = async (id) => {
    try {
      await apiFetch(`/api/routines/${id}`, {
        method: 'DELETE'
      });
      setRoutines(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete routine", err);
    }
  };

  const updateRoutine = async (id, routineData) => {
    try {
      const res = await apiFetch(`/api/routines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData)
      });
      const updatedRoutine = await res.json();
      setRoutines(prev => prev.map(r => r.id === id ? updatedRoutine : r));
      return updatedRoutine;
    } catch (err) {
      console.error("Failed to update routine", err);
      return null;
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCustomExercises();
    fetchRoutines();
  }, []);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('workout_unit', unit);
  }, [unit]);

  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem('workout_active', JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem('workout_active');
    }
  }, [activeWorkout]);

  useEffect(() => {
    localStorage.setItem('workout_duration', workoutDuration.toString());
  }, [workoutDuration]);

  useEffect(() => {
    if (lastSetCompletedAt) {
      localStorage.setItem('workout_last_set_time', lastSetCompletedAt.toString());
    } else {
      localStorage.removeItem('workout_last_set_time');
    }
  }, [lastSetCompletedAt]);

  // Timers
  useEffect(() => {
    let interval;
    if (activeWorkout && activeWorkout.startTime) {
      // Initialize it immediately in case of refresh
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

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
          });
        }
        return subscription;
      } catch (e) {
        console.error('Push subscription failed', e);
        return null;
      }
    }
    return null;
  };

  // Toggle Unit
  const toggleUnit = () => {
    const newUnit = unit === 'lbs' ? 'kgs' : 'lbs';
    
    if (activeWorkout) {
      setActiveWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({
            ...s,
            weight: convertWeight(s.weight, unit, newUnit)
          }))
        }))
      }));
    }
    
    setUnit(newUnit);
  };

  const startWorkout = () => {
    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      exercises: []
    });
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
  };

  const startWorkoutFromRoutine = (routine) => {
    const populatedExercises = routine.exercises.map(ex => {
      const pastWorkout = workoutHistory.find(wk => wk.exercises?.some(e => e.id === ex.id && e.sets?.length > 0));
      const prevPerformance = pastWorkout ? pastWorkout.exercises.find(e => e.id === ex.id) : null;
      
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
            completedAt: null
          });
        }
      } else {
        const setsToUse = ex.defaultSets || [];
        if (setsToUse.length > 0) {
          initialSets = setsToUse.map(ds => ({
            type: ds.type || 'Working',
            weight: ds.weight ? String(convertWeight(ds.weight, ex.unitSaved || 'lbs', unit)) : '',
            reps: ds.reps ? String(ds.reps) : '',
            completedAt: null
          }));
        } else {
          initialSets = Array(defaultSetsCount).fill(null).map(() => ({ type: 'Working', weight: '', reps: '', completedAt: null }));
        }
      }

      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        gifUrl: ex.gifUrl,
        sets: initialSets
      };
    });

    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      routineId: routine.id,
      routineName: routine.name,
      exercises: populatedExercises
    });
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
  };

  const cancelPushNotification = async () => {
    if (pushTaskIdRef.current) {
      try {
        await apiFetch(`/api/push/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: pushTaskIdRef.current })
        });
      } catch (err) {
        console.error('Failed to cancel push', err);
      }
      pushTaskIdRef.current = null;
    }
  };

  const finishWorkout = async () => { if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    try {
      const payload = {
        ...activeWorkout,
        endTime: Date.now(),
        duration: workoutDuration,
        unitSaved: unit
      };
      
      const res = await apiFetch(`/api/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const savedWorkout = await res.json();
      
      // Sync newly created custom exercises' default sets with what was actually performed
      for (const ex of activeWorkout.exercises) {
        if (newlyCreatedCustomExIds.current.includes(ex.id)) {
          // Map the active workout 'sets' to 'defaultSets' for the custom exercise template
          const mappedSets = ex.sets.map(s => ({ reps: s.reps, weight: s.weight, type: s.type || 'Working' }));
          if (mappedSets.length > 0) {
            await updateCustomExercise(ex.id, { defaultSets: mappedSets });
          }
        }
      }
      
      await fetchHistory();
      setCompletedWorkout(savedWorkout.workout || payload);
    } catch (e) {
      console.error("Failed to save workout", e);
    }
      
      setActiveWorkout(null);
      setWorkoutDuration(0);
      setLastSetCompletedAt(null);
      localStorage.removeItem('workout_active');
  };

  const cancelWorkout = async () => {
    setActiveWorkout(null);
    setWorkoutDuration(0);
    setLastSetCompletedAt(null);
  };

  const addExercise = (exercise) => {
    if (!activeWorkout) return;
    
    const pastWorkout = workoutHistory.find(wk => wk.exercises?.some(e => e.id === exercise.id && e.sets?.length > 0));
    const prevPerformance = pastWorkout ? pastWorkout.exercises.find(e => e.id === exercise.id) : null;
    
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
          completedAt: null
        });
      }
    } else {
      if (exercise.defaultSets && exercise.defaultSets.length > 0) {
        initialSets = exercise.defaultSets.map(s => ({
          reps: s.reps ? String(s.reps) : '',
          weight: s.weight ? String(convertWeight(s.weight, exercise.unitSaved || 'lbs', unit)) : '',
          type: s.type || 'Working',
          completedAt: null
        }));
      } else {
        initialSets = [{ reps: '', weight: '', type: 'Working', completedAt: null }];
      }
    }

    setActiveWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { 
        ...exercise, 
        sets: initialSets 
      }]
    }));
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
    
    // Auto-cascade edits from the first set to subsequent uncompleted sets
    if (setIndex === 0) {
      for (let i = 1; i < newExercises[exerciseIndex].sets.length; i++) {
        if (!newExercises[exerciseIndex].sets[i].completedAt) {
          newExercises[exerciseIndex].sets[i][field] = value;
        }
      }
    }
    
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
  };

  const reorderActiveExercise = (index, direction) => {
    if (!activeWorkout) return;
    setActiveWorkout(prev => {
      const newExercises = [...prev.exercises];
      if (direction === 'up' && index > 0) {
        [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      } else if (direction === 'down' && index < newExercises.length - 1) {
        [newExercises[index + 1], newExercises[index]] = [newExercises[index], newExercises[index + 1]];
      }
      return { ...prev, exercises: newExercises };
    });
  };

  const completeSet = async (exerciseIndex, setIndex) => {
    if (navigator.vibrate) navigator.vibrate(40);
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    
    // Default weight to 0 if not entered (e.g. for bodyweight exercises)
    if (!newExercises[exerciseIndex].sets[setIndex].weight) {
      newExercises[exerciseIndex].sets[setIndex].weight = 0;
    }

    // Track rest time taken before this set
    const restTimeTaken = lastSetCompletedAt ? Math.floor((Date.now() - lastSetCompletedAt) / 1000) : 0;
    newExercises[exerciseIndex].sets[setIndex].restTimeTaken = restTimeTaken;
    
    newExercises[exerciseIndex].sets[setIndex].completedAt = Date.now();
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
    
    // Start tracking rest for the *next* set
    setLastSetCompletedAt(Date.now());
  };

  const uncompleteSet = (exerciseIndex, setIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex].completedAt = null;
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
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
      completedAt: null
    });
    
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
  };

  const removeSet = (exerciseIndex, setIndex) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
  };

  // Streak Calculation
  const getStreaks = () => {
    if (workoutHistory.length === 0) return { current: 0, best: 0 };
    
    const dates = [...new Set(workoutHistory.map(w => startOfDay(parseISO(w.timestamp)).getTime()))].sort((a, b) => b - a);
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const today = startOfDay(new Date()).getTime();
    
    // Calculate current streak
    let expectedDate = today;
    if (dates[0] === today || dates[0] === today - 86400000) {
      expectedDate = dates[0];
      for (let i = 0; i < dates.length; i++) {
        if (dates[i] === expectedDate) {
          currentStreak++;
          expectedDate -= 86400000; // minus 1 day
        } else {
          break;
        }
      }
    }

    // Calculate best streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = differenceInDays(dates[i-1], dates[i]);
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

  return (
    <WorkoutContext.Provider value={{
      username, login, logout, unit, toggleUnit,
      activeWorkout, startWorkout, startWorkoutFromRoutine, finishWorkout, cancelWorkout,
      addExercise, updateSet, reorderActiveExercise, completeSet, uncompleteSet, addSetToExercise, removeSet,
      workoutDuration,
      restTimer, stopRestTimer,
      workoutHistory,
      customExercises, createCustomExercise, deleteCustomExercise, updateCustomExercise,
      routines, createRoutine, updateRoutine, deleteRoutine,
      getStreaks,
      completedWorkout, setCompletedWorkout
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);


