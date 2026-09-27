import { loadKey, saveKey } from './storage';
import type { BoosterId, UpgradeId } from './config';

export interface GalaxyPlanet {
  n: number;
  name: string;
  hue: number;
  stars: number;
  species: string[];
  life: number;
  colors?: string[];
}

export interface Profile {
  v: number;
  gems: number;
  dust: number;
  level: number; // next level to play
  stars: Record<number, number>;
  seen: string[]; // Lifebook: species ever discovered
  galaxy: GalaxyPlanet[];
  lastCollect: number;
  upgrades: Record<UpgradeId, number>;
  boosters: Record<BoosterId, number>;
  piggy: number;
  starter: boolean;
  skin: string;
  skins: string[];
  processedTx: string[];
  daily: { last: string; streak: number };
  settings: { sound: boolean; music: boolean; haptics: boolean };
  tutorial: boolean;
  stats: { throws: number; plays: number; wins: number; bestLife: number };
}

const KEY = 'pp.profile';

export function defaultProfile(): Profile {
  return {
    v: 1,
    gems: 30,
    dust: 0,
    level: 1,
    stars: {},
    seen: [],
    galaxy: [],
    lastCollect: Date.now(),
    upgrades: { scope: 0, throws: 0, splash: 0, vault: 0 },
    boosters: { shower: 1, spark: 1, scope: 1 },
    piggy: 0,
    starter: false,
    skin: 'classic',
    skins: ['classic'],
    processedTx: [],
    daily: { last: '', streak: 0 },
    settings: { sound: true, music: true, haptics: true },
    tutorial: false,
    stats: { throws: 0, plays: 0, wins: 0, bestLife: 0 },
  };
}

function merge<T>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return (saved as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export async function loadProfile(): Promise<Profile> {
  const raw = await loadKey(KEY);
  if (!raw) return defaultProfile();
  try {
    return merge(defaultProfile(), JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile) {
  return saveKey(KEY, JSON.stringify(p));
}

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayGap(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

/** Stardust per hour produced by one galaxy planet. */
export function planetRate(g: GalaxyPlanet) {
  return 6 + g.stars * 3 + g.species.length * 2;
}
