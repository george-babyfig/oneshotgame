import { VISITOR_DUST } from './tuning';
import { earn } from './wallet';
// Visitors: while the app is closed, creatures you've discovered drop by your galaxy
// and leave small gifts — and sometimes a keepsake memento (inspired by Neko Atsume).
import { SPECIES, SPECIES_BY_ID } from '../core/world';
import type { Profile, VisitorGift } from './profile';
import { t } from '../i18n';

export const VISIT_MIN_MINUTES = 20;
export const MAX_VISITORS = 6;

export const ITEMS = [
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
  return t("{who}'s {item}", { who: t(sp?.name ?? 'Someone'), item: t(ITEMS[(i < 0 ? 0 : i) % ITEMS.length]) });
}

/** Work out who visited between lastSeen and now. Deterministic for a given time window. */
export function rollVisitors(p: Profile, now: number): VisitorGift[] {
  const minutes = (now - p.meta.lastSeen) / 60000;
  if (minutes < VISIT_MIN_MINUTES || !p.galaxy.length || !p.seen.length) return [];
  const count = Math.min(MAX_VISITORS, 1 + Math.floor(Math.sqrt(minutes / 30)));
  const out: VisitorGift[] = [];
  const visits = { ...p.visits };
  const owed = new Set([...p.mementos, ...p.visitors.map((v) => v.memento).filter((id): id is string => !!id)]);
  for (let k = 0; k < count; k++) {
    const species = p.seen.reduce((best, id) => ((visits[id] ?? 0) < (visits[best] ?? 0) ? id : best));
    visits[species] = (visits[species] ?? 0) + 1;
    const rarity = SPECIES_BY_ID[species]?.rarity ?? 'common';
    const dust = VISITOR_DUST[rarity];
    const memento = visits[species] >= 3 && !owed.has(species) ? species : null;
    if (memento) owed.add(species);
    out.push({ species, dust, gems: 0, memento });
  }
  return out;
}

export function addVisitors(p: Profile, now: number) {
  const v = rollVisitors(p, now);
  for (const gift of v) p.visits[gift.species] = (p.visits[gift.species] ?? 0) + 1;
  p.visitors = [...p.visitors, ...v];
  while (p.visitors.length > MAX_VISITORS * 2) {
    const oldestPlain = p.visitors.findIndex((gift) => !gift.memento);
    if (oldestPlain < 0) break;
    p.visitors.splice(oldestPlain, 1);
  }
  return v.length;
}

export function openVisitor(p: Profile): VisitorGift | null {
  const v = p.visitors.shift();
  if (!v) return null;
  earn(p, 'dust', v.dust, 'visitor');
  if (v.memento && !p.mementos.includes(v.memento)) p.mementos.push(v.memento);
  return v;
}
