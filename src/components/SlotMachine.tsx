'use client';
import { useEffect, useRef, useState } from 'react';
import { Position, POSITION_LABELS } from '@/types';
import { FRANCHISES } from '@/lib/franchises';

interface Props {
  position: Position;
  franchiseAbbr: string;
  city: string;
  decade: string;
  onDone: () => void;
}

const DECADES = ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'];
const ALL_ABBRS = FRANCHISES.map(f => f.abbr);

export default function SlotMachine({ position, franchiseAbbr, city, decade, onDone }: Props) {
  const [displayAbbr, setDisplayAbbr] = useState(ALL_ABBRS[0]);
  const [displayDecade, setDisplayDecade] = useState(DECADES[0]);
  const [spinning, setSpinning] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setSpinning(true);

    let tick = 0;
    const totalTicks = 28; // ~2.8s at 100ms intervals
    const spinDuration = 2800;

    intervalRef.current = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;

      // Slow down near end
      if (progress > 0.75) {
        // Lock franchise first, keep decade spinning
        setDisplayAbbr(franchiseAbbr);
        setDisplayDecade(DECADES[Math.floor(Math.random() * DECADES.length)]);
      } else {
        setDisplayAbbr(ALL_ABBRS[Math.floor(Math.random() * ALL_ABBRS.length)]);
        setDisplayDecade(DECADES[Math.floor(Math.random() * DECADES.length)]);
      }

      if (tick >= totalTicks) {
        clearInterval(intervalRef.current!);
        setDisplayAbbr(franchiseAbbr);
        setDisplayDecade(decade);
        setSpinning(false);
        setTimeout(onDone, 400);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [franchiseAbbr, decade, onDone]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-slate-400 text-sm font-medium uppercase tracking-widest">
        Round {['C','LW','RW','LD','RD','G'].indexOf(position) + 1} · {POSITION_LABELS[position]}
      </div>

      <div className="flex items-center gap-6">
        {/* Franchise reel */}
        <div className={`
          bg-slate-800 border border-slate-600 rounded-2xl px-8 py-5 min-w-[160px] text-center
          transition-all duration-150
          ${spinning ? 'border-blue-500/50' : 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
        `}>
          <div className={`text-4xl font-black text-white tracking-tight ${spinning ? 'blur-[1px]' : ''}`}>
            {displayAbbr}
          </div>
          {!spinning && (
            <div className="text-slate-400 text-xs mt-1">{city}</div>
          )}
        </div>

        <div className="text-slate-500 text-2xl font-light">·</div>

        {/* Decade reel */}
        <div className={`
          bg-slate-800 border border-slate-600 rounded-2xl px-8 py-5 min-w-[120px] text-center
          transition-all duration-150
          ${spinning ? 'border-blue-500/50' : 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
        `}>
          <div className={`text-4xl font-black text-white tracking-tight ${spinning ? 'blur-[1px]' : ''}`}>
            {displayDecade}
          </div>
        </div>
      </div>

      {spinning && (
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
