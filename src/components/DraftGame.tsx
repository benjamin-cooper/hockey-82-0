'use client';
import { useState, useCallback } from 'react';
import { Player, DraftedPlayer, Position, POSITIONS, TeamResult, eligibleSlots } from '@/types';
import { FRANCHISE_MAP } from '@/lib/franchises';
import SlotMachine from './SlotMachine';
import PlayerCard from './PlayerCard';
import RinkLayout from './RinkLayout';
import ResultsScreen from './ResultsScreen';

type SpinCombo = { abbr: string; decade: string };

type GamePhase =
  | { type: 'spinning';        franchiseAbbr: string; city: string; decade: string; spinCombos: SpinCombo[] }
  | { type: 'picking-player';  franchiseAbbr: string; city: string; decade: string; players: Player[] }
  | { type: 'placing-player';  franchiseAbbr: string; city: string; decade: string; player: Player; slots: Position[] }
  | { type: 'results';         result: TeamResult };

type Roster = Partial<Record<Position, DraftedPlayer>>;

export default function DraftGame() {
  const [phase,       setPhase]       = useState<GamePhase | null>(null);
  const [roster,      setRoster]      = useState<Roster>({});
  const [usedCombos,  setUsedCombos]  = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const filled   = Object.keys(roster) as Position[];
  const unfilled = POSITIONS.filter(p => !filled.includes(p));

  async function startDraft() {
    setRoster({});
    setUsedCombos([]);
    setError(null);
    await spinNext([], POSITIONS);
  }

  async function spinNext(used: string[], remaining: Position[]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/draft-slot?used=${used.join(',')}&unfilled=${remaining.join(',')}`);
      if (!res.ok) throw new Error('No slots');
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
      const res = await fetch(`/api/players?franchise=${franchiseAbbr}&decade=${decade}&unfilled=${unfilled.join(',')}`);
      const data = await res.json();
      setPhase({ type: 'picking-player', franchiseAbbr, city, decade, players: data.players ?? [] });
    } catch {
      setError('Failed to load players.');
    }
  }, [phase, unfilled]);

  function handlePickPlayer(player: Player) {
    if (!phase || phase.type !== 'picking-player') return;
    // Which unfilled slots is this player eligible for?
    const slots = (eligibleSlots(player.position as Position) as Position[]).filter(s => unfilled.includes(s));
    setPhase({ type: 'placing-player', franchiseAbbr: phase.franchiseAbbr, city: phase.city, decade: phase.decade, player, slots });
  }

  async function handlePlace(pos: Position) {
    if (!phase || phase.type !== 'placing-player') return;
    const { player, franchiseAbbr, decade } = phase;

    const drafted: DraftedPlayer = { ...player, slotPosition: pos };
    const newRoster   = { ...roster, [pos]: drafted };
    const newUsed     = [...usedCombos, `${franchiseAbbr}-${decade}`];
    const newUnfilled = POSITIONS.filter(p => !(p in newRoster));

    setRoster(newRoster);
    setUsedCombos(newUsed);

    if (newUnfilled.length === 0) {
      setLoading(true);
      try {
        const orderedPlayers = POSITIONS.map(p => newRoster[p]!);
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

  // ── RENDER ───────────────────────────────────────────────────────────────────

  if (!phase) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-slate-400 text-center max-w-sm text-sm leading-relaxed">
          Each round, the slot machine picks a franchise and decade. Pick any player from that
          era, then place them on the rink. Can you build a team good enough to go 82-0?
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

  const teamColor = FRANCHISE_MAP.get(phase.franchiseAbbr)?.color ?? '#4a9eff';

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 gap-5">

      {/* Rink — always visible, shows current roster state */}
      <RinkLayout
        roster={roster}
        eligibleSlots={phase.type === 'placing-player' ? phase.slots : []}
        teamColor={teamColor}
        onPlace={handlePlace}
      />

      {/* Divider */}
      <div className="h-px bg-slate-800" />

      {/* Slot machine spin */}
      {phase.type === 'spinning' && (
        <SlotMachine
          franchiseAbbr={phase.franchiseAbbr}
          city={phase.city}
          decade={phase.decade}
          spinCombos={phase.spinCombos}
          onDone={handleSpinDone}
        />
      )}

      {/* All players — pick one */}
      {phase.type === 'picking-player' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold">{phase.franchiseAbbr}</span>
              <span className="text-slate-500 mx-1.5">·</span>
              <span className="text-white font-bold">{phase.decade}</span>
            </div>
            <div className="text-xs font-medium" style={{ color: teamColor }}>{phase.city}</div>
          </div>
          <p className="text-slate-400 text-xs">Pick a player — then place them on the rink.</p>
          {phase.players.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No available players for your remaining slots.</p>
          ) : (
            phase.players.map(player => (
              <PlayerCard key={player.id} player={player} onClick={() => handlePickPlayer(player)} />
            ))
          )}
        </div>
      )}

      {/* Placing — player selected, prompt to click a slot */}
      {phase.type === 'placing-player' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              onClick={async () => {
                const res = await fetch(`/api/players?franchise=${phase.franchiseAbbr}&decade=${phase.decade}&unfilled=${unfilled.join(',')}`);
                const data = await res.json();
                setPhase({ type: 'picking-player', franchiseAbbr: phase.franchiseAbbr, city: phase.city, decade: phase.decade, players: data.players ?? [] });
              }}
            >
              ← Back
            </button>
            <p className="text-slate-400 text-sm flex-1 text-center">
              Now place <span className="text-white font-semibold">{phase.player.name}</span> on the rink ↑
            </p>
          </div>
          {/* Show the selected player card */}
          <PlayerCard player={phase.player} />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}
