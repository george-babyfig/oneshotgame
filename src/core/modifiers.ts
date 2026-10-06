import type { Kind } from './world';
import type { TraitId } from './world';
import { LAB_MAX } from './labperks';
import { KINDS } from './world';

export type RoundMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix';

export interface RoundModifiers {
  extraThrows: number;
  splash: number;
  scopeLevel: number;
  lab: Partial<Record<Kind, number>>;
  forms: Partial<Record<Kind, boolean>>;
  boosters: { shower: boolean; spark: boolean; scope: boolean };
  momentum: number;
  buddy: { species: string; acc: string } | null;
  shower: boolean;
  gentle: boolean;
  buddyShield: TraitId | null;
}

export const NO_MODIFIERS: RoundModifiers = {
  extraThrows: 0,
  splash: 0,
  scopeLevel: 0,
  lab: {},
  forms: {},
  boosters: { shower: false, spark: false, scope: false },
  momentum: 0,
  buddy: null,
  shower: false,
  gentle: false,
  buddyShield: null,
};

/** Score modes share a base loadout; all other modes can use earned help. */
export function modifiersFor(mode: RoundMode, profileBonuses: Partial<RoundModifiers> = {}): RoundModifiers {
  if (mode === 'daily' || mode === 'rush' || mode === 'challenge' || mode === 'remix') {
    return { ...NO_MODIFIERS, gentle: !!profileBonuses.gentle, lab: {}, forms: {}, boosters: { ...NO_MODIFIERS.boosters } };
  }
  return {
    ...NO_MODIFIERS,
    ...profileBonuses,
    lab: { ...profileBonuses.lab },
    forms: { ...profileBonuses.forms },
    boosters: { ...NO_MODIFIERS.boosters, ...profileBonuses.boosters },
  };
}

export function maxLabModifiers(): Pick<RoundModifiers, 'lab' | 'forms'> {
  const kinds = Object.keys(KINDS) as Kind[];
  return {
    lab: Object.fromEntries(kinds.map((kind) => [kind, LAB_MAX])),
    forms: {},
  };
}
