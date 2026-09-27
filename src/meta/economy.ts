// Pure game-economy rules. Everything here mutates a Profile and returns what
// happened, so the UI can celebrate it and tests can pin it down.
import { BIOMES, type Planet } from '../core/world';
import { PIGGY_MAX, PIGGY_PER_WIN, PRODUCT_BY_ID, VAULT_HOURS, DAILY_GEMS, GEMS_PER_NEW_SPECIES } from './config';
import { dayGap, type GalaxyPlanet, type Profile } from './profile';
import { questEvent, type QuestEvent } from './progression';

/** Stardust per hour produced by one galaxy planet. */
export function planetRate(g: Pick<GalaxyPlanet, 'stars' | 'species'>) {
  return 6 + g.stars * 3 + g.species.length * 2;
}

export function galaxyRate(p: Profile) {
  return p.galaxy.reduce((a, g) => a + planetRate(g), 0);
}

export function vaultHours(p: Profile) {
  return VAULT_HOURS[Math.min(p.upgrades.vault, VAULT_HOURS.length - 1)];
}

export function pendingDust(p: Profile, now = Date.now()) {
  const hours = Math.min(vaultHours(p), Math.max(0, now - p.lastCollect) / 3600000);
  return Math.floor(galaxyRate(p) * hours);
}

/** Time (ms epoch) at which the vault will be full. */
export function vaultFullAt(p: Profile) {
  return p.lastCollect + vaultHours(p) * 3600000;
}

export function collectDust(p: Profile, now = Date.now(), multiplier = 1) {
  const d = pendingDust(p, now) * multiplier;
  if (d <= 0) return 0;
  p.dust += d;
  p.lastCollect = now;
  track(p, 'collect');
  return d;
}

export interface LevelOutcome {
  dust: number;
  gems: number;
  firstClear: boolean;
  newStars: number; // stars gained over previous best
  entry: GalaxyPlanet;
  unlockedLevel: boolean;
}

export function planetColors(planet: Planet) {
  const counts = new Map<string, number>();
  for (const s of planet.sectors) if (s.biome !== 'barren') counts.set(BIOMES[s.biome].color, (counts.get(BIOMES[s.biome].color) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([c]) => c);
}

/** Record a won campaign level. */
export function applyLevelWin(
  p: Profile,
  n: number,
  stars: number,
  score: number,
  planet: Planet,
  name: string,
  hue: number,
): LevelOutcome {
  const prev = p.stars[n] ?? 0;
  const firstClear = prev === 0;
  const newStars = Math.max(0, stars - prev);
  const dust = 25 + stars * 15 + (firstClear ? 40 : 0);
  const gems = stars === 3 && prev < 3 ? 2 : 0;
  p.stars[n] = Math.max(prev, stars);
  p.dust += dust;
  p.gems += gems;
  p.piggy = Math.min(PIGGY_MAX, p.piggy + PIGGY_PER_WIN);
  p.stats.wins++;
  p.stats.bestLife = Math.max(p.stats.bestLife, score);
  if (stars === 3 && prev < 3) p.stats.threeStars++;
  const entry: GalaxyPlanet = {
    n,
    name,
    hue,
    stars: p.stars[n],
    species: [...planet.speciesFound],
    life: score,
    colors: planetColors(planet),
  };
  const i = p.galaxy.findIndex((g) => g.n === n);
  if (i >= 0) {
    if (score >= p.galaxy[i].life) p.galaxy[i] = entry;
    else p.galaxy[i].stars = p.stars[n];
  } else {
    if (!p.galaxy.length) p.lastCollect = Date.now();
    p.galaxy.push(entry);
  }
  const unlockedLevel = n === p.level;
  if (unlockedLevel) p.level++;
  track(p, 'win');
  if (newStars) track(p, 'star', newStars);
  if (stars === 3) track(p, 'three');
  return { dust, gems, firstClear, newStars, entry, unlockedLevel };
}

/** First-time Lifebook discovery. Returns false if it was already known. */
export function discoverSpecies(p: Profile, id: string): boolean {
  if (p.seen.includes(id)) return false;
  p.seen.push(id);
  p.gems += GEMS_PER_NEW_SPECIES;
  return true;
}

/** Daily login streak. Returns the gift to show, or null if already claimed today. */
export function dailyGift(p: Profile, day: string): { streak: number; index: number; gems: number } | null {
  if (p.daily.last === day) return null;
  const gap = p.daily.last ? dayGap(p.daily.last, day) : 99;
  const streak = gap === 1 ? p.daily.streak + 1 : 1;
  const index = (streak - 1) % DAILY_GEMS.length;
  return { streak, index, gems: DAILY_GEMS[index] };
}

export function claimDailyGift(p: Profile, day: string) {
  const g = dailyGift(p, day);
  if (!g) return 0;
  p.daily = { last: day, streak: g.streak };
  p.gems += g.gems;
  return g.gems;
}

/** Apply a completed store transaction exactly once. Returns gems granted or null if ignored. */
export function grantProduct(p: Profile, productId: string, txId: string): { gems: number; title: string } | null {
  const def = PRODUCT_BY_ID[productId];
  if (!def || p.processedTx.includes(txId)) return null;
  p.processedTx = [...p.processedTx.slice(-200), txId];
  let gems = def.gems;
  switch (def.key) {
    case 'piggy':
      gems = p.piggy;
      p.piggy = 0;
      break;
    case 'starter':
      if (p.starter) gems = 0;
      else for (const k of Object.keys(p.boosters) as (keyof Profile['boosters'])[]) p.boosters[k] += 5;
      p.starter = true;
      if (!p.skins.includes('aurora')) p.skins.push('aurora');
      break;
    case 'pass':
      if (p.pass) gems = 0;
      p.pass = true;
      break;
  }
  p.gems += gems;
  return { gems, title: def.title };
}

export function spendGems(p: Profile, n: number) {
  if (p.gems < n) return false;
  p.gems -= n;
  return true;
}

export function spendDust(p: Profile, n: number) {
  if (p.dust < n) return false;
  p.dust -= n;
  return true;
}

/** Quest tracking helper (keeps call sites short). */
export function track(p: Profile, ev: QuestEvent, amount = 1) {
  return questEvent(p, ev, amount);
}
