export type Position = 'C' | 'LW' | 'RW' | 'LD' | 'RD' | 'G';

export const POSITIONS: Position[] = ['C', 'LW', 'RW', 'LD', 'RD', 'G'];

export const POSITION_LABELS: Record<Position, string> = {
  C: 'Center',
  LW: 'Left Wing',
  RW: 'Right Wing',
  LD: 'Left Defense',
  RD: 'Right Defense',
  G: 'Goalie',
};

export interface SkaterStats {
  gp: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pointsPerGame: number;
}

export interface GoalieStats {
  gp: number;
  wins: number;
  gaa: number;
  savePct: number;
  shutouts: number;
}

export type PlayerStats = SkaterStats | GoalieStats;

export function isGoalieStats(stats: PlayerStats): stats is GoalieStats {
  return 'savePct' in stats;
}

export interface Player {
  id: number;
  name: string;
  initials: string;
  position: Position;
  franchise: string;
  franchiseAbbr: string;
  decade: string;
  stats: PlayerStats;
  strengthScore: number; // normalized 0-100
}

export interface DraftSlot {
  position: Position;
  franchise: string;
  franchiseAbbr: string;
  decade: string;
  player: Player | null;
}

export interface TeamResult {
  players: Player[];
  wins: number;
  losses: number;
  otl: number;
  points: number; // 2*W + OTL
  rating: string; // 'DYNASTY' | 'CONTENDER' | 'PLAYOFF TEAM' | 'BUBBLE' | 'REBUILD'
  strengthScore: number;
}
