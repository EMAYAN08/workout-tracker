import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { parseISO, startOfDay, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Target, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to get month grid (columns of weeks, rows of days Mon-Sun)
const generateMonthGrid = (date, countsMap) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weeks = [];
  let currentWeek = Array(7).fill(null);
  
  const today = startOfDay(new Date());

  daysInMonth.forEach(day => {
    // getDay returns 0 for Sun, 1 for Mon, etc.
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const timestamp = startOfDay(day).getTime();
    const data = countsMap.get(timestamp) || { count: 0, hasRestDay: false, hasRealWorkout: false };

    currentWeek[adjustedDay] = {
      date: day,
      hasWorkout: data.count > 0,
      isRestOnly: data.hasRestDay && !data.hasRealWorkout,
      isFuture: isAfter(day, today)
    };

    if (adjustedDay === 6) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }
  });

  if (currentWeek.some(d => d !== null)) {
    weeks.push(currentWeek);
  }

  return weeks;
};

export default function ConsistencyMap({ onMapClick }) {
  const { workoutHistory } = useWorkout();
  
  // 0 = current 2 months, 1 = previous 2 months, etc.
  const [chunkOffset, setChunkOffset] = useState(0);

  const countsMap = useMemo(() => {
    const map = new Map();
    workoutHistory.forEach(w => {
      const d = startOfDay(parseISO(w.timestamp)).getTime();
      const existing = map.get(d) || { count: 0, hasRestDay: false, hasRealWorkout: false };
      const isRest = w.exercises && w.exercises.length === 0;
      if (isRest) existing.hasRestDay = true;
      else existing.hasRealWorkout = true;
      existing.count += 1;
      map.set(d, existing);
    });
    return map;
  }, [workoutHistory]);

  const [monthsToShow, setMonthsToShow] = useState(3);

  // Dynamically adjust months based on screen size
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setMonthsToShow(2);
      } else {
        setMonthsToShow(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { displayMonths, monthPairs, activeDaysInChunk, totalValidDaysInChunk, yearLabel } = useMemo(() => {
    const now = startOfDay(new Date());
    
    const pairs = [];
    for (let i = 0; i < 6; i++) {
      const dates = [];
      for (let j = monthsToShow - 1; j >= 0; j--) {
        dates.push(subMonths(now, i * monthsToShow + j));
      }
      pairs.push({
        id: i,
        dates: dates
      });
    }

    const activePair = pairs[chunkOffset] || pairs[0];
    
    let activeDays = 0;
    let validDays = 0;

    const generatedMonths = activePair.dates.map(date => {
      const grid = generateMonthGrid(date, countsMap);
      
      // Calculate active days & valid days (past/present days) for the score
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      days.forEach(d => {
        if (!isAfter(d, now)) {
          validDays++;
          if (countsMap.get(d.getTime()) > 0) {
            activeDays++;
          }
        }
      });

      return {
        name: format(date, 'MMMM'),
        grid
      };
    });
    
    const yearLabel = format(activePair.dates[activePair.dates.length - 1], 'yyyy');

    return {
      displayMonths: generatedMonths,
      monthPairs: pairs,
      activeDaysInChunk: activeDays,
      totalValidDaysInChunk: validDays || 1, // avoid division by zero
      yearLabel
    };
  }, [countsMap, chunkOffset, monthsToShow]);

  // Handle dropdown selection and adjust chunk if switching sizes
  React.useEffect(() => {
    if (chunkOffset >= monthPairs.length) {
      setChunkOffset(0);
    }
  }, [monthsToShow, chunkOffset, monthPairs.length]);

  const score = Math.min(Math.round((activeDaysInChunk / totalValidDaysInChunk) * 100), 100);

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
      <div 
        className="panel p-5 overflow-hidden w-full flex flex-col gap-5 relative cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onMapClick}
      >
      
      {/* Header - Using items-start to keep nav on top right on mobile */}
      <div className="flex justify-between items-start w-full gap-2">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-text font-black text-lg sm:text-xl tracking-tight whitespace-nowrap flex items-center gap-2">
            <Target size={20} className="text-primary" />
            Consistency Map
          </h2>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <Flame size={14} className="text-amber-500" />
              <span className="text-amber-500 font-bold text-[11px] uppercase tracking-wide">Score: {score}%</span>
            </div>
            <span className="text-textMuted text-xs font-semibold">{activeDaysInChunk} Days</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center bg-surface-light rounded-xl p-1 border border-border/50 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); setChunkOffset(prev => Math.min(prev + 1, monthPairs.length - 1)); }}
            disabled={chunkOffset >= monthPairs.length - 1}
            className={`p-1.5 rounded-lg transition-colors ${chunkOffset >= monthPairs.length - 1 ? 'text-textMuted/30 cursor-not-allowed' : 'text-textMuted hover:text-text hover:bg-surface'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-text px-3 min-w-[50px] text-center">
            {yearLabel}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setChunkOffset(prev => Math.max(prev - 1, 0)); }}
            disabled={chunkOffset <= 0}
            className={`p-1.5 rounded-lg transition-colors ${chunkOffset <= 0 ? 'text-textMuted/30 cursor-not-allowed' : 'text-textMuted hover:text-text hover:bg-surface'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendars Container */}
      <div className="flex pb-2 pt-2 w-full gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
        
        {/* Y-axis labels */}
        <div className="flex flex-col gap-[6px] pt-[26px] sticky left-0 bg-surface z-10 pr-2">
          {weekdays.map((day, i) => (
            <span key={i} className="text-[10px] font-black text-textMuted w-3 h-[16px] flex items-center justify-center leading-none">
              {i % 2 === 0 ? day : ''}
            </span>
          ))}
        </div>

        {/* Months Grids */}
        <div className="flex gap-6 sm:gap-10">
          {displayMonths.map((monthData, idx) => (
            <div key={idx} className="flex flex-col gap-3 min-w-max">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-wider">{monthData.name}</h3>
              <div className="flex gap-[6px]">
                {monthData.grid.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[6px]">
                    {week.map((day, dIdx) => (
                      <div 
                        key={dIdx}
                        title={day ? `${format(day.date, 'MMM do, yyyy')}` : ''}
                        className={`w-4 h-4 rounded-[4px] transition-all duration-300 ${
                          !day ? 'bg-transparent' : 
                          day.isFuture ? 'bg-surface-light/30' :
                          day.isRestOnly ? 'bg-emerald-500/80 shadow-sm shadow-emerald-500/20' :
                          day.hasWorkout ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-surface-light hover:bg-surface-light/80'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>
    </div>
  );
}
