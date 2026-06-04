import { Player, TeamResult, isGoalieStats } from '@/types';
import { ERA_AVERAGES } from '@/lib/franchises';

const RATINGS = [
  { label: 'DYNASTY',   min: 90 },
  { label: 'CONTENDER', min: 75 },
  { label: 'PLAYOFF',   min: 60 },
  { label: 'BUBBLE',    min: 45 },
  { label: 'REBUILD',   min: 0  },
];

function getRating(strengthScore: number): string {
  return RATINGS.find(r => strengthScore >= r.min)?.label ?? 'REBUILD';
}

/** Sigmoid mapping strength score → win probability per game (0–1)
 *  score 50  → ~.500  (average NHL team)
 *  score 100 → ~.911  (all-time super team — ~1-in-2000 shot at 82-0)
 *  score 0   → ~.089  (historically bad)
 */
function strengthToWinPct(score: number): number {
  return 0.08 + 0.84 / (1 + Math.exp(-0.09 * (score - 50)));
}

/** Monte Carlo simulation of 82 games. Returns { wins, losses, otl }. */
function simulate82(winPct: number, otlRate = 0.12): { wins: number; losses: number; otl: number } {
  let wins = 0, losses = 0, otl = 0;
  for (let i = 0; i < 82; i++) {
    const r = Math.random();
    if (r < winPct) {
      wins++;
    } else {
      // Of losses, some fraction go to OT
      const remaining = 1 - winPct;
      const otlThreshold = winPct + remaining * otlRate;
      if (r < otlThreshold) {
        otl++;
      } else {
        losses++;
      }
    }
  }
  return { wins, losses, otl };
}

export function simulateSeason(players: Player[]): TeamResult {
  const skaters = players.filter(p => p.position !== 'G');
  const goalie = players.find(p => p.position === 'G');

  // --- Offensive score from skaters ---
  let offScore = 0;
  for (const p of skaters) {
    const era = ERA_AVERAGES[p.decade] ?? ERA_AVERAGES['2010s'];
    if (!isGoalieStats(p.stats)) {
      const ppg = p.stats.pointsPerGame ?? 0;
      const ratio = era.pointsPerGame > 0 ? ppg / era.pointsPerGame : 1;
      // Weight by position: C/LW/RW contribute a bit more than D
      const posWeight = ['C', 'LW', 'RW'].includes(p.position) ? 1.0 : 0.7;
      offScore += ratio * posWeight;
    }
  }
  // Normalize: 5 players at league avg = offScore ~5 (4.1 with pos weights)
  // Scale to 0–60 range
  const maxOff = 4.1 * 4; // ~4× league average across all slots = elite offense
  const offNorm = Math.min(60, (offScore / maxOff) * 60);

  // --- Defensive / goalie score ---
  let defNorm = 30; // default mid
  if (goalie && isGoalieStats(goalie.stats)) {
    const era = ERA_AVERAGES[goalie.decade] ?? ERA_AVERAGES['2010s'];
    const diff = goalie.stats.savePct - era.savePct;
    // +0.020 above era avg = ~40 pts; at avg = 20 pts; below = less
    defNorm = Math.min(40, Math.max(0, 20 + diff * 1000));
  }

  const rawScore = offNorm + defNorm; // 0–100
  const strengthScore = Math.round(Math.min(100, Math.max(0, rawScore)));

  const winPct = strengthToWinPct(strengthScore);

  // Single simulation — real random result, not an average
  const { wins, losses, otl } = simulate82(winPct);

  const points = wins * 2 + otl;

  return {
    players,
    wins,
    losses: Math.max(0, losses),
    otl: Math.max(0, otl),
    points,
    rating: getRating(strengthScore),
    strengthScore,
  };
}
