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

export function clearFails(p: Profile, planet: number): void {
  delete p.fails[planet];
  delete p.continuesUsed[planet];
}
