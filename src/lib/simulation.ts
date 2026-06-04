import { DraftedPlayer, TeamResult, isGoalieStats } from '@/types';
import { ERA_AVERAGES } from '@/lib/franchises';

// Era-average production rates as fractions of team goals/game.
// Used to normalize each player against their own era.
const FWD_G_RATE  = 0.120; // avg top-6 fwd goals per team-goal
const FWD_A_RATE  = 0.150; // avg top-6 fwd assists per team-goal
const DEF_G_RATE  = 0.045; // avg D goals per team-goal
const DEF_A_RATE  = 0.085; // avg D assists per team-goal

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

/** Monte Carlo simulation of 82 games. */
function simulate82(winPct: number, otlRate = 0.12): { wins: number; losses: number; otl: number } {
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
  // Each skater scored against era-average production at their position.
  // An era-average forward = 1.0 unit; an era-average D = 0.55 units.
  // Average 5-skater lineup = 3×1.0 + 2×0.55 = 4.1 units.
  let offScore = 0;
  let pmSum    = 0; // accumulated +/- contribution (used in defense below)

  for (const p of skaters) {
    if (isGoalieStats(p.stats)) continue;
    const era   = ERA_AVERAGES[p.decade] ?? ERA_AVERAGES['2010s'];
    const egpg  = era.goalsPerGame;
    // Use slotPosition for role weighting — a C drafted to LW is a forward contributor
    const isF   = ['C', 'LW', 'RW'].includes(p.slotPosition);

    const gpg = p.stats.goals   / p.stats.gp;
    const apg = p.stats.assists / p.stats.gp;
    const pmg = p.stats.plusMinus / p.stats.gp;

    // Era-average rates for this position class
    const eraG = egpg * (isF ? FWD_G_RATE : DEF_G_RATE);
    const eraA = egpg * (isF ? FWD_A_RATE : DEF_A_RATE);

    // Goals (60%) + assists (40%), normalized
    const normOff = (gpg / eraG) * 0.6 + (apg / eraA) * 0.4;

    // D contribute ~55% as much to GF as forwards
    offScore += normOff * (isF ? 1.0 : 0.55);

    // +/- normalized by era scoring rate; D weighted more for defensive purposes
    pmSum += (pmg / egpg) * (isF ? 0.30 : 1.0);
  }

  // Map to 0–60: average team (4.1) → 30; elite (≥9.0) → 60
  const offNorm = Math.min(60, (offScore / 4.1) * 30);

  // ─── DEFENSE ───────────────────────────────────────────────────────────────
  // Goalie: SV% vs era (40%), GAA vs era (35%), shutout rate (10%)
  // Skater +/-: era-normalized sum (15%)
  let goalieScore = 18; // baseline = average goalie

  if (goalie && isGoalieStats(goalie.stats)) {
    const era     = ERA_AVERAGES[goalie.decade] ?? ERA_AVERAGES['2010s'];
    const svDiff  = goalie.stats.savePct - era.savePct;          // positive = better
    const gaaGain = (era.goalsPerGame - goalie.stats.gaa) / era.goalsPerGame; // positive = better
    const soRate  = goalie.stats.shutouts / goalie.stats.gp;

    goalieScore = 18
      + svDiff  * 250   // +.020 above era avg → +5 pts
      + gaaGain * 30    // +10% better GAA than era → +3 pts
      + soRate  * 30;   // 1 SO every 10 games → +3 pts bonus
  }

  // Skater +/- bonus: positive means team suppresses goals against
  const pmBonus = Math.min(10, Math.max(-8, pmSum * 15));

  const defNorm = Math.min(40, Math.max(0, goalieScore + pmBonus));

  // ─── COMBINE → STRENGTH SCORE ──────────────────────────────────────────────
  // offNorm: 0–60, defNorm: 0–40 → total: 0–100
  const strengthScore = Math.round(Math.min(100, Math.max(0, offNorm + defNorm)));

  // ─── WIN PROBABILITY ───────────────────────────────────────────────────────
  // Pythagorean expectation: GF² / (GF² + GA²)
  // Map strengthScore to estimated GF/GA, then apply Pythagorean.
  // Calibrated so score=50 → .500, score=100 → ~.911 (~1-in-2000 shot at 82-0).
  const winPct = 0.08 + 0.84 / (1 + Math.exp(-0.09 * (strengthScore - 50)));

  const { wins, losses, otl } = simulate82(winPct);
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
