import { Player, Position, FORWARD_POSITIONS, DEFENSE_POSITIONS, eligibleSlots, isGoalieStats } from '@/types';
import { FRANCHISES } from '@/lib/franchises';
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
  if (isGoalieStats(p.stats)) return p.strengthScore;
  const pmPerGame = p.stats.gp > 0 ? p.stats.plusMinus / p.stats.gp : 0;
  // +/- per game typically ranges from ~-0.5 to +1.5 for elite D like Orr.
  // Scale to add up to ±10 points on the 0–100 strength scale.
  return p.strengthScore + pmPerGame * 8;
}

export function getPlayersForCombo(franchiseAbbr: string, decade: string, unfilled: Position[]): Player[] {
  return loadPlayers()
    .filter(p => {
      if (p.franchiseAbbr !== franchiseAbbr || p.decade !== decade) return false;
      const slots = eligibleSlots(p.position as Position);
      return slots.some(s => unfilled.includes(s));
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

/** Returns a random franchise+decade combo that:
 *  - hasn't been used yet
 *  - has at least one player for at least one unfilled position
 *  Also returns the full set of valid combos for the spin animation.
 */
export function randomDraftSlot(
  usedCombos: string[],
  unfilledPositions: Position[]
): DraftSlotResult | null {
  const players = loadPlayers();

  // Build all combos that have players for at least one unfilled position
  const allValid = new Map<string, { franchiseAbbr: string; franchise: string; city: string; decade: string }>();

  for (const p of players) {
    const key = `${p.franchiseAbbr}-${p.decade}`;
    if (allValid.has(key)) continue;

    // Check if this combo has at least one player eligible for an unfilled slot
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

  const picked = available[Math.floor(Math.random() * available.length)];
  const spinCombos = Array.from(allValid.values()).map(c => ({ abbr: c.franchiseAbbr, decade: c.decade }));

  return { ...picked, spinCombos };
}
