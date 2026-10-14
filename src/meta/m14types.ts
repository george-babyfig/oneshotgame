/** M14 contracts. Type-only dependencies keep content separate from runtime catalogues. */
import type { Cosmetic } from './cosmetics';
import type { ProductDef } from './m12types';
import type { RoadDefinition, RoadId } from './starroad';
import type { LandmarkStageDef } from './tuning';

/** Decision 95: newest dedupe evidence lives once in the profile. */
export const ROAD_EARNING_KEY_LIMIT = 600;
export interface ThemeSpec {
  id: string;
  name: string;
  colors: readonly [string, string, string];
  motif: NonNullable<Cosmetic['motif']>;
}
export interface RoadContent {
  road: RoadDefinition;
  theme: ThemeSpec;
  looks: readonly Cosmetic[];
  products: readonly ProductDef[];
  singles: readonly Cosmetic[];
  stardust: readonly Cosmetic[];
  samplers: readonly Cosmetic[];
}
export type RoadLandmarkId = `rl_road${string}`;
export interface RoadLandmarkDef {
  id: RoadLandmarkId;
  roadId: RoadId;
  name: string;
  stages:
    | readonly [LandmarkStageDef, LandmarkStageDef, LandmarkStageDef]
    | readonly [LandmarkStageDef, LandmarkStageDef, LandmarkStageDef, LandmarkStageDef];
  delivery: Partial<Record<'leaf' | 'dew' | 'stone', number>>;
  finish: string;
  /** Earned cosmetic IDs; the child chooses where to place the decoration. */
  decoration: string;
  title: string;
}
export interface AlmanacRow {
  week: string;
  north?: string;
  south?: string;
  headline?: string;
}
export type CalendarOverride =
  { day: string; salt: number; week?: never; stop?: never } | { week: string; stop: number; salt: number; day?: never };
export interface ReleaseInfo {
  /** Major.minor content release, independent of patch releases. */
  version: string;
  submitOn: string;
}
