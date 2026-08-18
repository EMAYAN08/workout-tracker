import { createContext, useContext, useState, useEffect } from 'react';
import { convertWeight } from '../utils/calculations';
import { differenceInDays, parseISO, startOfDay, isSameDay } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  // Global preferences
  const [unit, setUnit] = useState(() => {
    return localStorage.getItem('workout_unit') || 'lbs';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('workout_theme') || 'dark';
  });

  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState(() => {
    const saved = localStorage.getItem('workout_active');
    return saved ? JSON.parse(saved) : null;
  });

  // Global Timer
  const [workoutDuration, setWorkoutDuration] = useState(() => {
    const saved = localStorage.getItem('workout_duration');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Rest Timer
  const [restEndTime, setRestEndTime] = useState(() => {
    const saved = localStorage.getItem('workout_rest_end_time');
    return saved ? parseInt(saved, 10) : null;
  });
  const [restTimer, setRestTimer] = useState(0);

  // Workout History
  const [workoutHistory, setWorkoutHistory] = useState([]);
  
  // Custom Exercises
  const [customExercises, setCustomExercises] = useState([]);

  // Routines
  const [routines, setRoutines] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts`);
      const data = await res.json();
      setWorkoutHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchCustomExercises = async () => {
    try {
      const res = await fetch(`${API_URL}/api/exercises/custom`);
      const data = await res.json();
      setCustomExercises(data);
    } catch (err) {
      console.error("Failed to fetch custom exercises", err);
    }
  };

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${API_URL}/api/routines`);
      const data = await res.json();
      setRoutines(data);
    } catch (err) {
      console.error("Failed to fetch routines", err);
    }
  };

  const createCustomExercise = async (name, muscleGroup) => {
    try {
      const res = await fetch(`${API_URL}/api/exercises/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, muscleGroup })
      });
      const newEx = await res.json();
      setCustomExercises(prev => [...prev, newEx]);
      return newEx;
    } catch (err) {
      console.error("Failed to create custom exercise", err);
      return null;
    }
  };

  const createRoutine = async (routineData) => {
    try {
      const res = await fetch(`${API_URL}/api/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData)
      });
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
      await fetch(`${API_URL}/api/routines/${id}`, {
        method: 'DELETE'
      });
      setRoutines(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete routine", err);
    }
  };

  const updateRoutine = async (id, routineData) => {
    try {
      const res = await fetch(`${API_URL}/api/routines/${id}`, {
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

  // Theme effect
  useEffect(() => {
    localStorage.setItem('workout_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

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
    if (restEndTime) {
      localStorage.setItem('workout_rest_end_time', restEndTime.toString());
    } else {
      localStorage.removeItem('workout_rest_end_time');
    }
  }, [restEndTime]);

  // Timers
  useEffect(() => {
    let interval;
    if (activeWorkout) {
      interval = setInterval(() => {
        setWorkoutDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout]);

  useEffect(() => {
    let interval;
    if (restEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
        setRestTimer(remaining);
        if (remaining <= 0) {
          setRestEndTime(null);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setRestTimer(0);
    }
    return () => clearInterval(interval);
  }, [restEndTime]);

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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
    setRestEndTime(null);
  };

  const startWorkoutFromRoutine = (routine) => {
    setActiveWorkout({
      id: `wk_${Date.now()}`,
      startTime: Date.now(),
      routineId: routine.id,
      routineName: routine.name,
      // Map routine exercises and pre-fill their sets based on routine configuration
      exercises: routine.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        gifUrl: ex.gifUrl,
        sets: (ex.defaultSets || []).map(ds => ({
          ...ds,
          completedAt: null
        }))
      }))
    });
    setWorkoutDuration(0);
    setRestEndTime(null);
  };

  const finishWorkout = async () => {
    try {
      if (activeWorkout.exercises.length === 0) {
        setActiveWorkout(null);
        setWorkoutDuration(0);
        setRestEndTime(null);
        return;
      }

      const payload = {
        ...activeWorkout,
        endTime: Date.now(),
        duration: workoutDuration,
        unitSaved: unit
      };
      
      await fetch(`${API_URL}/api/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await fetchHistory();
    } catch (e) {
      console.error("Failed to save workout", e);
    }
    
    setActiveWorkout(null);
    setWorkoutDuration(0);
    setRestEndTime(null);
  };

  const cancelWorkout = () => {
    setActiveWorkout(null);
    setWorkoutDuration(0);
    setRestEndTime(null);
  };

  const addExercise = (exercise) => {
    if (!activeWorkout) return;
    
    const prevPerformance = workoutHistory
      .flatMap(wk => wk.exercises || [])
      .find(ex => ex.id === exercise.id && ex.sets?.length > 0);
      
    let defaultWeight = '';
    if (prevPerformance) {
      const highestSet = prevPerformance.sets.reduce((max, s) => s.weight > max.weight ? s : max, prevPerformance.sets[0]);
      defaultWeight = highestSet.weight.toString();
    }

    setActiveWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { 
        ...exercise, 
        sets: [{ reps: '', weight: defaultWeight, type: 'Working', completedAt: null }] 
      }]
    }));
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
  };

  const completeSet = async (exerciseIndex, setIndex) => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (!activeWorkout) return;
    const newExercises = [...activeWorkout.exercises];
    newExercises[exerciseIndex].sets[setIndex].completedAt = Date.now();
    setActiveWorkout(prev => ({ ...prev, exercises: newExercises }));
    
    const delaySeconds = 60;
    setRestEndTime(Date.now() + delaySeconds * 1000);

    if ("Notification" in window && Notification.permission === "granted") {
      const subscription = await subscribeToPush();
      if (subscription) {
        fetch(`${API_URL}/api/push/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, delaySeconds })
        }).catch(err => console.error('Failed to schedule push', err));
      }
    }
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

  return (
    <WorkoutContext.Provider value={{
      unit, toggleUnit,
      theme, toggleTheme,
      activeWorkout, startWorkout, startWorkoutFromRoutine, finishWorkout, cancelWorkout,
      addExercise, updateSet, completeSet, uncompleteSet, addSetToExercise, removeSet,
      workoutDuration,
      restTimer, setRestTimer,
      workoutHistory,
      customExercises, createCustomExercise,
      routines, createRoutine, updateRoutine, deleteRoutine,
      getStreaks
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
