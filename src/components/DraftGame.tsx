'use client';
import { useState, useCallback } from 'react';
import { Player, DraftedPlayer, Position, POSITIONS, POSITION_LABELS, TeamResult } from '@/types';
import SlotMachine from './SlotMachine';
import PlayerCard from './PlayerCard';
import ResultsScreen from './ResultsScreen';

type SpinCombo = { abbr: string; decade: string };

type GamePhase =
  | { type: 'spinning';         franchiseAbbr: string; city: string; decade: string; spinCombos: SpinCombo[] }
  | { type: 'picking-position'; franchiseAbbr: string; city: string; decade: string; availablePositions: Position[] }
  | { type: 'picking-player';   franchiseAbbr: string; city: string; decade: string; selectedPosition: Position; players: Player[] }
  | { type: 'results';          result: TeamResult };

type Roster = Partial<Record<Position, DraftedPlayer>>;

const POSITION_COLORS: Record<Position, string> = {
  C:  'bg-blue-700',
  LW: 'bg-green-700',
  RW: 'bg-emerald-700',
  LD: 'bg-purple-700',
  RD: 'bg-violet-700',
  G:  'bg-orange-700',
};

export default function DraftGame() {
  const [phase, setPhase]           = useState<GamePhase | null>(null);
  const [roster, setRoster]         = useState<Roster>({});
  const [usedCombos, setUsedCombos] = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const filledPositions   = Object.keys(roster) as Position[];
  const unfilledPositions = POSITIONS.filter(p => !filledPositions.includes(p));
  const isDraftComplete   = filledPositions.length === 6;

  async function startDraft() {
    setRoster({});
    setUsedCombos([]);
    setError(null);
    await spinNext([], POSITIONS);
  }

  async function spinNext(used: string[], unfilled: Position[]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/draft-slot?used=${used.join(',')}&unfilled=${unfilled.join(',')}`);
      if (!res.ok) throw new Error('No available slots');
      const slot = await res.json();
      setPhase({ type: 'spinning', ...slot });
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleSpinDone = useCallback(async () => {
    if (!phase || phase.type !== 'spinning') return;
    const { franchiseAbbr, city, decade } = phase;

    try {
      const res = await fetch(
        `/api/available-positions?franchise=${franchiseAbbr}&decade=${decade}&unfilled=${unfilledPositions.join(',')}`
      );
      const data = await res.json();
      setPhase({ type: 'picking-position', franchiseAbbr, city, decade, availablePositions: data.positions ?? [] });
    } catch {
      setError('Failed to load positions.');
    }
  }, [phase, unfilledPositions]);

  async function handleSelectPosition(position: Position) {
    if (!phase || phase.type !== 'picking-position') return;
    const { franchiseAbbr, city, decade } = phase;

    try {
      const res = await fetch(`/api/players?franchise=${franchiseAbbr}&decade=${decade}&position=${position}`);
      const data = await res.json();
      setPhase({ type: 'picking-player', franchiseAbbr, city, decade, selectedPosition: position, players: data.players ?? [] });
    } catch {
      setError('Failed to load players.');
    }
  }

  async function handlePick(player: Player) {
    if (!phase || phase.type !== 'picking-player') return;
    const draftedPlayer: DraftedPlayer = { ...player, slotPosition: phase.selectedPosition };

    const newRoster    = { ...roster, [phase.selectedPosition]: draftedPlayer };
    const newUsed      = [...usedCombos, `${player.franchiseAbbr}-${player.decade}`];
    const newUnfilled  = POSITIONS.filter(p => !(p in newRoster));

    setRoster(newRoster);
    setUsedCombos(newUsed);

    if (newUnfilled.length === 0) {
      // All slots filled — simulate
      setLoading(true);
      try {
        const orderedPlayers = POSITIONS.map(pos => newRoster[pos]!);
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: orderedPlayers.map(p => p.id) }),
        });
        const result: TeamResult = await res.json();
        result.players = orderedPlayers;
        setPhase({ type: 'results', result });
      } catch {
        setError('Simulation failed.');
      } finally {
        setLoading(false);
      }
    } else {
      await spinNext(newUsed, newUnfilled);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (!phase) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-slate-400 text-center max-w-sm">
          Draft 6 all-time NHL legends — each round the slot machine picks a franchise and decade,
          then you choose which position to fill. Can you build a team good enough to go 82-0?
        </p>
        <button
          onClick={startDraft}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors"
        >
          {loading ? 'Loading…' : 'Start Draft'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  if (phase.type === 'results') {
    return <ResultsScreen result={phase.result} onBuildAnother={startDraft} />;
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 gap-6">

      {/* Roster progress grid */}
      <div className="grid grid-cols-6 gap-2">
        {POSITIONS.map(pos => {
          const player  = roster[pos];
          const isCurrent = phase.type === 'picking-player' && phase.selectedPosition === pos;
          return (
            <div key={pos} className={`
              rounded-lg p-2 text-center transition-all
              ${player        ? 'bg-slate-700'
              : isCurrent     ? 'bg-blue-900/50 ring-1 ring-blue-500'
              :                 'bg-slate-800/40'}
            `}>
              <div className={`text-xs font-bold
                ${player ? 'text-slate-300' : isCurrent ? 'text-blue-300' : 'text-slate-600'}
              `}>{pos}</div>
              {player && (
                <div className="text-[9px] text-slate-400 truncate mt-0.5 leading-tight">
                  {player.name.split(' ').slice(-1)[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slot machine */}
      {phase.type === 'spinning' && (
        <SlotMachine
          position={unfilledPositions[0]}
          franchiseAbbr={phase.franchiseAbbr}
          city={phase.city}
          decade={phase.decade}
          spinCombos={phase.spinCombos}
          onDone={handleSpinDone}
        />
      )}

      {/* Position picker */}
      {phase.type === 'picking-position' && (
        <div className="flex flex-col items-center gap-5">
          <div className="text-center">
            <div className="text-white font-bold text-2xl">{phase.franchiseAbbr} · {phase.decade}</div>
            <div className="text-slate-400 text-sm mt-1">{phase.city}</div>
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest">Which position do you want?</div>
          <div className="flex gap-3 flex-wrap justify-center">
            {POSITIONS.filter(pos => phase.availablePositions.includes(pos)).map(pos => (
              <button
                key={pos}
                onClick={() => handleSelectPosition(pos)}
                className={`
                  ${POSITION_COLORS[pos]} hover:opacity-90
                  text-white font-bold px-6 py-3 rounded-xl transition-all
                  flex flex-col items-center gap-0.5 min-w-[72px]
                `}
              >
                <span className="text-lg leading-none">{pos}</span>
                <span className="text-[10px] text-white/70 leading-none">{POSITION_LABELS[pos].split(' ')[0]}</span>
              </button>
            ))}
          </div>
          {phase.availablePositions.length === 0 && (
            <p className="text-slate-500 text-sm">No players available for your remaining positions.</p>
          )}
        </div>
      )}

      {/* Player picker */}
      {phase.type === 'picking-player' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPhase({ type: 'picking-position', franchiseAbbr: phase.franchiseAbbr, city: phase.city, decade: phase.decade, availablePositions: POSITIONS.filter(p => unfilledPositions.includes(p)) })}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <div className="flex-1 text-center">
              <span className="text-white font-bold">{phase.franchiseAbbr} · {phase.decade}</span>
              <span className="text-slate-400 text-sm ml-2">— {POSITION_LABELS[phase.selectedPosition]}</span>
            </div>
          </div>

          {phase.players.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No players found for this slot.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {phase.players.map(player => (
                <PlayerCard key={player.id} player={player} onClick={() => handlePick(player)} />
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}
