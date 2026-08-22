import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Weight, Flame, X, Share2, Dumbbell, BatteryCharging, Coffee, Moon } from 'lucide-react';
import { convertWeight } from '../../utils/calculations';
import { toPng } from 'html-to-image';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutSummary({ data, onClose, unit }) {
  const cardRef = useRef(null);

  if (!data) return null;

  const exercises = data.exercises || [];
  const isRest = exercises.length === 0;

  // Calculate volume
  let totalVolume = 0;
  let totalSets = 0;
  
  // First pass: count completed sets
  exercises.forEach(ex => {
    if (ex.sets) {
      ex.sets.forEach(s => {
        if (s.completedAt && s.type !== 'Warmup') {
          totalSets++;
          totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      });
    }
  });

  // If they forgot to check anything, just count all sets
  const forgotToCheck = totalSets === 0 && exercises.some(ex => ex.sets?.length > 0);
  if (forgotToCheck) {
    exercises.forEach(ex => {
      if (ex.sets) {
        ex.sets.forEach(s => {
          if (s.type !== 'Warmup') {
            totalSets++;
            totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
          }
        });
      }
    });
  }

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const image = await toPng(cardRef.current, {
        backgroundColor: '#0a0a0a',
        pixelRatio: 2
      });
      
      // If mobile with Web Share API
      if (navigator.share) {
        const blob = await (await fetch(image)).blob();
        const file = new File([blob], 'workout.png', { type: 'image/png' });
        await navigator.share({
          title: 'TrackIt Workout',
          text: `Just crushed my ${data.routineName} workout!`,
          files: [file]
        });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = `trackit-workout-${Date.now()}.png`;
        link.href = image;
        link.click();
      }
    } catch (err) {
      console.error('Failed to share:', err);
      alert('Could not share the image.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto overflow-x-hidden flex flex-col items-center p-4 py-16">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col gap-4 relative my-auto shrink-0"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-textMuted hover:text-white bg-surface-light/50 backdrop-blur-md rounded-full z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div 
          ref={cardRef} 
          className="bg-surface/90 backdrop-blur-xl border border-border/50 rounded-[24px] p-6 shadow-[0_0_40px_rgba(59,130,246,0.1)] flex flex-col gap-6 relative overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
          <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none -ml-20 -mb-20 ${isRest ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`} />

          {/* Header */}
          <div className="z-10 flex flex-col items-center gap-3 text-center mt-2">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-1 border backdrop-blur-md transform rotate-3 ${isRest ? 'from-blue-400/20 to-indigo-600/20 text-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.2)] border-blue-500/20' : 'from-emerald-400/20 to-emerald-600/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] border-emerald-500/20'}`}>
              {isRest ? <BatteryCharging size={32} strokeWidth={2.5} className="transform -rotate-3" /> : <CheckCircle size={32} strokeWidth={2.5} className="transform -rotate-3" />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-text tracking-tight uppercase">
                {isRest ? 'Rest Day Logged' : 'Workout Complete'}
              </h1>
              <p className="text-primary font-bold text-xs tracking-[0.2em] uppercase mt-1 opacity-80">{data.routineName}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="z-10 grid grid-cols-3 gap-3 w-full mt-2">
            <div className="flex flex-col items-center justify-center bg-surface-light/40 border border-border/30 rounded-2xl p-3 backdrop-blur-sm">
              <Clock size={18} className="text-textMuted mb-1.5" />
              <span className="text-text font-black font-mono text-lg leading-none">{formatTime(data.duration)}</span>
              <span className="text-[9px] uppercase tracking-widest text-textMuted font-bold mt-1">Time</span>
            </div>
            {!isRest ? (
              <>
                <div className="flex flex-col items-center justify-center bg-surface-light/40 border border-border/30 rounded-2xl p-3 backdrop-blur-sm">
                  <Flame size={18} className="text-amber-500 mb-1.5" />
                  <span className="text-text font-black font-mono text-lg leading-none">{totalSets}</span>
                  <span className="text-[9px] uppercase tracking-widest text-textMuted font-bold mt-1">Sets</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-surface-light/40 border border-border/30 rounded-2xl p-3 backdrop-blur-sm">
                  <Weight size={18} className="text-primary mb-1.5" />
                  <span className="text-text font-black font-mono text-lg leading-none truncate w-full text-center">{convertWeight(totalVolume, data.unitSaved, unit)}</span>
                  <span className="text-[9px] uppercase tracking-widest text-textMuted font-bold mt-1">Volume</span>
                </div>
              </>
            ) : (
               <div className="col-span-2 flex flex-row items-center justify-center gap-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 backdrop-blur-sm text-blue-400">
      <Coffee size={18} className="animate-bounce" style={{ animationDuration: '3s' }} />
      <span className="font-black text-sm uppercase tracking-wider">Rest & Recover</span>
      <Moon size={18} className="animate-pulse" />
   </div>
            )}
          </div>

          {/* Targeted Muscles */}
            {!isRest && (
              <div className="z-10 w-full flex flex-col gap-2 mt-2">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-textMuted font-bold text-left mb-1 px-1">Targeted Muscles</h3>
                <div className="flex flex-wrap gap-2 px-1">
                  {[...new Set(exercises.map(ex => ex.muscleGroup).filter(Boolean))].map(muscle => (
                    <span key={muscle} className="px-3 py-1.5 rounded-xl bg-surface-light/60 border border-border/30 text-xs font-bold text-text/90 capitalize backdrop-blur-sm shadow-sm">
                      {muscle}
                    </span>
                  ))}
                  {[...new Set(exercises.map(ex => ex.muscleGroup).filter(Boolean))].length === 0 && (
                    <span className="text-sm text-textMuted italic">No muscles targeted</span>
                  )}
                </div>
              </div>
            )}

          {/* Footer watermark */}
          <div className="z-10 w-full pt-4 mt-2 border-t border-border/20 flex justify-between items-center">
            <div className="flex items-center gap-1.5 opacity-60">
              <Dumbbell size={14} className="text-text" />
              <span className="font-black tracking-tighter text-text uppercase text-xs">TrackIt</span>
            </div>
            <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Action Buttons (Not shared in the image) */}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-surface hover:bg-surface-light border border-border/50 text-text font-bold py-3.5 rounded-2xl transition-colors active:scale-95 text-sm"
          >
            Close
          </button>
          <button
            onClick={handleShare}
            className="flex-[2] bg-primary hover:bg-primary-light text-white font-black py-3.5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Share2 size={16} /> Share Card
          </button>
        </div>
      </motion.div>
    </div>
  );
}
