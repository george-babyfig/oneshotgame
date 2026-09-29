import { VOYAGE_REWARDS } from './tuning';
// Weekly Voyage: a 7-planet mini-chapter that changes every Monday (same for
// everyone, seeded by the ISO week). Planets unlock one after another, the last
// one has a Comet Guardian, and finishing the whole trip counts toward Voyage
// stickers. Difficulty follows your campaign progress, fixed for the week.
import { makeLevel, type LevelDef } from '../core/levels';
import { rulesForLevel } from '../core/round';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { isoWeek, weekAtMostOneAhead } from './events';
import { unlocked } from './unlocks';
import { addRoadPoints } from './roadpoints';

export const VOYAGE_LEN = 7;
export { VOYAGE_UNLOCK_LEVEL } from './unlocks';

/** Paid the first time each stop is cleared this week. */
export { VOYAGE_REWARDS } from './tuning';

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
  return unlocked(p, 'voyage');
}

/** Campaign level the week's first stop plays like (clamped so it stays fair). */
export function voyageBase(level: number) {
  return Math.max(8, Math.min(55, level - 4));
}

export function ensureVoyage(p: Profile, week = isoWeek()) {
  if (week > p.voyage.week || (week < p.voyage.week && !weekAtMostOneAhead(p.voyage.week, week)))
    p.voyage = { week, base: voyageBase(p.level), cleared: 0, stars: [] };
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
export function voyageLevel(week: string, base: number, i: number, taught = base + i * 2): LevelDef {
  const L = makeLevel(base + i * 2, `VOY-${week}-${i}`, {
    goals: true,
    boss: i === VOYAGE_LEN - 1,
    rules: rulesForLevel(Math.min(base + i * 2, taught)),
  });
  return { ...L, name: portName(week, i) };
}

export function voyageUnlocked(p: Profile, i: number) {
  return i <= p.voyage.cleared;
}

/**
 * Record a finished stop. The first clear pays the stop reward and opens the
 * next one; replays only keep the best stars.
 */
export function clearStop(p: Profile, i: number, stars: number, day?: string): { reward: Reward | null; done: boolean } {
  const v = p.voyage;
  if (stars < 1 || i < 0 || i >= VOYAGE_LEN || i > v.cleared) return { reward: null, done: false };
  const s = [...v.stars];
  addRoadPoints(p, Math.max(0, stars - (s[i] ?? 0)), day);
  s[i] = Math.max(s[i] ?? 0, stars);
  v.stars = s;
  if (i < v.cleared) return { reward: null, done: false };
  v.cleared = i + 1;
  const reward = VOYAGE_REWARDS[i];
  applyReward(p, reward, 'voyage');
  const done = v.cleared === VOYAGE_LEN;
  if (done) p.voyageDone++;
  return { reward, done };
}

export function voyageStars(p: Profile) {
  return p.voyage.stars.reduce((a, b) => a + (b ?? 0), 0);
}
