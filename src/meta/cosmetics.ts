import { COSMETICS } from './tuning';
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

export { COSMETICS } from './tuning';

export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));

/** Items per slot, plus optional suit dye colours. */
export type Look = Record<Slot, string> & { dyeMain?: string; dyeTrim?: string };
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
  const out: Look = { ...DEFAULT_LOOK };
  for (const s of SLOTS) {
    const id = p.look?.[s];
    if (id && COSMETIC_BY_ID[id]?.slot === s && owns(p, id)) out[s] = id;
  }
  const d = dyeColors(p);
  if (d.main) out.dyeMain = d.main;
  if (d.trim) out.dyeTrim = d.trim;
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
      return t('Cosmic Pass');
  }
}

export const SLOT_NAMES: Record<Slot, string> = { suit: 'Suit', hat: 'Hat', launcher: 'Launcher', trail: 'Trail', emote: 'Emote' };

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
  const { dyeMain: _m, dyeTrim: _t, ...items } = currentLook(p);
  list[i] = items;
  p.presets = list;
}

/** Wear a saved outfit; items no longer owned fall back to the default look. */
export function loadPreset(p: Profile, i: number): boolean {
  const saved = p.presets?.[i];
  if (!saved) return false;
  p.look = { ...DEFAULT_LOOK, ...saved } as Look;
  p.look = currentLook(p);
  return true;
}
