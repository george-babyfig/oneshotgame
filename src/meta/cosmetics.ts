import { COSMETICS as BASE_COSMETICS } from './tuning';
import { spend } from './wallet';
// The Keeper (your little astronaut), its launcher and its throw trail.
// Every item is earned or bought directly: no random rolls, no duplicates.
// Ownership is derived from progress wherever possible, so unlocks are
// retroactive and never need a save migration.
import type { Profile } from './profile';
import { STAR_ROAD } from './progression';
import { t } from '../i18n';
import { HABITATS } from './habitats';
import { dyeColors } from './dyes';

export type Slot = 'suit' | 'hat' | 'launcher' | 'trail' | 'emote';
export const SLOTS: Slot[] = ['suit', 'hat', 'launcher', 'trail', 'emote'];

export type Source = 'free' | 'gems' | 'road' | 'pass' | 'chapter' | 'habitat' | 'starter' | 'event' | 'calendar' | 'constellation';
/** Presentation tier only (frame colour); it never affects odds because nothing is random. */
export type Tier = 'basic' | 'fancy' | 'epic';

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  source: Source;
  tier: Tier;
  gems?: number;
  /** Chapter number or habitat id. */
  unlock?: number | string;
  /** Palette: suits [body, trim, visor]; launchers/trails their main colours. */
  colors: string[];
  /** Named set (for the set flourish). */
  set?: string;
}

export const FACE_SHAPES = ['round', 'oval', 'square', 'heart'] as const;
export const FACE_NAMES = ['Round', 'Oval', 'Square', 'Heart'] as const;
export const SKIN_TONES = ['#f8dfc6', '#efd0ae', '#d9aa82', '#c48c64', '#a96e4e', '#85543e', '#633f34', '#432c2b'] as const;
export const HAIR_STYLES = ['none', 'crop', 'fringe', 'curls', 'puffs', 'waves', 'braids', 'spikes'] as const;
export const HAIR_NAMES = ['Bare', 'Crop', 'Fringe', 'Curls', 'Puffs', 'Waves', 'Braids', 'Spikes'] as const;
export const HAIR_COLORS = ['#251c27', '#523224', '#835136', '#b97b42', '#e6b75e', '#a34835', '#eee2cc', '#6f5aa6'] as const;
export const EYE_STYLES = ['round', 'smile', 'wide', 'sleepy', 'spark'] as const;
export const EYE_NAMES = ['Bright', 'Smiley', 'Wide', 'Sleepy', 'Sparkly'] as const;
export const EXPRESSIONS = ['happy', 'focused', 'surprised', 'shrug', 'cheer'] as const;
export const EXPRESSION_NAMES = ['Happy', 'Focused', 'Surprised', 'Shrug', 'Cheer'] as const;
export interface AvatarParts {
  face: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  expression: (typeof EXPRESSIONS)[number];
}
export const DEFAULT_AVATAR: AvatarParts = { face: 0, skin: 3, hair: 0, hairColor: 0, eyes: 0, expression: 'happy' };

/** These are earned by play and never have a price. */
export const SHOWTIME_COSMETICS: Cosmetic[] = [
  {
    id: 'suit_meadow',
    slot: 'suit',
    name: 'Meadow Explorer',
    source: 'chapter',
    unlock: 2,
    tier: 'fancy',
    colors: ['#74c69d', '#e9ffcc', '#214a44'],
  },
  {
    id: 'suit_cloud',
    slot: 'suit',
    name: 'Cloud Jumper',
    source: 'chapter',
    unlock: 5,
    tier: 'fancy',
    colors: ['#b1d8ed', '#fff5e4', '#384a72'],
  },
  {
    id: 'suit_coralreef',
    slot: 'suit',
    name: 'Coral Keeper',
    source: 'habitat',
    unlock: 'seaside',
    tier: 'fancy',
    colors: ['#ef8d85', '#ffe8ba', '#513c70'],
  },
  {
    id: 'suit_nightgarden',
    slot: 'suit',
    name: 'Night Garden',
    source: 'calendar',
    unlock: 21,
    tier: 'fancy',
    colors: ['#586b9d', '#c9edb5', '#252850'],
  },
  { id: 'hat_scarf', slot: 'hat', name: 'Comet Scarf', source: 'chapter', unlock: 3, tier: 'fancy', colors: ['#ff9b83', '#ffe3b1'] },
  { id: 'hat_mooncap', slot: 'hat', name: 'Moon Cap', source: 'chapter', unlock: 6, tier: 'fancy', colors: ['#8b8ccb', '#e9e8ff'] },
  { id: 'hat_reed', slot: 'hat', name: 'Reed Crown', source: 'habitat', unlock: 'wetlands', tier: 'fancy', colors: ['#8dcf8c', '#f4dda2'] },
  {
    id: 'hat_firefly',
    slot: 'hat',
    name: 'Firefly Antenna',
    source: 'calendar',
    unlock: 28,
    tier: 'fancy',
    colors: ['#e8dc89', '#88d7a3'],
  },
  { id: 'l_bloom', slot: 'launcher', name: 'Blossom', source: 'chapter', unlock: 4, tier: 'fancy', colors: ['#79b68e', '#ffc1d2'] },
  {
    id: 'l_moonbeam',
    slot: 'launcher',
    name: 'Moonbeam',
    source: 'habitat',
    unlock: 'frost',
    tier: 'fancy',
    colors: ['#a6adf0', '#fff0b8'],
  },
];
// Look IDs and sources stay stable for saved outfits and paid entitlements.
const LOOK_NAMES: Record<string, string> = {
  l_pad: 'Classic',
  l_twig: 'Twig',
  l_petal: 'Petal',
  l_cannon: 'Comet Rail',
};
export const COSMETICS: Cosmetic[] = [
  ...BASE_COSMETICS.map((item) => ({ ...item, name: LOOK_NAMES[item.id] ?? item.name })),
  ...SHOWTIME_COSMETICS,
];

export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
export const STYLES_RELEASE = 'm6.5';

export function isPaidLook(x: Cosmetic): boolean {
  return x.source === 'starter' || x.source === 'pass';
}

export function visibleCosmetics(p: Profile, slot?: Slot): Cosmetic[] {
  return COSMETICS.filter((x) => (!slot || x.slot === slot) && (!p.settings.hidePaidLooks || !isPaidLook(x)));
}

export function toggleFavourite(p: Profile, id: string): boolean {
  if (!COSMETIC_BY_ID[id]) return false;
  p.favourites = p.favourites.includes(id) ? p.favourites.filter((x) => x !== id) : [...p.favourites, id];
  return true;
}

/** Items per slot, plus optional suit dye colours. */
export type Look = Record<Slot, string> & {
  dyeMain?: string;
  dyeTrim?: string;
  avatar?: AvatarParts;
  expression?: AvatarParts['expression'];
  dance?: number;
  reduceMotion?: boolean;
};
export const DEFAULT_LOOK: Record<Slot, string> = {
  suit: 'suit_sky',
  hat: 'hat_antenna',
  launcher: 'l_pad',
  trail: 'tr_dots',
  emote: 'em_cheer',
};

/** Star Road tier index (free or pass lane) that grants an item. */
export function roadTierOf(id: string): { i: number; lane: 'free' | 'pass' } | null {
  for (let i = 0; i < STAR_ROAD.length; i++) {
    if (STAR_ROAD[i].reward.item === id) return { i, lane: 'free' };
    if (STAR_ROAD[i].pass.item === id) return { i, lane: 'pass' };
  }
  return null;
}

export function owns(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x) return false;
  switch (x.source) {
    case 'free':
      return true;
    case 'gems':
    case 'event':
      return p.wardrobe.includes(id);
    case 'starter':
      return p.starter;
    case 'calendar':
      return p.daily.streak >= (x.unlock as number);
    case 'constellation':
      return p.constellations.includes(x.unlock as string);
    case 'chapter':
      return p.chapters.includes(x.unlock as number) || p.rank > (x.unlock as number);
    case 'habitat':
      return p.habitats.includes(x.unlock as string);
    case 'road':
    case 'pass': {
      const r = roadTierOf(id);
      if (!r) return false;
      return r.lane === 'free' ? p.road.includes(r.i) : p.pass && p.roadPass.includes(r.i);
    }
  }
}

/** The look to actually draw: anything not owned (e.g. after a reset) falls back to the default. */
export function currentLook(p: Profile): Look {
  const out: Look = { ...DEFAULT_LOOK, avatar: p.avatar, reduceMotion: p.settings.reduceMotion };
  for (const s of SLOTS) {
    const id = p.look?.[s];
    if (id && COSMETIC_BY_ID[id]?.slot === s && owns(p, id) && (!p.settings.hidePaidLooks || !isPaidLook(COSMETIC_BY_ID[id]))) out[s] = id;
  }
  const d = dyeColors(p);
  if (d.main) out.dyeMain = d.main;
  if (d.trim) out.dyeTrim = d.trim;
  return out;
}

export function equip(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || !owns(p, id)) return false;
  p.look = { ...p.look, [x.slot]: id };
  return true;
}

export function buyCosmetic(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || x.source !== 'gems' || owns(p, id) || !x.gems || p.gems < x.gems) return false;
  spend(p, 'gems', x.gems, 'cosmetic');
  p.wardrobe.push(id);
  return true;
}

/** Wearing every piece of a set adds a flourish (a glow in the set's colour). */
export function fullSet(look: Look): string | null {
  // sets are made of wearables; emotes don't count
  const sets = SLOTS.filter((s) => s !== 'emote').map((s) => COSMETIC_BY_ID[look[s]]?.set);
  return sets.every((x) => x && x === sets[0]) ? (sets[0] as string) : null;
}

export function ownedCount(p: Profile) {
  return COSMETICS.filter((x) => !isPaidLook(x) && owns(p, x.id)).length;
}

/** How to get an item, for the locked tile. */
export function sourceText(x: Cosmetic): string {
  switch (x.source) {
    case 'free':
      return t('Free');
    case 'gems':
      return `💎${x.gems}`;
    case 'starter':
      return t('Try on');
    case 'chapter':
      return t('Chapter {n} chest', { n: x.unlock as number });
    case 'habitat': {
      const hb = HABITATS.find((x2) => x2.id === x.unlock);
      return hb ? t('{name} set', { name: t(hb.name) }) : t('Habitat set');
    }
    case 'event':
      return t('Weekly event');
    case 'calendar':
      return t('Star Calendar day {n}', { n: x.unlock as number });
    case 'constellation':
      return t('Constellation');
    case 'road': {
      const r = roadTierOf(x.id);
      return r ? t('Star Road {n} points', { n: STAR_ROAD[r.i].stars }) : t('Star Road');
    }
    case 'pass':
      return t('Try on');
  }
}

export const SLOT_NAMES: Record<Slot, string> = { suit: 'Suit', hat: 'Hat', launcher: 'Launcher looks', trail: 'Trail', emote: 'Emote' };

/** Launcher mastery: flings needed for each mastery star. */
export const MASTERY_STEPS = [100, 500, 2000];
export function masteryLevel(flings: number) {
  return MASTERY_STEPS.filter((n) => flings >= n).length;
}

export const PRESETS = 3;

export function savePreset(p: Profile, i: number) {
  if (i < 0 || i >= PRESETS) return;
  const list = [...(p.presets ?? [])];
  while (list.length < PRESETS) list.push(null);
  // presets remember items; dyes stay as they are
  const { dyeMain: _m, dyeTrim: _t, avatar: _a, expression: _e, dance: _d, reduceMotion: _r, ...items } = currentLook(p);
  list[i] = items;
  p.presets = list;
}

/** Wear a saved outfit; items no longer owned fall back to the default look. */
export function loadPreset(p: Profile, i: number): boolean {
  const saved = p.presets?.[i];
  if (!saved) return false;
  p.look = { ...DEFAULT_LOOK, ...saved };
  const allowed = currentLook(p);
  p.look = Object.fromEntries(SLOTS.map((slot) => [slot, allowed[slot]])) as Record<Slot, string>;
  return true;
}
