// Buddy: a friend living on the Homeworld who joins the Keeper in a level.
// It can wear any resident accessory you own; with none picked it wears this
// month's festival costume. Nothing here can be bought directly.
import { SPECIES_BY_ID, traitOf, type TraitId } from '../core/world';
import type { Profile } from './profile';
import { RESIDENT_ACCS } from './homeworld';
import type { RoundMode } from '../core/modifiers';
import type { TroubleId } from '../core/troubles';

/** Accessories every buddy can wear from the start. */
export const BUDDY_FREE_ACCS = ['bow', 'flower'];

export function buddyEligible(p: Profile): string[] {
  if (p.level < 18) return [];
  return [...new Set(p.home.residents.map((resident) => resident.species))].filter((id) => !!SPECIES_BY_ID[id]);
}

const COUNTERS: Record<TroubleId, readonly TraitId[]> = {
  vent: ['fireproof', 'swimmer'],
  vine: ['weedproof', 'swimmer'],
  frost: ['frostproof'],
};

/** Prefer a resident who can meet the level's first Trouble; otherwise remember the Buddy. */
export function suggestedBuddy(p: Profile, troubles: readonly { id: TroubleId }[]): string | null {
  const eligible = buddyEligible(p);
  const current = p.buddy.species;
  for (const trouble of troubles) {
    const counters = COUNTERS[trouble.id];
    if (!counters) continue;
    if (current && eligible.includes(current) && counters.includes(traitOf(current)!)) return current;
    const match = eligible.find((id) => counters.includes(traitOf(id)!));
    if (match) return match;
  }
  return current && eligible.includes(current) ? current : (eligible[0] ?? null);
}

/** Keep the Styles choice; suggestions fill only an empty or unavailable slot. */
export function planetBuddyFor(p: Profile, troubles: readonly { id: TroubleId }[]): string | null {
  const friends = buddyEligible(p);
  return p.buddy.species && friends.includes(p.buddy.species) ? p.buddy.species : suggestedBuddy(p, troubles);
}

export function nextPlanetBuddy(current: string, friends: readonly string[]): string {
  return friends.length ? friends[(friends.indexOf(current) + 1) % friends.length] : current;
}

export function buddyChipAvailable(p: Profile, planet: number, troubles: readonly { id: TroubleId }[], gentle: boolean): boolean {
  return planet >= 18 && troubles.length > 0 && !gentle && buddyEligible(p).length > 0;
}

export function buddyShieldFor(p: Profile, mode: RoundMode, planet: number, species = suggestedBuddy(p, [])): TraitId | null {
  if (planet < 18 || mode === 'daily' || mode === 'rush' || mode === 'challenge' || mode === 'remix') return null;
  if (!species || !buddyEligible(p).includes(species)) return null;
  return traitOf(species);
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
  const s = suggestedBuddy(p, []);
  if (!s || !buddyEligible(p).includes(s)) return null;
  return { species: s, acc: p.buddy.acc ?? festAcc ?? '' };
}
