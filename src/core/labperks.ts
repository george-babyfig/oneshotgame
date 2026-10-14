import type { Kind } from './world';
import type { ReactionId } from './round';
import type { TroubleId } from './troubles';

export const LAB_MAX = 5;
export const REACH_CAP = 4;
export type GuardId = 'firewall' | 'ventCooler' | 'labRoots' | 'weedBurner' | 'rinse' | 'frostMelter';
export type FormId = 'pebbleShower' | 'rimeComet' | 'grovePod' | 'obsidianFlow' | 'monsoon' | 'solarFlare';
export type FeatId = 'glacier' | 'steam' | 'rainGarden' | 'vineBurned' | 'ventCooled' | 'wildflowers';

export const GUARD_OF: Record<Kind, GuardId> = {
  rock: 'firewall',
  ice: 'ventCooler',
  seed: 'labRoots',
  magma: 'weedBurner',
  storm: 'rinse',
  sun: 'frostMelter',
};
export const FORM_OF: Record<Kind, FormId> = {
  rock: 'pebbleShower',
  ice: 'rimeComet',
  seed: 'grovePod',
  magma: 'obsidianFlow',
  storm: 'monsoon',
  sun: 'solarFlare',
};
export const FEAT_OF: Record<Kind, { feat: FeatId; goal: number }> = {
  rock: { feat: 'glacier', goal: 10 },
  ice: { feat: 'steam', goal: 10 },
  seed: { feat: 'rainGarden', goal: 10 },
  magma: { feat: 'vineBurned', goal: 5 },
  storm: { feat: 'ventCooled', goal: 5 },
  sun: { feat: 'wildflowers', goal: 10 },
};
export const LAB_TEACH: Record<Kind, { fusion: ReactionId[]; guard: TroubleId[] }> = {
  rock: { fusion: ['glacier'], guard: ['vent'] },
  ice: { fusion: ['steam'], guard: ['vent'] },
  seed: { fusion: ['rainGarden'], guard: ['vine'] },
  magma: { fusion: ['steam'], guard: ['vine'] },
  storm: { fusion: ['rainGarden'], guard: ['vent'] },
  sun: { fusion: ['wildflowers'], guard: ['frost'] },
};
export const labPower = (lv: number): 0 | 1 => (lv >= 2 ? 1 : 0);
export const labFusionReach = (lv: number): 0 | 1 => (lv >= 3 ? 1 : 0);
export const labGuard = (kind: Kind, lv: number): GuardId | null => (lv >= 4 ? GUARD_OF[kind] : null);
export const labNovaReach = (lv: number): 0 | 1 => (lv >= 5 ? 1 : 0);

export type LabEvent =
  | { type: 'guard'; kind: Kind; perk: GuardId; trouble: TroubleId; sector: number; how: 'blocked' | 'settled' }
  | { type: 'form'; kind: Kind; form: FormId; sector: number; changed: number }
  | { type: 'power'; kind: Kind; level: number; sector: number };
