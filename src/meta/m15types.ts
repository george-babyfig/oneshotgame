import type { RoundRules } from '../core/round';
import type { RulesVersion } from '../core/rules-version';

export type ExtraThrowSource = 'rainbow' | 'mote';
/** Pickup coordinates are planet-radius units, relative to its centre. */
export type Pickup = { kind: 'pebble' | 'mote'; x: number; y: number; r: number };
export type MoteDef = { kind: 'throw' | 'wide'; x: number; y: number; r: number };
export interface OverlayCtx {
  seed: string;
  rules: RoundRules;
  includeFlood: boolean;
}
/** Only in-rule extras belong to the judged budget; progress equipment is allowed. */
export interface RoundAssists {
  continues: number;
  powerBooster: boolean;
  aimBooster: boolean;
  help: boolean;
  hints: boolean;
  practice: boolean;
  gentle: boolean;
  fullAim: boolean;
  ownThrows: number;
  inRuleExtras: number;
  ignoredExtras: number;
  judgedScore?: number;
}
export interface WonderRound {
  n: number;
  score: number;
  version: RulesVersion;
  assists: RoundAssists;
}
