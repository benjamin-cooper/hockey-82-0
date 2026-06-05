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
  | { type: 'spinning';       franchiseAbbr: string; city: string; decade: string; spinCombos: SpinCombo[] }
  | { type: 'picking-player'; franchiseAbbr: string; city: string; decade: string; players: Player[] }
  | { type: 'placing-player'; franchiseAbbr: string; city: string; decade: string; player: Player; slots: Position[] }
  | { type: 'results';        result: TeamResult };

type Roster = Partial<Record<Position, DraftedPlayer>>;

export default function DraftGame() {
  const [phase,           setPhase]           = useState<GamePhase | null>(null);
  const [roster,          setRoster]          = useState<Roster>({});
  const [usedCombos,      setUsedCombos]      = useState<string[]>([]);
  // Reroll: one per round. Track combos already rerolled so they can't be rerolled again.
  const [rerollAvailable, setRerollAvailable] = useState(false);
  const [rerolledCombos,  setRerolledCombos]  = useState<string[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const filled   = Object.keys(roster) as Position[];
  const unfilled = POSITIONS.filter(p => !filled.includes(p));

  async function startDraft() {
    setRoster({});
    setUsedCombos([]);
    setRerolledCombos([]);
    setError(null);
    await spinNext([], POSITIONS, []);
  }

  async function spinNext(used: string[], remaining: Position[], rerolled: string[]) {
    setLoading(true);
    setRerollAvailable(true); // fresh round — reroll available
    try {
      // Exclude both permanently used combos and temporarily rerolled ones
      const exclude = [...used, ...rerolled];
      const res = await fetch(`/api/draft-slot?used=${exclude.join(',')}&unfilled=${remaining.join(',')}`);
      if (!res.ok) throw new Error('No slots available');
      const slot = await res.json();
      setPhase({ type: 'spinning', ...slot });
    } catch {
      setError('Something went wrong. Try again.');
      setPhase(null); // reset to start screen so user can retry
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
      setPhase(null);
    }
  }, [phase, unfilled]);

  async function handleReroll(type: 'team' | 'era') {
    if (!phase || phase.type === 'results' || !rerollAvailable) return;
    const combo = `${phase.franchiseAbbr}-${phase.decade}`;
    const newRerolled = [...rerolledCombos, combo];
    setRerolledCombos(newRerolled);
    setRerollAvailable(false);

    const lock = type === 'team'
      ? `&lockDecade=${phase.decade}`         // keep era, swap franchise
      : `&lockFranchise=${phase.franchiseAbbr}`; // keep franchise, swap era

    setLoading(true);
    try {
      const exclude = [...usedCombos, ...newRerolled];
      const res = await fetch(
        `/api/draft-slot?used=${exclude.join(',')}&unfilled=${unfilled.join(',')}${lock}`
      );
      if (!res.ok) throw new Error('No slots available');
      const slot = await res.json();
      setPhase({ type: 'spinning', ...slot });
    } catch {
      setError('No other options available for that reroll.');
      setPhase({ type: 'picking-player', ...phase as any }); // stay on current
    } finally {
      setLoading(false);
    }
  }

  function handlePickPlayer(player: Player) {
    if (!phase || phase.type !== 'picking-player') return;
    const slots = (eligibleSlots(player.position as Position) as Position[]).filter(s => unfilled.includes(s));
    setPhase({ type: 'placing-player', franchiseAbbr: phase.franchiseAbbr, city: phase.city, decade: phase.decade, player, slots });
  }

  async function handleBack() {
    if (!phase || phase.type !== 'placing-player') return;
    try {
      const res = await fetch(`/api/players?franchise=${phase.franchiseAbbr}&decade=${phase.decade}&unfilled=${unfilled.join(',')}`);
      const data = await res.json();
      setPhase({ type: 'picking-player', franchiseAbbr: phase.franchiseAbbr, city: phase.city, decade: phase.decade, players: data.players ?? [] });
    } catch {
      setError('Failed to reload players.');
    }
  }

  async function handlePlace(pos: Position) {
    if (!phase || phase.type !== 'placing-player') return;
    const { player, franchiseAbbr, decade } = phase;

    const drafted: DraftedPlayer    = { ...player, slotPosition: pos };
    const newRoster: Roster         = { ...roster, [pos]: drafted };
    const newUsed                   = [...usedCombos, `${franchiseAbbr}-${decade}`];
    const newUnfilled               = POSITIONS.filter(p => !(p in newRoster));

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
        setError('Simulation failed. Try again.');
        setPhase(null);
      } finally {
        setLoading(false);
      }
    } else {
      await spinNext(newUsed, newUnfilled, rerolledCombos);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (!phase) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-slate-400 text-center max-w-sm text-sm leading-relaxed">
          Each round, the slot machine picks a franchise and decade. Pick any player from that
          era, then place them on the rink. One reroll per round.
          Can you build a team good enough to go 82-0?
        </p>
        <button
          onClick={startDraft}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors"
        >
          {loading ? 'Loading…' : 'Start Draft'}
        </button>
        {error && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-slate-500 text-xs hover:text-slate-300">Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  if (phase.type === 'results') {
    return <ResultsScreen result={phase.result} onBuildAnother={startDraft} />;
  }

  const teamColor     = FRANCHISE_MAP.get(phase.franchiseAbbr)?.color ?? '#4a9eff';
  const currentCombo  = `${phase.franchiseAbbr}-${phase.decade}`;
  const canReroll     = rerollAvailable && !rerolledCombos.includes(currentCombo);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

        {/* LEFT */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Slot machine */}
          {phase.type === 'spinning' && (
            <SlotMachine
              franchiseAbbr={phase.franchiseAbbr}
              city={phase.city}
              decade={phase.decade}
              spinCombos={phase.spinCombos}
              onDone={handleSpinDone}
            />
          )}

          {/* Player list */}
          {phase.type === 'picking-player' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">{phase.franchiseAbbr}</span>
                  <span className="text-slate-500 mx-1.5">·</span>
                  <span className="text-white font-bold">{phase.decade}</span>
                  <span className="text-xs font-medium ml-2" style={{ color: teamColor }}>{phase.city}</span>
                </div>
                {canReroll && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReroll('team')}
                      disabled={loading}
                      title="Keep this era, spin a new team"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600
                                 text-slate-300 hover:text-white hover:border-slate-400
                                 transition-colors disabled:opacity-40"
                    >
                      Team
                    </button>
                    <button
                      onClick={() => handleReroll('era')}
                      disabled={loading}
                      title="Keep this team, spin a new era"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600
                                 text-slate-300 hover:text-white hover:border-slate-400
                                 transition-colors disabled:opacity-40"
                    >
                      Era
                    </button>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-xs">Pick a player — then place them on the rink →</p>
              {phase.players.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No available players for your remaining slots.</p>
              ) : (
                phase.players.map(player => (
                  <PlayerCard key={player.id} player={player} onClick={() => handlePickPlayer(player)} />
                ))
              )}
            </div>
          )}

          {/* Placing */}
          {phase.type === 'placing-player' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                  ← Back
                </button>
                <p className="text-slate-400 text-sm">
                  Place <span className="text-white font-semibold">{phase.player.name}</span> on the rink →
                </p>
              </div>
              <PlayerCard player={phase.player} />
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* RIGHT — rink */}
        <div className="sticky top-6">
          <RinkLayout
            roster={roster}
            eligibleSlots={phase.type === 'placing-player' ? phase.slots : []}
            teamColor={teamColor}
            onPlace={handlePlace}
          />
        </div>

      </div>
    </div>
  );
}

