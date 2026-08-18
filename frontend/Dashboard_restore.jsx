import React, { useState, useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBest1RM, calculateVolume, convertWeight } from '../../utils/calculations';
import { Activity, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const { workoutHistory, unit } = useWorkout();
  
  const [metric, setMetric] = useState('1rm'); // '1rm' or 'volume'
  const [selectedExerciseId, setSelectedExerciseId] = useState('e1');

  const uniqueExercises = useMemo(() => {
    const exercisesMap = new Map();
    workoutHistory.forEach(wk => {
      wk.exercises?.forEach(ex => {
        if (!exercisesMap.has(ex.id)) {
          exercisesMap.set(ex.id, ex.name);
        }
      });
    });
    return Array.from(exercisesMap.entries()).map(([id, name]) => ({ id, name }));
  }, [workoutHistory]);

  const chartData = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    
    const sorted = [...workoutHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const dataPoints = [];
    
    sorted.forEach(wk => {
      const ex = wk.exercises?.find(e => e.id === selectedExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        // Dummy data in DB was assuming lbs roughly, let's say DB unit is lbs
        const dbUnit = 'lbs';
        
        const rawValue = metric === '1rm' ? getBest1RM(ex.sets) : calculateVolume(ex.sets);
        // Convert to current display unit
        const value = convertWeight(rawValue, dbUnit, unit);

        dataPoints.push({
          date: format(parseISO(wk.timestamp), 'MMM dd'),
          value: value,
        });
      }
    });
    
    return dataPoints;
  }, [workoutHistory, selectedExerciseId, metric, unit]);

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 border border-white/10 rounded-xl shadow-2xl">
          <p className="text-textMuted text-xs font-bold uppercase mb-1">{label}</p>
          <p className="text-primary font-mono text-xl font-black">
            {payload[0].value} <span className="text-sm">{unit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* Header Controls */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h2 className="text-2xl font-black text-text flex items-center gap-2 tracking-tight">
            <TrendingUp className="text-primary" size={28} /> Progression
          </h2>
          <p className="text-sm text-textMuted mt-1">Visualize your strength journey</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={selectedExerciseId}
            onChange={e => setSelectedExerciseId(e.target.value)}
            className="input-premium py-2.5 px-4 font-semibold flex-1 md:w-48 bg-surface text-sm"
          >
            {uniqueExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          
          <select 
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="input-premium py-2.5 px-4 font-semibold flex-1 md:w-40 bg-surface text-sm"
          >
            <option value="1rm">Est. 1RM</option>
            <option value="volume">Total Volume</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-textMuted text-xs font-bold uppercase tracking-wider mb-2">Current {metric === '1rm' ? '1RM' : 'Volume'}</span>
          <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light font-mono drop-shadow-sm">
            {latestValue} <span className="text-xl text-primary">{unit}</span>
          </span>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-textMuted text-xs font-bold uppercase tracking-wider mb-2">Sessions Tracked</span>
          <span className="text-4xl font-black text-text font-mono">
            {chartData.length}
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="glass-panel p-5 rounded-2xl h-[350px]">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#A1A1AA" tick={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#4F46E5" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                activeDot={{ r: 8, fill: '#10B981', stroke: '#0A0A0A', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted">
            <Activity size={48} className="opacity-20 mb-4" />
            <p className="font-bold">Not enough data</p>
            <p className="text-sm mt-1">Log this exercise more than once to see progression.</p>
          </div>
        )}
      </div>
    </div>
  );
}
