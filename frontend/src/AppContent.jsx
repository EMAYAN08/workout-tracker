import React, { useState, useRef } from 'react';
import { useWorkout } from './context/WorkoutContext';
import ActiveWorkout from './components/WorkoutFlow/ActiveWorkout';
import Dashboard from './components/Dashboard/Dashboard';
import CustomExercises from './components/CustomExercises/CustomExercises';
import RoutinesMain from './components/Routines/RoutinesMain';
import { Play, Activity, LayoutDashboard, Settings2, Dumbbell, Square, Sun, Moon, Database, ClipboardList, CalendarDays, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarView from './components/Calendar/CalendarView';
import WorkoutDetailView from './components/Calendar/WorkoutDetailView';

export default function AppContent() {
  const { activeWorkout, startWorkout, finishWorkout, cancelWorkout, unit, toggleUnit, theme, toggleTheme } = useWorkout();
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const [direction, setDirection] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const tabOrder = ['home', 'routines', 'custom_exercises', 'dashboard'];
  
  const navigateTab = (newTab) => {
    const currentIdx = tabOrder.indexOf(currentTab);
    const newIdx = tabOrder.indexOf(newTab);
    if (currentIdx !== -1 && newIdx !== -1) {
      setDirection(newIdx > currentIdx ? 1 : -1);
    } else {
      setDirection(0);
    }
    setCurrentTab(newTab);
  };

  const handleScroll = (e) => {
    const currentScrollY = e.target.scrollTop;
    if (currentScrollY > lastScrollY.current + 15) {
      setIsNavVisible(false);
    } else if (currentScrollY < lastScrollY.current - 15) {
      setIsNavVisible(true);
    }
    if (currentScrollY < 20) setIsNavVisible(true);
    lastScrollY.current = currentScrollY;
  };

  const handleRefresh = () => {
    // Unregister service worker and reload to ensure fresh data
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  const slideVariants = {
    initial: (dir) => ({ x: dir > 0 ? 100 : dir < 0 ? -100 : 0, opacity: 0 }),
    animate: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: (dir) => ({ x: dir < 0 ? 100 : dir > 0 ? -100 : 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } })
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] relative selection:bg-primary/30 transition-colors duration-300 overflow-hidden">
      
      {/* Premium Solid Header */}
      <header className="app-header sticky top-0 z-40 p-4 pt-safe flex justify-between items-center min-h-16">
        <div className="flex items-center gap-2">
          <div className="text-primary">
            <Activity className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Hevy<span className="text-primary">Clone</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-surface-light transition-all text-textMuted hover:text-text"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
        
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-surface-light transition-all text-textMuted hover:text-text"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={toggleUnit}
            className="flex items-center gap-1 hover:bg-surface-light px-3 py-1.5 rounded-full transition-all text-sm font-bold"
          >
            <span className={unit === 'lbs' ? 'text-primary' : 'text-textMuted'}>LBS</span>
            <span className="text-textMuted/30 mx-0.5">/</span>
            <span className={unit === 'kgs' ? 'text-primary' : 'text-textMuted'}>KGS</span>
          </button>
          
          {activeWorkout && (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
              <button 
                onClick={cancelWorkout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-2 sm:px-4 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsFinishing(true);
                  await finishWorkout();
                  setIsFinishing(false);
                }}
                disabled={isFinishing}
                className="bg-primary hover:bg-primary-light text-white px-3 sm:px-5 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1 sm:gap-2"
              >
                {isFinishing ? <span className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                {isFinishing ? 'Finishing...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main 
        className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-background overflow-x-hidden"
        onScroll={handleScroll}
      >
        <AnimatePresence mode="wait" custom={direction}>
          {activeWorkout ? (
            <motion.div
              key="active"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="w-full pb-8"
            >
              <ActiveWorkout />
            </motion.div>
          ) : currentTab === 'home' ? (
            <motion.div 
              key="home"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col items-center justify-center min-h-[70vh] px-4"
            >
              <Dumbbell className="text-primary w-16 h-16 mb-6" strokeWidth={1.5} />
              
              <h1 className="text-3xl font-black text-text mb-3 tracking-tight text-center">
                Ready to Lift?
              </h1>
              <p className="text-textMuted mb-10 text-center text-base">
                Track your workout and get stronger.
              </p>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startWorkout}
                className="bg-primary text-white text-lg font-bold py-4 px-12 rounded-xl w-full max-w-xs shadow-lg shadow-primary/20"
              >
                Start Empty Workout
              </motion.button>
              
              <div className="mt-6">
                <button
                  onClick={() => navigateTab('routines')}
                  className="text-textMuted font-bold hover:text-primary transition-colors text-sm underline underline-offset-4"
                >
                  Or start from a routine
                </button>
              </div>
            </motion.div>
          ) : currentTab === 'custom_exercises' ? (
            <motion.div
              key="custom_exercises"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-4 pt-4"
            >
              <CustomExercises onNavigate={navigateTab} />
            </motion.div>
          ) : currentTab === 'routines' ? (
            <motion.div
              key="routines"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-4 pt-4 pb-12"
            >
              <RoutinesMain />
            </motion.div>
          ) : currentTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-2"
            >
              <Dashboard onMapClick={() => navigateTab('calendar')} />
            </motion.div>
          ) : currentTab === 'calendar' ? (
            <motion.div 
              key="calendar"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-2"
            >
              <CalendarView onDayClick={(date) => { setSelectedDate(date); navigateTab('workout-detail'); }} onBack={() => navigateTab('dashboard')} />
            </motion.div>
          ) : currentTab === 'workout-detail' ? (
            <motion.div 
              key="workout-detail"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-2"
            >
              <WorkoutDetailView date={selectedDate} onBack={() => navigateTab('calendar')} />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="px-4 pt-4"
            >
              <Dashboard onMapClick={() => navigateTab('calendar')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Pill Navigation */}
      {!activeWorkout && (
        <motion.div 
          initial={{ y: 0, scale: 1 }}
          animate={{ 
            y: isNavVisible ? 0 : 15, 
            scale: isNavVisible ? 1 : 0.85, 
            opacity: isNavVisible ? 1 : 0.75 
          }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-full backdrop-blur-xl bg-surface/80 border border-border/50 shadow-2xl overflow-hidden py-2 px-4 origin-bottom"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-around items-center w-full relative">
            <button 
              onClick={() => navigateTab('home')}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 p-2 w-16 transition-colors ${currentTab === 'home' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
            >
              <Activity size={24} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
              <motion.span 
                animate={{ height: isNavVisible ? 'auto' : 0, opacity: isNavVisible ? 1 : 0, marginTop: isNavVisible ? 2 : 0 }} 
                className="text-[9px] font-bold overflow-hidden"
              >
                Workout
              </motion.span>
            </button>
            <button 
              onClick={() => navigateTab('routines')}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 p-2 w-16 transition-colors ${currentTab === 'routines' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
            >
              <ClipboardList size={24} strokeWidth={currentTab === 'routines' ? 2.5 : 2} />
              <motion.span 
                animate={{ height: isNavVisible ? 'auto' : 0, opacity: isNavVisible ? 1 : 0, marginTop: isNavVisible ? 2 : 0 }} 
                className="text-[9px] font-bold overflow-hidden"
              >
                Routines
              </motion.span>
            </button>
            <button 
              onClick={() => navigateTab('custom_exercises')}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 p-2 w-16 transition-colors ${currentTab === 'custom_exercises' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
            >
              <Database size={24} strokeWidth={currentTab === 'custom_exercises' ? 2.5 : 2} />
              <motion.span 
                animate={{ height: isNavVisible ? 'auto' : 0, opacity: isNavVisible ? 1 : 0, marginTop: isNavVisible ? 2 : 0 }} 
                className="text-[9px] font-bold overflow-hidden"
              >
                Exercises
              </motion.span>
            </button>
            <button 
              onClick={() => navigateTab('dashboard')}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 p-2 w-16 transition-colors ${currentTab === 'dashboard' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
            >
              <LayoutDashboard size={24} strokeWidth={currentTab === 'dashboard' ? 2.5 : 2} />
              <motion.span 
                animate={{ height: isNavVisible ? 'auto' : 0, opacity: isNavVisible ? 1 : 0, marginTop: isNavVisible ? 2 : 0 }} 
                className="text-[9px] font-bold overflow-hidden"
              >
                Profile
              </motion.span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
