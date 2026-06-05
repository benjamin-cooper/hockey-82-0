'use client';
import { Position, DraftedPlayer } from '@/types';
import { FRANCHISE_MAP } from '@/lib/franchises';

interface Props {
  roster: Partial<Record<Position, DraftedPlayer>>;
  eligibleSlots: Position[];
  teamColor: string;
  onPlace: (pos: Position) => void;
}

const RINK_LAYOUT: { pos: Position; label: string }[][] = [
  [
    { pos: 'LW', label: 'Left Wing' },
    { pos: 'C',  label: 'Center'    },
    { pos: 'RW', label: 'Right Wing'},
  ],
  [
    { pos: 'LD', label: 'Left D'    },
    { pos: 'RD', label: 'Right D'   },
  ],
  [
    { pos: 'G',  label: 'Goalie'    },
  ],
];

export default function RinkLayout({ roster, eligibleSlots, teamColor, onPlace }: Props) {
  return (
    <div className="w-full">
      {/* Rink surface */}
      <div
        className="relative rounded-3xl px-5 py-7 flex flex-col gap-4"
        style={{
          background: 'linear-gradient(180deg, #1a2f4a 0%, #142238 100%)',
          border: '1px solid rgba(100,160,220,0.25)',
          boxShadow: 'inset 0 0 60px rgba(30,80,140,0.2)',
        }}
      >
        {/* Blue line */}
        <div className="absolute inset-x-5 top-[37%] h-[2px] rounded-full" style={{ backgroundColor: 'rgba(99,160,255,0.5)' }} />
        <div className="absolute inset-x-5 top-[63%] h-[2px] rounded-full" style={{ backgroundColor: 'rgba(248,113,113,0.5)' }} />

        {/* Forwards row */}
        <div className="grid grid-cols-3 gap-3">
          {RINK_LAYOUT[0].map(({ pos, label }) => (
            <RinkSlot key={pos} pos={pos} label={label} player={roster[pos]}
              isEligible={eligibleSlots.includes(pos)} teamColor={teamColor}
              onPlace={() => eligibleSlots.includes(pos) && onPlace(pos)} />
          ))}
        </div>

        {/* Defense row — centered pair */}
        <div className="grid grid-cols-3 gap-3">
          <RinkSlot pos="LD" label="Left D"  player={roster['LD']}
            isEligible={eligibleSlots.includes('LD')} teamColor={teamColor}
            onPlace={() => eligibleSlots.includes('LD') && onPlace('LD')} />
          <div /> {/* center gap */}
          <RinkSlot pos="RD" label="Right D" player={roster['RD']}
            isEligible={eligibleSlots.includes('RD')} teamColor={teamColor}
            onPlace={() => eligibleSlots.includes('RD') && onPlace('RD')} />
        </div>

        {/* Goalie row — centered */}
        <div className="grid grid-cols-3 gap-3">
          <div />
          <RinkSlot pos="G" label="Goalie" player={roster['G']}
            isEligible={eligibleSlots.includes('G')} teamColor={teamColor}
            onPlace={() => eligibleSlots.includes('G') && onPlace('G')} />
          <div />
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
  const playerColor = player ? (FRANCHISE_MAP.get(player.franchiseAbbr)?.color ?? '#4a9eff') : teamColor;

  if (player) {
    return (
      <div
        className="rounded-2xl py-4 px-2 text-center border"
        style={{
          borderColor: `${playerColor}80`,
          backgroundColor: `${playerColor}25`,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center
                     text-white font-black text-sm shadow-lg"
          style={{ backgroundColor: playerColor }}
        >
          {player.initials}
        </div>
        <div className="text-white text-[11px] font-bold leading-tight truncate px-1 mt-0.5">
          {player.name.split(' ').slice(0, -1).join(' ') || player.name}
        </div>
        <div className="text-[10px] leading-tight truncate px-1" style={{ color: `${playerColor}cc` }}>
          {player.name.split(' ').slice(-1)[0]}
        </div>
      </div>
    );
  }

  if (isEligible) {
    // Use white-based styling so dark team colors (WIN #041E42) are still visible.
    // Team color is used as a tint/glow only, not the primary contrast color.
    return (
      <button
        onClick={onPlace}
        className="rounded-2xl py-4 px-2 text-center border-2 border-dashed
                   transition-all duration-150 hover:scale-105 active:scale-95 w-full
                   border-slate-400/60 hover:border-white/80"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: `0 0 16px ${teamColor}40` }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.boxShadow = `0 0 24px ${teamColor}70`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = `0 0 16px ${teamColor}40`;
        }}
      >
        <div className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center
                        text-2xl font-light text-white/70 bg-white/10">
          +
        </div>
        <div className="text-[12px] font-bold text-white/80">{pos}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">{label}</div>
      </button>
    );
  }

  // Empty, ineligible
  return (
    <div className="rounded-2xl py-4 px-2 text-center border border-white/10 cursor-default opacity-40">
      <div className="w-11 h-11 rounded-xl mx-auto mb-2 bg-white/10" />
      <div className="text-slate-400 text-[12px] font-bold">{pos}</div>
      <div className="text-slate-500 text-[10px] mt-0.5">{label}</div>
    </div>
  );
}
