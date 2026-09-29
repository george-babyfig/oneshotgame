// Buddy: a creature you have befriended (seen often enough on your planets)
// that stands beside your Keeper in every level and cheers when land changes.
// It can wear any resident accessory you own; with none picked it wears this
// month's festival costume. Nothing here can be bought directly.
import { SPECIES_BY_ID, SPECIES } from '../core/world';
import type { Profile } from './profile';
import { LORE_AT, sightings } from './lore';
import { RESIDENT_ACCS } from './homeworld';
import { unlocked } from './unlocks';

/** Sightings needed before a creature will be your buddy (same as its field notes). */
export { BUDDY_AT } from './unlocks';
/** Accessories every buddy can wear from the start. */
export const BUDDY_FREE_ACCS = ['bow', 'flower'];

export function buddyEligible(p: Profile): string[] {
  if (!unlocked(p, 'buddy')) return [];
  return SPECIES.filter((s) => sightings(p, s.id) >= LORE_AT).map((s) => s.id);
}

export function buddyAccs(p: Profile): string[] {
  return RESIDENT_ACCS.map((a) => a.id).filter((id) => BUDDY_FREE_ACCS.includes(id) || p.home.accs.includes(id));
}

export function setBuddy(p: Profile, species: string | null): boolean {
  if (species !== null && (!SPECIES_BY_ID[species] || !buddyEligible(p).includes(species))) return false;
  p.buddy = { ...p.buddy, species };
  return true;
}

export function setBuddyAcc(p: Profile, acc: string | null): boolean {
  if (acc !== null && !buddyAccs(p).includes(acc)) return false;
  p.buddy = { ...p.buddy, acc };
  return true;
}

/** The buddy to draw, or null. `festAcc` is worn when no accessory is picked. */
export function currentBuddy(p: Profile, festAcc?: string): { species: string; acc: string } | null {
  const s = p.buddy.species;
  if (!s || !SPECIES_BY_ID[s]) return null;
  return { species: s, acc: p.buddy.acc ?? festAcc ?? '' };
}
