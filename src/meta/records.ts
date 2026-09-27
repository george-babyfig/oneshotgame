// Object records: how many times you've flung each object. Milestones award a
// record star, and 500 flings of one object earns a matching Passport title.
import type { Kind } from '../core/world';
import type { Profile } from './profile';

export const RECORD_STEPS = [50, 200, 500, 1000];
export const TITLE_AT = 500;

export const OBJECT_TITLES: Record<Kind, string> = {
  rock: 'Rock Hound',
  ice: 'Ice Sculptor',
  seed: 'Seed Keeper',
  magma: 'Magma Maker',
  storm: 'Rainmaker',
  sun: 'Sun Chaser',
};

export function flings(p: Profile, kind: Kind) {
  return p.flings?.[kind] ?? 0;
}

export function recordStars(n: number) {
  return RECORD_STEPS.filter((s) => n >= s).length;
}

/** Count a fling; returns the new record star if one was just reached. */
export function addFling(p: Profile, kind: Kind): number {
  const before = recordStars(flings(p, kind));
  p.flings = { ...p.flings, [kind]: flings(p, kind) + 1 };
  const after = recordStars(flings(p, kind));
  return after > before ? after : 0;
}

export function recordTitles(p: Profile) {
  return (Object.keys(OBJECT_TITLES) as Kind[]).filter((k) => flings(p, k) >= TITLE_AT).map((k) => OBJECT_TITLES[k]);
}
