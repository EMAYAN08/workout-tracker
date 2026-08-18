import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InfoPopover({ title, description, size = 16, className = "", align = "center", color = "primary" }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const alignmentClass = 
    align === 'right' ? 'right-0' : 
    align === 'left' ? 'left-0' : 
    'left-1/2 -translate-x-1/2';

  const colorMap = {
    primary: {
      text: 'text-primary',
      border: 'border-primary/20',
      iconActive: 'text-primary'
    },
    emerald: {
      text: 'text-emerald-500',
      border: 'border-emerald-500/20',
      iconActive: 'text-emerald-500'
    },
    amber: {
      text: 'text-amber-500',
      border: 'border-amber-500/20',
      iconActive: 'text-amber-500'
    }
  };

  const theme = colorMap[color] || colorMap.primary;

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`transition-colors ${isOpen ? theme.iconActive : 'text-textMuted hover:text-text'} ${className}`}
        aria-label="More information"
      >
        <Info size={size} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${alignmentClass} top-full mt-2 w-64 p-4 bg-surface border border-border-strong rounded-2xl shadow-2xl z-50 text-left`}
          >
            <h4 className={`text-sm font-black mb-1.5 ${theme.text}`}>{title}</h4>
            <p className="text-xs text-textMuted font-medium leading-relaxed">
              {description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
