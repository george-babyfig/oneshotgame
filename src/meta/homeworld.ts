import { RING_PLOTS, RING_CHAPTER, WIN_SPEEDUP, FRIEND_LEVELS, REQ_PERIOD, EXPEDITION_HOURS, DEBRIS_EVERY, DEBRIS_MAX } from './tuning';
import { FRIENDSHIP_REWARD_GEMS_PER_LEVEL, FRIENDSHIP_TREAT, EXPEDITION_REWARD, EXPEDITION_MULTIPLIER } from './tuning';
import { ledger } from './ledger';
import { BASE_CAP_HOURS } from './tuning';
import { RATE } from './tuning';
import { COST_K } from './tuning';
import { DEBRIS_DUST } from './tuning';
import { PAINTS } from './tuning';
import { RESIDENT_ACCS } from './tuning';
import { RING_COST } from './tuning';
import { BUILD_TIME } from './tuning';
import { BUILDINGS } from './tuning';
import { earn, spend } from './wallet';
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
import { unlocked } from './unlocks';

const H = 3600e3;

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

export { BUILDINGS } from './tuning';

export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];

export const MAX_LEVEL = 5;
/** Build time for reaching each level (index = target level). */
export { BUILD_TIME } from './tuning';

/** Plots on each ring; ring n needs chapter RING_CHAPTER[n] finished and RING_COST[n] stardust. */
export { RING_PLOTS } from './tuning';
export { RING_CHAPTER } from './tuning';
export { RING_COST } from './tuning';

export const MAX_RING = 5;
/** Winning a campaign level takes this much off every active build. */
export { WIN_SPEEDUP } from './tuning';
export { HOME_UNLOCK_LEVEL } from './unlocks';

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
export { RESIDENT_ACCS } from './tuning';

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
    ledger.homeworldAction();
    return 'ok';
  }
  const a = RESIDENT_ACCS.find((x) => x.id === id);
  if (!a) return 'locked';
  if (!accAvailable(p, r, id)) {
    if (a.friend || a.fest) return 'locked';
    if (p.gems < (a.gems ?? 0)) return 'gems';
    spend(p, 'gems', a.gems ?? 0, 'accessory');
    p.home.accs.push(id);
  }
  ledger.homeworldAction();
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
  /** Latest observed clock time; a rollback cannot finish work early. */
  lastTick?: number;
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

export { PAINTS } from './tuning';

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
    spend(p, 'gems', x.gems ?? 0, 'cosmetic');
    p.home.paints.push(id);
  }
  ledger.homeworldAction();
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
    lastTick: now,
    intro: false,
    paint: { ground: 'meadow', sea: 'blue' },
    paints: [],
    friends: {},
    accs: [],
  };
}

export function homeUnlocked(p: Profile) {
  return unlocked(p, 'homeworld');
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
  if (now < (h.lastTick ?? 0)) return 'busy';
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
  if (d.gems) spend(p, 'gems', d.gems, 'build');
  else spend(p, 'dust', buildCost(type, 1), 'build');
  // decorations are placed instantly; structures need a drone
  ledger.homeworldAction();
  p.home.plots[plot] = d.decor ? { type, lv: 1, since: now } : { type, lv: 1, since: now, done: now + BUILD_TIME[1] };
  return 'ok';
}

export function canUpgrade(p: Profile, plot: number, now = Date.now()): BuildCheck {
  if (now < (p.home.lastTick ?? 0)) return 'busy';
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
  spend(p, 'dust', buildCost(b.type, b.lv + 1), 'upgrade');
  ledger.homeworldAction();
  b.lv++;
  b.done = now + BUILD_TIME[b.lv];
  return 'ok';
}

/** Finish builds whose timers ran out; returns the plots that just completed. */
export function tickBuilds(h: HomeState, now = Date.now()): number[] {
  const out: number[] = [];
  if (now < (h.lastTick ?? 0)) return out;
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
  if (now < (h.lastTick ?? 0)) return 0;
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
  ledger.homeworldAction();
  p.home.ring++;
  spend(p, 'dust', RING_COST[p.home.ring], 'ring');
  while (p.home.plots.length < RING_PLOTS[p.home.ring]) p.home.plots.push(null);
  return 'ok';
}

// ------------------------------------------------------------------ production
export type Produce = 'dust' | 'booster' | 'gem';
export const PRODUCES: Partial<Record<BuildingType, Produce>> = { mill: 'dust', greenhouse: 'booster', grove: 'gem' };

/** Units per hour at each level. */

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
  if (now < (h.lastTick ?? 0)) return 0;
  const hours = Math.min(capHours(h, now), Math.max(0, (now - b.since) / H));
  return Math.floor(hours * rateOf(b) + 1e-9);
}

export function isFull(h: HomeState, plot: number, now = Date.now()) {
  const b = h.plots[plot];
  if (!b || b.done || !PRODUCES[b.type]) return false;
  return now >= (h.lastTick ?? 0) && (now - b.since) / H >= capHours(h, now);
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
  earn(p, 'dust', out.dust, 'homeworld_producer');
  earn(p, 'gems', out.gems, 'homeworld_producer');
  for (const [k, v] of Object.entries(out.boosters)) p.boosters[k as BoosterId] += v ?? 0;
  // keep the partial unit so nothing is lost between collections
  const elapsed = Math.min(capHours(h, now), (now - b.since) / H);
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

/** Read-only totals for a single collect card. */
export function pendingHomeProduction(h: HomeState, now = Date.now()) {
  const total = { dust: 0, gems: 0, boosters: 0 };
  h.plots.forEach((b, i) => {
    if (!b) return;
    const n = ready(h, i, now);
    const kind = PRODUCES[b.type];
    if (kind === 'dust') total.dust += n;
    else if (kind === 'gem') total.gems += n;
    else if (kind === 'booster') total.boosters += n;
  });
  return total;
}

// ------------------------------------------------------------------ residents
export { FRIEND_LEVELS } from './tuning';

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
  ledger.homeworldAction();
  h.residents.push(old ? { ...old, species } : { species, fp: 0, lastReq: -1, rewarded: 1 });
  return true;
}

export function sendHome(p: Profile, species: string): boolean {
  const h = p.home;
  if (h.expedition?.species === species) return false;
  const i = h.residents.findIndex((r) => r.species === species);
  if (i < 0) return false;
  ledger.homeworldAction();
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
  for (let l = r.rewarded + 1; l <= lv; l++) gems += FRIENDSHIP_REWARD_GEMS_PER_LEVEL * l;
  earn(p, 'gems', gems, 'buddy');
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

export { REQ_PERIOD } from './tuning';
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
  if (x < 0.4) return { kind: 'treat', dust: FRIENDSHIP_TREAT.baseDust + lv * FRIENDSHIP_TREAT.dustPerLevel };
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
    spend(p, 'dust', req.dust ?? 0, 'friendship');
  }
  if (req.kind === 'decor' && !countOf(h, req.decor!)) return { result: 'decor' };
  ledger.homeworldAction();
  r.lastReq = period(now);
  // charm makes friends faster: +1 bonus point per 4 charm
  const up = addFriendship(p, r, (req.kind === 'treat' ? 2 : 1) + Math.floor(charm(h) / 4));
  return { result: 'ok', ...up };
}

export function requestsWaiting(h: HomeState, now = Date.now()) {
  return h.residents.filter((r) => h.expedition?.species !== r.species && requestOf(r, now, h.ring)).length;
}

// ------------------------------------------------------------------ expeditions
export { EXPEDITION_HOURS } from './tuning';

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
  const bonus = rare === 'legendary' ? EXPEDITION_MULTIPLIER.legendary : rare === 'rare' ? EXPEDITION_MULTIPLIER.rare : 1;
  return {
    dust: Math.round(hours * EXPEDITION_REWARD.dustPerHour * (1 + towerLv * EXPEDITION_MULTIPLIER.perTowerLevel) * bonus),
    gems:
      hours >= EXPEDITION_REWARD.eightHourThreshold
        ? EXPEDITION_REWARD.eightHourGems
        : hours >= EXPEDITION_REWARD.fourHourThreshold
          ? EXPEDITION_REWARD.fourHourGems
          : 0,
    boosters: hours >= 8 ? ({ shower: 1, spark: 1, scope: 1 } as Partial<Record<BoosterId, number>>) : hours >= 4 ? { spark: 1 } : {},
  };
}

export function startExpedition(p: Profile, species: string, hours: number, now = Date.now()): boolean {
  const h = p.home;
  if (now < (h.lastTick ?? 0) || h.expedition || !expeditionOptions(h).includes(hours)) return false;
  if (!h.residents.some((r) => r.species === species)) return false;
  const planet = p.galaxy.length ? Math.floor(rngFrom(`EXP-${species}-${now}`)() * p.galaxy.length) : -1;
  ledger.homeworldAction();
  h.expedition = { species, hours, ends: now + hours * H, planet };
  return true;
}

export function expeditionBack(h: HomeState, now = Date.now()) {
  return now >= (h.lastTick ?? 0) && !!h.expedition && h.expedition.ends <= now;
}

export function finishExpedition(p: Profile, now = Date.now()) {
  const h = p.home;
  const e = h.expedition;
  if (!e || e.ends > now || now < (h.lastTick ?? 0)) return null;
  const loot = expeditionLoot(e.hours, towerLevel(h), e.species);
  earn(p, 'dust', loot.dust, 'expedition');
  earn(p, 'gems', loot.gems, 'expedition');
  for (const [k, v] of Object.entries(loot.boosters)) p.boosters[k as BoosterId] += v ?? 0;
  const r = h.residents.find((x) => x.species === e.species);
  if (r) addFriendship(p, r, Math.ceil(e.hours / 4) + 1);
  h.expedition = null;
  return { ...loot, species: e.species, planet: e.planet, hours: e.hours };
}

// ------------------------------------------------------------------ meteor debris
export { DEBRIS_EVERY } from './tuning';
export { DEBRIS_MAX } from './tuning';
export { DEBRIS_DUST } from './tuning';

/** Meteors fall on empty plots while you're away (never on buildings). */
export function tickDebris(h: HomeState, now = Date.now()): number {
  let added = 0;
  if (now < (h.lastTick ?? 0)) return 0;
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
  earn(p, 'dust', DEBRIS_DUST, 'debris');
  return DEBRIS_DUST;
}

// ------------------------------------------------------------------ summary
/** Things waiting on the Homeworld (for the home-screen badge). */
export function homeBadge(p: Profile, now = Date.now()) {
  if (!homeUnlocked(p)) return 0;
  const h = p.home;
  let n = 0;
  if (anyReady(h, now)) n++;
  if (now >= (h.lastTick ?? 0) && h.plots.some((b) => b?.done && b.done <= now)) n++;
  if (expeditionBack(h, now)) n++;
  n += h.residents.some((r) => {
    if (h.expedition?.species === r.species) return false;
    const req = requestOf(r, now, h.ring);
    return req && (req.kind === 'pat' || (req.kind === 'decor' && countOf(h, req.decor!)));
  })
    ? 1
    : 0;
  return n;
}

/** Keep state consistent on load (builds finishing while away, debris). */
export function tickHome(p: Profile, now = Date.now()) {
  const h = p.home;
  while (h.plots.length < RING_PLOTS[h.ring]) h.plots.push(null);
  if (now < (h.lastTick ?? 0)) return [];
  const done = tickBuilds(h, now);
  tickDebris(h, now);
  h.lastTick = now;
  return done;
}
