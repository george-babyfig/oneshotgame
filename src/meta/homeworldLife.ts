/** Shared M11.5 Homeworld Life contract. Keep round rewards in the owning meta operation. */
import type { BiomeId } from '../core/world';
import type { EconomyMode } from './homeworldTypes';

export type LandmarkId = 'sprout_garden' | 'skyglass' | 'sky_bridge' | 'comet_pier' | 'keepers_beacon';
export type LandmarkStage = 0 | 1 | 2 | 3 | 4;

export interface LandmarkState {
  stage: LandmarkStage;
  progress: number[];
  done?: number;
  /** Stable stage IDs whose rewards have already been credited. */
  rewarded: string[];
  /** Deduplication evidence for completed eligible rounds and first discoveries. */
  rounds?: string[];
  arrivals?: string[];
  planets?: string[];
}

export interface EligibleRoundEvent {
  mode: EconomyMode;
  /** Unique stable key for this completed round, including a Voyage or Daily instance. */
  roundKey: string;
  planetKey: string;
  at: number;
  newStars: number;
  firstArrivals: string[];
  /** Sectors whose best life improved, counted by their resulting biome. */
  improvedSectors: Partial<Record<BiomeId, number>>;
  /** Exact sector IDs entering a route; a sector can improve twice in one round. */
  improvedSectorIds?: Partial<Record<BiomeId, number[]>>;
  /** All non-barren sectors on the winning round's final planet. */
  grownSectors?: Partial<Record<BiomeId, number>>;
  fusions: number;
  supernovas: number;
  settledTroubles: number;
  firstPlanetWin?: boolean;
}

export interface EarnedRoundReward {
  id: string;
  dust?: number;
  gems?: number;
}

export interface EligibleRoundResult {
  earned: EarnedRoundReward[];
  /** Animation IDs only. Value is credited before these are queued. */
  celebrations: string[];
}
