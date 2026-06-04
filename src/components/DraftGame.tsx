'use client';
import { useState, useCallback } from 'react';
import { Player, Position, POSITIONS, POSITION_LABELS, TeamResult } from '@/types';
import SlotMachine from './SlotMachine';
import PlayerCard from './PlayerCard';
import ResultsScreen from './ResultsScreen';

type GamePhase =
  | { type: 'spinning'; round: number; franchiseAbbr: string; city: string; decade: string }
  | { type: 'picking'; round: number; franchiseAbbr: string; city: string; decade: string; players: Player[] }
  | { type: 'results'; result: TeamResult };

export default function DraftGame() {
  const [phase, setPhase] = useState<GamePhase | null>(null);
  const [drafted, setDrafted] = useState<Player[]>([]);
  const [usedCombos, setUsedCombos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRound = drafted.length; // 0–5

  async function startDraft() {
    setDrafted([]);
    setUsedCombos([]);
    setError(null);
    await spinForRound(0, []);
  }

  async function spinForRound(round: number, used: string[]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/draft-slot?round=${round}&used=${used.join(',')}`);
      if (!res.ok) throw new Error('Failed to get draft slot');
      const slot = await res.json();
      setPhase({ type: 'spinning', round, ...slot });
    } catch (e) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleSpinDone = useCallback(async () => {
    if (!phase || phase.type !== 'spinning') return;
    const { round, franchiseAbbr, city, decade } = phase;
    const position: Position = POSITIONS[round];

    try {
      const res = await fetch(`/api/players?franchise=${franchiseAbbr}&decade=${decade}&position=${position}`);
      const data = await res.json();
      setPhase({ type: 'picking', round, franchiseAbbr, city, decade, players: data.players ?? [] });
    } catch {
      setError('Failed to load players.');
    }
  }, [phase]);

  async function handlePick(player: Player) {
    const newDrafted = [...drafted, player];
    const combo = `${player.franchiseAbbr}-${player.decade}`;
    const newUsed = [...usedCombos, combo];
    setDrafted(newDrafted);
    setUsedCombos(newUsed);

    if (newDrafted.length === 6) {
      // Simulate
      setLoading(true);
      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: newDrafted.map(p => p.id) }),
        });
        const result: TeamResult = await res.json();
        // Re-attach full player objects (API returns lean result)
        result.players = newDrafted;
        setPhase({ type: 'results', result });
      } catch {
        setError('Simulation failed.');
      } finally {
        setLoading(false);
      }
    } else {
      await spinForRound(newDrafted.length, newUsed);
    }
  }

  // ---- RENDER ----

  if (!phase) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-slate-400 text-center max-w-sm">
          Draft 6 all-time NHL legends — one per round, with team and decade assigned by fate.
          Can you build a team good enough to go 82-0?
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
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4">
      {/* Draft progress bar */}
      <div className="flex gap-2 mb-6">
        {POSITIONS.map((pos, i) => {
          const player = drafted[i];
          const isCurrent = i === currentRound;
          const isDone = i < currentRound;
          return (
            <div key={pos} className={`flex-1 rounded-lg p-2 text-center transition-all
              ${isDone ? 'bg-slate-700' : isCurrent ? 'bg-blue-900/50 ring-1 ring-blue-500' : 'bg-slate-800/50'}
            `}>
              <div className={`text-xs font-bold ${isDone ? 'text-slate-300' : isCurrent ? 'text-blue-300' : 'text-slate-600'}`}>
                {pos}
              </div>
              {player && (
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{player.name.split(' ').pop()}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slot machine spin */}
      {phase.type === 'spinning' && (
        <SlotMachine
          position={POSITIONS[phase.round]}
          franchiseAbbr={phase.franchiseAbbr}
          city={phase.city}
          decade={phase.decade}
          onDone={handleSpinDone}
        />
      )}

      {/* Player picker */}
      {phase.type === 'picking' && (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <div className="text-slate-400 text-sm uppercase tracking-widest mb-1">
              Pick your {POSITION_LABELS[POSITIONS[phase.round]]}
            </div>
            <div className="text-white font-bold text-xl">
              {phase.franchiseAbbr} · {phase.decade}
            </div>
          </div>

          {phase.players.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No players found for this slot.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {phase.players.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => handlePick(player)}
                />
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
      {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
    </div>
  );
}
