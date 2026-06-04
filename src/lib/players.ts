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

export function getPlayersBySlot(franchiseAbbr: string, decade: string, position: Position): Player[] {
  return loadPlayers()
    .filter(p => p.franchiseAbbr === franchiseAbbr && p.decade === decade && p.position === position)
    .sort((a, b) => b.strengthScore - a.strengthScore);
}

/** Returns a random franchise+decade combo that hasn't been used yet for the given position. */
export function randomDraftSlot(
  position: Position,
  usedCombos: string[] // "ABBR-decade" strings
): { franchiseAbbr: string; franchise: string; city: string; decade: string } | null {
  // Build all valid combos for this position that have players
  const players = loadPlayers();
  const available = new Map<string, { franchiseAbbr: string; franchise: string; city: string; decade: string }>();

  for (const p of players) {
    if (p.position !== position) continue;
    const key = `${p.franchiseAbbr}-${p.decade}`;
    if (!usedCombos.includes(key) && !available.has(key)) {
      // Find display info
      const f = FRANCHISES.find(f => f.abbr === p.franchiseAbbr);
      available.set(key, {
        franchiseAbbr: p.franchiseAbbr,
        franchise: p.franchise,
        city: (f?.city ?? ''),
        decade: p.decade,
      });
    }
  }

  const options = Array.from(available.values());
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}
