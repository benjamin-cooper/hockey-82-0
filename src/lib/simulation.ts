import { DraftedPlayer, TeamResult, isGoalieStats } from '@/types';
import { ERA_AVERAGES } from '@/lib/franchises';

const FWD_G_RATE  = 0.120;
const FWD_A_RATE  = 0.150;
const DEF_G_RATE  = 0.045;
const DEF_A_RATE  = 0.085;

// +/- wasn't tracked by the NHL until the 1967-68 season.
// Pre-1968 players have plusMinus = 0 in the data — treat it as missing, not zero.
const PM_TRACKED_FROM_DECADE = '1970s';
const PM_DECADES = new Set(['1970s','1980s','1990s','2000s','2010s','2020s']);

// OTL didn't exist until 1999-2000. Pre-2000 rosters shouldn't accumulate OTL.
function eraOtlRate(decades: string[]): number {
  const modernCount = decades.filter(d => ['2000s','2010s','2020s'].includes(d)).length;
  return modernCount >= 3 ? 0.12 : modernCount >= 1 ? 0.06 : 0;
}

const RATINGS = [
  { label: 'DYNASTY',   min: 90 },
  { label: 'CONTENDER', min: 75 },
  { label: 'PLAYOFF',   min: 60 },
  { label: 'BUBBLE',    min: 45 },
  { label: 'REBUILD',   min: 0  },
];

function getRating(score: number): string {
  return RATINGS.find(r => score >= r.min)?.label ?? 'REBUILD';
}

function simulate82(winPct: number, otlRate: number): { wins: number; losses: number; otl: number } {
  let wins = 0, losses = 0, otl = 0;
  for (let i = 0; i < 82; i++) {
    const r = Math.random();
    if (r < winPct) {
      wins++;
    } else {
      if (r < winPct + (1 - winPct) * otlRate) otl++;
      else losses++;
    }
  }
  return { wins, losses, otl };
}

export function simulateSeason(players: DraftedPlayer[]): TeamResult {
  const skaters = players.filter(p => p.slotPosition !== 'G');
  const goalie  = players.find(p => p.slotPosition === 'G');

  // ─── OFFENSE ───────────────────────────────────────────────────────────────
  let offScore = 0;
  let pmSum    = 0;

  for (const p of skaters) {
    if (isGoalieStats(p.stats)) continue;
    const era  = ERA_AVERAGES[p.decade] ?? ERA_AVERAGES['2010s'];
    const egpg = era.goalsPerGame;
    const isF  = ['C', 'LW', 'RW'].includes(p.slotPosition);

    const gpg = p.stats.goals   / p.stats.gp;
    const apg = p.stats.assists / p.stats.gp;

    const eraG = egpg * (isF ? FWD_G_RATE : DEF_G_RATE);
    const eraA = egpg * (isF ? FWD_A_RATE : DEF_A_RATE);

    offScore += ((gpg / eraG) * 0.6 + (apg / eraA) * 0.4) * (isF ? 1.0 : 0.55);

    // Only count +/- for eras where it was actually tracked
    if (PM_DECADES.has(p.decade)) {
      const pmg = p.stats.plusMinus / p.stats.gp;
      pmSum += (pmg / egpg) * (isF ? 0.30 : 1.0);
    }
  }

  const offNorm = Math.min(60, (offScore / 4.1) * 30);

  // ─── DEFENSE ───────────────────────────────────────────────────────────────
  let goalieScore = 18;

  if (goalie && isGoalieStats(goalie.stats)) {
    const era     = ERA_AVERAGES[goalie.decade] ?? ERA_AVERAGES['2010s'];
    const svDiff  = goalie.stats.savePct - era.savePct;
    const gaaGain = (era.goalsPerGame - goalie.stats.gaa) / era.goalsPerGame;
    const soRate  = goalie.stats.shutouts / goalie.stats.gp;

    goalieScore = 18 + svDiff * 250 + gaaGain * 30 + soRate * 30;
  }

  const pmBonus = Math.min(10, Math.max(-8, pmSum * 15));
  const defNorm = Math.min(40, Math.max(0, goalieScore + pmBonus));

  // ─── STRENGTH SCORE → WIN PROBABILITY ─────────────────────────────────────
  const strengthScore = Math.round(Math.min(100, Math.max(0, offNorm + defNorm)));
  // Score=50 → ~.500, Score=85 → ~.850, Score=100 → ~.931
  // At .931 over 82 games: ~0.27% chance of 82-0 — roughly 1 in 370 at max score.
  // Achievable with a truly legendary roster but rare enough to feel special.
  const winPct = 0.08 + 0.86 / (1 + Math.exp(-0.09 * (strengthScore - 50)));

  // Era-aware OTL: no OTL for pre-2000 rosters
  const allDecades = players.map(p => p.decade);
  const otlRate = eraOtlRate(allDecades);

  const { wins, losses, otl } = simulate82(winPct, otlRate);
  const points = wins * 2 + otl;

  return {
    players,
    wins,
    losses: Math.max(0, losses),
    otl:    Math.max(0, otl),
    points,
    rating: getRating(strengthScore),
    strengthScore,
  };
}
