import { Player, Position, FORWARD_POSITIONS, DEFENSE_POSITIONS, eligibleSlots, isGoalieStats } from '@/types';
import { FRANCHISES, ERA_AVERAGES } from '@/lib/franchises';
import path from 'path';
import fs from 'fs';

let _cache: Player[] | null = null;

function loadPlayers(): Player[] {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), 'data', 'players.json');
  if (!fs.existsSync(filePath)) {
    console.warn('players.json not found — run scripts/scrape.py first');
    return [];
  }
  _cache = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Player[];
  return _cache;
}

export function getPlayers(): Player[] {
  return loadPlayers();
}

export function getPlayerById(id: number): Player | undefined {
  return loadPlayers().find(p => p.id === id);
}

/** All players from a franchise+decade that can fill at least one unfilled slot */
/** Composite sort score: strengthScore (PPG-based) + +/- per game bonus.
 *  Keeps offensive production as the primary signal while surfacing
 *  two-way players and penalizing defensive liabilities. */
function sortScore(p: Player): number {
  if (isGoalieStats(p.stats)) {
    // Use the same composite as the simulation engine: SV% + GAA + shutout rate.
    // Stored strengthScore is SV%-only so two goalies with the same SV% need
    // GAA and win rate as tiebreakers to avoid arbitrary ordering.
    const era     = ERA_AVERAGES[p.decade] ?? ERA_AVERAGES['2010s'];
    const svDiff  = p.stats.savePct - era.savePct;
    const gaaGain = (era.goalsPerGame - p.stats.gaa) / era.goalsPerGame;
    const soRate  = p.stats.shutouts / Math.max(p.stats.gp, 1);
    const winRate = p.stats.wins    / Math.max(p.stats.gp, 1);
    return 18 + svDiff * 250 + gaaGain * 30 + soRate * 15 + winRate * 20;
  }
  const pmPerGame = p.stats.gp > 0 ? p.stats.plusMinus / p.stats.gp : 0;
  return p.strengthScore + pmPerGame * 8;
}

/** All eligible slots for a player, using their full positions array if available */
function playerEligibleSlots(p: Player): Position[] {
  const positions = (p.positions ?? [p.position]) as Position[];
  const slots = new Set<Position>();
  for (const pos of positions) {
    for (const s of eligibleSlots(pos)) slots.add(s);
  }
  return Array.from(slots);
}

export function getPlayersForCombo(franchiseAbbr: string, decade: string, unfilled: Position[]): Player[] {
  return loadPlayers()
    .filter(p => {
      if (p.franchiseAbbr !== franchiseAbbr || p.decade !== decade) return false;
      return playerEligibleSlots(p).some(s => unfilled.includes(s));
    })
    .sort((a, b) => sortScore(b) - sortScore(a));
}

/** Legacy: players for a single position slot */
export function getPlayersBySlot(franchiseAbbr: string, decade: string, position: Position): Player[] {
  const eligible = eligibleSlots(position);
  return loadPlayers()
    .filter(p =>
      p.franchiseAbbr === franchiseAbbr &&
      p.decade === decade &&
      eligible.includes(p.position as Position)
    )
    .sort((a, b) => b.strengthScore - a.strengthScore);
}

export interface DraftSlotResult {
  franchiseAbbr: string;
  franchise: string;
  city: string;
  decade: string;
  /** All valid franchise+decade pairs for this position — used for slot machine animation */
  spinCombos: { abbr: string; decade: string }[];
}

export interface RerollLock {
  franchiseAbbr?: string; // lock franchise, reroll decade
  decade?: string;        // lock decade, reroll franchise
}

/** Returns a random franchise+decade combo that:
 *  - hasn't been used yet
 *  - has at least one player for at least one unfilled position
 *  - optionally locks franchise (reroll era) or decade (reroll team)
 *  Also returns the full set of valid combos for the spin animation.
 */
export function randomDraftSlot(
  usedCombos: string[],
  unfilledPositions: Position[],
  lock?: RerollLock,
  avoidFranchise?: string  // don't pick this franchise if other options exist
): DraftSlotResult | null {
  const players = loadPlayers();

  const allValid = new Map<string, { franchiseAbbr: string; franchise: string; city: string; decade: string }>();

  for (const p of players) {
    const key = `${p.franchiseAbbr}-${p.decade}`;
    if (allValid.has(key)) continue;

    // Apply lock constraints
    if (lock?.franchiseAbbr && p.franchiseAbbr !== lock.franchiseAbbr) continue;
    if (lock?.decade && p.decade !== lock.decade) continue;

    const comboPlayers = players.filter(
      q => q.franchiseAbbr === p.franchiseAbbr && q.decade === p.decade
    );
    const hasEligible = unfilledPositions.some(pos => {
      const eligible = FORWARD_POSITIONS.includes(pos) ? FORWARD_POSITIONS : [pos];
      return comboPlayers.some(q => eligible.includes(q.position as Position));
    });

    if (hasEligible) {
      const f = FRANCHISES.find(f => f.abbr === p.franchiseAbbr);
      allValid.set(key, {
        franchiseAbbr: p.franchiseAbbr,
        franchise: p.franchise,
        city: f?.city ?? '',
        decade: p.decade,
      });
    }
  }

  const available = Array.from(allValid.values()).filter(
    c => !usedCombos.includes(`${c.franchiseAbbr}-${c.decade}`)
  );
  if (available.length === 0) return null;

  // Prefer not to pick the same franchise as last round; fall back if no other options
  const preferred = avoidFranchise
    ? available.filter(c => c.franchiseAbbr !== avoidFranchise)
    : available;
  const pool = preferred.length > 0 ? preferred : available;

  const picked = pool[Math.floor(Math.random() * pool.length)];
  // For spin animation: use lock-filtered valid combos so the reel only shows relevant options
  const spinCombos = Array.from(allValid.values()).map(c => ({ abbr: c.franchiseAbbr, decade: c.decade }));

  return { ...picked, spinCombos };
}
