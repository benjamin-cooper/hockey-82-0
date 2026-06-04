'use client';
import { useEffect, useRef, useState } from 'react';
import { Position, POSITION_LABELS } from '@/types';

interface SpinCombo { abbr: string; decade: string; }

interface Props {
  position: Position;
  franchiseAbbr: string;
  city: string;
  decade: string;
  spinCombos: SpinCombo[];
  onDone: () => void;
}

export default function SlotMachine({ position, franchiseAbbr, city, decade, spinCombos, onDone }: Props) {
  const [displayAbbr, setDisplayAbbr]     = useState(spinCombos[0]?.abbr   ?? franchiseAbbr);
  const [displayDecade, setDisplayDecade] = useState(spinCombos[0]?.decade  ?? decade);
  const [spinning, setSpinning]           = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSpinning(true);
    const combos = spinCombos.length > 0 ? spinCombos : [{ abbr: franchiseAbbr, decade }];

    let tick = 0;
    const totalTicks = 28; // 2.8s at 100ms

    intervalRef.current = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;

      if (progress > 0.75) {
        // Lock franchise first, keep only the valid decades for that franchise spinning
        const validDecades = combos
          .filter(c => c.abbr === franchiseAbbr)
          .map(c => c.decade);
        const pool = validDecades.length > 0 ? validDecades : [decade];
        setDisplayAbbr(franchiseAbbr);
        setDisplayDecade(pool[Math.floor(Math.random() * pool.length)]);
      } else {
        // Show random valid pairs from the real dataset
        const c = combos[Math.floor(Math.random() * combos.length)];
        setDisplayAbbr(c.abbr);
        setDisplayDecade(c.decade);
      }

      if (tick >= totalTicks) {
        clearInterval(intervalRef.current!);
        setDisplayAbbr(franchiseAbbr);
        setDisplayDecade(decade);
        setSpinning(false);
        setTimeout(onDone, 400);
      }
    }, 100);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [franchiseAbbr, decade, spinCombos, onDone]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-slate-400 text-sm font-medium uppercase tracking-widest">
        Round {(['C','LW','RW','LD','RD','G'] as Position[]).indexOf(position) + 1} · {POSITION_LABELS[position]}
      </div>

      <div className="flex items-center gap-6">
        {/* Franchise reel */}
        <div className={`
          bg-slate-800 border rounded-2xl px-8 py-5 min-w-[160px] text-center transition-all duration-150
          ${spinning ? 'border-slate-600' : 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
        `}>
          <div className={`text-4xl font-black text-white tracking-tight transition-all ${spinning ? 'blur-[1px]' : ''}`}>
            {displayAbbr}
          </div>
          {!spinning && (
            <div className="text-slate-400 text-xs mt-1">{city}</div>
          )}
        </div>

        <div className="text-slate-500 text-2xl font-light">·</div>

        {/* Decade reel */}
        <div className={`
          bg-slate-800 border rounded-2xl px-8 py-5 min-w-[120px] text-center transition-all duration-150
          ${spinning ? 'border-slate-600' : 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}
        `}>
          <div className={`text-4xl font-black text-white tracking-tight transition-all ${spinning ? 'blur-[1px]' : ''}`}>
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
