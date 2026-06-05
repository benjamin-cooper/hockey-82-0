'use client';
import { Player, DraftedPlayer, Position, PlayerStats, isGoalieStats } from '@/types';
import { FRANCHISE_MAP } from '@/lib/franchises';

interface Props {
  player: Player | DraftedPlayer;
  onClick?: () => void;
  compact?: boolean;
}

const POSITION_COLORS: Record<string, string> = {
  C:  'bg-blue-700',
  LW: 'bg-green-700',
  RW: 'bg-emerald-700',
  LD: 'bg-purple-700',
  RD: 'bg-violet-700',
  G:  'bg-orange-700',
};

function isDrafted(p: Player | DraftedPlayer): p is DraftedPlayer {
  return 'slotPosition' in p;
}

export default function PlayerCard({ player, onClick, compact }: Props) {
  const franchise   = FRANCHISE_MAP.get(player.franchiseAbbr);
  const accentColor = franchise?.color ?? '#4a9eff';

  // Use slotPosition for the badge colour; show both if they differ
  const slotPos    = isDrafted(player) ? player.slotPosition : player.position;
  const naturalPos = player.position;
  const posLabel   = slotPos !== naturalPos ? `${slotPos}/${naturalPos}` : slotPos;
  const posColor   = POSITION_COLORS[slotPos] ?? 'bg-gray-700';

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-4 rounded-xl p-4 transition-all
        bg-slate-800/80 hover:bg-slate-700/80
        ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-slate-600' : 'cursor-default'}
      `}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: accentColor }}
      />

      {/* Avatar + position badge */}
      <div className={`${posColor} rounded-lg w-12 h-12 flex flex-col items-center justify-center flex-shrink-0 ml-2`}>
        <span className="text-white font-bold text-sm leading-none">{player.initials}</span>
        <span className="text-white/70 text-[9px] mt-0.5 leading-none">{posLabel}</span>
      </div>

      {/* Name + team */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm truncate">{player.name}</div>
        <div className="text-slate-400 text-xs mt-0.5">
          {player.franchiseAbbr} · {player.decade}
        </div>
      </div>

      {/* Stats */}
      {!compact && <StatsBlock stats={player.stats} />}
    </div>
  );
}

function StatsBlock({ stats }: { stats: PlayerStats }) {
  if (isGoalieStats(stats)) {
    return (
      <div className="flex gap-3 flex-shrink-0">
        <Stat label="W"   value={stats.wins} />
        <Stat label="GAA" value={stats.gaa.toFixed(2)} />
        <Stat label="SV%" value={stats.savePct.toFixed(3)} />
        <Stat label="SO"  value={stats.shutouts} />
      </div>
    );
  }
  const pm = stats.plusMinus;
  const pmStr = pm > 0 ? `+${pm}` : `${pm}`;
  return (
    <div className="flex gap-3 flex-shrink-0">
      <Stat label="G"   value={stats.goals} />
      <Stat label="A"   value={stats.assists} />
      <Stat label="PTS" value={stats.points} />
      <Stat label="+/-" value={pmStr} highlight={pm > 0 ? 'pos' : pm < 0 ? 'neg' : undefined} />
      <Stat label="PPG" value={stats.pointsPerGame.toFixed(2)} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: 'pos' | 'neg' }) {
  const valueColor = highlight === 'pos' ? 'text-emerald-400' : highlight === 'neg' ? 'text-red-400' : 'text-white';
  return (
    <div className="text-center min-w-[2.5rem]">
      <div className={`${valueColor} font-semibold text-sm tabular-nums`}>{value}</div>
      <div className="text-slate-500 text-[10px]">{label}</div>
    </div>
  );
}
