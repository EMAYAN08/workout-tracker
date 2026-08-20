import React, { useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { parseISO, startOfDay, eachDayOfInterval, format, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

const generateYearGrid = (year, countsMap) => {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const daysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd });

  const weeks = [];
  let currentWeek = Array(7).fill(null);
  
  let activeDays = 0;
  const today = startOfDay(new Date());

  daysInYear.forEach(day => {
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const timestamp = startOfDay(day).getTime();
    const count = countsMap.get(timestamp) || 0;
    
    if (count > 0) activeDays++;

    currentWeek[adjustedDay] = {
      date: day,
      hasWorkout: count > 0,
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

  return { weeks, activeDays };
};

export default function ConsistencyMap({ onMapClick }) {
  const { workoutHistory } = useWorkout();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const countsMap = useMemo(() => {
    const map = new Map();
    workoutHistory.forEach(w => {
      const d = startOfDay(parseISO(w.timestamp)).getTime();
      map.set(d, (map.get(d) || 0) + 1);
    });
    return map;
  }, [workoutHistory]);

  const { weeks, activeDays } = useMemo(() => {
    return generateYearGrid(selectedYear, countsMap);
  }, [selectedYear, countsMap]);

  // Calculate consistency score
  const consistencyScore = useMemo(() => {
    const now = new Date();
    let totalDaysToConsider = 365;
    
    // Leap year check roughly
    if (selectedYear % 4 === 0) totalDaysToConsider = 366;

    if (selectedYear === now.getFullYear()) {
      // Days elapsed this year so far
      const start = new Date(selectedYear, 0, 1);
      const diffTime = Math.abs(now - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDaysToConsider = diffDays || 1; 
    } else if (selectedYear > now.getFullYear()) {
      return 0; // Future year
    }

    const score = (activeDays / totalDaysToConsider) * 100;
    return Math.min(Math.round(score), 100);
  }, [selectedYear, activeDays]);

  const handlePrevYear = (e) => {
    e.stopPropagation();
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = (e) => {
    e.stopPropagation();
    setSelectedYear(prev => prev + 1);
  };

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
      <div 
        className="panel p-5 overflow-hidden w-full flex flex-col gap-5 relative cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={onMapClick}
      >
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-text font-black text-lg sm:text-xl tracking-tight whitespace-nowrap flex items-center gap-2">
              <Target size={20} className="text-primary" />
              Consistency Map
            </h2>
            <div className="text-sm font-bold mt-1 text-textMuted flex items-center gap-2">
              Score: <span className="text-primary">{consistencyScore}%</span>
              <span className="opacity-30">|</span>
              <span>{activeDays} Days</span>
            </div>
          </div>
  
          {/* Navigation */}
          <div className="flex items-center bg-surface-light rounded-xl p-1 border border-border/50 shrink-0 self-start sm:self-auto">
            <button 
              onClick={handlePrevYear}
              className="p-1.5 hover:bg-surface rounded-lg transition-colors text-textMuted hover:text-text"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-text px-3 min-w-[60px] text-center">
              {selectedYear}
            </span>
            <button 
              onClick={handleNextYear}
              disabled={selectedYear >= new Date().getFullYear()}
              className="p-1.5 hover:bg-surface rounded-lg transition-colors text-textMuted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
  
        {/* Year Grid */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="flex flex-col min-w-max">
            {/* Months Header row */}
            <div className="flex items-end mb-1 ml-[18px]">
              {weeks.map((week, wIdx) => {
                const firstDay = week.find(d => d !== null);
                if (!firstDay) return null;
                // Render month label if it's the first week of the month, or first week of grid
                const isFirstWeekOfMonth = firstDay.date.getDate() <= 7 && wIdx > 0 && firstDay.date.getMonth() !== weeks[wIdx-1].find(d=>d!==null)?.date.getMonth();
                
                return (
                  <div key={wIdx} className="w-[14px] shrink-0 relative">
                    {(wIdx === 0 || isFirstWeekOfMonth) && (
                      <span className="absolute bottom-0 text-[10px] font-bold text-textMuted uppercase tracking-wider -translate-x-1/2 left-1/2">
                        {format(firstDay.date, 'MMM')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid Area with Y-axis */}
            <div className="flex">
              {/* Y-axis labels (M, T, W...) */}
              <div className="flex flex-col gap-[2px] pr-2 sticky left-0 bg-surface z-10 py-[1px]">
                {weekdays.map((day, i) => (
                  <span key={i} className="text-[9px] font-black text-textMuted w-3 h-[12px] flex items-center justify-center leading-none">
                    {i % 2 === 0 ? day : ''}
                  </span>
                ))}
              </div>

              {/* The Weeks */}
              <div className="flex gap-[2px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[2px]">
                    {week.map((day, dIdx) => (
                      <div 
                        key={dIdx}
                        className={`w-[12px] h-[12px] rounded-[3px] transition-all duration-300 ${
                          !day ? 'bg-transparent' : 
                          day.isFuture ? 'bg-surface-light/30' :
                          day.hasWorkout ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-surface-light hover:bg-surface-light/80'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
