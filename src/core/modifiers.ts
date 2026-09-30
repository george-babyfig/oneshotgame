import type { Kind } from './world';

export type RoundMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix';

export interface RoundModifiers {
  extraThrows: number;
  splash: number;
  scopeLevel: number;
  lab: Partial<Record<Kind, number>>;
  boosters: { shower: boolean; spark: boolean; scope: boolean };
  momentum: number;
  buddy: { species: string; acc: string } | null;
  shower: boolean;
  gentle: boolean;
}

export const NO_MODIFIERS: RoundModifiers = {
  extraThrows: 0,
  splash: 0,
  scopeLevel: 0,
  lab: {},
  boosters: { shower: false, spark: false, scope: false },
  momentum: 0,
  buddy: null,
  shower: false,
  gentle: false,
};

/** Score modes share a base loadout; all other modes can use earned help. */
export function modifiersFor(mode: RoundMode, profileBonuses: Partial<RoundModifiers> = {}): RoundModifiers {
  if (mode === 'daily' || mode === 'rush' || mode === 'challenge' || mode === 'remix') {
    return { ...NO_MODIFIERS, gentle: mode === 'remix' && !!profileBonuses.gentle, lab: {}, boosters: { ...NO_MODIFIERS.boosters } };
  }
  return {
    ...NO_MODIFIERS,
    ...profileBonuses,
    lab: { ...profileBonuses.lab },
    boosters: { ...NO_MODIFIERS.boosters, ...profileBonuses.boosters },
  };
}
