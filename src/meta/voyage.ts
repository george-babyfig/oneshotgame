// Weekly Voyage: a 7-planet mini-chapter that changes every Monday (same for
// everyone, seeded by the ISO week). Planets unlock one after another, the last
// one has a Comet Guardian, and finishing the whole trip counts toward Voyage
// stickers. Difficulty follows your campaign progress, fixed for the week.
import { makeLevel, type LevelDef } from '../core/levels';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { isoWeek } from './events';

export const VOYAGE_LEN = 7;
export const VOYAGE_UNLOCK_LEVEL = 12;

/** Paid the first time each stop is cleared this week. */
export const VOYAGE_REWARDS: Reward[] = [
  { dust: 150 },
  { dust: 200 },
  { gems: 5 },
  { dust: 300, boosters: { spark: 1 } },
  { gems: 10 },
  { dust: 400, boosters: { shower: 1 } },
  { gems: 30, dust: 600 },
];

/** Stop names for the map, one set per week. */
export const PORTS = ['Harbor', 'Reef', 'Lighthouse', 'Lagoon', 'Beacon', 'Drift', 'Summit', 'Haven', 'Cove', 'Isle'];
export const VOYAGE_NAMES = [
  'Comet Trail',
  'Moonwake',
  'Nebula Loop',
  'Starlit Sea',
  'Dust Road',
  'Aurora Run',
  'Sunward Arc',
  'Dreamdrift',
];

export function voyageActive(p: Profile) {
  return p.level >= VOYAGE_UNLOCK_LEVEL;
}

/** Campaign level the week's first stop plays like (clamped so it stays fair). */
export function voyageBase(level: number) {
  return Math.max(8, Math.min(55, level - 4));
}

export function ensureVoyage(p: Profile, week = isoWeek()) {
  if (p.voyage.week !== week) p.voyage = { week, base: voyageBase(p.level), cleared: 0, stars: [] };
  return p.voyage;
}

function weekNum(week: string) {
  const [y, w] = week.split('-W').map(Number);
  return y * 53 + w;
}

export function voyageName(week: string) {
  return VOYAGE_NAMES[weekNum(week) % VOYAGE_NAMES.length];
}

export function portName(week: string, i: number) {
  return PORTS[(weekNum(week) * 3 + i) % PORTS.length];
}

/** Stop i (0-based): a little harder each stop; the last has a Comet Guardian. */
export function voyageLevel(week: string, base: number, i: number): LevelDef {
  const L = makeLevel(base + i * 2, `VOY-${week}-${i}`, { goals: true, boss: i === VOYAGE_LEN - 1 });
  return { ...L, name: portName(week, i) };
}

export function voyageUnlocked(p: Profile, i: number) {
  return i <= p.voyage.cleared;
}

/**
 * Record a finished stop. The first clear pays the stop reward and opens the
 * next one; replays only keep the best stars.
 */
export function clearStop(p: Profile, i: number, stars: number): { reward: Reward | null; done: boolean } {
  const v = p.voyage;
  if (stars < 1 || i < 0 || i >= VOYAGE_LEN || i > v.cleared) return { reward: null, done: false };
  const s = [...v.stars];
  s[i] = Math.max(s[i] ?? 0, stars);
  v.stars = s;
  if (i < v.cleared) return { reward: null, done: false };
  v.cleared = i + 1;
  const reward = VOYAGE_REWARDS[i];
  applyReward(p, reward);
  const done = v.cleared === VOYAGE_LEN;
  if (done) p.voyageDone++;
  return { reward, done };
}

export function voyageStars(p: Profile) {
  return p.voyage.stars.reduce((a, b) => a + (b ?? 0), 0);
}
