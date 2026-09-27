// Constellations: the long-term collection layer. Every planet you finish
// drops materials depending on the lands it has; spend them to fill bundles
// and light up six constellations in your Homeworld's sky. Nothing random,
// nothing sold: materials only come from playing.
import type { BiomeId, Planet } from '../core/world';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';

export type Mat = 'stone' | 'dew' | 'leaf' | 'ember' | 'frost';
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
    const n = Math.floor((count[m] ?? 0) / 2);
    if (n) out[m] = n + (stars >= 3 ? 1 : 0);
  }
  return out;
}

export function addDrops(p: Profile, d: Partial<Record<Mat, number>>) {
  const mats = { ...p.mats };
  for (const [k, v] of Object.entries(d)) mats[k as Mat] = (mats[k as Mat] ?? 0) + (v ?? 0);
  p.mats = mats;
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

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'otter',
    name: 'The Little Otter',
    stars: [
      [0.2, 0.6],
      [0.4, 0.45],
      [0.6, 0.5],
      [0.8, 0.35],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    bundles: [
      { id: 'otter-1', need: { dew: 6 } },
      { id: 'otter-2', need: { leaf: 5, dew: 3 } },
      { id: 'otter-3', need: { stone: 4, dew: 4 } },
    ],
    reward: { gems: 40, item: 'suit_tide' },
  },
  {
    id: 'mill',
    name: 'The Windmill',
    stars: [
      [0.5, 0.5],
      [0.3, 0.25],
      [0.75, 0.3],
      [0.7, 0.75],
      [0.25, 0.7],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    bundles: [
      { id: 'mill-1', need: { stone: 8 } },
      { id: 'mill-2', need: { leaf: 8 } },
      { id: 'mill-3', need: { stone: 5, ember: 4 } },
      { id: 'mill-4', need: { dew: 6, leaf: 4 } },
    ],
    reward: { gems: 50, item: 'tr_aurora' },
  },
  {
    id: 'ember',
    name: 'The Ember Fox',
    stars: [
      [0.15, 0.7],
      [0.35, 0.55],
      [0.5, 0.3],
      [0.65, 0.55],
      [0.85, 0.4],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    bundles: [
      { id: 'ember-1', need: { ember: 6 } },
      { id: 'ember-2', need: { ember: 6, stone: 6 } },
      { id: 'ember-3', need: { ember: 8, leaf: 5 } },
    ],
    reward: { gems: 50, item: 'suit_ember' },
  },
  {
    id: 'frost',
    name: 'The Snow Whale',
    stars: [
      [0.15, 0.5],
      [0.4, 0.4],
      [0.65, 0.45],
      [0.85, 0.3],
      [0.85, 0.6],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
    bundles: [
      { id: 'frost-1', need: { frost: 6 } },
      { id: 'frost-2', need: { frost: 6, dew: 6 } },
      { id: 'frost-3', need: { frost: 10, stone: 4 } },
    ],
    reward: { gems: 60, item: 'hat_snow' },
  },
  {
    id: 'tree',
    name: 'The World Tree',
    stars: [
      [0.5, 0.85],
      [0.5, 0.55],
      [0.3, 0.35],
      [0.7, 0.35],
      [0.5, 0.15],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
    bundles: [
      { id: 'tree-1', need: { leaf: 12 } },
      { id: 'tree-2', need: { leaf: 8, dew: 8 } },
      { id: 'tree-3', need: { leaf: 10, stone: 6, frost: 4 } },
      { id: 'tree-4', need: { leaf: 10, ember: 6 } },
    ],
    reward: { gems: 80, item: 'l_tree' },
  },
  {
    id: 'crown',
    name: 'The Keeper’s Crown',
    stars: [
      [0.2, 0.7],
      [0.25, 0.35],
      [0.4, 0.55],
      [0.5, 0.25],
      [0.6, 0.55],
      [0.75, 0.35],
      [0.8, 0.7],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
    bundles: [
      { id: 'crown-1', need: { stone: 12, dew: 12 } },
      { id: 'crown-2', need: { leaf: 12, ember: 10 } },
      { id: 'crown-3', need: { frost: 12, stone: 8 } },
      { id: 'crown-4', need: { stone: 8, dew: 8, leaf: 8, ember: 8, frost: 8 } },
    ],
    reward: { gems: 150, item: 'hat_star' },
  },
];

export const CONSTELLATION_BY_ID: Record<string, Constellation> = Object.fromEntries(CONSTELLATIONS.map((c) => [c.id, c]));

/** A constellation is available once the one before it is lit. */
export function unlockedConstellation(p: Profile, i: number) {
  return i === 0 || p.constellations.includes(CONSTELLATIONS[i - 1].id);
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
  const mats = { ...p.mats };
  for (const [m, n] of Object.entries(b.need)) mats[m as Mat] = (mats[m as Mat] ?? 0) - (n ?? 0);
  p.mats = mats;
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
  applyReward(p, c.reward);
  return c.reward;
}

export function constellationsReady(p: Profile) {
  return CONSTELLATIONS.filter(
    (c, i) =>
      unlockedConstellation(p, i) && !p.constellations.includes(c.id) && (constellationFull(p, c) || c.bundles.some((b) => canFill(p, b))),
  ).length;
}
