import React, { useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { differenceInCalendarDays, parseISO, subDays, startOfDay, format, isSameDay } from 'date-fns';
import { Flame, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConsistencyMap() {
  const { workoutHistory, getStreaks } = useWorkout();

  // Constants for map
  const WEEKS_TO_SHOW = 26; // Approx 6 months, fits well on mobile
  const DAYS_TO_SHOW = WEEKS_TO_SHOW * 7;

  // Generate data for the map
  const mapData = useMemo(() => {
    const today = startOfDay(new Date());
    const data = [];
    
    // Create a map of date strings to workout counts for O(1) lookup
    const countsMap = new Map();
    workoutHistory.forEach(w => {
      const d = startOfDay(parseISO(w.timestamp)).getTime();
      countsMap.set(d, (countsMap.get(d) || 0) + 1);
    });

    // Go back DAYS_TO_SHOW days
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const timestamp = d.getTime();
      const count = countsMap.get(timestamp) || 0;
      
      data.push({
        date: d,
        count: count,
        level: count > 3 ? 4 : count // 0, 1, 2, 3, 4
      });
    }

    return data;
  }, [workoutHistory]);

  // Group into weeks (columns)
  const columns = [];
  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    columns.push(mapData.slice(i * 7, (i + 1) * 7));
  }

  const { current, best } = getStreaks();

  // Color mapping (vibrant indigo)
  const getColor = (level) => {
    switch(level) {
      case 0: return 'bg-surface-light border border-border/50';
      case 1: return 'bg-primary/30 border border-primary/20';
      case 2: return 'bg-primary/60 border border-primary/40';
      case 3: return 'bg-primary border border-primary-light';
      case 4: return 'bg-primary-light border border-white/20 shadow-[0_0_8px_rgba(79,70,229,0.5)]';
      default: return 'bg-surface-light border border-border/50';
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* Streak Widgets */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="panel p-4 flex items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4" />
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 z-10 shrink-0">
            <Flame size={20} fill="currentColor" />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-0.5">Current Streak</p>
            <p className="text-2xl font-black text-text font-mono leading-none">{current} <span className="text-sm text-textMuted font-sans font-semibold">Days</span></p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="panel p-4 flex items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4" />
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 z-10 shrink-0">
            <Trophy size={20} />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-0.5">Best Streak</p>
            <p className="text-2xl font-black text-text font-mono leading-none">{best} <span className="text-sm text-textMuted font-sans font-semibold">Days</span></p>
          </div>
        </motion.div>
      </div>

      {/* Map */}
      <div className="panel p-5 overflow-hidden">
        <h3 className="text-sm font-black text-text uppercase tracking-widest mb-4">Consistency Map</h3>
        
        <div className="overflow-x-auto hide-scrollbar -mx-2 px-2 pb-2">
          <div className="flex gap-1.5 min-w-max">
            {columns.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-1.5">
                {col.map((day, dIdx) => (
                  <motion.div
                    key={`${cIdx}-${dIdx}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (cIdx * 0.01) + (dIdx * 0.01) }}
                    className={`w-3.5 h-3.5 rounded-sm ${getColor(day.level)} transition-colors duration-300`}
                    title={`${format(day.date, 'MMM do, yyyy')}: ${day.count} workout(s)`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] font-bold text-textMuted uppercase tracking-wider">
          <span>Less</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-sm ${getColor(0)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColor(1)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColor(2)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColor(3)}`} />
            <div className={`w-3 h-3 rounded-sm ${getColor(4)}`} />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}