import React, { useState, useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isToday, parseISO, startOfWeek, endOfWeek, isAfter
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarView({ onDayClick }) {
  const { workoutHistory } = useWorkout();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDate = startOfWeek(start, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const workoutsMap = useMemo(() => {
    const map = {};
    if (!workoutHistory) return map;
    workoutHistory.forEach(wk => {
      const timeStr = wk.timestamp || new Date(wk.startTime).toISOString();
      const d = format(parseISO(timeStr), 'yyyy-MM-dd');
      if (!map[d]) map[d] = [];
      map[d].push(wk);
    });
    return map;
  }, [workoutHistory]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex flex-col w-full pb-8 pt-2">
      <div className="flex items-center justify-between mb-6 px-2">
        <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-2">
          <CalendarIcon className="text-primary" size={24} /> History
        </h1>
        <button 
          onClick={goToToday}
          className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="panel p-5 sm:p-6 flex flex-col gap-6 relative overflow-hidden shadow-xl shadow-black/5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text tracking-tight">
            {format(currentMonth, 'MMMM')} <span className="text-textMuted font-medium">{format(currentMonth, 'yyyy')}</span>
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-surface-light rounded-full transition-colors text-textMuted hover:text-text border border-transparent hover:border-border"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-surface-light rounded-full transition-colors text-textMuted hover:text-text border border-transparent hover:border-border"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="flex flex-col gap-4">
          {/* Days of Week Header */}
          <div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} 
            className="gap-1 sm:gap-2 mb-1"
          >
            {weekDays.map((day, idx) => (
              <div key={idx} className="text-center text-[11px] font-bold text-textMuted/60 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} 
            className="gap-y-3 gap-x-1 sm:gap-2"
          >
            {daysInMonth.map((day, i) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayWorkouts = workoutsMap[dateKey] || [];
              const hasWorkout = dayWorkouts.length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);
              const isFuture = isAfter(day, new Date()) && !isDayToday;

              return (
                <div key={i} className="flex justify-center">
                  <motion.button
                    whileHover={hasWorkout ? { scale: 1.05 } : {}}
                    whileTap={hasWorkout ? { scale: 0.95 } : {}}
                    onClick={() => { if (hasWorkout) onDayClick(dateKey); }}
                    disabled={!hasWorkout}
                    className={`
                      relative w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center rounded-full font-bold transition-all
                      ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                      ${isDayToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}
                      ${hasWorkout ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer shadow-sm' : 'text-text hover:bg-surface-light cursor-default'}
                      ${isFuture ? 'text-textMuted/30' : ''}
                      ${!hasWorkout && !isFuture && !isDayToday && isCurrentMonth ? 'text-textMuted' : ''}
                    `}
                  >
                    <span className="text-sm sm:text-base z-10">{format(day, 'd')}</span>
                    
                    {/* Subtle dot indicators for multiple workouts */}
                    {hasWorkout && dayWorkouts.length > 1 && (
                      <div className="absolute bottom-1 sm:bottom-1.5 flex gap-0.5 z-10">
                        {dayWorkouts.map((_, idx) => (
                          <div key={idx} className="w-1 h-1 rounded-full bg-current opacity-70" />
                        ))}
                      </div>
                    )}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
