import { MILESTONE_REWARD } from './tuning';
import { ALBUM_PAGES } from './tuning';
// Sticker Album: every sticker is earned by doing something specific
// (discovering a creature, a festival, a finished Voyage, a feat). No packs, no
// duplicates, no randomness. Stickers you own can be placed freely on three
// scrapbook pages, with unlockable paper backgrounds, and shared as a picture.
import { SPECIES } from '../core/world';
import type { Profile } from './profile';
import { FESTIVALS } from './festivals';
import { STUDIED_AT } from './lore';
import { applyReward, type Reward } from './progression';

export type StickerKind = 'critter' | 'fest' | 'voyage' | 'feat';

export interface Sticker {
  id: string;
  kind: StickerKind;
  name: string;
  /** What the art draws: a species id, festival id, voyage count or feat icon. */
  art: string;
  /** How to earn it: an English template and its values. */
  hint: [string, Record<string, string | number>?];
  earned: (p: Profile) => boolean;
}

export const VOYAGE_MARKS: { n: number; name: string }[] = [
  { n: 1, name: 'First Voyage' },
  { n: 3, name: 'Explorer’s Compass' },
  { n: 5, name: 'Star Navigator' },
  { n: 10, name: 'Captain’s Wheel' },
  { n: 20, name: 'Galaxy Mapmaker' },
];

interface Feat {
  id: string;
  name: string;
  hint: string;
  n?: number;
  earned: (p: Profile) => boolean;
}

const FEATS: Feat[] = [
  { id: 'guardian', name: 'Guardian Tamer', hint: 'Defeat a Comet Guardian', earned: (p) => p.bosses.length > 0 },
  { id: 'atlas', name: 'Stargazer', hint: 'Light a constellation', earned: (p) => p.constellations.length > 0 },
  { id: 'crown', name: 'Crown of Stars', hint: 'Light all six constellations', earned: (p) => p.constellations.length >= 6 },
  { id: 'calendar', name: 'Full Calendar', hint: 'Collect {n} calendar stamps', n: 28, earned: (p) => p.daily.streak >= 28 },
  { id: 'home', name: 'Worldbuilder', hint: 'Grow your Homeworld to ring {n}', n: 5, earned: (p) => p.home.ring >= 5 },
  { id: 'passport', name: 'Named Explorer', hint: 'Set up your Planet Passport', earned: (p) => p.passport.set },
  {
    id: 'scholar',
    name: 'Field Scholar',
    hint: 'Study a creature ({n} sightings)',
    n: STUDIED_AT,
    earned: (p) => Object.values(p.sightings).some((n) => n >= STUDIED_AT),
  },
  { id: 'perfect', name: 'Perfectionist', hint: 'Earn 3 stars on {n} planets', n: 30, earned: (p) => p.stats.threeStars >= 30 },
  { id: 'dye', name: 'Colour Artist', hint: 'Unlock {n} suit dyes', n: 4, earned: (p) => p.dyes.length >= 4 },
  { id: 'rank', name: 'Seasoned Explorer', hint: 'Reach Explorer Rank {n}', n: 10, earned: (p) => p.rank >= 10 },
];

export const STICKERS: Sticker[] = [
  ...SPECIES.map((s): Sticker => ({
    id: `c_${s.id}`,
    kind: 'critter',
    name: s.name,
    art: s.id,
    hint: ['Discover this creature'],
    earned: (p) => p.seen.includes(s.id),
  })),
  ...FESTIVALS.map((f): Sticker => ({
    id: `f_${f.id}`,
    kind: 'fest',
    name: f.name,
    art: f.id,
    hint: ['Spot costumed critters during {name}', { name: f.name }],
    earned: (p) => p.album.fest.includes(f.id),
  })),
  ...VOYAGE_MARKS.map((v): Sticker => ({
    id: `v_${v.n}`,
    kind: 'voyage',
    name: v.name,
    art: String(v.n),
    hint: v.n === 1 ? ['Finish a Weekly Voyage'] : ['Finish {n} Weekly Voyages', { n: v.n }],
    earned: (p) => p.voyageDone >= v.n,
  })),
  ...FEATS.map((f): Sticker => ({
    id: `k_${f.id}`,
    kind: 'feat',
    name: f.name,
    art: f.id,
    hint: f.n ? [f.hint, { n: f.n }] : [f.hint],
    earned: f.earned,
  })),
];

export const STICKER_BY_ID: Record<string, Sticker> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export interface AlbumPage {
  id: StickerKind;
  name: string;
  reward: Reward;
}

/** Collection pages; filling one pays its reward once. */
export { ALBUM_PAGES } from './tuning';

export const pageStickers = (kind: StickerKind) => STICKERS.filter((s) => s.kind === kind);

export function ownedStickers(p: Profile) {
  return STICKERS.filter((s) => s.earned(p));
}

export const hasSticker = (p: Profile, id: string) => !!STICKER_BY_ID[id]?.earned(p);

/** Every 10 stickers pays a small gem bonus. */
export const MILESTONE_EVERY = 10;
export { MILESTONE_REWARD } from './tuning';

export function milestonesReady(p: Profile) {
  return Math.max(0, Math.floor(ownedStickers(p).length / MILESTONE_EVERY) - p.album.milestones);
}

export function pageDone(p: Profile, kind: StickerKind) {
  return pageStickers(kind).every((s) => s.earned(p));
}

export function albumReady(p: Profile) {
  return milestonesReady(p) + ALBUM_PAGES.filter((pg) => pageDone(p, pg.id) && !p.album.pagesClaimed.includes(pg.id)).length;
}

export function claimMilestones(p: Profile): Reward | null {
  const n = milestonesReady(p);
  if (!n) return null;
  p.album.milestones += n;
  const r: Reward = { gems: (MILESTONE_REWARD.gems ?? 0) * n };
  applyReward(p, r, 'album');
  return r;
}

export function claimPage(p: Profile, kind: StickerKind): Reward | null {
  const pg = ALBUM_PAGES.find((x) => x.id === kind);
  if (!pg || !pageDone(p, kind) || p.album.pagesClaimed.includes(kind)) return null;
  p.album.pagesClaimed = [...p.album.pagesClaimed, kind];
  applyReward(p, pg.reward, 'album');
  return pg.reward;
}

// ------------------------------------------------------------------ scrapbook
export interface Placed {
  id: string;
  /** Centre in page units (0..1), rotation in radians, scale. */
  x: number;
  y: number;
  r: number;
  s: number;
}

export interface ScrapPage {
  bg: number;
  items: Placed[];
}

export const SCRAP_PAGES = 3;
export const MAX_PLACED = 30;
export const SCALE_MIN = 0.6;
export const SCALE_MAX = 1.8;

/** Page papers; later ones unlock as your collection grows. */
export const SCRAP_BGS: {
  name: string;
  need: number;
  colors: [string, string];
  pattern: 'dots' | 'grid' | 'stars' | 'stripes' | 'none';
}[] = [
  { name: 'Night Sky', need: 0, colors: ['#1c1a4a', '#2c2870'], pattern: 'stars' },
  { name: 'Notebook', need: 0, colors: ['#fdf8ea', '#cfe3ff'], pattern: 'grid' },
  { name: 'Bubblegum', need: 8, colors: ['#ffd6ea', '#ffb3d6'], pattern: 'dots' },
  { name: 'Meadow', need: 16, colors: ['#d8f7c2', '#a8e890'], pattern: 'stripes' },
  { name: 'Ocean', need: 24, colors: ['#bfe8ff', '#7ccfff'], pattern: 'dots' },
  { name: 'Sunset', need: 32, colors: ['#ffcf8a', '#ff8fa8'], pattern: 'none' },
  { name: 'Aurora', need: 42, colors: ['#1a2a4a', '#5ef2b0'], pattern: 'stars' },
  { name: 'Gold Leaf', need: 55, colors: ['#fff2c2', '#ffd24a'], pattern: 'stripes' },
];

export const bgUnlocked = (p: Profile, i: number) => !!SCRAP_BGS[i] && ownedStickers(p).length >= SCRAP_BGS[i].need;

export function defaultScrap(): ScrapPage[] {
  return Array.from({ length: SCRAP_PAGES }, (_, i) => ({ bg: i % 2, items: [] }));
}

function page(p: Profile, i: number): ScrapPage | null {
  while (p.album.pages.length < SCRAP_PAGES) p.album.pages.push({ bg: 0, items: [] });
  return p.album.pages[i] ?? null;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Put an owned sticker on a page; returns its index or -1. */
export function placeSticker(p: Profile, pi: number, id: string, x = 0.5, y = 0.5, r = 0): number {
  const pg = page(p, pi);
  if (!pg || !hasSticker(p, id) || pg.items.length >= MAX_PLACED) return -1;
  pg.items.push({ id, x: clamp(x, 0, 1), y: clamp(y, 0, 1), r, s: 1 });
  return pg.items.length - 1;
}

export function moveSticker(p: Profile, pi: number, k: number, x: number, y: number) {
  const it = page(p, pi)?.items[k];
  if (!it) return;
  it.x = clamp(x, 0, 1);
  it.y = clamp(y, 0, 1);
}

export function turnSticker(p: Profile, pi: number, k: number, dr: number) {
  const it = page(p, pi)?.items[k];
  if (it) it.r = (it.r + dr) % (Math.PI * 2);
}

export function scaleSticker(p: Profile, pi: number, k: number, f: number) {
  const it = page(p, pi)?.items[k];
  if (it) it.s = clamp(Math.round(it.s * f * 100) / 100, SCALE_MIN, SCALE_MAX);
}

/** Bring a sticker to the front; returns its new index. */
export function raiseSticker(p: Profile, pi: number, k: number) {
  const pg = page(p, pi);
  if (!pg?.items[k]) return k;
  const [it] = pg.items.splice(k, 1);
  pg.items.push(it);
  return pg.items.length - 1;
}

export function removeSticker(p: Profile, pi: number, k: number) {
  const pg = page(p, pi);
  if (pg?.items[k]) pg.items.splice(k, 1);
}

export function setPageBg(p: Profile, pi: number, bg: number) {
  const pg = page(p, pi);
  if (!pg || !bgUnlocked(p, bg)) return false;
  pg.bg = bg;
  return true;
}
