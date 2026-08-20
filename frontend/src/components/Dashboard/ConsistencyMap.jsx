import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { parseISO, startOfDay, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Helper to get month grid (columns of weeks, rows of days Mon-Sun)
const generateMonthGrid = (date, countsMap) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weeks = [];
  let currentWeek = Array(7).fill(null);
  
  daysInMonth.forEach(day => {
    // getDay returns 0 for Sun, 1 for Mon, etc.
    // We want Mon=0, Sun=6
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Check count for this day
    const timestamp = startOfDay(day).getTime();
    const count = countsMap.get(timestamp) || 0;
    const level = count > 3 ? 4 : count;

    currentWeek[adjustedDay] = {
      date: day,
      count,
      level,
      isCurrentMonth: true
    };

    // If it's Sunday (end of week), push the week and start a new one
    if (adjustedDay === 6) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }
  });

  // Push the last partial week if it has any days
  if (currentWeek.some(d => d !== null)) {
    // Fill remaining days with null
    weeks.push(currentWeek);
  }

  // To make the UI exactly like the reference, the "empty" days of the first and last week 
  // should just be rendered as invisible/placeholder blocks so the grid aligns correctly.
  return weeks;
};

export default function ConsistencyMap({ onMapClick }) {
  const { workoutHistory, getStreaks } = useWorkout();
  
  // We'll manage historical chunks via offset (0 = current 2 months, 1 = previous 2 months, etc.)
  const [chunkOffset, setChunkOffset] = useState(0);

  // Pre-compute workout counts per day for fast lookup
  const countsMap = useMemo(() => {
    const map = new Map();
    workoutHistory.forEach(w => {
      const d = startOfDay(parseISO(w.timestamp)).getTime();
      map.set(d, (map.get(d) || 0) + 1);
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
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate the months to display based on chunkOffset and monthsToShow
  const { displayMonths, monthPairs } = useMemo(() => {
    const now = new Date();
    
    const pairs = [];
    for (let i = 0; i < 6; i++) {
      const dates = [];
      for (let j = monthsToShow - 1; j >= 0; j--) {
        dates.push(subMonths(now, i * monthsToShow + j));
      }
      pairs.push({
        id: i,
        label: `${format(dates[0], 'MMM')} - ${format(dates[dates.length - 1], 'MMM yyyy')}`,
        dates: dates
      });
    }

    const activePair = pairs[chunkOffset] || pairs[0];

    const generatedMonths = activePair.dates.map(date => ({
      name: format(date, 'MMMM'),
      grid: generateMonthGrid(date, countsMap)
    }));

    return {
      displayMonths: generatedMonths,
      monthPairs: pairs
    };
  }, [countsMap, chunkOffset, monthsToShow]);

  // Updated color mapping matching the app's theme
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

  const { current, best } = getStreaks();

  // Handle dropdown selection and adjust chunk if switching sizes
  React.useEffect(() => {
    // If the chunk offset is somehow out of bounds after resize, reset it
    if (chunkOffset >= monthPairs.length) {
      setChunkOffset(0);
    }
  }, [monthsToShow, chunkOffset, monthPairs.length]);

  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
      {/* Consistency Map */}
      <div 
        className="panel p-5 overflow-hidden w-full flex flex-col gap-4 relative cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onMapClick}
      >
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-text font-black text-lg sm:text-xl tracking-tight whitespace-nowrap">Consistency Map</h2>

        {/* Navigation */}
        <div className="flex items-center gap-1 bg-surface-light rounded-full p-1 border border-border">
          <button 
            onClick={(e) => { e.stopPropagation(); setChunkOffset(prev => Math.min(prev + 1, monthPairs.length - 1)); }}
            disabled={chunkOffset >= monthPairs.length - 1}
            className={`p-1.5 rounded-full transition-colors ${chunkOffset >= monthPairs.length - 1 ? 'text-textMuted/30 cursor-not-allowed' : 'text-text hover:bg-surface hover:text-primary'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-text px-2 min-w-[120px] text-center">
            {monthPairs[chunkOffset]?.label || 'All Time'}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setChunkOffset(prev => Math.max(prev - 1, 0)); }}
            disabled={chunkOffset <= 0}
            className={`p-1.5 rounded-full transition-colors ${chunkOffset <= 0 ? 'text-textMuted/30 cursor-not-allowed' : 'text-text hover:bg-surface hover:text-primary'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendars Container */}
      <div className="flex justify-evenly md:justify-between pb-2 pt-2 w-full">
        {displayMonths.map((monthData, idx) => (
          <div key={idx} className="flex flex-col gap-3 min-w-max">
            <h3 className="text-textMuted text-sm font-semibold text-center md:text-left">{monthData.name}</h3>
            <div className="flex gap-1.5">
              {monthData.grid.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day, dIdx) => (
                    <div 
                      key={dIdx}
                      title={day ? `${format(day.date, 'MMM do, yyyy')}: ${day.count} workout(s)` : ''}
                      className={`w-4 h-4 rounded-[4px] ${day ? getColor(day.level) : 'bg-transparent'}`}
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
  );
}