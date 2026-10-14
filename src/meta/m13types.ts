/** M13's shared save and package contracts. Keep runtime dependencies out of this module. */
import type { Planet } from '../core/world';
import type { Mat } from './constellations';
import type { BoosterId } from './config';
import type { GalaxyPlanet } from './profile';

export type TripHours = 1 | 4 | 8;
export interface TripYield {
  mats: Partial<Record<Mat, number>>;
  gems: number;
  fp: number;
}
export interface LegacyTripLoot {
  dust: number;
  gems: number;
  boosters: Partial<Record<BoosterId, number>>;
}
export interface Trip {
  species: string;
  /** Broad for 1.0 in-memory callers; saved trips are validated as TripHours on load. */
  hours: number;
  ends: number;
  /** Old galaxy index; new trips use -1 and identify their planet with n. */
  planet: number;
  n?: number;
  sentAt?: number;
  match?: boolean;
  yield?: TripYield;
  legacyLoot?: LegacyTripLoot;
}
export interface TripReturn {
  n: number;
  species: string;
  hours: TripHours;
  returnedAt: number;
  match: boolean;
  yield?: TripYield;
  legacyLoot?: LegacyTripLoot;
}
export interface TripPlanetRow {
  n: number;
  entry: GalaxyPlanet;
  planet: Planet;
  mats: TripYield['mats'];
  total: number;
  needed?: Mat;
}
export interface TripPreview {
  n: number;
  species: string;
  hours: TripHours;
  ends: number;
  match: boolean;
  yield: TripYield;
  entry: GalaxyPlanet;
}
export type TripBlock =
  'no_bay' | 'bay_level' | 'busy' | 'no_planets' | 'no_friend' | 'only_buddy' | 'needs_win' | 'clock' | 'before_planet_21';
export interface TripStatus {
  block: TripBlock | null;
  trip: Trip | null;
  returned: TripReturn | null;
  options: TripHours[];
}
export type WishOrigin = 'friend' | 'open';

export interface CloudBackupStatus {
  enabled: boolean;
  account: boolean;
  on: boolean;
  lastAt: number | null;
  full: boolean;
}
export interface BackupSummary {
  level: number;
  friends: number;
  date: string;
}
export interface BackupKeyMeta {
  key: string;
  saveId: string;
  nonce: string;
  seq: number;
  savedAt: number;
  sha256: string;
  v: number;
  summary: BackupSummary;
  bytes: number;
}
export type BackupReason = 'save' | 'pause' | 'hidden';
export type BackupRestoreResult = 'ok' | 'unavailable' | 'newer' | 'purchases' | 'invalid';
/** Native code compresses JSON; callers never share a writable key with another device. */
export interface CloudBackupPlugin {
  status(options?: {
    optIn?: boolean;
    nonce?: string;
  }): Promise<{ enabled: boolean; account: boolean; accountChanged?: boolean; deviceNonce?: string }>;
  list(): Promise<{ keys: BackupKeyMeta[] }>;
  read(options: { key: string }): Promise<{ json: string | null; meta?: BackupKeyMeta }>;
  write(options: { key: string; json: string; meta: BackupKeyMeta }): Promise<{ ok: boolean; reason?: 'disabled' | 'account' | 'quota' }>;
  remove(options: { key: string }): Promise<void>;
  addListener(
    event: 'changed',
    listener: (event: { reason: 'server' | 'initial' | 'quota' | 'account' }) => void,
  ): Promise<{ remove(): Promise<void> }>;
}
