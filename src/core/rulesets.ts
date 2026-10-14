import type { RoundMode } from './modifiers';
import type { ReactionId } from './round';
import type { TroubleId } from './troubles';
import type { ObstacleId } from './sky';
import type { Kind } from './world';
import { RULES_VERSION, type RulesVersion } from './rules-version';

// Planned ids live in the rules contract before their behaviour is implemented.
export type RuleReactionId = ReactionId | 'firemount' | 'rainbow' | 'flood';
export type RuleTroubleId = TroubleId | 'pebble';
export const includeFlood: boolean = false; // T0 must clear Flood before it ships.
export const RULES_V2_VOYAGE_FROM: string | undefined = undefined;
const layoutTroubles: readonly TroubleId[] = ['vent', 'vine', 'frost'];
const layoutObstacles: readonly ObstacleId[] = ['rocks', 'bubble', 'mist', 'ring', 'tug'];
const launchReactions: readonly ReactionId[] = ['steam', 'rainGarden', 'wildflowers', 'glacier', 'scorch'];
export const REACTION_DEBUT: Record<RuleReactionId, number> = {
  steam: 8,
  rainGarden: 13,
  wildflowers: 22,
  glacier: 25,
  scorch: 32,
  firemount: 63,
  rainbow: 67,
  flood: 74,
};
export const TROUBLE_DEBUT: Record<RuleTroubleId, number> = { vent: 14, vine: 28, frost: 36, pebble: 52 };
const pairs: Record<RuleReactionId, readonly Kind[]> = {
  steam: ['ice', 'magma'],
  rainGarden: ['seed', 'storm'],
  wildflowers: ['seed', 'sun'],
  glacier: ['rock', 'ice'],
  scorch: ['magma', 'sun'],
  firemount: ['magma', 'rock'],
  rainbow: ['storm', 'sun'],
  flood: ['ice', 'storm'],
};
export function ruleReactionForPair(a: Kind, b: Kind, reactions: readonly RuleReactionId[]): RuleReactionId | null {
  return a === b ? null : (reactions.find((id) => pairs[id].includes(a) && pairs[id].includes(b)) ?? null);
}

/** Reviewed layout substitutions for campaign slots. Zero means the original layout. */
export const LEVEL_SALT: Partial<Record<number, number>> = {
  1: 3,
  2: 118,
  4: 1,
  5: 2,
  6: 1,
  7: 75,
  8: 5,
  9: 35,
  10: 33,
  11: 25,
  12: 18,
  13: 8,
  14: 43,
  15: 100,
  16: 2,
  17: 11,
  18: 26,
  19: 1,
  20: 42,
  21: 6,
  22: 11,
  23: 339,
  24: 21,
  25: 79,
  27: 17,
  28: 6,
  29: 98,
  30: 15,
  31: 11,
  32: 1,
  34: 35,
  35: 37,
  36: 49,
  38: 20,
  39: 60,
  40: 17,
  41: 3,
  42: 49,
  43: 14,
  44: 16,
  45: 109,
  47: 2,
  48: 11,
  49: 118,
  50: 23,
  51: 6,
  52: 1,
  53: 23,
  54: 10,
  55: 9,
  56: 29,
  58: 10,
  59: 59,
  60: 4,
};

/** Selected raw-v2 campaign salts for lint outliers in unshipped planets 61-120. */
export const RAW_LEVEL_SALT: Partial<Record<number, number>> = {
  68: 4,
  70: 9,
  75: 14,
  76: 9,
  77: 2,
  80: 6,
  90: 6,
  93: 12,
  95: 1,
  99: 13,
  101: 1,
  102: 4,
  104: 6,
  111: 3,
  114: 1,
  115: 2,
  119: 15,
  120: 8,
};

export interface RuleSet {
  version: RulesVersion;
  reactions: readonly RuleReactionId[];
  troubles: Readonly<Record<RoundMode, readonly RuleTroubleId[]>>;
  layoutTroubles: readonly TroubleId[];
  layoutObstacles: readonly ObstacleId[];
  salt: { level: Partial<Record<number, number>>; raw: Partial<Record<number, number>> };
  pebbleTeach?: number;
  guardianPebblesFrom?: number;
  pebbleSubstituteFrom?: number;
  motesTeach?: number;
  motesFrom?: number;
  extraThrowCap: 0 | 1;
  novaThresholds: readonly number[];
}
const v1Troubles = {
  campaign: layoutTroubles,
  voyage: layoutTroubles,
  daily: layoutTroubles,
  challenge: layoutTroubles,
  zen: [],
  rush: [],
  remix: [],
};
const salt = { level: LEVEL_SALT, raw: RAW_LEVEL_SALT };
export const RULESETS: Record<RulesVersion, RuleSet> = {
  1: {
    version: 1,
    reactions: launchReactions,
    troubles: v1Troubles,
    layoutTroubles,
    layoutObstacles,
    salt,
    extraThrowCap: 0,
    novaThresholds: [12, 18],
  },
  2: {
    version: 2,
    reactions: [
      'steam',
      'rainGarden',
      'wildflowers',
      'glacier',
      'firemount',
      'rainbow',
      'scorch',
      ...(includeFlood ? ['flood' as const] : []),
    ],
    troubles: { ...v1Troubles, campaign: [...layoutTroubles, 'pebble'] },
    layoutTroubles,
    layoutObstacles,
    salt,
    pebbleTeach: 52,
    guardianPebblesFrom: 60,
    pebbleSubstituteFrom: 61,
    motesTeach: 56,
    motesFrom: 58,
    extraThrowCap: 1,
    novaThresholds: [12, 18],
  },
};
export function effectiveVersion(n: number, mode: RoundMode, taught: number, play: RulesVersion): RulesVersion {
  if (play === 1) return 1;
  const cap = mode === 'campaign' ? n : Math.min(n, taught);
  const content = (version: RulesVersion) => {
    const set = RULESETS[version];
    // Ordering among active launch reactions is part of the v1 contract.
    return JSON.stringify([
      set.reactions
        .filter((id) => cap >= REACTION_DEBUT[id])
        .slice()
        .sort(),
      set.troubles[mode].filter((id) => cap >= TROUBLE_DEBUT[id]),
    ]);
  };
  return content(1) === content(play) ? 1 : play;
}
export function voyagePlay(week: string, play: RulesVersion = RULES_VERSION): RulesVersion {
  return play === 2 && RULES_V2_VOYAGE_FROM !== undefined && week >= RULES_V2_VOYAGE_FROM ? 2 : 1;
}
