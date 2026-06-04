import { Player, Position } from '@/types';
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

const FORWARD_POSITIONS: Position[] = ['C', 'LW', 'RW'];

export function getPlayersBySlot(franchiseAbbr: string, decade: string, position: Position): Player[] {
  // For any forward slot, show all forwards — a center can play wing and vice versa
  const eligible = FORWARD_POSITIONS.includes(position)
    ? FORWARD_POSITIONS
    : [position];

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

/** Returns a random franchise+decade combo that hasn't been used yet for the given position,
 *  plus the full list of valid combos for the spin animation. */
export function randomDraftSlot(
  position: Position,
  usedCombos: string[] // "ABBR-decade" strings
): DraftSlotResult | null {
  const players = loadPlayers();
  const allValid = new Map<string, { franchiseAbbr: string; franchise: string; city: string; decade: string }>();

  for (const p of players) {
    if (p.position !== position) continue;
    const key = `${p.franchiseAbbr}-${p.decade}`;
    if (!allValid.has(key)) {
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
