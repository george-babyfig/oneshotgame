import type { Profile } from './profile';

export { CONTINUE_COST } from './tuning';
export const CONTINUE_THROWS = 5;
export const CONTINUE_MAX = 2;
export const CONTINUE_FROM_PLANET = 11;

export type PlayMode = 'campaign' | 'tutorial' | 'voyage' | 'daily' | 'rush' | 'challenge' | 'zen' | 'remix';

export function continueAllowed(c: {
  mode: PlayMode;
  planet: number;
  won: boolean;
  cleared?: boolean;
  failsBefore: number;
  used: number;
}): boolean {
  return c.mode === 'campaign' && c.planet >= CONTINUE_FROM_PLANET && !c.won && !c.cleared && c.failsBefore >= 1 && c.used < CONTINUE_MAX;
}

export function countsAsFail(throwsUsed: number, throwsTotal: number): boolean {
  return throwsTotal > 0 && throwsUsed >= Math.ceil(throwsTotal / 2);
}

export function recordFail(p: Profile, planet: number): void {
  p.fails[planet] = (p.fails[planet] ?? 0) + 1;
}

// Results are awarded immediately after a win clears the retry counters.
// Keep only this transient fact so a paid continue cannot improve Essence.
const wonContinues = new WeakMap<Profile, Map<number, number>>();

export function clearFails(p: Profile, planet: number): void {
  const used = p.continuesUsed[planet] ?? 0;
  if (used > 0) {
    let pending = wonContinues.get(p);
    if (!pending) wonContinues.set(p, (pending = new Map()));
    pending.set(planet, used);
  }
  delete p.fails[planet];
  delete p.continuesUsed[planet];
}

/** Consume the just-cleared count when awarding this planet's win. */
export function takeWonContinues(p: Profile, planet: number): number {
  const pending = wonContinues.get(p);
  const used = pending?.get(planet) ?? p.continuesUsed[planet] ?? 0;
  pending?.delete(planet);
  delete p.continuesUsed[planet];
  return used;
}
