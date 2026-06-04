'use client';
import { Position, DraftedPlayer } from '@/types';
import { FRANCHISE_MAP } from '@/lib/franchises';

interface SlotState {
  filled?: DraftedPlayer;
  eligible: boolean; // can the current player go here?
}

interface Props {
  roster: Partial<Record<Position, DraftedPlayer>>;
  eligibleSlots: Position[];
  teamColor: string;
  onPlace: (pos: Position) => void;
}

// Rink spatial layout — forwards up top, D in middle, G at net
const RINK_LAYOUT: { pos: Position; label: string; col: number; row: number }[] = [
  { pos: 'LW', label: 'Left Wing',    col: 1, row: 1 },
  { pos: 'C',  label: 'Center',       col: 2, row: 1 },
  { pos: 'RW', label: 'Right Wing',   col: 3, row: 1 },
  { pos: 'LD', label: 'Left D',       col: 1, row: 2 },
  { pos: 'RD', label: 'Right D',      col: 3, row: 2 },
  { pos: 'G',  label: 'Goalie',       col: 2, row: 3 },
];

export default function RinkLayout({ roster, eligibleSlots, teamColor, onPlace }: Props) {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Ice rink outline */}
      <div
        className="relative rounded-3xl border border-slate-700/60 bg-slate-900/60 px-4 py-6"
        style={{ background: 'linear-gradient(180deg, rgba(15,25,40,0.95) 0%, rgba(10,18,30,0.95) 100%)' }}
      >
        {/* Rink lines */}
        <div className="absolute inset-x-6 top-[38%] h-px bg-blue-900/40" />
        <div className="absolute inset-x-6 top-[66%] h-px bg-red-900/40" />

        {/* Grid of slots */}
        <div className="grid grid-cols-3 gap-3">
          {RINK_LAYOUT.map(({ pos, label, col, row }) => {
            const player    = roster[pos];
            const isEligible = eligibleSlots.includes(pos);

            if (row === 2 && col === 2) {
              // Center gap between LD/RD — render spacer
              return <div key="gap" />;
            }

            // For the G row, pad left and right
            if (row === 3 && col !== 2) {
              return <div key={`pad-${col}`} />;
            }

            return (
              <RinkSlot
                key={pos}
                pos={pos}
                label={label}
                player={player}
                isEligible={isEligible}
                teamColor={teamColor}
                onPlace={() => isEligible && onPlace(pos)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RinkSlot({
  pos, label, player, isEligible, teamColor, onPlace,
}: {
  pos: Position;
  label: string;
  player?: DraftedPlayer;
  isEligible: boolean;
  teamColor: string;
  onPlace: () => void;
}) {
  const playerFranchise = player ? FRANCHISE_MAP.get(player.franchiseAbbr) : null;
  const playerColor     = playerFranchise?.color ?? '#4a9eff';

  if (player) {
    // Filled slot
    return (
      <div
        className="rounded-xl p-2.5 text-center border border-slate-600/60 bg-slate-800/60"
        style={{ borderColor: `${playerColor}50` }}
      >
        <div
          className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: playerColor }}
        >
          {player.initials}
        </div>
        <div className="text-white text-[11px] font-semibold leading-tight truncate">
          {player.name.split(' ').slice(-1)[0]}
        </div>
        <div className="text-slate-500 text-[9px] mt-0.5">{pos}</div>
      </div>
    );
  }

  if (isEligible) {
    // Empty, eligible — glowing + clickable
    return (
      <button
        onClick={onPlace}
        className="rounded-xl p-2.5 text-center border-2 border-dashed transition-all duration-150
                   hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          borderColor: `${teamColor}80`,
          backgroundColor: `${teamColor}12`,
          boxShadow: `0 0 12px ${teamColor}30`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = teamColor;
          e.currentTarget.style.boxShadow = `0 0 20px ${teamColor}55`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = `${teamColor}80`;
          e.currentTarget.style.boxShadow = `0 0 12px ${teamColor}30`;
        }}
      >
        <div
          className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-xl font-light"
          style={{ color: teamColor, backgroundColor: `${teamColor}20` }}
        >
          +
        </div>
        <div className="text-[11px] font-semibold leading-tight" style={{ color: teamColor }}>
          {pos}
        </div>
        <div className="text-slate-500 text-[9px] mt-0.5">{label}</div>
      </button>
    );
  }

  // Empty, ineligible — dimmed placeholder
  return (
    <div className="rounded-xl p-2.5 text-center border border-slate-800/40 opacity-25 cursor-default">
      <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 bg-slate-800" />
      <div className="text-slate-600 text-[11px] font-semibold">{pos}</div>
      <div className="text-slate-700 text-[9px] mt-0.5">{label}</div>
    </div>
  );
}
