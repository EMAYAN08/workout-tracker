import React, { useState, useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBest1RM, calculateVolume, convertWeight } from '../../utils/calculations';
import { Search, Activity, TrendingUp, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ConsistencyMap from './ConsistencyMap';
import InfoPopover from './InfoPopover';
import WorkoutDurationChart from './WorkoutDurationChart';
import StrengthChart from './StrengthChart';

const CustomDropdown = ({ options, value, onChange, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedLabel = options.find(o => o.value === value)?.label || "Select";
  
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchQuery, searchable]);

  return (
    <div className="relative w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-light px-3 py-2.5 rounded-lg text-sm font-semibold flex justify-between items-center text-text border border-border focus:outline-none focus:border-primary transition-colors"
      >
        <span className="truncate pr-2">{selectedLabel}</span>
        <ChevronDown size={16} className={`text-textMuted transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-strong rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 flex flex-col"
            >
              {searchable && (
               <div className="p-2 border-b border-border-strong bg-surface">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search exercise..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-light pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text placeholder-textMuted"
                    />
                  </div>
                </div>
              )}
              <div className="overflow-y-auto flex-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-textMuted text-center font-semibold">No results</div>
                ) : (
                  filteredOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0 ${
                        opt.value === value ? 'bg-primary/10 text-primary font-bold' : 'text-text hover:bg-surface-light font-semibold'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Dashboard({ onMapClick }) {
  const { workoutHistory, unit } = useWorkout();
  
  // Exercise Progression Chart State
  const [metric, setMetric] = useState('1rm'); // '1rm' or 'volume'
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const uniqueExercises = useMemo(() => {
    const exercisesMap = new Map();
    workoutHistory.forEach(wk => {
      wk.exercises?.forEach(ex => {
        if (!exercisesMap.has(ex.id)) {
          exercisesMap.set(ex.id, ex.name);
        }
      });
    });
    return Array.from(exercisesMap.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [workoutHistory]);

  React.useEffect(() => {
    if (uniqueExercises.length > 0) {
      if (!selectedExerciseId || !uniqueExercises.find(ex => ex.value === selectedExerciseId)) {
        setSelectedExerciseId(uniqueExercises[0].value);
      }
    }
  }, [uniqueExercises, selectedExerciseId]);

  const metricOptions = [
    { value: '1rm', label: 'Est. 1RM' },
    { value: 'volume', label: 'Total Volume' }
  ];

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

  const [weightExerciseId, setWeightExerciseId] = useState('');

  React.useEffect(() => {
    if (uniqueExercises.length > 0) {
      if (!weightExerciseId || !uniqueExercises.find(ex => ex.value === weightExerciseId)) {
        setWeightExerciseId(uniqueExercises[0].value);
      }
    }
  }, [uniqueExercises, weightExerciseId]);

  const weightChartData = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    
    const sorted = [...workoutHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const dataPoints = [];
    
    sorted.forEach(wk => {
      const ex = wk.exercises?.find(e => e.id === weightExerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        // Find the maximum weight across all sets in this workout
        const rawValue = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
        // We assume db stores in lbs for the dummy conversion like earlier logic
        const value = convertWeight(rawValue, 'lbs', unit);

        dataPoints.push({
          date: format(parseISO(wk.timestamp), 'MMM dd'),
          value: value,
        });
      }
    });
    
    return dataPoints;
  }, [workoutHistory, weightExerciseId, unit]);

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;

  const CustomTooltip = ({ active, payload, label, colorClass = "text-primary" }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light p-3 border border-border rounded-lg shadow-xl">
          <p className="text-textMuted text-xs font-bold uppercase mb-1">{label}</p>
          <p className={`${colorClass} font-mono text-xl font-black`}>
            {payload[0].value} <span className="text-sm">{unit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8">
      
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-2 px-2">
        <div className="w-16 h-16 rounded-full bg-surface-light border-2 border-primary flex items-center justify-center text-primary font-black text-2xl shadow-lg">
          U
        </div>
        <div>
          <h1 className="text-2xl font-black text-text leading-tight">User</h1>
          <p className="text-textMuted font-semibold text-sm">Fitness Enthusiast</p>
        </div>
      </div>

      {/* Lifetime Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4 flex flex-col justify-center">
          <span className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Total Workouts</span>
          <span className="text-2xl font-black text-text font-mono leading-none">
            {workoutHistory.length}
          </span>
        </div>
        <div className="panel p-4 flex flex-col justify-center">
          <span className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Total Volume</span>
          <span className="text-2xl font-black text-text font-mono leading-none">
            {convertWeight(workoutHistory.reduce((acc, wk) => acc + (wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0), 0), 'lbs', unit).toLocaleString()} <span className="text-sm text-textMuted">{unit}</span>
          </span>
        </div>
      </div>

      {/* Consistency Map & Streaks */}
      <ConsistencyMap onMapClick={onMapClick} />

      {/* Muscle Distribution Strength Chart */}
      <StrengthChart />

      <div className="mt-4 mb-2 px-2 flex items-center justify-between">
        <h2 className="text-lg font-black text-text flex items-center gap-2 tracking-tight">
          <TrendingUp className="text-primary" size={20} /> Exercise Progression
        </h2>
        <InfoPopover 
          title="Exercise Progression"
          description="Track your performance over time. 'Total Volume' shows the total weight lifted across all sets. 'Est. 1RM' calculates your theoretical 1-rep maximum based on your heaviest sets."
          align="right"
        />
      </div>

      {/* Header Controls */}
      <div className="panel p-4 flex flex-col gap-3 relative z-30">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Exercise</label>
            <CustomDropdown 
              options={uniqueExercises.length > 0 ? uniqueExercises : [{ value: 'none', label: 'No Exercises' }]}
              value={selectedExerciseId}
              onChange={setSelectedExerciseId}
              searchable={true}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Metric</label>
            <CustomDropdown 
              options={metricOptions}
              value={metric}
              onChange={setMetric}
              searchable={false}
            />
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="panel p-4 h-[300px] mb-6">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<CustomTooltip colorClass="text-primary" />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#4F46E5" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                activeDot={{ r: 6, fill: '#4F46E5', stroke: '#18181b', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted">
            <Activity size={32} className="opacity-20 mb-3" />
            <p className="font-bold text-sm">Not enough data</p>
            <p className="text-xs mt-1">Log this exercise more than once to see progression.</p>
          </div>
        )}
      </div>

      <div className="mt-4 mb-2 px-2 flex items-center justify-between">
        <h2 className="text-lg font-black text-text flex items-center gap-2 tracking-tight">
          <Activity className="text-emerald-500" size={20} /> Max Weight Progression
        </h2>
        <InfoPopover 
          title="Max Weight Progression"
          description="Focus purely on strength. This chart plots the absolute heaviest single set you lifted during each workout for the selected exercise."
          align="right"
          color="emerald"
        />
      </div>

      {/* Header Controls for Weight Chart */}
      <div className="panel p-4 flex flex-col gap-3 relative z-20">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Exercise</label>
            <CustomDropdown 
              options={uniqueExercises.length > 0 ? uniqueExercises : [{ value: 'none', label: 'No Exercises' }]}
              value={weightExerciseId}
              onChange={setWeightExerciseId}
              searchable={true}
            />
          </div>
          {/* Empty div for spacing/alignment if we only need one dropdown here */}
          <div className="flex-1 hidden sm:block"></div>
        </div>
      </div>

      {/* Chart Area for Weight */}
      <div className="panel p-4 h-[300px]">
        {weightChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWeightValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<CustomTooltip colorClass="text-emerald-500" />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorWeightValue)" 
                activeDot={{ r: 6, fill: '#10B981', stroke: '#18181b', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted">
            <Activity size={32} className="opacity-20 mb-3" />
            <p className="font-bold text-sm">Not enough data</p>
            <p className="text-xs mt-1">Log this exercise more than once to see progression.</p>
          </div>
        )}
      </div>

      {/* Workout Duration Chart */}
      <WorkoutDurationChart />
    </div>
  );
}
