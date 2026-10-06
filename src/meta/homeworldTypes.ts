/** Shared M11 Homeworld and economy contracts. */
export type HomeworldLevel = 1 | 2 | 3 | 4 | 5;

export type EconomyMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix' | 'practice';

export interface GreenhouseState {
  choice: 'shower' | 'spark' | 'scope';
  winsTowardNext: number;
  /** Total stock for cap checks and older saves. */
  stored: number;
  storedByType?: { shower: number; spark: number; scope: number };
}

export interface VaultState {
  tier: HomeworldLevel;
  bankedProductionMs: number;
  storedDust: number;
  lastTick: number;
}

export interface WonRoundEvent {
  mode: EconomyMode;
  planetKey: string;
  buddySpecies: string | null;
  at: number;
}

export type GenerationProfile = 'reviewed-v1' | 'raw-v2';
