import type { Profile } from './profile';
import type { RulesVersion } from '../core/rules-version';
import type { RoundAssists } from './m15types';
import type { Sticker } from './stickers';
export type { RoundAssists } from './m15types';
// D15 implements eligibility, rewards and recording; no reward or visible target yet.
export const WONDER_STICKERS: Sticker[] = [];
export function recordWonder(_p: Profile, _n: number, _score: number, _version: RulesVersion, _assists: RoundAssists): { first: boolean } {
  return { first: false };
}
