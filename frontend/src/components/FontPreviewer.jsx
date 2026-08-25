import React, { useState, useEffect } from 'react';
import { Type, Check, X } from 'lucide-react';

export default function FontPreviewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFont, setActiveFont] = useState('Outfit');

  const fonts = [
    { name: 'Outfit', family: "'Outfit', sans-serif", desc: 'Current Default: Geometric, modern, sporty.' },
    { name: 'System Default', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", desc: 'Used by Fitbod. Ultra-native, high performance, flawless legibility.' },
    { name: 'Jost', family: "'Jost', sans-serif", desc: 'Inspired by Futura (used by Peloton). Sharp, energetic, elegant.' },
    { name: 'Barlow', family: "'Barlow', sans-serif", desc: 'Technical and slightly condensed. Used heavily in sports/stats apps.' },
    { name: 'Teko', family: "'Teko', sans-serif", desc: 'Aggressive, tall display font. Gives off a heavy lifting/CrossFit vibe.' },
    { name: 'Kanit', family: "'Kanit', sans-serif", desc: 'Very trendy, dynamic, and thick. Great for high-intensity apps.' }
  ];

  useEffect(() => {
    document.body.style.fontFamily = fonts.find(f => f.name === activeFont).family;
  }, [activeFont]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[100] w-12 h-12 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center text-white transition-transform active:scale-95"
      >
        <Type size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[101] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-8">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-light text-textMuted hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-black text-text mb-4">Font Previewer</h2>
            
            <div className="flex flex-col gap-3 h-[60vh] overflow-y-auto scrollbar-none pb-4">
              {fonts.map(font => (
                <button
                  key={font.name}
                  onClick={() => setActiveFont(font.name)}
                  style={{ fontFamily: font.family }}
                  className={`flex flex-col items-start w-full p-4 rounded-xl border text-left transition-colors shrink-0 ${activeFont === font.name ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-light border-border/50 text-text hover:border-textMuted'}`}
                >
                  <div className="flex justify-between w-full items-center mb-1">
                    <span className="text-lg font-bold">{font.name}</span>
                    {activeFont === font.name && <Check size={18} />}
                  </div>
                  <span className={`text-sm ${activeFont === font.name ? 'text-primary/70' : 'text-textMuted'}`}>{font.desc}</span>
                  
                  <div className="mt-3 flex gap-4 text-xs w-full">
                    <div className="flex flex-col">
                      <span className="opacity-50 font-bold uppercase tracking-wider">Weight</span>
                      <span className="text-base font-bold">135 lbs</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="opacity-50 font-bold uppercase tracking-wider">Score</span>
                      <span className="text-base font-bold">94%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <p className="text-xs text-textMuted mt-4 text-center">Select a font to instantly preview it across the entire app. Let me know which one you choose!</p>
          </div>
        </div>
      )}
    </>
  );
}
