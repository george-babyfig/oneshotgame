// Explorer Rank: three standing goals at a time; clear all three to rank up (Alto's style).
import type { Profile } from './profile';
import type { Reward } from './progression';
import { t, tp } from '../i18n';

export type RankStat =
  'wins' | 'seen' | 'throws' | 'threeStars' | 'bestLife' | 'chapters' | 'dailies' | 'rushBest' | 'mementos' | 'bestStreak' | 'hardWins';

export interface RankGoal {
  stat: RankStat;
  target: number;
  text: string;
}

const T: Record<RankStat, (n: number) => string> = {
  wins: (n) => t('Complete {n} planets', { n }),
  seen: (n) => t('Discover {n} creatures', { n }),
  throws: (n) => t('Fling {n} objects', { n }),
  threeStars: (n) => t('Get 3★ on {n} planets', { n }),
  bestLife: (n) => t('Reach {n} life on one planet', { n }),
  chapters: (n) => tp(n, 'Open {n} chapter chest', 'Open {n} chapter chests'),
  dailies: (n) => tp(n, 'Play {n} Daily Planet', 'Play {n} Daily Planets'),
  rushBest: (n) => t('Score {n} in Meteor Rush', { n }),
  mementos: (n) => tp(n, 'Collect {n} memento', 'Collect {n} mementos'),
  bestStreak: (n) => t('Reach Momentum ×{n}', { n }),
  hardWins: (n) => tp(n, 'Beat {n} Hard planet', 'Beat {n} Hard planets'),
};

const g = (stat: RankStat, target: number): RankGoal => ({
  stat,
  target,
  get text() {
    return T[stat](target);
  },
});

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
  return t(RANK_TITLES[Math.min(rank, RANK_TITLES.length) - 1]) + (rank > RANK_TITLES.length ? ` ${rank - RANK_TITLES.length + 1}` : '');
}
