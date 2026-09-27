import type { Achievement } from './types';

/** Badges are deliberately few so each one means something. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-game', name: 'First Game', description: 'Play your first game on BALLS.', metric: 'games', threshold: 1, icon: 'flag' },
  { id: 'games-5', name: '5 Games', description: 'Play 5 games.', metric: 'games', threshold: 5, icon: 'five' },
  { id: 'games-10', name: '10 Games', description: 'Play 10 games.', metric: 'games', threshold: 10, icon: 'ten' },
  { id: 'games-50', name: '50 Games', description: 'Play 50 games.', metric: 'games', threshold: 50, icon: 'fifty' },
  { id: 'tournament', name: 'Tournament Player', description: 'Enter a tournament.', metric: 'tournaments', threshold: 1, icon: 'trophy' },
  { id: 'early-bird', name: 'Early Bird', description: 'Play 3 games that start before 09:00.', metric: 'early', threshold: 3, icon: 'sunrise' },
  { id: 'local-legend', name: 'Local Legend', description: 'Play at 10 different venues.', metric: 'venues', threshold: 10, icon: 'pin' },
  { id: 'all-rounder', name: 'All-Rounder', description: 'Play 3 different sports.', metric: 'sports', threshold: 3, icon: 'shapes' },
  { id: 'rock-solid', name: 'Rock Solid', description: 'Keep 95% reliability over 20 games.', metric: 'reliability', threshold: 20, icon: 'shield' },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
