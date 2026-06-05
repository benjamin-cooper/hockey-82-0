export interface Franchise {
  abbr: string;
  name: string;
  city: string;
  color: string; // primary hex for UI accents
  decades: string[]; // which decades this franchise has data for
}

export const FRANCHISES: Franchise[] = [
  // Original Six
  { abbr: 'MTL', name: 'Canadiens', city: 'Montreal', color: '#AF1E2D', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'TOR', name: 'Maple Leafs', city: 'Toronto', color: '#003E7E', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'BOS', name: 'Bruins', city: 'Boston', color: '#FFB81C', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'DET', name: 'Red Wings', city: 'Detroit', color: '#CE1126', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'CHI', name: 'Blackhawks', city: 'Chicago', color: '#CF0A2C', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'NYR', name: 'Rangers', city: 'New York', color: '#0038A8', decades: ['1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'] },
  // Expansion powerhouses
  { abbr: 'EDM', name: 'Oilers', city: 'Edmonton', color: '#FF4C00', decades: ['1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'PIT', name: 'Penguins', city: 'Pittsburgh', color: '#FCB514', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'PHI', name: 'Flyers', city: 'Philadelphia', color: '#F74902', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'NYI', name: 'Islanders', city: 'New York', color: '#00539B', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'BUF', name: 'Sabres', city: 'Buffalo', color: '#003087', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'STL', name: 'Blues', city: 'St. Louis', color: '#002F87', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'VAN', name: 'Canucks', city: 'Vancouver', color: '#00843D', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'CGY', name: 'Flames', city: 'Calgary', color: '#C8102E', decades: ['1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'NJD', name: 'Devils', city: 'New Jersey', color: '#CE1126', decades: ['1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'COL', name: 'Avalanche', city: 'Colorado', color: '#6F263D', decades: ['1990s','2000s','2010s','2020s'] },
  { abbr: 'DAL', name: 'Stars', city: 'Dallas', color: '#006847', decades: ['1990s','2000s','2010s','2020s'] },
  { abbr: 'LAK', name: 'Kings', city: 'Los Angeles', color: '#A2AAAD', decades: ['1970s','1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'WSH', name: 'Capitals', city: 'Washington', color: '#C8102E', decades: ['1980s','1990s','2000s','2010s','2020s'] },
  { abbr: 'TBL', name: 'Lightning', city: 'Tampa Bay', color: '#002868', decades: ['1990s','2000s','2010s','2020s'] },
  // Historic/defunct (makes draft more interesting/challenging)
  { abbr: 'QUE', name: 'Nordiques', city: 'Quebec', color: '#003DA5', decades: ['1980s','1990s'] },
  { abbr: 'HFD', name: 'Whalers', city: 'Hartford', color: '#007A33', decades: ['1980s','1990s'] },
  { abbr: 'MNS', name: 'North Stars', city: 'Minnesota', color: '#154734', decades: ['1970s','1980s','1990s'] },
  { abbr: 'WIN', name: 'Jets', city: 'Winnipeg (WHA)', color: '#041E42', decades: ['1980s','1990s'] },
];

export const FRANCHISE_MAP = new Map(FRANCHISES.map(f => [f.abbr, f]));

// Era averages for normalization (goals per team per game, league avg SV%)
export const ERA_AVERAGES: Record<string, { goalsPerGame: number; savePct: number; pointsPerGame: number }> = {
  '1950s': { goalsPerGame: 2.55, savePct: 0.920, pointsPerGame: 0.38 },
  '1960s': { goalsPerGame: 3.02, savePct: 0.912, pointsPerGame: 0.44 },
  '1970s': { goalsPerGame: 3.30, savePct: 0.890, pointsPerGame: 0.52 },
  '1980s': { goalsPerGame: 3.90, savePct: 0.872, pointsPerGame: 0.62 },
  '1990s': { goalsPerGame: 2.95, savePct: 0.893, pointsPerGame: 0.52 },
  '2000s': { goalsPerGame: 2.72, savePct: 0.902, pointsPerGame: 0.48 },
  '2010s': { goalsPerGame: 2.73, savePct: 0.911, pointsPerGame: 0.48 },
  '2020s': { goalsPerGame: 3.00, savePct: 0.906, pointsPerGame: 0.52 },
};
