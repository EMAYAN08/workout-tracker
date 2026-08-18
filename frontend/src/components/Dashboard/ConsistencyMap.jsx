import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { parseISO, startOfDay, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, isSameMonth } from 'date-fns';
import { Info, ChevronDown, Flame, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InfoPopover from './InfoPopover';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle dropdown selection and adjust chunk if switching sizes
  React.useEffect(() => {
    // If the chunk offset is somehow out of bounds after resize, reset it
    if (chunkOffset >= monthPairs.length) {
      setChunkOffset(0);
    }
  }, [monthsToShow, chunkOffset, monthPairs.length]);

  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
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

      {/* Consistency Map */}
      <div 
        className="panel p-5 overflow-hidden w-full flex flex-col gap-4 relative cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onMapClick}
      >
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h2 className="text-text font-black text-lg sm:text-xl tracking-tight whitespace-nowrap">Consistency Map</h2>
          <InfoPopover 
            title="Consistency Map" 
            description="Tracks the days you logged a workout. The darker the square, the more workouts you completed that day. Keep the grid dark to build your streak!" 
            className="mt-1"
            align="left"
          />
        </div>

        {/* Dropdown */}
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
            className="flex items-center gap-1.5 sm:gap-2 bg-surface-light hover:bg-surface text-text text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border transition-colors whitespace-nowrap"
          >
            <span>{monthPairs[chunkOffset]?.label || 'All Time'}</span>
            <ChevronDown size={14} className={`transition-transform text-textMuted ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-auto left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-surface border border-border-strong rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
                >
                  {monthPairs.map((pair) => (
                    <button
                      key={pair.id}
                      onClick={(e) => { e.stopPropagation(); setChunkOffset(pair.id); setIsDropdownOpen(false); }}
                      className={`text-left px-4 py-3 text-sm font-semibold transition-colors ${
                        chunkOffset === pair.id ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-light'
                      }`}
                    >
                      {pair.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
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