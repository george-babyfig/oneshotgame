// Explorer Rank: three standing goals at a time; clear all three to rank up (Alto's style).
import type { Profile } from './profile';
import type { Reward } from './progression';

export type RankStat =
  'wins' | 'seen' | 'throws' | 'threeStars' | 'bestLife' | 'chapters' | 'dailies' | 'rushBest' | 'mementos' | 'bestStreak' | 'hardWins';

export interface RankGoal {
  stat: RankStat;
  target: number;
  text: string;
}

const T: Record<RankStat, (n: number) => string> = {
  wins: (n) => `Complete ${n} planets`,
  seen: (n) => `Discover ${n} creatures`,
  throws: (n) => `Fling ${n} objects`,
  threeStars: (n) => `Get 3★ on ${n} planets`,
  bestLife: (n) => `Reach ${n} life on one planet`,
  chapters: (n) => `Open ${n} chapter chest${n > 1 ? 's' : ''}`,
  dailies: (n) => `Play ${n} Daily Planet${n > 1 ? 's' : ''}`,
  rushBest: (n) => `Score ${n} in Meteor Rush`,
  mementos: (n) => `Collect ${n} memento${n > 1 ? 's' : ''}`,
  bestStreak: (n) => `Reach Momentum ×${n}`,
  hardWins: (n) => `Beat ${n} Hard planet${n > 1 ? 's' : ''}`,
};

const g = (stat: RankStat, target: number): RankGoal => ({ stat, target, text: T[stat](target) });

// Hand-written early ranks teach the game; later ones are generated.
const HAND: RankGoal[][] = [
  [g('wins', 2), g('seen', 2), g('throws', 20)],
  [g('wins', 5), g('seen', 5), g('threeStars', 1)],
  [g('bestStreak', 2), g('seen', 8), g('bestLife', 80)],
  [g('dailies', 1), g('hardWins', 1), g('throws', 150)],
  [g('chapters', 1), g('rushBest', 150), g('mementos', 1)],
  [g('wins', 15), g('seen', 14), g('threeStars', 6)],
  [g('bestStreak', 3), g('dailies', 3), g('bestLife', 160)],
  [g('hardWins', 3), g('mementos', 3), g('rushBest', 300)],
];

export function rankGoals(rank: number): RankGoal[] {
  if (rank <= HAND.length) return HAND[rank - 1];
  const k = rank - HAND.length;
  return [g('wins', 15 + k * 5), g('seen', Math.min(36, 14 + k * 2)), g('threeStars', 6 + k * 2)];
}

export function statValue(p: Profile, s: RankStat): number {
  switch (s) {
    case 'seen':
      return p.seen.length;
    case 'chapters':
      return p.chapters.length;
    case 'mementos':
      return p.mementos.length;
    default:
      return p.stats[s];
  }
}

export function rankProgress(p: Profile) {
  return rankGoals(p.rank).map((goal) => ({
    goal,
    value: Math.min(goal.target, statValue(p, goal.stat)),
    done: statValue(p, goal.stat) >= goal.target,
  }));
}

export function rankReady(p: Profile) {
  return rankProgress(p).every((x) => x.done);
}

export function rankReward(rank: number): Reward {
  return { gems: 20 + rank * 5, dust: 150 * rank, boosters: rank % 2 ? { shower: 1 } : { spark: 1, scope: 1 } };
}

/** What a rank unlocks when you reach it. */
export const RANK_UNLOCKS: Record<number, string> = {
  2: 'Daily Planet',
  3: 'Meteor Rush',
  4: 'Zen Garden',
  5: 'Challenge a Friend',
};

export function unlocked(p: Profile, feature: 'daily' | 'rush' | 'zen' | 'challenge') {
  const need = { daily: 2, rush: 3, zen: 4, challenge: 5 }[feature];
  return p.rank >= need;
}

export const RANK_TITLES = [
  'Stargazer',
  'Pebble Tosser',
  'Cloud Shaper',
  'World Gardener',
  'Sky Sculptor',
  'Planet Keeper',
  'Star Warden',
  'Cosmic Architect',
];
export function rankTitle(rank: number) {
  return RANK_TITLES[Math.min(rank, RANK_TITLES.length) - 1] + (rank > RANK_TITLES.length ? ` ${rank - RANK_TITLES.length + 1}` : '');
}
