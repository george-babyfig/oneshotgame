// Dyes: recolour your Keeper's suit (body and trim). Dyes are unlocked once
// with materials from your planets (never random, never sold) and work with
// any suit.
import type { Profile } from './profile';
import type { Mat } from './constellations';

export interface Dye {
  id: string;
  name: string;
  color: string;
  /** Materials to unlock (free if missing). */
  cost?: Partial<Record<Mat, number>>;
}

export const DYES: Dye[] = [
  { id: 'snow', name: 'Snow', color: '#f4f6ff' },
  { id: 'sky', name: 'Sky', color: '#6ec8ff' },
  { id: 'mint', name: 'Mint', color: '#5ef2b0' },
  { id: 'night', name: 'Night', color: '#2a2a5e' },
  { id: 'coral', name: 'Coral', color: '#ff7a8a', cost: { dew: 4 } },
  { id: 'sunflower', name: 'Sunflower', color: '#ffd24a', cost: { leaf: 4 } },
  { id: 'lilac', name: 'Lilac', color: '#b58cff', cost: { frost: 3 } },
  { id: 'forest', name: 'Forest', color: '#3f9e5a', cost: { leaf: 6 } },
  { id: 'lava', name: 'Lava', color: '#e0552f', cost: { ember: 5 } },
  { id: 'ocean', name: 'Deep Ocean', color: '#1f5a9e', cost: { dew: 6 } },
  { id: 'peach', name: 'Peach', color: '#ffb48a', cost: { ember: 3, leaf: 3 } },
  { id: 'glacier', name: 'Glacier', color: '#bfeaff', cost: { frost: 6 } },
  { id: 'slate', name: 'Slate', color: '#6a7088', cost: { stone: 6 } },
  { id: 'bubblegum', name: 'Bubblegum', color: '#ff8fd0', cost: { dew: 4, leaf: 4 } },
  { id: 'gold', name: 'Gold Leaf', color: '#e8b33a', cost: { stone: 8, ember: 6 } },
  { id: 'aurora', name: 'Aurora', color: 'aurora', cost: { frost: 8, dew: 8 } },
];
export const DYE_BY_ID: Record<string, Dye> = Object.fromEntries(DYES.map((d) => [d.id, d]));

export function ownsDye(p: Profile, id: string) {
  const d = DYE_BY_ID[id];
  return !!d && (!d.cost || p.dyes.includes(id));
}

export function canAffordDye(p: Profile, id: string) {
  const d = DYE_BY_ID[id];
  if (!d?.cost) return true;
  return Object.entries(d.cost).every(([m, n]) => (p.mats[m as Mat] ?? 0) >= (n ?? 0));
}

export function unlockDye(p: Profile, id: string): boolean {
  const d = DYE_BY_ID[id];
  if (!d || ownsDye(p, id) || !canAffordDye(p, id)) return false;
  const mats = { ...p.mats };
  for (const [m, n] of Object.entries(d.cost ?? {})) mats[m as Mat] = (mats[m as Mat] ?? 0) - (n ?? 0);
  p.mats = mats;
  p.dyes = [...p.dyes, id];
  return true;
}

/** Set (or clear with null) the body or trim dye. */
export function applyDye(p: Profile, channel: 'main' | 'trim', id: string | null): boolean {
  if (id && !ownsDye(p, id)) return false;
  p.dye = { ...p.dye, [channel]: id };
  return true;
}

/** Colours to draw with, or undefined to use the suit's own. */
export function dyeColors(p: Profile): { main?: string; trim?: string } {
  const main = p.dye?.main && ownsDye(p, p.dye.main) ? DYE_BY_ID[p.dye.main].color : undefined;
  const trim = p.dye?.trim && ownsDye(p, p.dye.trim) ? DYE_BY_ID[p.dye.trim].color : undefined;
  return { main, trim };
}
