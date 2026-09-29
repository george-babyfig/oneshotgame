import { loadKey, saveKey } from './storage';
import type { BoosterId, UpgradeId } from './config';
import type { Kind, Planet } from '../core/world';
import { defaultHome, type HomeState } from './homeworld';
import type { Mail } from './inbox';
import { UNLOCKS } from './unlocks';
import { restoreRound, serializeRound, type RoundState } from '../core/round';
import { ROUND_RULES_V0 } from '../core/round';
import { LEVEL_SALT, makeLevel } from '../core/levels';
import type { RoundModifiers } from '../core/modifiers';
import { DEFAULT_AVATAR, type AvatarParts } from './cosmetics';

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
  planetColours: 'classic' | 'clear';
  /** Reminders; off until a grown-up turns them on behind the parental gate. */
  notifications: boolean;
  /** Game Center; off until a grown-up signs in behind the parental gate. */
  gameCenter: boolean;
  /** '' = follow the device language. */
  lang: string;
  /** For real-calendar seasons. */
  hemi: 'north' | 'south';
  textSize: 'standard' | 'large' | 'extra-large';
  hidePaidLooks: boolean;
  spendingReminder: { cents: number; currency: string } | null;
  breakAfterRounds: number | null;
  /** A digest, never the entered PIN. */
  parentPin: string | null;
  gatePausedUntil: number;
}

export interface RoundCheckpoint {
  n: number;
  seedPrefix?: string;
  salt?: number;
  state: RoundState;
  modifiers: RoundModifiers;
  throwsLeft: number;
  throwsUsed: number;
  throwsTotal: number;
  qi: number;
  cur: Kind;
  next: Kind;
  score: number;
  shownScore: number;
  starsGot: number;
  rot: number;
  time: number;
  timeLeft: number;
  bossHp: number;
  shot: {
    kind: Kind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    t: number;
    carry: number;
    t0: number;
    rot0: number;
    trail: { x: number; y: number }[];
    nova?: boolean;
  } | null;
  warmup?: boolean;
  practiceFirstClear?: boolean;
  practiceGifts?: number;
}

function roundFingerprint(n: number, prefix = 'PP', salt?: number): string {
  const level = makeLevel(n, prefix, { salt });
  const source = JSON.stringify([level.queue, level.start]);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return JSON.stringify([n, prefix, salt ?? (prefix === 'PP' ? (LEVEL_SALT[n] ?? null) : null), ROUND_RULES_V0.version, hash >>> 0]);
}

/** The core serializer owns rules compatibility; this wrapper keeps scene position. */
export function saveInterruptedRound(p: Profile, checkpoint: RoundCheckpoint): void {
  const { state, ...scene } = checkpoint;
  p.savedRound = JSON.stringify({
    format: 1,
    fingerprint: roundFingerprint(checkpoint.n, checkpoint.seedPrefix, checkpoint.salt),
    round: serializeRound(state),
    scene,
  });
}

export function readInterruptedRound(p: Profile): RoundCheckpoint | null {
  if (!p.savedRound) return null;
  try {
    const saved = JSON.parse(p.savedRound) as { format: number; fingerprint: string; round: string; scene: Omit<RoundCheckpoint, 'state'> };
    const state = saved.format === 1 && typeof saved.round === 'string' ? restoreRound(saved.round) : null;
    const s = saved.scene;
    if (
      !state ||
      !s ||
      !Number.isInteger(s.n) ||
      s.n < 1 ||
      s.n > p.level ||
      !Number.isInteger(s.qi) ||
      s.qi < 0 ||
      !Number.isFinite(s.throwsLeft) ||
      !Number.isFinite(s.throwsUsed) ||
      !Number.isFinite(s.throwsTotal) ||
      !Number.isFinite(s.score) ||
      !Number.isFinite(s.rot) ||
      !Number.isFinite(s.time) ||
      typeof s.cur !== 'string' ||
      typeof s.next !== 'string' ||
      !s.modifiers ||
      (s.seedPrefix !== undefined && (!/^[a-z0-9_-]{1,40}$/i.test(s.seedPrefix) || s.seedPrefix.includes('..'))) ||
      (s.salt !== undefined && !Number.isInteger(s.salt))
    )
      throw new Error('Invalid round checkpoint');
    if (saved.fingerprint !== roundFingerprint(s.n, s.seedPrefix, s.salt)) throw new Error('Level changed');
    return { ...s, state };
  } catch {
    p.savedRound = undefined;
    return null;
  }
}

export function clearInterruptedRound(p: Profile): void {
  p.savedRound = undefined;
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
  /** Star Road progress, separate from campaign stars. */
  roadPoints: number;
  roadDay: { day: string; earned: number };
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
  /** M3 migration is complete; older gates already earned are kept. */
  m3Migrated: boolean;
  legacyUnlocks: string[];
  /** Premium Star Road tiers already claimed. */
  roadPass: number[];
  skin: string;
  skins: string[];
  processedTx: string[];
  pendingPiggy: { amount: number; startedAt: number } | null;
  pendingPurchaseRecords: { tx: string; key: string; at: number }[];
  daily: { last: string; streak: number };
  quests: { day: string; list: QuestState[]; bonusClaimed: boolean };
  /** Star Road tiers already claimed (indices). */
  road: number[];
  /** Chapter chests already opened (chapter numbers). */
  chapters: number[];
  dailyPlanet: { day: string; best: number; stars: number; rewarded: boolean };
  settings: Settings;
  /** An interrupted campaign round, including its rules version. */
  savedRound?: string;
  tutorial: boolean;
  meta: { installed: number; lastSeen: number; sessions: number; rated: boolean; starterOffered: boolean; notifAsked: boolean };
  stats: Stats;
  /** Momentum win streak (0..3) and the day the free shield was last used. */
  momentum: { streak: number; shieldDay: string; paused: boolean };
  /** Gifts left by visiting creatures, waiting to be opened. */
  visitors: VisitorGift[];
  mementos: string[];
  /** Explorer Rank (1-based) and habitat sets already rewarded. */
  rank: number;
  /** Highest retired rank payout already accounted for by chapter chests. */
  m4RankPaidThrough: number;
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
  avatar: AvatarParts;
  wardrobe: string[];
  favourites: string[];
  stylesNewSeen: string;
  /** Flings per launcher, for launcher mastery. */
  mastery: Record<string, number>;
  /** Planet Passport: name parts, title, banner and pinned badges. */
  passport: {
    first: number;
    second: number;
    set: boolean;
    title: string;
    banner: number;
    frame: number;
    badges: string[];
    badgesSet: boolean;
  };
  /** Homeworld: the planet you build on between levels. */
  home: HomeState;
  /** Object Lab levels per flingable (missing = 1). */
  lab: Partial<Record<Kind, number>>;
  /** Flings per object (object records). */
  flings: Partial<Record<Kind, number>>;
  /** Times each creature was seen appearing (Lifebook field notes). */
  sightings: Record<string, number>;
  /** Inbox letters, and every letter id ever delivered (so trimming never re-sends one). */
  mail: Mail[];
  mailSeen: string[];
  /** Planets whose Comet Guardian has been defeated (first-time reward paid). */
  bosses: number[];
  /** Saved Keeper outfits (Workshop presets). */
  presets: (Record<string, string> | null)[];
  /** Constellations: materials from level drops, filled bundles, lit constellations. */
  mats: Partial<Record<'stone' | 'dew' | 'leaf' | 'ember' | 'frost', number>>;
  bundles: string[];
  constellations: string[];
  /** Suit dyes: unlocked ids and the ones applied. */
  dyes: string[];
  dye: { main: string | null; trim: string | null };
  /** This month's festival: costumed critters spotted and tiers claimed. */
  festival: { key: string; spotted: number; claimed: number[] };
  /** This week's Voyage: difficulty base, stops cleared, best stars per stop; and voyages ever finished. */
  voyage: { week: string; base: number; cleared: number; stars: number[] };
  voyageDone: number;
  /** Campaign fails in a row per planet (cleared on a win); drives the continue rule. */
  fails: Record<number, number>;
  /** Continues bought on each campaign planet, across attempts. */
  continuesUsed: Record<number, number>;
  /** Visits per species; a memento arrives on a species' 3rd visit. */
  visits: Record<string, number>;
  /** Sticker Album: festival stickers kept, milestones and pages claimed, and the scrapbook pages. */
  album: {
    fest: string[];
    milestones: number;
    pagesClaimed: string[];
    pages: { bg: number; items: { id: string; x: number; y: number; r: number; s: number }[] }[];
  };
  /** Buddy creature beside the Keeper, and the accessory it wears (null = festival costume). */
  buddy: { species: string | null; acc: string | null };
}

const KEY = 'pp.profile';
const BACKUP_KEY = 'pp.profile.bak';
export const PROFILE_VERSION = 3;

export function defaultProfile(now = Date.now()): Profile {
  return {
    v: PROFILE_VERSION,
    gems: 30,
    dust: 0,
    level: 1,
    stars: {},
    roadPoints: 0,
    roadDay: { day: '', earned: 0 },
    seen: [],
    galaxy: [],
    lastCollect: now,
    upgrades: { scope: 0, throws: 0, splash: 0, vault: 0 },
    boosters: { shower: 1, spark: 1, scope: 1 },
    piggy: 0,
    starter: false,
    pass: false,
    m3Migrated: true,
    legacyUnlocks: [],
    roadPass: [],
    skin: 'classic',
    skins: ['classic'],
    processedTx: [],
    pendingPiggy: null,
    pendingPurchaseRecords: [],
    daily: { last: '', streak: 0 },
    quests: { day: '', list: [], bonusClaimed: false },
    road: [],
    chapters: [],
    dailyPlanet: { day: '', best: 0, stars: 0, rewarded: false },
    settings: {
      sound: true,
      music: true,
      haptics: true,
      reduceMotion: false,
      planetColours: 'classic',
      notifications: false,
      gameCenter: false,
      lang: '',
      hemi: 'north',
      textSize: 'standard',
      hidePaidLooks: false,
      spendingReminder: null,
      breakAfterRounds: null,
      parentPin: null,
      gatePausedUntil: 0,
    },
    tutorial: false,
    savedRound: undefined,
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
    momentum: { streak: 0, shieldDay: '', paused: false },
    visitors: [],
    mementos: [],
    rank: 1,
    m4RankPaidThrough: 0,
    habitats: [],
    challengeLog: [],
    zen: null,
    event: { week: '', tokens: 0, claimed: [] },
    gcReported: [],
    look: { suit: 'suit_sky', hat: 'hat_antenna', launcher: 'l_pad', trail: 'tr_dots', emote: 'em_cheer' },
    avatar: { ...DEFAULT_AVATAR },
    wardrobe: [],
    favourites: [],
    stylesNewSeen: '',
    mastery: {},
    passport: { first: -1, second: -1, set: false, title: '', banner: 0, frame: 0, badges: [], badgesSet: false },
    home: defaultHome(now),
    lab: {},
    flings: {},
    sightings: {},
    mail: [],
    mailSeen: [],
    bosses: [],
    presets: [null, null, null],
    mats: {},
    bundles: [],
    constellations: [],
    dyes: [],
    dye: { main: null, trim: null },
    festival: { key: '', spotted: 0, claimed: [] },
    voyage: { week: '', base: 8, cleared: 0, stars: [] },
    voyageDone: 0,
    fails: {},
    continuesUsed: {},
    visits: {},
    album: {
      fest: [],
      milestones: 0,
      pagesClaimed: [],
      pages: [
        { bg: 0, items: [] },
        { bg: 1, items: [] },
        { bg: 0, items: [] },
      ],
    },
    buddy: { species: null, acc: null },
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
  if (!Object.hasOwn(raw, 'm4RankPaidThrough')) p.m4RankPaidThrough = Math.min(7, Math.max(0, p.rank - 1));
  if (!Object.hasOwn(raw, 'roadPoints'))
    p.roadPoints = Object.entries(p.stars).reduce((sum, [n, stars]) => sum + (+n > 0 ? stars : 0), 0) + (p.stars[0] ?? 0);
  delete p.stars[0];
  if (raw.m3Migrated !== true) {
    const oldLevels: Record<string, number> = {
      swap: 1,
      supernova: 3,
      hard: 5,
      weekly_event: 8,
      festival: 8,
      quest_spot: 8,
      voyage: 12,
      quest_voyage: 12,
      momentum: 6,
      star_road: 1,
      quests: 1,
      star_atlas: 5,
      sticker_album: 1,
      passport: 1,
      workshop: 1,
      object_lab: 1,
      upgrades: 1,
    };
    p.legacyUnlocks = Object.entries(oldLevels)
      .filter(([, level]) => p.tutorial && p.level >= level)
      .map(([id]) => id);
    if (p.tutorial) p.legacyUnlocks.push('star_calendar');
    if (Object.values(p.sightings).some((count) => count >= 5)) p.legacyUnlocks.push('buddy');
    for (const row of UNLOCKS) {
      if (row.intro && (p.legacyUnlocks.includes(row.id) || (row.planet > 0 && p.level > row.planet))) {
        const key = `coach-${row.id}`;
        if (!p.mailSeen.includes(key)) p.mailSeen.push(key);
      }
    }
    p.m3Migrated = true;
  }
  const savedSettings = raw.settings as Record<string, unknown> | undefined;
  if (typeof p.settings.spendingReminder === 'number')
    p.settings.spendingReminder = { cents: p.settings.spendingReminder * 100, currency: 'USD' };
  if (!savedSettings || !Object.hasOwn(savedSettings, 'gameCenter')) {
    p.settings.notifications = false;
    p.settings.gameCenter = false;
  }
  if ((raw.v as number | undefined) === undefined || (raw.v as number) < 2) {
    // v1 → v2: galaxy entries gained colours; stats gained counters.
    p.galaxy = p.galaxy.map((g) => ({ ...g, colors: g.colors ?? [] }));
    p.stats.threeStars = Math.max(p.stats.threeStars, Object.values(p.stars).filter((s) => s === 3).length);
    p.stats.wins = Math.max(p.stats.wins, Object.keys(p.stars).length);
  }
  if ((raw.v as number | undefined) !== undefined && (raw.v as number) < 3) {
    // v2 → v3: the daily streak became Star Calendar stamps; start the calendar fresh
    p.daily.streak = 0;
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
let saveQueue: Promise<void> = Promise.resolve();
/** Save the profile; every few saves also refresh a backup copy. */
export async function saveProfile(p: Profile) {
  if (readOnly) return;
  const json = JSON.stringify(p);
  const write = async () => {
    await saveKey(KEY, json);
    if (saves++ % 5 === 0) await saveKey(BACKUP_KEY, json);
  };
  const job = saveQueue.then(write, write);
  saveQueue = job.catch(() => {});
  await job;
}

/** Check that a paid grant reached durable storage before StoreKit is finished. */
export async function saveProfileChecked(p: Profile) {
  if (readOnly) throw new Error('Profile storage is read-only');
  await saveProfile(p);
  if ((await loadKey(KEY)) !== JSON.stringify(p)) throw new Error('Profile was not saved');
}

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayGap(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

export function totalStars(p: Profile) {
  return Object.entries(p.stars).reduce((a, [n, b]) => a + (+n > 0 ? b : 0), 0);
}
