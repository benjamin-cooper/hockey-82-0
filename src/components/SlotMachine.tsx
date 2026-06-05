'use client';
import { useEffect, useRef, useState } from 'react';
import { FRANCHISE_MAP } from '@/lib/franchises';

interface SpinCombo { abbr: string; decade: string; }

interface Props {
  franchiseAbbr: string;
  city: string;
  decade: string;
  spinCombos: SpinCombo[];
  onDone: () => void;
}

export default function SlotMachine({ franchiseAbbr, city, decade, spinCombos, onDone }: Props) {
  const [displayAbbr,   setDisplayAbbr]   = useState(spinCombos[0]?.abbr   ?? franchiseAbbr);
  const [displayDecade, setDisplayDecade] = useState(spinCombos[0]?.decade ?? decade);
  const [spinning,      setSpinning]      = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Resolved team color for the final franchise
  const teamColor = FRANCHISE_MAP.get(franchiseAbbr)?.color ?? '#4a9eff';

  useEffect(() => {
    setSpinning(true);
    const combos = spinCombos.length > 0 ? spinCombos : [{ abbr: franchiseAbbr, decade }];
    let tick = 0;
    const totalTicks = 28;

    intervalRef.current = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;

      if (progress > 0.75) {
        const validDecades = combos.filter(c => c.abbr === franchiseAbbr).map(c => c.decade);
        const pool = validDecades.length > 0 ? validDecades : [decade];
        setDisplayAbbr(franchiseAbbr);
        setDisplayDecade(pool[Math.floor(Math.random() * pool.length)]);
      } else {
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
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="text-slate-300 text-xs font-medium uppercase tracking-widest">
        Spinning…
      </div>

      <div className="flex items-center gap-4">
        {/* Franchise reel */}
        <div
          className="bg-slate-700/60 rounded-2xl px-6 py-4 min-w-[130px] text-center transition-all duration-300"
          style={{
            border: `2px solid ${spinning ? 'rgba(255,255,255,0.18)' : teamColor}`,
            boxShadow: spinning ? 'none' : `0 0 24px ${teamColor}55`,
          }}
        >
          <div className={`text-3xl font-black tracking-tight transition-all duration-150 ${spinning ? 'text-slate-300 blur-[1.5px]' : 'text-white'}`}>
            {displayAbbr}
          </div>
          {!spinning && (
            <div className="text-xs mt-1 font-medium" style={{ color: teamColor }}>
              {city}
            </div>
          )}
        </div>

        <div className="text-slate-400 text-xl font-light">·</div>

        {/* Decade reel */}
        <div
          className="bg-slate-700/60 rounded-2xl px-6 py-4 min-w-[100px] text-center transition-all duration-300"
          style={{
            border: `2px solid ${spinning ? 'rgba(255,255,255,0.18)' : teamColor}`,
            boxShadow: spinning ? 'none' : `0 0 24px ${teamColor}55`,
          }}
        >
          <div className={`text-3xl font-black tracking-tight transition-all duration-150 ${spinning ? 'text-slate-300 blur-[1.5px]' : 'text-white'}`}>
            {displayDecade}
          </div>
        </div>
      </div>

      {spinning && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: teamColor, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
