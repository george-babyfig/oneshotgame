// The Keeper (your little astronaut), its launcher and its throw trail.
// Every item is earned or bought directly: no random rolls, no duplicates.
// Ownership is derived from progress wherever possible, so unlocks are
// retroactive and never need a save migration.
import type { Profile } from './profile';
import { STAR_ROAD } from './progression';
import { t } from '../i18n';
import { HABITATS } from './habitats';

export type Slot = 'suit' | 'hat' | 'launcher' | 'trail' | 'emote';
export const SLOTS: Slot[] = ['suit', 'hat', 'launcher', 'trail', 'emote'];

export type Source = 'free' | 'gems' | 'road' | 'pass' | 'rank' | 'habitat' | 'starter' | 'event' | 'calendar';
/** Presentation tier only (frame colour); it never affects odds because nothing is random. */
export type Tier = 'basic' | 'fancy' | 'epic';

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  source: Source;
  tier: Tier;
  gems?: number;
  /** Rank number (source 'rank') or habitat id (source 'habitat'). */
  unlock?: number | string;
  /** Palette: suits [body, trim, visor]; launchers/trails their main colours. */
  colors: string[];
  /** Named set (for the set flourish). */
  set?: string;
}

const c = (x: Cosmetic) => x;

export const COSMETICS: Cosmetic[] = [
  // suits
  c({ id: 'suit_sky', slot: 'suit', name: 'Sky Scout', source: 'free', tier: 'basic', colors: ['#6ec8ff', '#ffffff', '#1d2a5e'] }),
  c({ id: 'suit_mint', slot: 'suit', name: 'Mint Ranger', source: 'free', tier: 'basic', colors: ['#5ef2b0', '#ffffff', '#123f38'] }),
  c({
    id: 'suit_coral',
    slot: 'suit',
    name: 'Coral Cadet',
    source: 'gems',
    gems: 120,
    tier: 'fancy',
    colors: ['#ff7a8a', '#ffe0a8', '#3a1a38'],
  }),
  c({ id: 'suit_sun', slot: 'suit', name: 'Sunbeam', source: 'gems', gems: 120, tier: 'fancy', colors: ['#ffc94a', '#ffffff', '#4a2a10'] }),
  c({
    id: 'suit_grape',
    slot: 'suit',
    name: 'Nebula Navigator',
    source: 'rank',
    unlock: 3,
    tier: 'fancy',
    colors: ['#9a6bff', '#ffd0ff', '#1a1040'],
  }),
  c({
    id: 'suit_moss',
    slot: 'suit',
    name: 'Forest Warden',
    source: 'habitat',
    unlock: 'greenwoods',
    tier: 'fancy',
    colors: ['#4f9e5a', '#e8d6a0', '#10301a'],
  }),
  c({
    id: 'suit_aurora',
    slot: 'suit',
    name: 'Aurora Explorer',
    source: 'starter',
    tier: 'epic',
    colors: ['aurora', '#ffffff', '#20104a'],
  }),
  c({
    id: 'suit_star',
    slot: 'suit',
    name: 'Star Captain',
    source: 'pass',
    tier: 'epic',
    colors: ['#2a2270', '#ffd24a', '#0a0620'],
    set: 'captain',
  }),
  c({
    id: 'suit_night',
    slot: 'suit',
    name: 'Starlight',
    source: 'calendar',
    unlock: 28,
    tier: 'epic',
    colors: ['#1a2a6e', '#9fe6ff', '#050818'],
  }),
  // hats
  c({ id: 'hat_none', slot: 'hat', name: 'Bare Helmet', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'hat_antenna', slot: 'hat', name: 'Antenna', source: 'free', tier: 'basic', colors: ['#ff6a7a'] }),
  c({ id: 'hat_sprout', slot: 'hat', name: 'Sprout', source: 'gems', gems: 80, tier: 'basic', colors: ['#5ecf5a'] }),
  c({ id: 'hat_bunny', slot: 'hat', name: 'Bunny Ears', source: 'gems', gems: 100, tier: 'fancy', colors: ['#f3eef7', '#ffb3cf'] }),
  c({ id: 'hat_horns', slot: 'hat', name: 'Dragon Horns', source: 'gems', gems: 150, tier: 'fancy', colors: ['#ffd07a', '#b8303a'] }),
  c({
    id: 'hat_flower',
    slot: 'hat',
    name: 'Flower Crown',
    source: 'habitat',
    unlock: 'seaside',
    tier: 'fancy',
    colors: ['#ff8fc8', '#ffe066'],
  }),
  c({ id: 'hat_wizard', slot: 'hat', name: 'Star Wizard', source: 'rank', unlock: 5, tier: 'fancy', colors: ['#4a3aa8', '#ffd24a'] }),
  c({ id: 'hat_beanie', slot: 'hat', name: 'Cozy Beanie', source: 'calendar', unlock: 14, tier: 'fancy', colors: ['#ff6a7a', '#ffffff'] }),
  c({ id: 'hat_crown', slot: 'hat', name: 'Tiny Crown', source: 'road', tier: 'epic', colors: ['#ffd24a', '#ff4a8a'] }),
  c({ id: 'hat_halo', slot: 'hat', name: 'Halo Ring', source: 'pass', tier: 'epic', colors: ['#ffe58a'], set: 'captain' }),
  // launchers
  c({ id: 'l_pad', slot: 'launcher', name: 'Launch Pad', source: 'free', tier: 'basic', colors: ['#c9c2ff'] }),
  c({ id: 'l_twig', slot: 'launcher', name: 'Twig Sling', source: 'rank', unlock: 2, tier: 'basic', colors: ['#a0743a', '#e0b050'] }),
  c({ id: 'l_petal', slot: 'launcher', name: 'Petal Sling', source: 'gems', gems: 200, tier: 'fancy', colors: ['#ff8fc8', '#5ecf5a'] }),
  c({ id: 'l_cannon', slot: 'launcher', name: 'Comet Cannon', source: 'gems', gems: 250, tier: 'fancy', colors: ['#6e8cff', '#ffd24a'] }),
  c({ id: 'l_crystal', slot: 'launcher', name: 'Crystal Arc', source: 'road', tier: 'epic', colors: ['#7fdcff', '#d8f6ff'] }),
  c({
    id: 'l_orbit',
    slot: 'launcher',
    name: 'Golden Orbit',
    source: 'pass',
    tier: 'epic',
    colors: ['#ffd24a', '#fff2b8'],
    set: 'captain',
  }),
  // trails
  c({ id: 'tr_dots', slot: 'trail', name: 'Stardust', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'tr_sparkle', slot: 'trail', name: 'Twinkle', source: 'gems', gems: 120, tier: 'fancy', colors: ['#fff6b0'] }),
  c({ id: 'tr_hearts', slot: 'trail', name: 'Hearts', source: 'gems', gems: 120, tier: 'fancy', colors: ['#ff6a9a'] }),
  c({ id: 'tr_bubbles', slot: 'trail', name: 'Bubbles', source: 'rank', unlock: 4, tier: 'fancy', colors: ['#9fe6ff'] }),
  c({ id: 'tr_embers', slot: 'trail', name: 'Embers', source: 'habitat', unlock: 'sun', tier: 'fancy', colors: ['#ff8a3d', '#ffd24a'] }),
  c({
    id: 'tr_rainbow',
    slot: 'trail',
    name: 'Rainbow',
    source: 'road',
    tier: 'epic',
    colors: ['#ff6a7a', '#ffc94a', '#5ef2b0', '#6ec8ff', '#b58cff'],
  }),
  c({
    id: 'tr_cosmic',
    slot: 'trail',
    name: 'Comet Tail',
    source: 'pass',
    tier: 'epic',
    colors: ['#7a4dff', '#ff4de1', '#4dc3ff'],
    set: 'captain',
  }),
  // emotes (played when you finish a planet)
  c({ id: 'em_cheer', slot: 'emote', name: 'Hooray', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'em_wave', slot: 'emote', name: 'Big Wave', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'em_jump', slot: 'emote', name: 'Moon Jump', source: 'rank', unlock: 6, tier: 'fancy', colors: [] }),
  c({ id: 'em_spin', slot: 'emote', name: 'Twirl', source: 'gems', gems: 100, tier: 'fancy', colors: [] }),
  c({ id: 'em_dance', slot: 'emote', name: 'Wiggle Dance', source: 'habitat', unlock: 'frost', tier: 'fancy', colors: [] }),
  c({ id: 'em_flag', slot: 'emote', name: 'Plant the Flag', source: 'gems', gems: 150, tier: 'fancy', colors: [] }),
  c({ id: 'em_fireworks', slot: 'emote', name: 'Fireworks', source: 'road', tier: 'epic', colors: [] }),
];

export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));

export type Look = Record<Slot, string>;
export const DEFAULT_LOOK: Look = { suit: 'suit_sky', hat: 'hat_antenna', launcher: 'l_pad', trail: 'tr_dots', emote: 'em_cheer' };

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
    case 'rank':
      return p.rank >= (x.unlock as number);
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
  const out = { ...DEFAULT_LOOK };
  for (const s of SLOTS) {
    const id = p.look?.[s];
    if (id && COSMETIC_BY_ID[id]?.slot === s && owns(p, id)) out[s] = id;
  }
  return out;
}

export function equip(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || !owns(p, id)) return false;
  p.look = { ...currentLook(p), [x.slot]: id };
  return true;
}

export function buyCosmetic(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || x.source !== 'gems' || owns(p, id) || !x.gems || p.gems < x.gems) return false;
  p.gems -= x.gems;
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
  return COSMETICS.filter((x) => owns(p, x.id)).length;
}

/** How to get an item, for the locked tile. */
export function sourceText(x: Cosmetic): string {
  switch (x.source) {
    case 'free':
      return t('Free');
    case 'gems':
      return `💎${x.gems}`;
    case 'starter':
      return t('Starter Pack');
    case 'rank':
      return t('Explorer Rank {n}', { n: x.unlock as number });
    case 'habitat': {
      const hb = HABITATS.find((x2) => x2.id === x.unlock);
      return hb ? t('{name} set', { name: t(hb.name) }) : t('Habitat set');
    }
    case 'event':
      return t('Weekly event');
    case 'calendar':
      return t('Star Calendar day {n}', { n: x.unlock as number });
    case 'road': {
      const r = roadTierOf(x.id);
      return r ? t('Star Road {n}★', { n: STAR_ROAD[r.i].stars }) : t('Star Road');
    }
    case 'pass':
      return t('Cosmic Pass');
  }
}

export const SLOT_NAMES: Record<Slot, string> = { suit: 'Suit', hat: 'Hat', launcher: 'Launcher', trail: 'Trail', emote: 'Emote' };

/** Launcher mastery: flings needed for each mastery star. */
export const MASTERY_STEPS = [100, 500, 2000];
export function masteryLevel(flings: number) {
  return MASTERY_STEPS.filter((n) => flings >= n).length;
}
