export type Position = 'C' | 'LW' | 'RW' | 'LD' | 'RD' | 'G';

export const FORWARD_POSITIONS: Position[] = ['C', 'LW', 'RW'];
export const DEFENSE_POSITIONS: Position[] = ['LD', 'RD'];

/** Which roster slots a player is eligible for based on their natural position.
 *  Forwards play their specific position (C≠LW≠RW).
 *  Defensemen can swap sides (LD↔RD) since the physical demands are similar.
 *  Multi-position data (player.positions[]) can override this in future scrapes. */
export function eligibleSlots(playerPosition: Position): Position[] {
  if (DEFENSE_POSITIONS.includes(playerPosition)) return DEFENSE_POSITIONS;
  return [playerPosition]; // C→C, LW→LW, RW→RW, G→G
}

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
  position: Position;           // primary / display position
  positions: Position[];        // all positions ever recorded (enables real multi-pos eligibility)
  franchise: string;
  franchiseAbbr: string;
  decade: string;
  stats: PlayerStats;
  strengthScore: number;
}

export interface DraftSlot {
  position: Position;
  franchise: string;
  franchiseAbbr: string;
  decade: string;
  player: Player | null;
}

/** A player as drafted — includes the slot they were drafted into (may differ from their natural position) */
export interface DraftedPlayer extends Player {
  slotPosition: Position; // the roster slot they were picked for
}

export interface TeamResult {
  players: DraftedPlayer[];
  wins: number;
  losses: number;
  otl: number;
  points: number; // 2*W + OTL
  rating: string; // 'DYNASTY' | 'CONTENDER' | 'PLAYOFF TEAM' | 'BUBBLE' | 'REBUILD'
  strengthScore: number;
}
