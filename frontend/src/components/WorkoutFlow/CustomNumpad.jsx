import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Delete, ArrowRight } from 'lucide-react';

export default function CustomNumpad({ activeInput, onClose, onUpdate, value }) {
  if (!activeInput) return null;

  const handleKeyPress = (key) => {
    let currentVal = String(value || '');
    if (key === 'delete') {
      onUpdate(currentVal.slice(0, -1));
    } else if (key === '.') {
      if (!currentVal.includes('.')) {
        onUpdate(currentVal + (currentVal.length === 0 ? '0.' : '.'));
      }
    } else if (key === '+' || key === '-') {
      let num = parseFloat(currentVal) || 0;
      const step = activeInput.field === 'weight' ? 2.5 : 1;
      if (key === '+') num += step;
      if (key === '-') num = Math.max(0, num - step);
      // clean up decimals
      onUpdate(String(Math.round(num * 100) / 100));
    } else {
      if (currentVal === '0' && key !== '.') {
        onUpdate(key);
      } else {
        onUpdate(currentVal + key);
      }
    }
  };

  const tabs = [
    { id: 'reps', label: 'Reps' },
    { id: 'weight', label: 'Weight' }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-[#1c1c1e] border-t border-white/10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 mb-2 relative">
          <div className="flex-1 flex justify-center gap-8">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`text-lg font-bold px-4 py-1 rounded-full cursor-pointer transition-colors flex items-center gap-2 ${activeInput.field === tab.id ? 'text-white' : 'text-gray-500'}`}
                onClick={() => activeInput.onChangeField(tab.id)}
              >
                {tab.label} {activeInput.field === tab.id ? <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs">✓</div> : <div className="w-5 h-5 rounded-full border border-gray-500" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 grid grid-cols-4 gap-2 bg-[#1c1c1e]">
          {/* Row 1 */}
          <button onClick={() => handleKeyPress('1')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">1</button>
          <button onClick={() => handleKeyPress('2')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">2</button>
          <button onClick={() => handleKeyPress('3')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">3</button>
          <button onClick={onClose} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14"><ChevronDown size={28} /></button>

          {/* Row 2 */}
          <button onClick={() => handleKeyPress('4')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">4</button>
          <button onClick={() => handleKeyPress('5')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">5</button>
          <button onClick={() => handleKeyPress('6')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">6</button>
          <div className="flex rounded-xl overflow-hidden shadow-sm h-14">
            <button onClick={() => handleKeyPress('-')} className="flex-1 flex items-center justify-center font-mono text-2xl font-normal transition-colors active:scale-95 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white border-r border-[#1c1c1e]">-</button>
            <button onClick={() => handleKeyPress('+')} className="flex-1 flex items-center justify-center font-mono text-2xl font-normal transition-colors active:scale-95 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white">+</button>
          </div>

          {/* Row 3 */}
          <button onClick={() => handleKeyPress('7')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">7</button>
          <button onClick={() => handleKeyPress('8')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">8</button>
          <button onClick={() => handleKeyPress('9')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">9</button>
          <button onClick={() => activeInput.onNext()} className="row-span-2 h-full flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-white hover:bg-gray-200 text-black"><ArrowRight size={28} strokeWidth={3} /></button>

          {/* Row 4 */}
          <button onClick={() => handleKeyPress('.')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">.</button>
          <button onClick={() => handleKeyPress('0')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14">0</button>
          <button onClick={() => handleKeyPress('delete')} className="flex items-center justify-center rounded-xl font-mono text-3xl font-normal transition-colors active:scale-95 shadow-sm bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white h-14"><Delete size={24} /></button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
