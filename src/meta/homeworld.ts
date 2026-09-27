// Homeworld: the passive side of Pocket Planet. A planet of your own that grows
// in rings; build and upgrade structures on its plots, invite creatures from
// your Lifebook to live there, and send them on expeditions.
//
// Design rules (kid-safe, waiting-room friendly):
// - Timers are short and can never be skipped with gems. Winning a campaign
//   level speeds every active build up instead.
// - Producers fill up to a cap, so checking in 2-3 times a day is plenty.
// - Nothing is random and paid; the few random bits (debris, destinations)
//   are free and deterministic from the clock.
import type { Profile } from './profile';
import type { BoosterId } from './config';
import { SPECIES, SPECIES_BY_ID } from '../core/world';
import { rngFrom } from '../core/levels';
import { LEVELS_PER_CHAPTER } from './progression';

const H = 3600e3;
const M = 60e3;

export type BuildingType =
  'mill' | 'greenhouse' | 'grove' | 'den' | 'tower' | 'observatory' | 'fountain' | 'lantern' | 'flowers' | 'statue';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  desc: string;
  /** Ring needed before it can be built. */
  ring: number;
  /** Stardust cost to build (lv 1) — upgrades scale from it. */
  cost: number;
  /** Decorations are single-level and only add charm. */
  decor?: boolean;
  /** Gems instead of stardust (decor only; a direct purchase, never random). */
  gems?: number;
  charm?: number;
  /** At most this many of the type. */
  max: number;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  mill: { type: 'mill', name: 'Stardust Mill', desc: 'Makes stardust while you are away', ring: 1, cost: 150, max: 3 },
  den: { type: 'den', name: 'Critter Den', desc: 'A home for creatures from your Lifebook', ring: 1, cost: 250, max: 2 },
  greenhouse: { type: 'greenhouse', name: 'Greenhouse', desc: 'Grows boosters for your levels', ring: 2, cost: 600, max: 2 },
  tower: { type: 'tower', name: 'Launch Tower', desc: 'Sends residents on expeditions', ring: 2, cost: 900, max: 1 },
  grove: { type: 'grove', name: 'Crystal Grove', desc: 'Slowly grows gems', ring: 3, cost: 2000, max: 2 },
  observatory: {
    type: 'observatory',
    name: 'Observatory',
    desc: 'Every producer stores more before it is full',
    ring: 3,
    cost: 2500,
    max: 1,
  },
  fountain: {
    type: 'fountain',
    name: 'Star Fountain',
    desc: 'Decoration · residents love it',
    ring: 1,
    cost: 300,
    decor: true,
    charm: 2,
    max: 2,
  },
  lantern: {
    type: 'lantern',
    name: 'Moon Lantern',
    desc: 'Decoration · residents love it',
    ring: 1,
    cost: 200,
    decor: true,
    charm: 1,
    max: 3,
  },
  flowers: {
    type: 'flowers',
    name: 'Comet Flowers',
    desc: 'Decoration · residents love it',
    ring: 2,
    cost: 400,
    decor: true,
    charm: 2,
    max: 3,
  },
  statue: {
    type: 'statue',
    name: 'Keeper Statue',
    desc: 'Decoration · residents adore it',
    ring: 1,
    cost: 0,
    gems: 120,
    decor: true,
    charm: 4,
    max: 1,
  },
};
export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];

export const MAX_LEVEL = 5;
/** Build time for reaching each level (index = target level). */
export const BUILD_TIME = [0, 30e3, 5 * M, 30 * M, 2 * H, 4 * H];
const COST_K = [0, 1, 2.5, 6, 14, 30];
/** Plots on each ring; ring n needs chapter RING_CHAPTER[n] finished and RING_COST[n] stardust. */
export const RING_PLOTS = [0, 6, 8, 10, 12, 14];
export const RING_CHAPTER = [0, 0, 1, 3, 5, 8];
export const RING_COST = [0, 0, 1500, 5000, 12000, 30000];
export const MAX_RING = 5;
/** Winning a campaign level takes this much off every active build. */
export const WIN_SPEEDUP = 10 * M;
export const HOME_UNLOCK_LEVEL = 5;

export interface Building {
  type: BuildingType;
  lv: number;
  /** When production last restarted (collect, or finishing a build). */
  since: number;
  /** Upgrade/build in progress: finishes at this time. */
  done?: number;
}

export interface Resident {
  species: string;
  /** Friendship points. */
  fp: number;
  /** 6-hour period of the last fulfilled request. */
  lastReq: number;
  /** Friendship levels already rewarded. */
  rewarded: number;
  /** Nickname (from NICKNAMES; kid-safe, no free text). */
  nick?: string;
  /** Accessory worn (RESIDENT_ACCS id). */
  acc?: string;
}

/** Resident accessories: earned with friendship, or a couple bought with gems. */
export const RESIDENT_ACCS: { id: string; name: string; friend?: number; gems?: number }[] = [
  { id: 'bow', name: 'Bow', friend: 2 },
  { id: 'flower', name: 'Flower', friend: 3 },
  { id: 'scarf', name: 'Scarf', friend: 4 },
  { id: 'crown', name: 'Tiny Crown', friend: 5 },
  { id: 'shades', name: 'Sunglasses', gems: 40 },
  { id: 'party', name: 'Party Hat', gems: 40 },
];

export function accAvailable(p: Profile, r: Resident, id: string) {
  const a = RESIDENT_ACCS.find((x) => x.id === id);
  if (!a) return false;
  if (a.friend) return friendLevel(r.fp) >= a.friend;
  return p.home.accs.includes(id);
}

/** Put an accessory on a resident (buying a gem one first if needed). */
export function wearAcc(p: Profile, species: string, id: string | undefined): 'ok' | 'locked' | 'gems' {
  const r = p.home.residents.find((x) => x.species === species);
  if (!r) return 'locked';
  if (!id) {
    r.acc = undefined;
    return 'ok';
  }
  const a = RESIDENT_ACCS.find((x) => x.id === id);
  if (!a) return 'locked';
  if (!accAvailable(p, r, id)) {
    if (a.friend) return 'locked';
    if (p.gems < (a.gems ?? 0)) return 'gems';
    p.gems -= a.gems ?? 0;
    p.home.accs.push(id);
  }
  r.acc = id;
  return 'ok';
}

/** Pet names for residents: proper nouns, the same in every language. */
export const NICKNAMES = [
  'Pip',
  'Mochi',
  'Bean',
  'Nova',
  'Biscuit',
  'Pebbles',
  'Comet',
  'Luna',
  'Sprout',
  'Ziggy',
  'Maple',
  'Button',
  'Pudding',
  'Echo',
  'Dot',
  'Kiwi',
  'Toffee',
  'Pixel',
  'Twig',
  'Bubbles',
  'Coco',
  'Fizz',
  'Juniper',
  'Waffles',
  'Clover',
  'Nugget',
  'Sunny',
  'Marble',
  'Peanut',
  'Orbit',
  'Jellybean',
  'Noodle',
];

export function setNick(p: Profile, species: string, nick: string | undefined) {
  const r = p.home.residents.find((x) => x.species === species);
  if (!r || (nick && !NICKNAMES.includes(nick))) return false;
  r.nick = nick;
  return true;
}

export const isBestFriend = (r: Resident) => friendLevel(r.fp) >= FRIEND_LEVELS.length;

export interface Expedition {
  species: string;
  hours: number;
  ends: number;
  /** Galaxy planet index visited (for the postcard). */
  planet: number;
}

export interface HomeState {
  ring: number;
  plots: (Building | null)[];
  residents: Resident[];
  expedition: Expedition | null;
  /** Plots with meteor debris waiting to be cleared. */
  debris: number[];
  /** Last debris check (a meteor may fall every few hours). */
  lastDebris: number;
  started: number;
  /** The welcome card was shown. */
  intro: boolean;
  /** Paint job: ground and water palette ids. */
  paint: { ground: string; sea: string };
  /** Paints bought with gems. */
  paints: string[];
  /** Friendship remembered for creatures that moved out. */
  friends: Record<string, Omit<Resident, 'species'>>;
  /** Resident accessories bought with gems (shared by all residents). */
  accs: string[];
}

// ------------------------------------------------------------------ paint
export interface Paint {
  id: string;
  name: string;
  channel: 'ground' | 'sea';
  /** light, mid, dark */
  colors: [string, string, string];
  gems?: number;
  pass?: boolean;
}

export const PAINTS: Paint[] = [
  { id: 'meadow', name: 'Meadow', channel: 'ground', colors: ['#8ef0a0', '#3fae6a', '#1f6a58'] },
  { id: 'dune', name: 'Dune', channel: 'ground', colors: ['#ffe6a8', '#e0b060', '#9a6a30'] },
  { id: 'snow', name: 'Snowdrift', channel: 'ground', colors: ['#ffffff', '#cfe4ff', '#7a9ac8'] },
  { id: 'candy', name: 'Candy', channel: 'ground', colors: ['#ffd0ea', '#ff8fc8', '#b8467e'], gems: 120 },
  { id: 'ember', name: 'Ember', channel: 'ground', colors: ['#ffb08a', '#d9553a', '#5a1a2a'], gems: 120 },
  { id: 'crystal', name: 'Crystal', channel: 'ground', colors: ['#e6d6ff', '#a07aff', '#4a2a9a'], gems: 150 },
  { id: 'gilded', name: 'Gilded', channel: 'ground', colors: ['#fff2b8', '#ffc94a', '#a0600a'], pass: true },
  { id: 'blue', name: 'Ocean Blue', channel: 'sea', colors: ['#9fd6ff', '#46a0e6', '#1f5a9e'] },
  { id: 'teal', name: 'Lagoon', channel: 'sea', colors: ['#a8fff0', '#3fd6c0', '#1a7a7a'] },
  { id: 'rose', name: 'Rose Water', channel: 'sea', colors: ['#ffd0e6', '#ff7ab8', '#9a2a6a'], gems: 60 },
  { id: 'nebula', name: 'Nebula', channel: 'sea', colors: ['#e0c8ff', '#9a6bff', '#3a1a8a'], gems: 60 },
  { id: 'goldsea', name: 'Liquid Gold', channel: 'sea', colors: ['#fff6c8', '#ffd24a', '#b8800a'], pass: true },
];
export const PAINT_BY_ID: Record<string, Paint> = Object.fromEntries(PAINTS.map((x) => [x.id, x]));

export function ownsPaint(p: Profile, id: string) {
  const x = PAINT_BY_ID[id];
  if (!x) return false;
  if (x.pass) return p.pass;
  return !x.gems || p.home.paints.includes(id);
}

/** Buy (if needed) and apply a paint. */
export function applyPaint(p: Profile, id: string): 'ok' | 'gems' | 'pass' {
  const x = PAINT_BY_ID[id];
  if (!x) return 'pass';
  if (!ownsPaint(p, id)) {
    if (x.pass) return 'pass';
    if (p.gems < (x.gems ?? 0)) return 'gems';
    p.gems -= x.gems ?? 0;
    p.home.paints.push(id);
  }
  p.home.paint = { ...p.home.paint, [x.channel]: id };
  return 'ok';
}

export function currentPaint(p: Profile) {
  const g = ownsPaint(p, p.home.paint?.ground) ? p.home.paint.ground : 'meadow';
  const s = ownsPaint(p, p.home.paint?.sea) ? p.home.paint.sea : 'blue';
  return { ground: PAINT_BY_ID[g], sea: PAINT_BY_ID[s] };
}

export function defaultHome(now = Date.now()): HomeState {
  return {
    ring: 1,
    plots: Array(RING_PLOTS[1]).fill(null),
    residents: [],
    expedition: null,
    debris: [],
    lastDebris: now,
    started: now,
    intro: false,
    paint: { ground: 'meadow', sea: 'blue' },
    paints: [],
    friends: {},
    accs: [],
  };
}

export function homeUnlocked(p: Profile) {
  return p.level >= HOME_UNLOCK_LEVEL;
}

// ------------------------------------------------------------------ building
export function buildCost(type: BuildingType, lv: number) {
  const d = BUILDINGS[type];
  return Math.round((d.cost * COST_K[lv]) / 10) * 10;
}

export function drones(p: Profile) {
  return p.pass ? 3 : 2;
}

export function busyDrones(h: HomeState, now = Date.now()) {
  return h.plots.filter((b) => b?.done && b.done > now).length;
}

export function countOf(h: HomeState, type: BuildingType) {
  return h.plots.filter((b) => b?.type === type).length;
}

export type BuildCheck = 'ok' | 'ring' | 'max' | 'drones' | 'dust' | 'gems' | 'busy' | 'debris' | 'occupied' | 'maxlv';

export function canBuild(p: Profile, plot: number, type: BuildingType, now = Date.now()): BuildCheck {
  const h = p.home;
  const d = BUILDINGS[type];
  if (plot < 0 || plot >= h.plots.length) return 'occupied';
  if (h.plots[plot]) return 'occupied';
  if (h.debris.includes(plot)) return 'debris';
  if (h.ring < d.ring) return 'ring';
  if (countOf(h, type) >= d.max) return 'max';
  if (!d.decor && busyDrones(h, now) >= drones(p)) return 'drones';
  if (d.gems) return p.gems >= d.gems ? 'ok' : 'gems';
  return p.dust >= buildCost(type, 1) ? 'ok' : 'dust';
}

export function build(p: Profile, plot: number, type: BuildingType, now = Date.now()): BuildCheck {
  const c = canBuild(p, plot, type, now);
  if (c !== 'ok') return c;
  const d = BUILDINGS[type];
  if (d.gems) p.gems -= d.gems;
  else p.dust -= buildCost(type, 1);
  // decorations are placed instantly; structures need a drone
  p.home.plots[plot] = d.decor ? { type, lv: 1, since: now } : { type, lv: 1, since: now, done: now + BUILD_TIME[1] };
  return 'ok';
}

export function canUpgrade(p: Profile, plot: number, now = Date.now()): BuildCheck {
  const b = p.home.plots[plot];
  if (!b) return 'occupied';
  if (BUILDINGS[b.type].decor || b.lv >= MAX_LEVEL) return 'maxlv';
  if (b.done && b.done > now) return 'busy';
  if (b.lv + 1 > p.home.ring) return 'ring';
  if (busyDrones(p.home, now) >= drones(p)) return 'drones';
  return p.dust >= buildCost(b.type, b.lv + 1) ? 'ok' : 'dust';
}

export function upgrade(p: Profile, plot: number, now = Date.now()): BuildCheck {
  const c = canUpgrade(p, plot, now);
  if (c !== 'ok') return c;
  const b = p.home.plots[plot]!;
  // bank what it made so far; production pauses while the drones work
  collect(p, plot, now);
  p.dust -= buildCost(b.type, b.lv + 1);
  b.lv++;
  b.done = now + BUILD_TIME[b.lv];
  return 'ok';
}

/** Finish builds whose timers ran out; returns the plots that just completed. */
export function tickBuilds(h: HomeState, now = Date.now()): number[] {
  const out: number[] = [];
  h.plots.forEach((b, i) => {
    if (b?.done && b.done <= now) {
      b.since = b.done;
      delete b.done;
      out.push(i);
    }
  });
  return out;
}

/** A campaign win speeds every active build up. */
export function speedUpBuilds(h: HomeState, ms = WIN_SPEEDUP, now = Date.now()) {
  let n = 0;
  for (const b of h.plots) {
    // only builds still in progress, and never into the past (no free production)
    if (b?.done && b.done > now) {
      b.done = Math.max(now, b.done - ms);
      n++;
    }
  }
  return n;
}

/** Level whose effects apply: while upgrading, the previous level still counts. */
export function effLevel(b: Building, now = Date.now()) {
  return b.done && b.done > now ? b.lv - 1 : b.lv;
}

/** Move a building to an empty plot (free, instant). */
export function moveBuilding(h: HomeState, from: number, to: number): boolean {
  if (!h.plots[from] || h.plots[to] || h.debris.includes(to) || to < 0 || to >= h.plots.length) return false;
  h.plots[to] = h.plots[from];
  h.plots[from] = null;
  return true;
}

// ------------------------------------------------------------------ rings
export type RingCheck = 'ok' | 'max' | 'chapter' | 'dust';

export function chaptersDone(p: Profile) {
  return Math.floor((p.level - 1) / LEVELS_PER_CHAPTER);
}

export function canExpand(p: Profile): RingCheck {
  const r = p.home.ring + 1;
  if (r > MAX_RING) return 'max';
  if (chaptersDone(p) < RING_CHAPTER[r]) return 'chapter';
  return p.dust >= RING_COST[r] ? 'ok' : 'dust';
}

export function expand(p: Profile): RingCheck {
  const c = canExpand(p);
  if (c !== 'ok') return c;
  p.home.ring++;
  p.dust -= RING_COST[p.home.ring];
  while (p.home.plots.length < RING_PLOTS[p.home.ring]) p.home.plots.push(null);
  return 'ok';
}

// ------------------------------------------------------------------ production
export type Produce = 'dust' | 'booster' | 'gem';
export const PRODUCES: Partial<Record<BuildingType, Produce>> = { mill: 'dust', greenhouse: 'booster', grove: 'gem' };

/** Units per hour at each level. */
const RATE: Record<Produce, number[]> = {
  dust: [0, 40, 70, 110, 160, 230],
  booster: [0, 1 / 6, 1 / 5, 1 / 4, 1 / 3.5, 1 / 3],
  gem: [0, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2.5],
};
const BASE_CAP_HOURS = 6;

export function capHours(h: HomeState, now = Date.now()) {
  const obs = h.plots.find((b) => b?.type === 'observatory');
  return BASE_CAP_HOURS + (obs ? Math.max(0, effLevel(obs, now)) * 2 : 0);
}

export function rateOf(b: Building) {
  const kind = PRODUCES[b.type];
  return kind ? RATE[kind][b.lv] : 0;
}

/** Whole units ready to collect from a plot. */
export function ready(h: HomeState, plot: number, now = Date.now()): number {
  const b = h.plots[plot];
  if (!b || b.done || !PRODUCES[b.type]) return 0;
  const hours = Math.min(capHours(h), Math.max(0, (now - b.since) / H));
  return Math.floor(hours * rateOf(b) + 1e-9);
}

export function isFull(h: HomeState, plot: number, now = Date.now()) {
  const b = h.plots[plot];
  if (!b || b.done || !PRODUCES[b.type]) return false;
  return (now - b.since) / H >= capHours(h);
}

const BOOSTER_CYCLE: BoosterId[] = ['shower', 'spark', 'scope'];

export interface Collected {
  dust: number;
  gems: number;
  boosters: Partial<Record<BoosterId, number>>;
}

/** Collect one plot. Leftover fractions carry over so nothing is lost. */
export function collect(p: Profile, plot: number, now = Date.now()): Collected {
  const out: Collected = { dust: 0, gems: 0, boosters: {} };
  const h = p.home;
  const b = h.plots[plot];
  const n = ready(h, plot, now);
  if (!b || !n) return out;
  const kind = PRODUCES[b.type]!;
  if (kind === 'dust') out.dust = n;
  else if (kind === 'gem') out.gems = n;
  else
    for (let i = 0; i < n; i++) {
      const id = BOOSTER_CYCLE[(Math.floor(b.since / H) + plot + i) % 3];
      out.boosters[id] = (out.boosters[id] ?? 0) + 1;
    }
  p.dust += out.dust;
  p.gems += out.gems;
  for (const [k, v] of Object.entries(out.boosters)) p.boosters[k as BoosterId] += v ?? 0;
  // keep the partial unit so nothing is lost between collections
  const elapsed = Math.min(capHours(h), (now - b.since) / H);
  b.since = now - (elapsed - n / rateOf(b)) * H;
  return out;
}

export function collectAll(p: Profile, now = Date.now()): Collected {
  const total: Collected = { dust: 0, gems: 0, boosters: {} };
  p.home.plots.forEach((_, i) => {
    const c = collect(p, i, now);
    total.dust += c.dust;
    total.gems += c.gems;
    for (const [k, v] of Object.entries(c.boosters)) total.boosters[k as BoosterId] = (total.boosters[k as BoosterId] ?? 0) + (v ?? 0);
  });
  return total;
}

export function anyReady(h: HomeState, now = Date.now()) {
  return h.plots.some((_, i) => ready(h, i, now) > 0);
}

// ------------------------------------------------------------------ residents
export const FRIEND_LEVELS = [0, 3, 8, 15, 25];

export function denCapacity(h: HomeState, now = Date.now()) {
  return h.plots.reduce((a, b) => {
    const lv = b?.type === 'den' ? effLevel(b, now) : 0;
    return a + (lv > 0 ? lv + 1 : 0);
  }, 0);
}

export function charm(h: HomeState) {
  return h.plots.reduce((a, b) => a + (b ? (BUILDINGS[b.type].charm ?? 0) : 0), 0);
}

export function friendLevel(fp: number) {
  return FRIEND_LEVELS.filter((x) => fp >= x).length;
}

/** Lifebook creatures that could move in. */
export function candidates(p: Profile) {
  const here = new Set(p.home.residents.map((r) => r.species));
  return SPECIES.filter((s) => p.seen.includes(s.id) && !here.has(s.id));
}

export function invite(p: Profile, species: string): boolean {
  const h = p.home;
  if (!p.seen.includes(species) || h.residents.some((r) => r.species === species)) return false;
  if (h.residents.length >= denCapacity(h)) return false;
  // a creature that lived here before remembers you (and its friendship, rewards and today's request)
  const old = h.friends?.[species];
  h.residents.push(old ? { ...old, species } : { species, fp: 0, lastReq: -1, rewarded: 1 });
  return true;
}

export function sendHome(p: Profile, species: string): boolean {
  const h = p.home;
  if (h.expedition?.species === species) return false;
  const i = h.residents.findIndex((r) => r.species === species);
  if (i < 0) return false;
  const [r] = h.residents.splice(i, 1);
  h.friends = { ...h.friends, [species]: { ...r } };
  return true;
}

/** Add friendship points, paying each newly reached level exactly once. */
export function addFriendship(p: Profile, r: Resident, pts: number): { levelUp?: number; gems?: number } {
  r.fp += pts;
  const lv = friendLevel(r.fp);
  if (lv <= r.rewarded) return {};
  let gems = 0;
  for (let l = r.rewarded + 1; l <= lv; l++) gems += 5 * l;
  p.gems += gems;
  r.rewarded = lv;
  if (lv >= FRIEND_LEVELS.length && !p.mementos.includes(r.species)) p.mementos.push(r.species);
  return { levelUp: lv, gems };
}

export type RequestKind = 'treat' | 'pat' | 'decor';
export interface Request {
  kind: RequestKind;
  /** Stardust for a treat; decoration type wanted for 'decor'. */
  dust?: number;
  decor?: BuildingType;
}

export const REQ_PERIOD = 6 * H;
// Only decorations bought with stardust: a resident never nudges you toward spending gems.
const DECOR_WANTS: BuildingType[] = ['fountain', 'lantern', 'flowers'];

export function period(now = Date.now()) {
  return Math.floor(now / REQ_PERIOD);
}

/** This period's request for a resident (deterministic), or null if already done. */
export function requestOf(r: Resident, now = Date.now(), ring = MAX_RING): Request | null {
  const per = period(now);
  if (r.lastReq === per) return null;
  const rnd = rngFrom(`REQ-${r.species}-${per}`);
  const x = rnd();
  const lv = friendLevel(r.fp);
  if (x < 0.4) return { kind: 'treat', dust: 40 + lv * 30 };
  if (x < 0.75) return { kind: 'pat' };
  const wants = DECOR_WANTS.filter((d) => BUILDINGS[d].ring <= ring);
  return { kind: 'decor', decor: wants[Math.floor(rnd() * wants.length)] };
}

export type FulfilCheck = 'ok' | 'none' | 'dust' | 'decor' | 'away';

export function fulfil(p: Profile, species: string, now = Date.now()): { result: FulfilCheck; levelUp?: number; gems?: number } {
  const h = p.home;
  const r = h.residents.find((x) => x.species === species);
  if (!r) return { result: 'none' };
  if (h.expedition?.species === species) return { result: 'away' };
  const req = requestOf(r, now, h.ring);
  if (!req) return { result: 'none' };
  if (req.kind === 'treat') {
    if (p.dust < (req.dust ?? 0)) return { result: 'dust' };
    p.dust -= req.dust ?? 0;
  }
  if (req.kind === 'decor' && !countOf(h, req.decor!)) return { result: 'decor' };
  r.lastReq = period(now);
  // charm makes friends faster: +1 bonus point per 4 charm
  const up = addFriendship(p, r, (req.kind === 'treat' ? 2 : 1) + Math.floor(charm(h) / 4));
  return { result: 'ok', ...up };
}

export function requestsWaiting(h: HomeState, now = Date.now()) {
  return h.residents.filter((r) => h.expedition?.species !== r.species && requestOf(r, now, h.ring)).length;
}

// ------------------------------------------------------------------ expeditions
export const EXPEDITION_HOURS = [1, 4, 8];

export function towerLevel(h: HomeState, now = Date.now()) {
  const t = h.plots.find((b) => b?.type === 'tower');
  return t ? Math.max(0, effLevel(t, now)) : 0;
}

export function expeditionOptions(h: HomeState) {
  const lv = towerLevel(h);
  return EXPEDITION_HOURS.filter((_, i) => lv >= [1, 2, 3][i]);
}

export function expeditionLoot(hours: number, towerLv: number, species: string) {
  const rare = SPECIES_BY_ID[species]?.rarity;
  const bonus = rare === 'legendary' ? 1.5 : rare === 'rare' ? 1.25 : 1;
  return {
    dust: Math.round(hours * 120 * (1 + towerLv * 0.1) * bonus),
    gems: hours >= 8 ? 6 : hours >= 4 ? 2 : 0,
    boosters: hours >= 8 ? ({ shower: 1, spark: 1, scope: 1 } as Partial<Record<BoosterId, number>>) : hours >= 4 ? { spark: 1 } : {},
  };
}

export function startExpedition(p: Profile, species: string, hours: number, now = Date.now()): boolean {
  const h = p.home;
  if (h.expedition || !expeditionOptions(h).includes(hours)) return false;
  if (!h.residents.some((r) => r.species === species)) return false;
  const planet = p.galaxy.length ? Math.floor(rngFrom(`EXP-${species}-${now}`)() * p.galaxy.length) : -1;
  h.expedition = { species, hours, ends: now + hours * H, planet };
  return true;
}

export function expeditionBack(h: HomeState, now = Date.now()) {
  return !!h.expedition && h.expedition.ends <= now;
}

export function finishExpedition(p: Profile, now = Date.now()) {
  const h = p.home;
  const e = h.expedition;
  if (!e || e.ends > now) return null;
  const loot = expeditionLoot(e.hours, towerLevel(h), e.species);
  p.dust += loot.dust;
  p.gems += loot.gems;
  for (const [k, v] of Object.entries(loot.boosters)) p.boosters[k as BoosterId] += v ?? 0;
  const r = h.residents.find((x) => x.species === e.species);
  if (r) addFriendship(p, r, Math.ceil(e.hours / 4) + 1);
  h.expedition = null;
  return { ...loot, species: e.species, planet: e.planet, hours: e.hours };
}

// ------------------------------------------------------------------ meteor debris
export const DEBRIS_EVERY = 3 * H;
export const DEBRIS_MAX = 3;
export const DEBRIS_DUST = 60;

/** Meteors fall on empty plots while you're away (never on buildings). */
export function tickDebris(h: HomeState, now = Date.now()): number {
  let added = 0;
  while (now - h.lastDebris >= DEBRIS_EVERY) {
    h.lastDebris += DEBRIS_EVERY;
    if (h.debris.length >= DEBRIS_MAX) continue;
    const free = h.plots.map((b, i) => (b || h.debris.includes(i) ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) continue;
    const i = free[Math.floor(rngFrom(`DEB-${h.lastDebris}`)() * free.length)];
    h.debris.push(i);
    added++;
  }
  return added;
}

export function clearDebris(p: Profile, plot: number): number {
  const i = p.home.debris.indexOf(plot);
  if (i < 0) return 0;
  p.home.debris.splice(i, 1);
  p.dust += DEBRIS_DUST;
  return DEBRIS_DUST;
}

// ------------------------------------------------------------------ summary
/** Things waiting on the Homeworld (for the home-screen badge). */
export function homeBadge(p: Profile, now = Date.now()) {
  if (!homeUnlocked(p)) return 0;
  const h = p.home;
  let n = 0;
  if (anyReady(h, now)) n++;
  if (h.plots.some((b) => b?.done && b.done <= now)) n++;
  if (expeditionBack(h, now)) n++;
  n += requestsWaiting(h, now) ? 1 : 0;
  n += h.debris.length ? 1 : 0;
  return n;
}

/** Keep state consistent on load (builds finishing while away, debris). */
export function tickHome(p: Profile, now = Date.now()) {
  const h = p.home;
  while (h.plots.length < RING_PLOTS[h.ring]) h.plots.push(null);
  const done = tickBuilds(h, now);
  tickDebris(h, now);
  return done;
}
