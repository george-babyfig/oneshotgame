import { DYES } from './tuning';
import { spend } from './wallet';
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

export { DYES } from './tuning';

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
  for (const [m, n] of Object.entries(d.cost ?? {})) spend(p, m as Mat, n ?? 0, 'dye');
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
