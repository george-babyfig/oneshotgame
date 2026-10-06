import { RING_PLOTS, WIN_SPEEDUP, FRIEND_LEVELS, EXPEDITION_HOURS, HOME_LEVEL_REQUIREMENTS } from './tuning';
import { FRIENDSHIP_REWARD_GEMS_PER_LEVEL, EXPEDITION_REWARD, EXPEDITION_MULTIPLIER } from './tuning';
import { ledger } from './ledger';
import { COST_K } from './tuning';
import { PAINTS } from './tuning';
import { RESIDENT_ACCS } from './tuning';
import { BUILD_TIME } from './tuning';
import { BUILDINGS } from './tuning';
import type { GreenhouseState, HomeworldLevel, WonRoundEvent } from './homeworldTypes';
import { earn, spend } from './wallet';
// Homeworld: a planet that grows through five levels. Build on its plots,
// invite Lifebook creatures and send them on expeditions.
//
// Design rules (kid-safe, waiting-room friendly):
// - Timers are short and can never be skipped with gems. Winning a campaign
//   level speeds every active build up instead.
// - Greenhouses grow a chosen booster from wins and pause when full.
// - Expedition destinations are free and deterministic from the clock.
import type { Profile } from './profile';
import type { BoosterId } from './config';
import { SPECIES, SPECIES_BY_ID, type Kind } from '../core/world';
import { rngFrom } from '../core/levels';
import { LEVELS_PER_CHAPTER } from './progression';
import { unlocked } from './unlocks';

const H = 3600e3;

export type BuildingType =
  'lab' | 'mill' | 'greenhouse' | 'grove' | 'den' | 'launch_bay' | 'observatory' | 'fountain' | 'lantern' | 'flowers' | 'statue';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  desc: string;
  /** Homeworld Level needed before it can be built. */
  ring: number;
  /** Stardust cost to build (lv 1) — upgrades scale from it. */
  cost: number;
  /** Decorations are single-level. */
  decor?: boolean;
  /** Gems instead of stardust (decor only; a direct purchase, never random). */
  gems?: number;
  charm?: number;
  /** At most this many of the type. */
  max: number;
}

export { BUILDINGS } from './tuning';

const activeBuilding = (type: BuildingType): boolean => type !== 'mill' && type !== 'grove' && type !== 'observatory';
export const BUILDING_TYPES: BuildingType[] = (Object.keys(BUILDINGS) as BuildingType[]).filter(activeBuilding);

export const MAX_LEVEL = 5;
/** Build time for reaching each level (index = target level). */
export { BUILD_TIME } from './tuning';

/** Plot and chapter compatibility tables for existing callers. */
export { RING_PLOTS } from './tuning';
export { RING_CHAPTER } from './tuning';
export { RING_COST } from './tuning';

export const MAX_RING = 5;
/** Winning a campaign level takes this much off every active build. */
export { WIN_SPEEDUP } from './tuning';
export { HOME_UNLOCK_LEVEL } from './unlocks';

export interface Building {
  type: BuildingType;
  kind?: Kind;
  lv: number;
  /** When production last restarted (collect, or finishing a build). */
  since: number;
  /** Upgrade/build in progress: finishes at this time. */
  done?: number;
  greenhouse?: GreenhouseState;
}

export interface Resident {
  species: string;
  /** Friendship points. */
  fp: number;
  /** Old request marker retained for existing friendship saves. */
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
  level: HomeworldLevel;
  /** Legacy mirror until all save and screen readers migrate. */
  ring: number;
  firstHour: 0 | 1 | 2;
  labFreeUsed: boolean;
  plots: (Building | null)[];
  residents: Resident[];
  expedition: Expedition | null;
  /** Plots with meteor debris waiting to be cleared. */
  debris: number[];
  /** Last debris check (a meteor may fall every few hours). */
  lastDebris: number;
  /** Latest observed clock time; a rollback cannot finish work early. */
  lastTick?: number;
  /** Last handled win event, so a repeated callback cannot award it twice. */
  lastWonRound?: string;
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
    level: 1,
    ring: 1,
    firstHour: 0,
    labFreeUsed: false,
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
  if (type === 'launch_bay') return [0, 800, 2000, 4800, 11200, 24000][lv] ?? 0;
  if (type === 'den') return [0, 250, 630, 1500, 3500, 7500][lv] ?? 0;
  if (type === 'greenhouse') return [0, 600, 1500, 3600][lv] ?? 0;
  const d = BUILDINGS[type];
  return Math.round((d.cost * COST_K[lv]) / 10) * 10;
}

/** Paid prices from before M11; retired tuning entries deliberately cost zero. */
export function retiredBuildingRefund(type: BuildingType, level: number): number {
  const base: Partial<Record<BuildingType, number>> = { mill: 150, grove: 2000, observatory: 2500 };
  const cost = base[type];
  if (!cost) return 0;
  let total = 0;
  for (let lv = 1; lv <= Math.min(5, Math.max(0, Math.floor(level))); lv++) total += Math.round((cost * COST_K[lv]) / 10) * 10;
  return total;
}

/** One-time refund: removing each old plot makes repeated migration harmless. */
export function retireBuildings(p: Profile): number {
  let refund = 0;
  p.home.plots.forEach((b, i) => {
    if (!b || !['mill', 'grove', 'observatory'].includes(b.type)) return;
    refund += retiredBuildingRefund(b.type, b.lv);
    p.home.plots[i] = null;
  });
  if (refund) earn(p, 'dust', refund, 'migration_refund');
  p.home.debris = [];
  return refund;
}

export function drones(p: Profile) {
  // Sole M11 grandfathering: legacy Pass included a paid third drone, so 11.6 preserves that value.
  const legacyPassDrone = p.pass && !(p.meta as Profile['meta'] & { passLooksOnly?: boolean }).passLooksOnly;
  return p.home.level >= 3 || legacyPassDrone ? 3 : 2;
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
  if (type === 'lab' || type === 'mill' || type === 'grove' || type === 'observatory') return 'max';
  if (plot < 0 || plot >= h.plots.length) return 'occupied';
  if (h.plots[plot]) return 'occupied';
  if (h.level < d.ring) return 'ring';
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
  p.home.plots[plot] = d.decor
    ? { type, lv: 1, since: now }
    : { type, lv: 1, since: now, done: now + BUILD_TIME[1], ...(type === 'greenhouse' ? { greenhouse: defaultGreenhouse() } : {}) };
  return 'ok';
}

export function canUpgrade(p: Profile, plot: number, now = Date.now()): BuildCheck {
  if (now < (p.home.lastTick ?? 0)) return 'busy';
  const b = p.home.plots[plot];
  if (!b) return 'occupied';
  if (b.type === 'lab' || b.type === 'mill' || b.type === 'grove' || b.type === 'observatory') return 'maxlv';
  if (b.type === 'greenhouse' && b.lv >= 3) return 'maxlv';
  if (BUILDINGS[b.type].decor || b.lv >= MAX_LEVEL) return 'maxlv';
  if (b.done && b.done > now) return 'busy';
  if (b.lv + 1 > p.home.level) return 'ring';
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
  if (!h.plots[from] || h.plots[to] || to < 0 || to >= h.plots.length) return false;
  h.plots[to] = h.plots[from];
  h.plots[from] = null;
  return true;
}

// ------------------------------------------------------------------ rings
export type RingCheck = 'ok' | 'max' | 'chapter' | 'dust' | 'essence';

export function chaptersDone(p: Profile) {
  return Math.floor((p.level - 1) / LEVELS_PER_CHAPTER);
}

export function canExpand(p: Profile): RingCheck {
  const r = p.home.level + 1;
  if (r > MAX_RING) return 'max';
  const need = HOME_LEVEL_REQUIREMENTS[r as HomeworldLevel];
  if (chaptersDone(p) < need.chapter) return 'chapter';
  if (p.dust < need.dust) return 'dust';
  return Object.entries(need.essence).every(([mat, amount]) => (p.mats[mat as keyof typeof p.mats] ?? 0) >= amount) ? 'ok' : 'essence';
}

export function expand(p: Profile): RingCheck {
  const c = canExpand(p);
  if (c !== 'ok') return c;
  ledger.homeworldAction();
  const next = (p.home.level + 1) as HomeworldLevel;
  const need = HOME_LEVEL_REQUIREMENTS[next];
  spend(p, 'dust', need.dust, 'ring');
  for (const [mat, amount] of Object.entries(need.essence)) spend(p, mat as keyof typeof p.mats, amount, 'ring');
  p.home.level = next;
  p.home.ring = next;
  while (p.home.plots.length < RING_PLOTS[next]) p.home.plots.push(null);
  return 'ok';
}

// ------------------------------------------------------------------ production
export type Produce = 'dust' | 'booster' | 'gem';
export const PRODUCES: Partial<Record<BuildingType, Produce>> = { greenhouse: 'booster' };

/** Units per hour at each level. */

export function capHours(h: HomeState, now = Date.now()) {
  void h;
  void now;
  return 0;
}

export function rateOf(b: Building) {
  void b;
  return 0;
}

export const defaultGreenhouse = (): GreenhouseState => ({
  choice: 'shower',
  winsTowardNext: 0,
  stored: 0,
  storedByType: { shower: 0, spark: 0, scope: 0 },
});

function greenhouseOf(b: Building): GreenhouseState {
  const state = (b.greenhouse ??= defaultGreenhouse());
  // An older one-type stock belongs to the crop that produced it.
  state.storedByType ??= { shower: 0, spark: 0, scope: 0, [state.choice]: Number.isFinite(state.stored) ? state.stored : 0 };
  for (const id of ['shower', 'spark', 'scope'] as const) {
    const count = state.storedByType[id];
    state.storedByType[id] = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }
  state.stored = Object.values(state.storedByType).reduce((sum, n) => sum + n, 0);
  return state;
}

/** Preserve an old house's accrued booster and refund levels above the new cap. */
export function migrateGreenhouses(p: Profile, now = Date.now()): number {
  const observedNow = Math.max(now, p.home.lastTick ?? now);
  const oldObservatory = p.home.plots.find((b) => b?.type === 'observatory');
  const capHours = 6 + (oldObservatory ? Math.max(0, effLevel(oldObservatory, observedNow)) * 2 : 0);
  const oldRates = [0, 1 / 6, 1 / 5, 1 / 4, 1 / 3.5, 1 / 3];
  let refund = 0;
  for (const b of p.home.plots) {
    if (b?.type !== 'greenhouse') continue;
    if (!b.greenhouse) {
      const start = b.done ? (b.done <= observedNow ? b.done : undefined) : b.since;
      const hours = start === undefined ? 0 : Math.min(capHours, Math.max(0, (observedNow - start) / H));
      b.greenhouse = { choice: 'shower', winsTowardNext: 0, stored: Math.min(3, Math.floor(hours * oldRates[Math.min(5, b.lv)])) };
    }
    if (b.lv > 3) {
      for (let lv = 4; lv <= Math.min(5, b.lv); lv++) refund += Math.round((600 * COST_K[lv]) / 10) * 10;
      b.lv = 3;
      delete b.done;
      b.since = observedNow;
    }
    const state = greenhouseOf(b);
    const cap = Math.min(3, b.lv);
    if (state.stored > cap) {
      let excess = state.stored - cap;
      for (const id of [state.choice, ...(['shower', 'spark', 'scope'] as const).filter((id) => id !== state.choice)]) {
        const removed = Math.min(excess, state.storedByType![id]);
        state.storedByType![id] -= removed;
        excess -= removed;
      }
      state.stored = Object.values(state.storedByType!).reduce((sum, n) => sum + n, 0);
    }
  }
  if (refund) earn(p, 'dust', refund, 'migration_refund');
  return refund;
}

export function chooseGreenhouse(p: Profile, plot: number, choice: GreenhouseState['choice']): boolean {
  const b = p.home.plots[plot];
  if (b?.type !== 'greenhouse' || !['shower', 'spark', 'scope'].includes(choice)) return false;
  greenhouseOf(b).choice = choice;
  return true;
}

/** Each eligible win advances each non-full house once. Full houses pause. */
export function recordGreenhouseWin(p: Profile, event: WonRoundEvent): number {
  if (!['campaign', 'voyage', 'zen'].includes(event.mode)) return 0;
  let grown = 0;
  for (const b of p.home.plots.filter((plot) => plot?.type === 'greenhouse').slice(0, 2)) {
    if (b?.type !== 'greenhouse' || effLevel(b, event.at) < 1) continue;
    const state = greenhouseOf(b);
    const cap = Math.min(3, effLevel(b, event.at));
    if (state.stored >= cap) continue;
    state.winsTowardNext++;
    if (state.winsTowardNext >= 6) {
      state.winsTowardNext = 0;
      state.storedByType![state.choice]++;
      state.stored++;
      grown++;
    }
  }
  return grown;
}

/** Called once after a completed win, with the Buddy used in that round. */
export function recordHomeworldWin(p: Profile, event: WonRoundEvent): void {
  const key = `${event.mode}|${event.planetKey}|${event.at}`;
  if (p.home.lastWonRound === key) return;
  p.home.lastWonRound = key;
  recordGreenhouseWin(p, event);
  if (event.mode === 'campaign') speedUpBuilds(p.home, WIN_SPEEDUP, event.at);
  if (!['campaign', 'voyage', 'zen'].includes(event.mode) || !event.buddySpecies) return;
  const friend = p.home.residents.find((r) => r.species === event.buddySpecies);
  if (friend) addFriendship(p, friend, 1);
}

/** Whole units ready to collect from a plot. */
export function ready(h: HomeState, plot: number, now = Date.now()): number {
  const b = h.plots[plot];
  if (b?.type !== 'greenhouse' || effLevel(b, now) < 1) return 0;
  if (now < (h.lastTick ?? 0)) return 0;
  return greenhouseOf(b).stored;
}

export function isFull(h: HomeState, plot: number, now = Date.now()) {
  const b = h.plots[plot];
  return b?.type === 'greenhouse' && greenhouseOf(b).stored >= Math.min(3, effLevel(b, now));
}

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
  if (b?.type !== 'greenhouse' || !n) return out;
  const state = greenhouseOf(b);
  for (const id of ['shower', 'spark', 'scope'] as const) {
    const count = state.storedByType![id];
    if (!count) continue;
    out.boosters[id] = count;
    p.boosters[id] += count;
    state.storedByType![id] = 0;
  }
  state.stored = 0;
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

// Legacy request entry points stay inert until screen readers retire them.
export type RequestKind = 'treat' | 'pat' | 'decor';
export interface Request {
  kind: RequestKind;
  dust?: number;
  decor?: BuildingType;
}
export { REQ_PERIOD } from './tuning';
export function period(now = Date.now()) {
  return Math.floor(now / (6 * H));
}
export function requestOf(_r: Resident, _now = Date.now(), _level = MAX_LEVEL): Request | null {
  return null;
}
export type FulfilCheck = 'ok' | 'none' | 'dust' | 'decor' | 'away';
export function fulfil(_p: Profile, _species: string, _now = Date.now()): { result: FulfilCheck; levelUp?: number; gems?: number } {
  return { result: 'none' };
}
export function requestsWaiting(_h: HomeState, _now = Date.now()) {
  return 0;
}

// ------------------------------------------------------------------ expeditions
export { EXPEDITION_HOURS } from './tuning';

export function bayLevel(h: HomeState, now = Date.now()) {
  const t = h.plots.find((b) => b?.type === 'launch_bay');
  return t ? Math.max(0, effLevel(t, now)) : 0;
}

/** Legacy name retained for callers of the existing expedition flow. */
export const towerLevel = bayLevel;

export function expeditionOptions(h: HomeState) {
  const lv = bayLevel(h);
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
  const loot = expeditionLoot(e.hours, bayLevel(h), e.species);
  earn(p, 'dust', loot.dust, 'expedition');
  earn(p, 'gems', loot.gems, 'expedition');
  for (const [k, v] of Object.entries(loot.boosters)) p.boosters[k as BoosterId] += v ?? 0;
  h.expedition = null;
  h.lastTick = Math.max(h.lastTick ?? 0, now); // A forward clock claim becomes the new rollback high-water mark.
  return { ...loot, species: e.species, planet: e.planet, hours: e.hours };
}

// ------------------------------------------------------------------ meteor debris
export { DEBRIS_EVERY } from './tuning';
export { DEBRIS_MAX } from './tuning';
export { DEBRIS_DUST } from './tuning';

/** Legacy debris is cleared on load without creating a new payout. */
export function tickDebris(_h: HomeState, _now = Date.now()): number {
  return 0;
}
export function clearDebris(p: Profile, plot: number): number {
  p.home.debris = p.home.debris.filter((i) => i !== plot);
  return 0;
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
  return n;
}

/** Keep state consistent on load (builds finishing while away, debris). */
export function tickHome(p: Profile, now = Date.now()) {
  const h = p.home;
  migrateGreenhouses(p, now);
  retireBuildings(p);
  while (h.plots.length < RING_PLOTS[h.level]) h.plots.push(null);
  h.debris = [];
  if (now < (h.lastTick ?? 0)) return [];
  const done = tickBuilds(h, now);
  tickDebris(h, now);
  h.lastTick = now;
  return done;
}
