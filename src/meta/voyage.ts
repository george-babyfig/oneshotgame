import { VOYAGE_REWARDS } from './tuning';
// Weekly Voyage: a 7-planet mini-chapter that changes every Monday (same within
// each hemisphere, seeded by the ISO week). Planets unlock one after another, the last
// one has a Comet Guardian, and finishing the whole trip counts toward Voyage
// stickers. Difficulty follows your campaign progress, fixed for the week.
import { budgetFor, goalsMet, makeLevel, pressureOf, skyWall, solve0, solve2, starsFor, type LevelDef } from '../core/levels';
import { lifeScore } from '../core/world';
import { rulesForLevel } from '../core/round';
import { today, type Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { eventFor, isoWeek, legacyEventAtmospherePaid, legacyEventGems, retireEventProgress, weekAtMostOneAhead } from './events';
import type { Hemisphere } from './seasons';
import { unlocked } from './unlocks';
import { grantProfileRoadPoints } from './starroad';

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

export const THEME_PORTS: Record<string, readonly string[]> = {
  volcano: ['Warm Shore', 'Sunny Ridge', 'Firefly Bay', 'Amber Trail', 'Sunstone Point', 'Warm Hollow', 'Volcano Crown'],
  ocean: ['Blue Harbor', 'Shell Bay', 'Shell Pool', 'Pearl Cove', 'Sea Lantern', 'Moon Lagoon', 'Ocean Crown'],
  bloom: ['Petal Path', 'Meadow Gate', 'Fern Glade', 'Flower Hill', 'Orchard', 'Blossom Grove', 'Garden Crown'],
  critter: ['Pawprint Port', 'Bunny Burrow', 'Fox Hollow', 'Otter Cove', 'Nest Hill', 'Friendship Grove', 'Critter Crown'],
  frost: ['Snowdrop Port', 'Ice Cove', 'Pine Trail', 'Crystal Lake', 'Frostlight', 'Aurora Ridge', 'Winter Crown'],
  star: ['Starlight Port', 'Comet Cove', 'Moon Hill', 'Starlit Path', 'Nebula Bay', 'Aurora Arch', 'Starlit Summit'],
};

const THEME_HUES: Record<string, number> = { volcano: 24, ocean: 205, bloom: 125, critter: 38, frost: 190, star: 275 };
const BONUS_GEMS = 80; // About 130/week with the old Voyage's 45, while new gem sinks cover free supply.
const REPEAT_ATMOSPHERE_DUST = 1125; // 150-gem atmosphere at the economy's 7.5 dust/gem median.
const RETIRED_EVENT_DUST_PER_STOP = 175; // Replaces roughly 9,600 dust per 60 days from retired Events.

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
  const saved = p.voyage as Profile['voyage'] & { hemisphere?: Hemisphere };
  if (saved.hemisphere !== 'north' && saved.hemisphere !== 'south') saved.hemisphere = p.settings.hemi;
  const legacyGems = p.event.week === p.voyage.week ? retireEventProgress(p) : 0;
  if (!p.voyage.legacyCatchUpPaid && p.voyage.cleared > 0) {
    const bonus = Math.max(0, BONUS_GEMS - legacyGems);
    const catchUp = Math.floor((bonus * p.voyage.cleared) / VOYAGE_LEN);
    if (catchUp) applyReward(p, { gems: catchUp }, 'voyage');
    if (p.voyage.cleared === VOYAGE_LEN && !legacyEventAtmospherePaid(p, p.voyage.week))
      applyReward(p, { skin: eventFor(p.voyage.week, voyageHemisphere(p)).skin }, 'voyage');
  }
  p.voyage.legacyCatchUpPaid = true;
  return p.voyage;
}

/** A child's open route keeps the hemisphere chosen when it began. */
export function voyageHemisphere(p: Profile): Hemisphere {
  return (p.voyage as Profile['voyage'] & { hemisphere?: Hemisphere }).hemisphere ?? p.settings.hemi;
}

function weekNum(week: string) {
  const [y, w] = week.split('-W').map(Number);
  return y * 53 + w;
}

export function voyageName(week: string) {
  return VOYAGE_NAMES[weekNum(week) % VOYAGE_NAMES.length];
}

export function portName(week: string, i: number, hemisphere: Hemisphere = 'north') {
  if (week > '2026-W44') return THEME_PORTS[eventFor(week, hemisphere).id][i];
  return PORTS[(weekNum(week) * 3 + i) % PORTS.length];
}

const stopCache = new Map<string, LevelDef>();

/** Stop i (0-based): a little harder each stop; the last has a Comet Guardian. */
export function voyageLevel(week: string, base: number, i: number, taught = base + i * 2, hemisphere: Hemisphere = 'north'): LevelDef {
  const key = JSON.stringify([week, base, i, taught, hemisphere]);
  const cached = stopCache.get(key);
  if (cached) return structuredClone(cached);
  const n = base + i * 2;
  const options = {
    goals: true,
    boss: i === VOYAGE_LEN - 1,
    rules: rulesForLevel(Math.min(n, taught)),
    obstacleCap: taught,
  };
  const theme = week > '2026-W44' ? eventFor(week, hemisphere) : undefined;
  const seed = theme ? `VOY-${week}-${theme.id}-${i}` : `VOY-${week}-${i}`;
  const first = makeLevel(n, seed, options);
  let L = first;
  // Keep trips already open to children fixed; later weeks redraw solver traps.
  if (week > '2026-W43') {
    let found = false;
    for (let salt = 0; salt <= 256; salt++) {
      if (salt) L = makeLevel(n, seed, { ...options, salt });
      if (week > '2026-W44' && (pressureOf(L) > budgetFor(L) || skyWall(L))) continue;
      const blind = solve0(L);
      const aware = solve2(L);
      if (
        goalsMet(blind, L.goals) &&
        starsFor(lifeScore(blind), L.stars) >= 1 &&
        goalsMet(aware, L.goals) &&
        starsFor(lifeScore(aware), L.stars) >= 1
      ) {
        found = true;
        break;
      }
      // Never break the Voyage screen: serve the first draw. The nightly pre-flight
      // sweeps two years ahead, so a stop like this is caught long before it opens.
    }
    if (!found) L = first;
  }
  if (theme) {
    const blind = solve0(L);
    const aware = solve2(L);
    const common = theme.biomes?.find(
      (biome) => blind.sectors.some((sector) => sector.biome === biome) && aware.sectors.some((sector) => sector.biome === biome),
    );
    const creature = theme.creatures
      ? blind.sectors.find((sector) => sector.species && aware.sectors.some((other) => other.species === sector.species))?.species
      : undefined;
    // A shared solved outcome gives the theme an actual land or creature goal without making a stop unwinnable.
    if (common || creature) {
      const themedGoal = { type: common ? ('biome' as const) : ('species' as const), id: (common ?? creature)!, count: 1 };
      // Replace one ordinary goal so the theme changes play without raising difficulty pressure.
      L = { ...L, goals: L.goals.length ? [themedGoal, ...L.goals.slice(1)] : [themedGoal] };
    }
  }
  const stop = {
    ...L,
    name: portName(week, i, hemisphere),
    ...(theme ? { hue: THEME_HUES[theme.id] } : {}),
  };
  stopCache.set(key, stop);
  return structuredClone(stop);
}

export function voyageUnlocked(p: Profile, i: number) {
  return i <= p.voyage.cleared;
}

export function stopReward(p: Profile, i: number): Reward {
  const v = p.voyage;
  const bonus = Math.max(0, BONUS_GEMS - legacyEventGems(p, v.week));
  const gems = Math.floor((bonus * (i + 1)) / VOYAGE_LEN) - Math.floor((bonus * i) / VOYAGE_LEN);
  const finalAtmosphere = i === VOYAGE_LEN - 1 && !legacyEventAtmospherePaid(p, v.week);
  const atmosphere = finalAtmosphere ? eventFor(v.week, voyageHemisphere(p)).skin : undefined;
  return {
    ...VOYAGE_REWARDS[i],
    dust:
      (VOYAGE_REWARDS[i].dust ?? 0) +
      RETIRED_EVENT_DUST_PER_STOP +
      (atmosphere && p.skins.includes(atmosphere) ? REPEAT_ATMOSPHERE_DUST : 0),
    gems: (VOYAGE_REWARDS[i].gems ?? 0) + gems,
    ...(atmosphere && !p.skins.includes(atmosphere) ? { skin: atmosphere } : {}),
  };
}

/**
 * Record a finished stop. The first clear pays the stop reward and opens the
 * next one; replays only keep the best stars.
 */
export function clearStop(p: Profile, i: number, stars: number, day?: string): { reward: Reward | null; done: boolean } {
  ensureVoyage(p, p.voyage.week);
  const v = p.voyage;
  if (stars < 1 || i < 0 || i >= VOYAGE_LEN || i > v.cleared) return { reward: null, done: false };
  const s = [...v.stars];
  const newStars = Math.max(0, stars - (s[i] ?? 0));
  if (newStars)
    grantProfileRoadPoints(p, { source: 'voyage', date: day ?? today(), earningKey: `stop:${v.week}:${i}:best:${stars}`, delta: newStars });
  s[i] = Math.max(s[i] ?? 0, stars);
  v.stars = s;
  if (i < v.cleared) return { reward: null, done: false };
  v.cleared = i + 1;
  const reward = stopReward(p, i);
  applyReward(p, reward, 'voyage');
  const done = v.cleared === VOYAGE_LEN;
  if (done) p.voyageDone++;
  return { reward, done };
}

export function voyageStars(p: Profile) {
  return p.voyage.stars.reduce((a, b) => a + (b ?? 0), 0);
}
