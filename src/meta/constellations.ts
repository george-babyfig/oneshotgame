import { MATERIAL_DROP } from './tuning';
import { CONSTELLATIONS } from './tuning';
import { earn, spend, type EarnSource } from './wallet';
// Constellations: the long-term collection layer. Every planet you finish
// drops materials depending on the lands it has; spend them to fill bundles
// and light up six constellations in your Homeworld's sky. Nothing random,
// nothing sold: materials only come from playing.
import type { BiomeId, Planet } from '../core/world';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { unlocked } from './unlocks';

export type Mat = 'stone' | 'dew' | 'leaf' | 'ember' | 'frost';
export type Essence = Mat;
export const MATS: Mat[] = ['stone', 'dew', 'leaf', 'ember', 'frost'];
export const MAT_EMOJI: Record<Mat, string> = { stone: '🪨', dew: '💧', leaf: '🌿', ember: '🔥', frost: '❄️' };
export const MAT_NAMES: Record<Mat, string> = { stone: 'Stone', dew: 'Dew', leaf: 'Leaf', ember: 'Ember', frost: 'Frost' };

const FROM: Partial<Record<BiomeId, Mat>> = {
  mountain: 'stone',
  highland: 'stone',
  ocean: 'dew',
  reef: 'dew',
  springs: 'dew',
  swamp: 'dew',
  meadow: 'leaf',
  forest: 'leaf',
  jungle: 'leaf',
  marsh: 'leaf',
  savanna: 'leaf',
  desert: 'ember',
  volcano: 'ember',
  icesheet: 'frost',
  tundra: 'frost',
  taiga: 'frost',
};

/** Materials a finished planet drops: one per 2 regions of a land, +1 per star. */
export function dropsFor(planet: Planet, stars: number): Partial<Record<Mat, number>> {
  const count: Partial<Record<Mat, number>> = {};
  for (const s of planet.sectors) {
    const m = FROM[s.biome];
    if (m) count[m] = (count[m] ?? 0) + 1;
  }
  const out: Partial<Record<Mat, number>> = {};
  for (const m of MATS) {
    const n = m === 'frost' ? (count[m] ?? 0) * MATERIAL_DROP.frostPerRegion : Math.floor((count[m] ?? 0) / MATERIAL_DROP.regionsPerDrop);
    if (n) out[m] = n + (m !== 'frost' && stars >= 3 ? MATERIAL_DROP.threeStarBonus : 0);
  }
  return out;
}

export function essenceDropsFor(planet: Planet, stars: number, firstClear: boolean): Partial<Record<Mat, number>> {
  const full = dropsFor(planet, stars);
  if (firstClear) {
    // First discoveries help the scarce Rock colour and the Seed/Sun shared colour.
    const discoveryBonus = stars >= 3 ? 4 : stars >= 2 ? 2 : 0;
    if (discoveryBonus) for (const mat of ['stone', 'leaf'] as const) if (full[mat]) full[mat] += discoveryBonus;
    return full;
  }
  return Object.fromEntries(
    Object.entries(full)
      .map(([mat, amount]) => [mat, Math.floor(amount / 2)] as const)
      .filter(([, amount]) => amount > 0),
  );
}

export function addDrops(p: Profile, d: Partial<Record<Mat, number>>, source: EarnSource = 'material_drop') {
  for (const [k, v] of Object.entries(d)) earn(p, k as Mat, v ?? 0, source);
}

export interface Bundle {
  id: string;
  need: Partial<Record<Mat, number>>;
}

export interface Constellation {
  id: string;
  name: string;
  /** Star positions (0..1) and the lines between them, for drawing. */
  stars: [number, number][];
  lines: [number, number][];
  bundles: Bundle[];
  reward: Reward;
}

export { CONSTELLATIONS } from './tuning';

export const CONSTELLATION_BY_ID: Record<string, Constellation> = Object.fromEntries(CONSTELLATIONS.map((c) => [c.id, c]));

/** The Atlas keeps two neighbouring unfinished constellations open. */
export function unlockedConstellation(p: Profile, i: number) {
  const first = CONSTELLATIONS.findIndex((c) => !p.constellations.includes(c.id));
  if (i < 0 || i >= CONSTELLATIONS.length) return false;
  if (p.constellations.includes(CONSTELLATIONS[i].id)) return true;
  if (first < 0) return false;
  return i >= first && i < first + (unlocked(p, 'star_atlas') ? 2 : 1);
}

export function bundleDone(p: Profile, id: string) {
  return p.bundles.includes(id);
}

export function canFill(p: Profile, b: Bundle) {
  if (bundleDone(p, b.id)) return false;
  return Object.entries(b.need).every(([m, n]) => (p.mats[m as Mat] ?? 0) >= (n ?? 0));
}

export function fillBundle(p: Profile, cid: string, bid: string): boolean {
  const c = CONSTELLATION_BY_ID[cid];
  const i = CONSTELLATIONS.indexOf(c);
  const b = c?.bundles.find((x) => x.id === bid);
  if (!c || !b || !unlockedConstellation(p, i) || !canFill(p, b)) return false;
  for (const [m, n] of Object.entries(b.need)) spend(p, m as Mat, n ?? 0, 'bundle');
  p.bundles = [...p.bundles, b.id];
  return true;
}

export function constellationFull(p: Profile, c: Constellation) {
  return c.bundles.every((b) => bundleDone(p, b.id));
}

/** Light a finished constellation and pay its reward (once). */
export function lightConstellation(p: Profile, cid: string): Reward | null {
  const c = CONSTELLATION_BY_ID[cid];
  if (!c || p.constellations.includes(cid) || !constellationFull(p, c)) return null;
  p.constellations = [...p.constellations, cid];
  applyReward(p, c.reward, 'constellation');
  return c.reward;
}

export function constellationsReady(p: Profile) {
  return CONSTELLATIONS.filter(
    (c, i) =>
      unlockedConstellation(p, i) && !p.constellations.includes(c.id) && (constellationFull(p, c) || c.bundles.some((b) => canFill(p, b))),
  ).length;
}
