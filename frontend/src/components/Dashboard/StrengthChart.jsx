import React, { useState, useMemo } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { RefreshCw, Activity, Dumbbell, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, subMonths, subYears, isAfter } from 'date-fns';
import { calculateVolume, convertWeight } from '../../utils/calculations';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'chest', label: 'Chest', color: '#34d399' },    // Top
  { id: 'back', label: 'Back', color: '#22d3ee' },      // Top Right
  { id: 'legs', label: 'Legs', color: '#38bdf8' },      // Bottom Right
  { id: 'shoulders', label: 'Shoulders', color: '#a3e635' }, // Bottom
  { id: 'core', label: 'Core', color: '#fbbf24' },      // Bottom Left
  { id: 'arms', label: 'Arms', color: '#2dd4bf' }       // Top Left
];

const mapMuscleGroup = (rawGroup) => {
  const g = (rawGroup || '').toLowerCase();
  if (g.includes('chest')) return 'chest';
  if (g.includes('back')) return 'back';
  if (g.includes('leg') || g.includes('calf') || g.includes('glute')) return 'legs';
  if (g.includes('shoulder') || g.includes('deltoid')) return 'shoulders';
  if (g.includes('waist') || g.includes('core') || g.includes('abs')) return 'core';
  if (g.includes('arm') || g.includes('bicep') || g.includes('tricep') || g.includes('forearm')) return 'arms';
  return null;
};

function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", start.x, start.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");

  return d;
}

export default function StrengthChart() {
  const { workoutHistory, unit, theme } = useWorkout();
  const [metric, setMetric] = useState('volume');
  const [timeRange, setTimeRange] = useState('3m');
  const [isMetricOpen, setIsMetricOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const timeOptions = [
    { id: '3m', label: 'Last 3 Months' },
    { id: '6m', label: 'Last 6 Months' },
    { id: '1y', label: 'Last 1 Year' },
    { id: 'lifetime', label: 'Lifetime' }
  ];

  const metricOptions = [
    { id: 'frequency', label: 'Workout Frequency', icon: RefreshCw },
    { id: 'load', label: 'Muscular Load', icon: Dumbbell },
    { id: 'volume', label: 'Total Volume', icon: Activity }
  ];

  const stats = useMemo(() => {
    const data = {
      chest: { volume: 0, frequency: new Set(), load: 0 },
      back: { volume: 0, frequency: new Set(), load: 0 },
      legs: { volume: 0, frequency: new Set(), load: 0 },
      shoulders: { volume: 0, frequency: new Set(), load: 0 },
      core: { volume: 0, frequency: new Set(), load: 0 },
      arms: { volume: 0, frequency: new Set(), load: 0 },
    };

    if (!workoutHistory) return data;

    const now = new Date();
    let cutoffDate = null;
    if (timeRange === '3m') cutoffDate = subMonths(now, 3);
    if (timeRange === '6m') cutoffDate = subMonths(now, 6);
    if (timeRange === '1y') cutoffDate = subYears(now, 1);

    const filteredHistory = cutoffDate 
      ? workoutHistory.filter(wk => {
          const t = wk.timestamp || wk.startTime;
          return t ? isAfter(new Date(t), cutoffDate) : false;
        })
      : workoutHistory;

    let totalGlobalVolume = 0;

    filteredHistory.forEach(wk => {
      wk.exercises?.forEach(ex => {
        const cat = mapMuscleGroup(ex.muscleGroup);
        if (cat && data[cat]) {
          const vol = calculateVolume(ex.sets);
          const standardVol = wk.unitSaved === 'kgs' ? convertWeight(vol, 'kgs', 'lbs') : vol;
          data[cat].volume += standardVol;
          totalGlobalVolume += standardVol;
          data[cat].frequency.add(wk.id);
        }
      });
    });

    Object.keys(data).forEach(cat => {
      data[cat].load = totalGlobalVolume > 0 
        ? Math.round((data[cat].volume / totalGlobalVolume) * 100) 
        : 0;
    });

    return data;
  }, [workoutHistory, timeRange]);

  const maxValues = useMemo(() => {
    return {
      volume: Math.max(...Object.values(stats).map(d => d.volume), 0),
      frequency: Math.max(...Object.values(stats).map(d => d.frequency.size), 0),
      load: Math.max(...Object.values(stats).map(d => d.load), 0)
    };
  }, [stats]);

  const chartValues = useMemo(() => {
    return CATEGORIES.map((cat, index) => {
      let rawVal = 0;
      let displayStr = '';
      
      if (metric === 'volume') {
        rawVal = stats[cat.id].volume;
        const converted = convertWeight(rawVal, 'lbs', unit);
        if (converted > 1000) {
          displayStr = `${(converted / 1000).toFixed(2)}K ${unit}`;
        } else {
          displayStr = `${converted} ${unit}`;
        }
      } else if (metric === 'frequency') {
        rawVal = stats[cat.id].frequency.size;
        displayStr = `${rawVal} session${rawVal !== 1 ? 's' : ''}`;
      } else if (metric === 'load') {
        rawVal = stats[cat.id].load;
        displayStr = `${rawVal}%`;
      }

      const max = maxValues[metric];
      let level = 0;
      if (max > 0) {
        level = Math.round((rawVal / max) * 5);
        if (level === 0 && rawVal > 0) level = 1;
        if (level > 5) level = 5;
      }

      return { ...cat, value: rawVal, displayStr, level, index };
    });
  }, [stats, metric, unit, maxValues]);

  const currentMetricObj = metricOptions.find(m => m.id === metric);
  const currentTimeObj = timeOptions.find(t => t.id === timeRange);
  const Icon = currentMetricObj.icon;

  // Chart Dimensions
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 100;
  const innerHole = 22;
  const ringWidth = (maxRadius - innerHole) / 5;

  return (
    <div className="flex flex-col w-full pb-2">
      <div className="mt-4 mb-2 px-2">
        <h2 className="text-lg font-black text-text tracking-tight">Strength</h2>
      </div>

      <div className="panel p-4 sm:p-6 flex flex-col relative overflow-visible bg-[#21232c] border border-border-strong/50 shadow-2xl">
        
        {/* Dropdown Headers - Flex Row for Top Right Positioning */}
        <div className="flex flex-row items-center justify-between relative z-20 mb-10 w-full">
          
          {/* Metric Dropdown (Left) */}
          <div className="relative">
            <button 
              onClick={() => { setIsMetricOpen(!isMetricOpen); setIsTimeOpen(false); }}
              className="flex items-center gap-1.5 text-text font-bold text-base sm:text-lg hover:text-primary transition-colors"
            >
              <Icon size={18} className="text-textMuted hidden sm:block" strokeWidth={2.5} />
              {currentMetricObj.label}
              <ChevronDown size={16} className={`text-textMuted transition-transform ${isMetricOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isMetricOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMetricOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 top-full mt-2 w-52 bg-surface border border-border-strong rounded-xl shadow-2xl z-40 overflow-hidden flex flex-col py-1"
                  >
                    {metricOptions.map(opt => (
                      <button key={opt.id} onClick={() => { setMetric(opt.id); setIsMetricOpen(false); }}
                        className={`text-left px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between ${metric === opt.id ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-light'}`}
                      >
                        {opt.label} {metric === opt.id && <span className="text-primary">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Time Range Dropdown (Right) */}
          <div className="relative">
            <button 
              onClick={() => { setIsTimeOpen(!isTimeOpen); setIsMetricOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light rounded-lg border border-border-strong text-xs font-bold text-text hover:border-primary/50 transition-colors"
            >
              <CalendarIcon size={14} className="text-primary" />
              {currentTimeObj.label}
              <ChevronDown size={14} className={`transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isTimeOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsTimeOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border-strong rounded-xl shadow-2xl z-40 overflow-hidden flex flex-col py-1"
                  >
                    {timeOptions.map(opt => (
                      <button key={opt.id} onClick={() => { setTimeRange(opt.id); setIsTimeOpen(false); }}
                        className={`text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${timeRange === opt.id ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-light'}`}
                      >
                        {opt.label} {timeRange === opt.id && <span className="text-primary">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Chart Container - Increased height to prevent bottom label clipping */}
        <div className="relative w-full flex justify-center items-center h-[320px] sm:h-[360px] pb-6 sm:pb-0">
          <svg width="100%" height="100%" viewBox="0 0 400 400" className="overflow-visible z-0 drop-shadow-lg max-w-[450px]">
            <defs>
              {CATEGORIES.map(cat => (
                <radialGradient 
                  key={`grad-${cat.id}`} 
                  id={`grad-${cat.id}`} 
                  cx={200} cy={200} r={115} 
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="20%" stopColor={cat.color} stopOpacity="0.4" />
                  <stop offset="70%" stopColor={cat.color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={cat.color} stopOpacity="1" />
                </radialGradient>
              ))}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {chartValues.map((cat, i) => {
              const angleSpan = 360 / 6;
              const centerAngle = i * angleSpan; 
              const startAngle = centerAngle - (angleSpan / 2);
              const endAngle = centerAngle + (angleSpan / 2);

              const emptyRingFill = theme === 'light' ? '#f1f5f9' : '#161921';
              const ringStroke = theme === 'light' ? '#e2e8f0' : '#222631';

              return (
                <g key={cat.id}>
                  {[...Array(5)].map((_, ringIndex) => {
                    const rLevel = ringIndex + 1;
                    const iRadius = 25 + (ringIndex * 18); // innerHole = 25, ringWidth = 18
                    const oRadius = iRadius + 18;
                    
                    const isFilled = rLevel <= cat.level;
                    const fill = isFilled ? `url(#grad-${cat.id})` : emptyRingFill; 
                    
                    return (
                      <path
                        key={ringIndex}
                        d={describeArc(200, 200, iRadius, oRadius, startAngle, endAngle)}
                        fill={fill}
                        stroke={ringStroke}
                        strokeWidth="2.5"
                        filter={isFilled && rLevel === cat.level ? "url(#glow)" : ""}
                        className="transition-all duration-700 ease-out"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* SVG Labels */}
            {chartValues.map((cat, i) => {
              const angleSpan = 360 / 6;
              const centerAngle = i * angleSpan;
              const textRadius = 155; // 115 max radius + 40 padding
              const angleInRads = (centerAngle - 90) * (Math.PI / 180);
              const tx = 200 + Math.cos(angleInRads) * textRadius;
              const ty = 200 + Math.sin(angleInRads) * textRadius;

              // Determine text anchor based on angle to prevent clipping
              let textAnchor = "middle";
              if (Math.abs(centerAngle) % 180 !== 0) {
                 if (centerAngle < 180 && centerAngle > 0) textAnchor = "start"; // Right side
                 if (centerAngle > 180) textAnchor = "end"; // Left side
              }
              // Adjust tx slightly to add padding from the graph if anchored
              const adjustedTx = textAnchor === "start" ? tx + 5 : textAnchor === "end" ? tx - 5 : tx;

              return (
                <text 
                  key={`label-${cat.id}`} 
                  x={adjustedTx} 
                  y={ty} 
                  textAnchor={textAnchor} 
                  dominantBaseline="middle"
                  className="pointer-events-none drop-shadow-md"
                >
                  <tspan 
                    x={adjustedTx} 
                    dy="-0.5em" 
                    fill={cat.level > 0 ? cat.color : (theme === 'light' ? '#94a3b8' : '#71717a')} 
                    fontSize="15" 
                    fontWeight="800"
                  >
                    {cat.displayStr}
                  </tspan>
                  <tspan 
                    x={adjustedTx} 
                    dy="1.4em" 
                    fill={theme === 'light' ? '#64748b' : '#f8fafc'} 
                    fontSize="13" 
                    fontWeight="700" 
                    textTransform="capitalize"
                  >
                    {cat.label}
                  </tspan>
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
