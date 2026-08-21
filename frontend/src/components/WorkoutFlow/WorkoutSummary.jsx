import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Weight, Flame, X, Share2, Dumbbell } from 'lucide-react';
import { convertWeight } from '../../utils/calculations';
import html2canvas from 'html2canvas';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutSummary({ data, onClose, unit }) {
  const cardRef = useRef(null);

  if (!data) return null;

  const isRest = data.exercises.length === 0;

  // Calculate volume
  let totalVolume = 0;
  let totalSets = 0;
  data.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.completed && s.type !== 'Warmup') {
        totalSets++;
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }
    });
  });

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true
      });
      const image = canvas.toDataURL('image/png');
      
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
    <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col gap-6 relative"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-textMuted hover:text-text bg-surface-light rounded-full z-10"
        >
          <X size={20} />
        </button>

        <div 
          ref={cardRef} 
          className="bg-surface border border-border/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col items-center gap-6 relative overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none -ml-20 -mb-20" />

          <div className="z-10 flex flex-col items-center gap-2 text-center mt-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {isRest ? <span className="text-3xl">???</span> : <CheckCircle size={32} strokeWidth={2.5} />}
            </div>
            <h1 className="text-2xl font-black text-text tracking-tight uppercase">
              {isRest ? 'Rest Day Logged' : 'Workout Complete'}
            </h1>
            <p className="text-primary font-bold text-sm tracking-widest uppercase">{data.routineName}</p>
          </div>

          <div className="z-10 flex w-full justify-around bg-surface-light/50 p-4 rounded-2xl border border-border/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-1">
              <Clock size={16} className="text-textMuted" />
              <span className="text-text font-bold font-mono">{formatTime(data.duration)}</span>
              <span className="text-[10px] uppercase tracking-wider text-textMuted font-bold">Time</span>
            </div>
            {!isRest && (
              <>
                <div className="w-px bg-border/50" />
                <div className="flex flex-col items-center gap-1">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-text font-bold font-mono">{totalSets}</span>
                  <span className="text-[10px] uppercase tracking-wider text-textMuted font-bold">Sets</span>
                </div>
                <div className="w-px bg-border/50" />
                <div className="flex flex-col items-center gap-1">
                  <Weight size={16} className="text-primary" />
                  <span className="text-text font-bold font-mono">{convertWeight(totalVolume, data.unitSaved, unit)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-textMuted font-bold">Volume</span>
                </div>
              </>
            )}
          </div>

          {!isRest && (
            <div className="z-10 w-full flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-widest text-textMuted font-bold text-left mb-1">Exercises</h3>
              {data.exercises.map(ex => {
                const exSets = ex.sets.filter(s => s.completed && s.type !== 'Warmup').length;
                if (exSets === 0) return null;
                return (
                  <div key={ex.id} className="flex justify-between items-center bg-surface-light/30 px-3 py-2 rounded-xl text-sm border border-border/10">
                    <span className="font-semibold text-text truncate max-w-[70%] capitalize">{ex.name}</span>
                    <span className="text-primary font-bold text-xs">{exSets} Sets</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="z-10 w-full pt-4 border-t border-border/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-textMuted" />
              <span className="font-black tracking-tighter text-textMuted uppercase text-sm">TrackIt</span>
            </div>
            <span className="text-xs text-textMuted font-bold">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={onClose}
            className="flex-1 bg-surface-light hover:bg-surface border border-border/30 text-text font-bold py-3.5 rounded-2xl transition-colors active:scale-95 text-sm"
          >
            Close
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share Card
          </button>
        </div>
      </motion.div>
    </div>
  );
}
