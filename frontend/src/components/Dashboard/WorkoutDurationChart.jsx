import React, { useState, useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import InfoPopover from './InfoPopover';

export default function WorkoutDurationChart() {
  const { workoutHistory } = useWorkout();
  const [displayUnit, setDisplayUnit] = useState('mins'); // 'mins' or 'hrs'

  const chartData = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];

    // Group by date
    const grouped = {};
    workoutHistory.forEach(wk => {
      // Use timestamp if available, else fallback to startTime
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      const dateKey = format(parseISO(timeStr), 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, durationSec: 0 };
      }
      grouped[dateKey].durationSec += (wk.duration || 0);
    });

    // Sort chronologically
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    // Map to chart values
    return sortedDates.map(dateKey => {
      const d = grouped[dateKey];
      return {
        date: format(parseISO(dateKey), 'MMM dd'),
        value: displayUnit === 'mins' 
            ? Math.round(d.durationSec / 60)
            : Number((d.durationSec / 3600).toFixed(1))
      };
    }).filter(d => d.value > 0); // Don't plot 0 duration days if any weird data exists
  }, [workoutHistory, displayUnit]);

  const averageValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.value, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light p-3 border border-border rounded-lg shadow-xl">
          <p className="text-textMuted text-xs font-bold uppercase mb-1">{label}</p>
          <p className="text-amber-500 font-mono text-xl font-black">
            {payload[0].value} <span className="text-sm">{displayUnit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full pb-2">
      <div className="mt-4 mb-2 px-2 flex items-center justify-between">
        <h2 className="text-lg font-black text-text flex items-center gap-2 tracking-tight">
          <Clock className="text-amber-500" size={20} /> Workout Duration
        </h2>
        <InfoPopover 
          title="Workout Duration"
          description="Track how much time you spend working out each day. The dashed line shows your average duration over this period."
          align="right"
          color="amber" // Wait, I need to add amber to InfoPopover, but it defaults to primary safely if missing. I'll add amber to InfoPopover next.
        />
      </div>

      <div className="panel p-4 flex flex-col gap-3 relative z-10 mb-4">
        <div className="flex items-center justify-between w-full">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Time Unit</label>
            <div className="flex bg-background rounded-lg p-1 border border-border">
              <button 
                onClick={() => setDisplayUnit('mins')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayUnit === 'mins' ? 'bg-surface-light text-amber-500 shadow' : 'text-textMuted hover:text-text'}`}
              >
                Minutes
              </button>
              <button 
                onClick={() => setDisplayUnit('hrs')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayUnit === 'hrs' ? 'bg-surface-light text-amber-500 shadow' : 'text-textMuted hover:text-text'}`}
              >
                Hours
              </button>
            </div>
          </div>
          
          {chartData.length > 0 && (
            <div className="text-right">
              <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1 block">Average</label>
              <span className="text-lg font-black text-text font-mono">
                {averageValue} <span className="text-xs text-textMuted">{displayUnit}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="panel p-4 h-[300px] mb-6">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <ReferenceLine y={averageValue} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} opacity={0.5} />
              
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#f59e0b" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorDuration)" 
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#18181b', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted">
            <Activity size={32} className="opacity-20 mb-3" />
            <p className="font-bold text-sm">Not enough data</p>
            <p className="text-xs mt-1">Log more workouts to see your duration trends.</p>
          </div>
        )}
      </div>
    </div>
  );
}
