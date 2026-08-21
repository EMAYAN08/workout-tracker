import React, { useState, useRef } from 'react';
import { useWorkout } from './context/WorkoutContext';
import ActiveWorkout from './components/WorkoutFlow/ActiveWorkout';
import WorkoutSummary from './components/WorkoutFlow/WorkoutSummary';
import Login from './components/Auth/Login';
const Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard'));
const CustomExercises = React.lazy(() => import('./components/CustomExercises/CustomExercises'));
const RoutinesMain = React.lazy(() => import('./components/Routines/RoutinesMain'));
import { Play, Activity, LayoutDashboard, Settings2, Dumbbell, Square, Sun, Moon, Database, ClipboardList, CalendarDays, RefreshCw, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const CalendarView = React.lazy(() => import('./components/Calendar/CalendarView'));
const WorkoutDetailView = React.lazy(() => import('./components/Calendar/WorkoutDetailView'));

export default function AppContent() {
  const { username, login, activeWorkout, startWorkout, finishWorkout, cancelWorkout, unit, toggleUnit, completedWorkout, setCompletedWorkout } = useWorkout();

  if (!username) {
    return <Login onLogin={login} />;
  }
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
    
    // Shrink nav bar on any significant scroll (up or down)
    if (Math.abs(currentScrollY - lastScrollY.current) > 15) {
      setIsNavVisible(false);
    }
    
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
    <div className="h-[100dvh] w-full bg-background flex flex-col relative selection:bg-primary/30 transition-colors duration-300 overflow-hidden">
      
      {/* Premium Solid Header */}
      <header className="app-header flex-shrink-0 z-40 p-4 pt-safe flex justify-between items-center min-h-16 relative">
        <button 
          onClick={() => navigateTab('home')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95"
        >
          <div className="text-primary flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}trackit-logo.jpg`} alt="TrackIt Logo" className="w-8 h-8 rounded-md" />
          </div>
          <span className="font-black text-xl tracking-tight hidden sm:block text-text">
            Track<span className="text-primary">It</span>
          </span>
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-primary/10 border border-primary/40 backdrop-blur-md text-primary hover:bg-primary/20 hover:border-primary/60 transition-all active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
        
            <button 
            onClick={toggleUnit}
            className="relative rounded-full bg-primary/10 border border-primary/40 backdrop-blur-md transition-transform active:scale-95 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] shrink-0"
            style={{ width: '80px', height: '30px' }}
          >
            {/* Sliding Liquid Glass Pill */}
            <div 
              className={`absolute top-[2px] bottom-[2px] w-[36px] bg-gradient-to-tr from-primary to-primary-light rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-transform duration-300 ease-out`}
              style={{ left: '2px', transform: unit === 'lbs' ? 'translateX(0px)' : 'translateX(40px)' }}
            />
            {/* Labels */}
            <span 
              className={`absolute top-[2px] bottom-[2px] flex items-center justify-center text-[10px] tracking-widest font-black transition-colors duration-300 ${unit === 'lbs' ? 'text-white drop-shadow-md' : 'text-primary/70 hover:text-primary'}`}
              style={{ left: '2px', width: '36px' }}
            >
              LBS
            </span>
            <span 
              className={`absolute top-[2px] bottom-[2px] flex items-center justify-center text-[10px] tracking-widest font-black transition-colors duration-300 ${unit === 'kgs' ? 'text-white drop-shadow-md' : 'text-primary/70 hover:text-primary'}`}
              style={{ left: '42px', width: '36px' }}
            >
              KGS
            </span>
          </button>
          
          {activeWorkout && (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
                <button 
                  onClick={cancelWorkout}
                  className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 backdrop-blur-md shadow-[0_0_12px_rgba(239,68,68,0.15)] text-red-500 px-2 sm:px-4 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-all active:scale-95"
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
                  className="bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 backdrop-blur-md shadow-[0_0_12px_rgba(59,130,246,0.15)] text-primary px-3 sm:px-5 py-1.5 rounded-md font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 sm:gap-2"
                >
                  {isFinishing ? <span className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-primary border-t-transparent rounded-full" /> : null}
                  {isFinishing ? 'Finishing...' : (activeWorkout.exercises.length === 0 ? 'Log Rest Day' : 'Finish')}
                </button>
            </div>
          )}
        </div>

        {/* Workout Summary Overlay */}
        <AnimatePresence>
          {completedWorkout && (
            <WorkoutSummary data={completedWorkout} onClose={() => setCompletedWorkout(null)} unit={unit} />
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main 
        className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-background overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom))] relative"
        onScroll={handleScroll}
      >
        <React.Suspense fallback={<div className="flex h-full items-center justify-center"><div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent"></div></div>}>          <AnimatePresence mode="wait" custom={direction}>
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
                  className="bg-primary/10 text-primary border border-primary/20 backdrop-blur-md hover:bg-primary/20 hover:border-primary/30 transition-all text-lg font-bold py-4 px-12 rounded-xl w-full max-w-xs shadow-[0_0_15px_rgba(59,130,246,0.15)]"
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
        </AnimatePresence>        </React.Suspense>
      </main>

        {/* Floating Pill Navigation */}
        {!activeWorkout && (
          <div 
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-full max-w-sm px-4 flex justify-start">
              <motion.div 
                layout
                initial={false}
                animate={{ 
                  width: isNavVisible ? '100%' : '56px',
                  height: isNavVisible ? '72px' : '56px',
                  opacity: 1
                }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
                className="pointer-events-auto rounded-full backdrop-blur-2xl backdrop-saturate-150 bg-surface/50 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex items-center justify-center origin-left"
              >
          <AnimatePresence mode="wait">
            {isNavVisible ? (
              <motion.div 
                key="full-nav"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex justify-around items-center w-full h-full px-2"
              >
                <button 
                  onClick={() => navigateTab('home')}
                  className={`relative z-10 flex flex-col items-center justify-center h-full w-16 transition-colors ${currentTab === 'home' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
                >
                  <Activity size={22} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
                  <span className="text-[10px] font-bold mt-1">Workout</span>
                </button>
                <button 
                  onClick={() => navigateTab('routines')}
                  className={`relative z-10 flex flex-col items-center justify-center h-full w-16 transition-colors ${currentTab === 'routines' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
                >
                  <ClipboardList size={22} strokeWidth={currentTab === 'routines' ? 2.5 : 2} />
                  <span className="text-[10px] font-bold mt-1">Routines</span>
                </button>
                <button 
                  onClick={() => navigateTab('custom_exercises')}
                  className={`relative z-10 flex flex-col items-center justify-center h-full w-16 transition-colors ${currentTab === 'custom_exercises' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
                >
                  <Database size={22} strokeWidth={currentTab === 'custom_exercises' ? 2.5 : 2} />
                  <span className="text-[10px] font-bold mt-1">Exercises</span>
                </button>
                <button 
                  onClick={() => navigateTab('dashboard')}
                  className={`relative z-10 flex flex-col items-center justify-center h-full w-16 transition-colors ${currentTab === 'dashboard' ? 'text-primary' : 'text-textMuted hover:text-text'}`}
                >
                  <LayoutDashboard size={22} strokeWidth={currentTab === 'dashboard' ? 2.5 : 2} />
                  <span className="text-[10px] font-bold mt-1">Profile</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="min-nav"
                initial={{ opacity: 0, scale: 0 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center cursor-pointer text-primary"
                onClick={() => setIsNavVisible(true)}
              >
                <Menu size={24} strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </div>
      </div>
      )}
    </div>
  );
}
