import { loadKey, saveKey } from './storage';
import type { BoosterId, UpgradeId } from './config';
import type { Kind, Planet } from '../core/world';
import { defaultHome, type HomeState } from './homeworld';

export interface GalaxyPlanet {
  n: number;
  name: string;
  hue: number;
  stars: number;
  species: string[];
  life: number;
  colors: string[];
}

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  notifications: boolean;
  /** '' = follow the device language. */
  lang: string;
  /** For real-calendar seasons. */
  hemi: 'north' | 'south';
}

export interface Stats {
  throws: number;
  plays: number;
  wins: number;
  bestLife: number;
  creatures: number;
  threeStars: number;
  dailies: number;
  rushBest: number;
  rushPlays: number;
  zenThrows: number;
  challenges: number;
  hardWins: number;
  bestStreak: number;
}

export interface VisitorGift {
  species: string;
  dust: number;
  gems: number;
  /** Memento id (= species id) if this visitor left its keepsake. */
  memento: string | null;
}

export interface Profile {
  v: number;
  gems: number;
  dust: number;
  /** Highest unlocked level (the next one to beat). */
  level: number;
  stars: Record<number, number>;
  /** Lifebook: every creature ever discovered. */
  seen: string[];
  galaxy: GalaxyPlanet[];
  lastCollect: number;
  upgrades: Record<UpgradeId, number>;
  boosters: Record<BoosterId, number>;
  piggy: number;
  starter: boolean;
  /** Cosmic Pass owned: unlocks the premium Star Road lane. */
  pass: boolean;
  /** Premium Star Road tiers already claimed. */
  roadPass: number[];
  skin: string;
  skins: string[];
  processedTx: string[];
  daily: { last: string; streak: number };
  quests: { day: string; list: QuestState[]; bonusClaimed: boolean };
  /** Star Road tiers already claimed (indices). */
  road: number[];
  /** Chapter chests already opened (chapter numbers). */
  chapters: number[];
  dailyPlanet: { day: string; best: number; stars: number; rewarded: boolean };
  settings: Settings;
  tutorial: boolean;
  meta: { installed: number; lastSeen: number; sessions: number; rated: boolean; starterOffered: boolean; notifAsked: boolean };
  stats: Stats;
  /** Momentum win streak (0..3) and the day the free shield was last used. */
  momentum: { streak: number; shieldDay: string };
  /** Gifts left by visiting creatures, waiting to be opened. */
  visitors: VisitorGift[];
  mementos: string[];
  /** Explorer Rank (1-based) and habitat sets already rewarded. */
  rank: number;
  habitats: string[];
  /** Personal best per mode and challenge history. */
  challengeLog: { code: string; score: number; stars: number; vs: number }[];
  /** The persistent Zen Garden world. */
  zen: Planet | null;
  /** This week's event progress. */
  event: { week: string; tokens: number; claimed: number[] };
  /** Game Center achievement ids already reported. */
  gcReported: string[];
  /** Keeper outfit (see meta/cosmetics.ts) and items bought with gems. */
  look: Record<'suit' | 'hat' | 'launcher' | 'trail' | 'emote', string>;
  wardrobe: string[];
  /** Flings per launcher, for launcher mastery. */
  mastery: Record<string, number>;
  /** Planet Passport: name parts, title, banner and pinned badges. */
  passport: { first: number; second: number; set: boolean; title: string; banner: number; badges: string[] };
  /** Homeworld: the planet you build on between levels. */
  home: HomeState;
  /** Object Lab levels per flingable (missing = 1). */
  lab: Partial<Record<Kind, number>>;
}

const KEY = 'pp.profile';
const BACKUP_KEY = 'pp.profile.bak';
export const PROFILE_VERSION = 2;

export function defaultProfile(now = Date.now()): Profile {
  return {
    v: PROFILE_VERSION,
    gems: 30,
    dust: 0,
    level: 1,
    stars: {},
    seen: [],
    galaxy: [],
    lastCollect: now,
    upgrades: { scope: 0, throws: 0, splash: 0, vault: 0 },
    boosters: { shower: 1, spark: 1, scope: 1 },
    piggy: 0,
    starter: false,
    pass: false,
    roadPass: [],
    skin: 'classic',
    skins: ['classic'],
    processedTx: [],
    daily: { last: '', streak: 0 },
    quests: { day: '', list: [], bonusClaimed: false },
    road: [],
    chapters: [],
    dailyPlanet: { day: '', best: 0, stars: 0, rewarded: false },
    settings: { sound: true, music: true, haptics: true, reduceMotion: false, notifications: true, lang: '', hemi: 'north' },
    tutorial: false,
    meta: { installed: now, lastSeen: now, sessions: 0, rated: false, starterOffered: false, notifAsked: false },
    stats: {
      throws: 0,
      plays: 0,
      wins: 0,
      bestLife: 0,
      creatures: 0,
      threeStars: 0,
      dailies: 0,
      rushBest: 0,
      rushPlays: 0,
      zenThrows: 0,
      challenges: 0,
      hardWins: 0,
      bestStreak: 0,
    },
    momentum: { streak: 0, shieldDay: '' },
    visitors: [],
    mementos: [],
    rank: 1,
    habitats: [],
    challengeLog: [],
    zen: null,
    event: { week: '', tokens: 0, claimed: [] },
    gcReported: [],
    look: { suit: 'suit_sky', hat: 'hat_antenna', launcher: 'l_pad', trail: 'tr_dots', emote: 'em_cheer' },
    wardrobe: [],
    mastery: {},
    passport: { first: -1, second: -1, set: false, title: '', banner: 0, badges: [] },
    home: defaultHome(now),
    lab: {},
  };
}

/** Deep-merge saved data over defaults so fields added in updates get sane values. */
function merge<T>(base: T, saved: unknown): T {
  if (saved === undefined || saved === null) return base;
  if (typeof saved !== 'object' || Array.isArray(saved) || typeof base !== 'object' || base === null || Array.isArray(base))
    return saved as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    out[k] = merge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

/** Upgrade older save formats in place. */
export function migrate(raw: Record<string, unknown>): Profile {
  const p = merge(defaultProfile(), raw);
  if ((raw.v as number | undefined) === undefined || (raw.v as number) < 2) {
    // v1 → v2: galaxy entries gained colours; stats gained counters.
    p.galaxy = p.galaxy.map((g) => ({ ...g, colors: g.colors ?? [] }));
    p.stats.threeStars = Math.max(p.stats.threeStars, Object.values(p.stars).filter((s) => s === 3).length);
    p.stats.wins = Math.max(p.stats.wins, Object.keys(p.stars).length);
  }
  p.v = PROFILE_VERSION;
  return p;
}

/** Set when storage could not be read: we then never overwrite what's on disk this session. */
let readOnly = false;
export const storageReadOnly = () => readOnly;

export async function loadProfile(): Promise<Profile> {
  let failedReads = 0;
  for (const key of [KEY, BACKUP_KEY]) {
    let raw: string | null;
    try {
      raw = await loadKey(key);
    } catch {
      failedReads++;
      continue;
    }
    if (!raw) continue;
    try {
      return migrate(JSON.parse(raw));
    } catch {
      /* corrupted: try the backup */
    }
  }
  // Storage errored (not merely empty): play on, but don't clobber a save we couldn't read.
  if (failedReads) readOnly = true;
  return defaultProfile();
}

let saves = 0;
/** Save the profile; every few saves also refresh a backup copy. */
export async function saveProfile(p: Profile) {
  if (readOnly) return;
  const json = JSON.stringify(p);
  await saveKey(KEY, json);
  if (saves++ % 5 === 0) await saveKey(BACKUP_KEY, json);
}

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayGap(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

export function totalStars(p: Profile) {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}
