// Visitors: while the app is closed, creatures you've discovered drop by your galaxy
// and leave small gifts — and sometimes a keepsake memento (inspired by Neko Atsume).
import { rngFrom } from '../core/levels';
import { SPECIES, SPECIES_BY_ID } from '../core/world';
import type { Profile, VisitorGift } from './profile';

export const VISIT_MIN_MINUTES = 20;
export const MAX_VISITORS = 6;
export const MEMENTO_CHANCE = 0.18;

const ITEMS = [
  'smooth pebble',
  'lucky feather',
  'spiral shell',
  'pinecone',
  'glow bead',
  'tiny map',
  'acorn cap',
  'star sticker',
  'moon marble',
  'leaf boat',
  'crystal chip',
  'woven bracelet',
  'river stone',
  'sun charm',
  'snow globe',
  'seed pouch',
  'coral twig',
  'ember glass',
  'ribbon',
  'drawing',
  'kite string',
  'button',
  'bell',
  'postcard',
];

export function mementoName(id: string): string {
  const i = SPECIES.findIndex((s) => s.id === id);
  const sp = SPECIES_BY_ID[id];
  return `${sp?.name ?? 'Someone'}'s ${ITEMS[(i < 0 ? 0 : i) % ITEMS.length]}`;
}

/** Work out who visited between lastSeen and now. Deterministic for a given time window. */
export function rollVisitors(p: Profile, now: number): VisitorGift[] {
  const minutes = (now - p.meta.lastSeen) / 60000;
  if (minutes < VISIT_MIN_MINUTES || !p.galaxy.length || !p.seen.length) return [];
  const count = Math.min(MAX_VISITORS, 1 + Math.floor(Math.sqrt(minutes / 30)));
  const rnd = rngFrom(`V-${p.meta.lastSeen}-${p.seen.length}`);
  const out: VisitorGift[] = [];
  const owed = new Set(p.mementos);
  for (let k = 0; k < count; k++) {
    const species = p.seen[Math.floor(rnd() * p.seen.length)];
    const rarity = SPECIES_BY_ID[species]?.rarity ?? 'common';
    const mult = { common: 1, uncommon: 1.5, rare: 2.5, legendary: 4 }[rarity];
    const gems = rnd() < 0.25 ? Math.ceil(mult) : 0;
    const dust = Math.round((15 + rnd() * 25) * mult);
    let memento: string | null = null;
    if (!owed.has(species) && rnd() < MEMENTO_CHANCE) {
      memento = species;
      owed.add(species);
    }
    out.push({ species, dust, gems, memento });
  }
  return out;
}

export function addVisitors(p: Profile, now: number) {
  const v = rollVisitors(p, now);
  p.visitors = [...p.visitors, ...v].slice(-MAX_VISITORS * 2);
  return v.length;
}

export function openVisitor(p: Profile): VisitorGift | null {
  const v = p.visitors.shift();
  if (!v) return null;
  p.dust += v.dust;
  p.gems += v.gems;
  if (v.memento && !p.mementos.includes(v.memento)) p.mementos.push(v.memento);
  return v;
}
