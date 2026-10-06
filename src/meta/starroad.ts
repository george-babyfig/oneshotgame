import type { Profile } from './profile';
import { today } from './profile';
import { applyReward, type Reward } from './progression';

export type RoadId = `road${string}`;
export const COSMIC_ROAD_ID: RoadId = 'road00';
export type RoadTierId = `${RoadId}:tier${string}`;
export type RoadPointSource = 'campaign' | 'daily' | 'voyage' | 'wish';
export interface RoadPointEvent {
  source: RoadPointSource;
  date: string;
  /** Stable across retries and restores. */
  earningKey: string;
  delta: number;
}
export interface RoadState {
  points: number;
  claimedFreeTierIds: string[];
  claimedPaidTierIds: string[];
  lastCreditedDay: string;
  earnedOnLastCreditedDay: number;
  creditedEarningKeys: string[];
  openedOn?: string;
  plannedEndOn?: string;
  /** Rewards already paid by the fifteen-step Road are represented by their old tier IDs. */
  legacyGrantIds?: string[];
}
export interface RoadTier {
  id: RoadTierId;
  stars: number;
  reward: Reward;
  pass: Reward;
}
export interface RoadDefinition {
  id: RoadId;
  name: string;
  tiers: readonly RoadTier[];
  /** Road availability comes from installed content, never a remote timer. */
  opensOn?: string;
}

// The first fifteen positions preserve old cosmetic ownership by index. Legacy claims
// are also recorded separately so changing point thresholds cannot pay them twice.
export const STAR_ROAD: RoadTier[] = [
  { id: 'road00:tier00', stars: 10, reward: { gems: 10 }, pass: { skin: 'cosmic', item: 'l_orbit' } },
  { id: 'road00:tier01', stars: 20, reward: { boosters: { shower: 2 }, gems: 10 }, pass: { item: 'paint_gilded_ground' } },
  { id: 'road00:tier02', stars: 30, reward: { dust: 400 }, pass: { item: 'paint_liquid_gold_sea' } },
  { id: 'road00:tier03', stars: 40, reward: { skin: 'rose', gems: 10 }, pass: { item: 'hat_halo' } },
  { id: 'road00:tier04', stars: 50, reward: { gems: 10 }, pass: { item: 'frame_starfield' } },
  { id: 'road00:tier05', stars: 60, reward: { boosters: { spark: 2, scope: 2 }, item: 'l_crystal' }, pass: {} },
  { id: 'road00:tier06', stars: 70, reward: { dust: 1200 }, pass: { item: 'banner_gilded' } },
  { id: 'road00:tier07', stars: 80, reward: { skin: 'lime', gems: 10 }, pass: { item: 'tr_cosmic' } },
  { id: 'road00:tier08', stars: 90, reward: { gems: 10 }, pass: { item: 'title_star_captain' } },
  { id: 'road00:tier09', stars: 100, reward: { boosters: { shower: 3, spark: 3, scope: 3 }, item: 'tr_rainbow' }, pass: {} },
  { id: 'road00:tier10', stars: 110, reward: { dust: 3000 }, pass: { item: 'em_star_captain' } },
  { id: 'road00:tier11', stars: 120, reward: { skin: 'gold', gems: 15 }, pass: { item: 'suit_star' } },
  { id: 'road00:tier12', stars: 130, reward: { gems: 20, item: 'em_fireworks' }, pass: {} },
  { id: 'road00:tier13', stars: 140, reward: { dust: 6000, gems: 15, item: 'hat_crown' }, pass: {} },
  { id: 'road00:tier14', stars: 150, reward: { gems: 40 }, pass: { item: 'burst_cosmic' } },
  { id: 'road00:tier15', stars: 160, reward: { dust: 500 }, pass: {} },
  { id: 'road00:tier16', stars: 170, reward: { boosters: { shower: 1 } }, pass: {} },
  { id: 'road00:tier17', stars: 180, reward: { dust: 750 }, pass: {} },
  { id: 'road00:tier18', stars: 190, reward: { boosters: { spark: 1 } }, pass: {} },
  { id: 'road00:tier19', stars: 200, reward: { dust: 1000, sticker: 'cosmic_road' }, pass: {} },
];
export const ROAD_CATALOG: readonly RoadDefinition[] = [{ id: COSMIC_ROAD_ID, name: 'Cosmic Road', tiers: STAR_ROAD }];
export const ROAD_DAILY_CAP = 4;
export const ROAD_CATCH_UP_CAP = 8;
export const ROAD_LENGTH_DAYS = 56;
export const ROAD_PACING = {
  steps: 20,
  pointsPerStep: 10,
  totalPoints: 200,
  regularPointsPerDay: 4,
  regularDays: 51,
  freeGems: 150,
} as const;

function datePlus(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function validDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T12:00:00Z`));
}
export function roadCap(state: RoadState, day: string): number {
  return state.plannedEndOn && day >= datePlus(state.plannedEndOn, -13) && day <= state.plannedEndOn ? ROAD_CATCH_UP_CAP : ROAD_DAILY_CAP;
}
export function newRoadState(): RoadState {
  return {
    points: 0,
    claimedFreeTierIds: [],
    claimedPaidTierIds: [],
    lastCreditedDay: '',
    earnedOnLastCreditedDay: 0,
    creditedEarningKeys: [],
    legacyGrantIds: [],
  };
}

/** Credit a single Road with a stable event. A full day never consumes the key. */
export function grantRoadPoints(state: RoadState, event: RoadPointEvent): number {
  const key = `${event.source}:${event.earningKey}`;
  if (!validDay(event.date) || !Number.isFinite(event.delta) || event.delta <= 0 || state.creditedEarningKeys.includes(key)) return 0;
  const day = state.lastCreditedDay && event.date < state.lastCreditedDay ? state.lastCreditedDay : event.date;
  if (!state.openedOn) state.openedOn = day;
  if (day > state.lastCreditedDay) {
    state.lastCreditedDay = day;
    state.earnedOnLastCreditedDay = 0;
  }
  const granted = Math.min(
    Math.floor(event.delta),
    event.source === 'wish' ? 1 : 3,
    Math.max(0, roadCap(state, day) - state.earnedOnLastCreditedDay),
  );
  state.earnedOnLastCreditedDay += granted;
  state.points += granted;
  if (granted) state.creditedEarningKeys.push(key);
  return granted;
}

export function playableRoads(p: Profile, day = today(), catalog: readonly RoadDefinition[] = ROAD_CATALOG): RoadDefinition[] {
  const installed = catalog.filter((road) => !road.opensOn || road.opensOn <= day);
  return installed.length ? installed : [catalog[0]];
}
export function currentRoad(p: Profile, day = today(), catalog: readonly RoadDefinition[] = ROAD_CATALOG): RoadDefinition {
  return playableRoads(p, day, catalog).at(-1)!;
}
export function pastRoads(p: Profile, day = today(), catalog: readonly RoadDefinition[] = ROAD_CATALOG): RoadDefinition[] {
  return playableRoads(p, day, catalog).slice(0, -1);
}
export function roadCloseOn(id: RoadId, catalog: readonly RoadDefinition[] = ROAD_CATALOG): string | undefined {
  const successor = catalog[catalog.findIndex((road) => road.id === id) + 1];
  return successor?.opensOn ? datePlus(successor.opensOn, -1) : undefined;
}
export function roadHasPass(p: Profile, id: RoadId): boolean {
  return id === COSMIC_ROAD_ID ? p.pass : p.roadPassEntitlements.includes(id);
}
/** The IAP grant calls this after recording the non-consumable product ID. */
export function grantRoadPass(p: Profile, id: RoadId = COSMIC_ROAD_ID, catalog: readonly RoadDefinition[] = ROAD_CATALOG): Reward[] {
  if (!p.roadPassEntitlements.includes(id)) p.roadPassEntitlements.push(id);
  if (id === COSMIC_ROAD_ID) p.pass = true;
  return claimReachedPaidRoad(p, id, catalog);
}
function ensureRoad(p: Profile, id: RoadId): RoadState {
  const state = (p.roadRecords[id] ??= newRoadState());
  // Older callers may still write the compatibility field directly.
  if (id === COSMIC_ROAD_ID && p.roadPoints > state.points) state.points = p.roadPoints;
  return state;
}
function syncLegacy(p: Profile): void {
  const state = ensureRoad(p, COSMIC_ROAD_ID);
  p.roadPoints = state.points;
  if (state.lastCreditedDay > p.roadDay.day) p.roadDay = { day: state.lastCreditedDay, earned: state.earnedOnLastCreditedDay };
  p.road = STAR_ROAD.flatMap((tier, index) => (state.claimedFreeTierIds.includes(tier.id) ? [index] : []));
  p.roadPass = STAR_ROAD.flatMap((tier, index) => (state.claimedPaidTierIds.includes(tier.id) ? [index] : []));
}

/** Profile API for package B: oldest unfinished Past Road first, then the current Road. */
export function grantProfileRoadPoints(p: Profile, event: RoadPointEvent, catalog: readonly RoadDefinition[] = ROAD_CATALOG): number {
  if (!validDay(event.date) || !Number.isFinite(event.delta) || event.delta <= 0) return 0;
  const key = `${event.source}:${event.earningKey}`;
  if (p.roadCreditedEarningKeys.includes(key)) return 0;
  const day = p.roadDay.day && event.date < p.roadDay.day ? p.roadDay.day : event.date;
  if (day > p.roadDay.day) p.roadDay = { day, earned: 0 };
  const roads = playableRoads(p, day, catalog);
  let left = Math.min(Math.floor(event.delta), event.source === 'wish' ? 1 : 3);
  let granted = 0;
  const current = roads.at(-1)!;
  const ordered = [...roads.slice(0, -1).filter((road) => ensureRoad(p, road.id).points < road.tiers.at(-1)!.stars), current];
  for (const road of ordered) {
    if (left <= 0) break;
    const state = ensureRoad(p, road.id);
    if (!state.openedOn) state.openedOn = road.opensOn ?? day;
    // The closing window belongs to installed Road content, never to a child's first point.
    state.plannedEndOn = roadCloseOn(road.id, catalog);
    const room = Math.max(0, road.tiers.at(-1)!.stars - state.points);
    const dailyRoom = Math.max(0, roadCap(state, day) - p.roadDay.earned);
    const amount = Math.min(left, room, dailyRoom);
    if (!amount) continue;
    state.points += amount;
    state.lastCreditedDay = day;
    state.earnedOnLastCreditedDay = p.roadDay.earned + amount;
    state.creditedEarningKeys.push(key);
    p.roadDay.earned += amount;
    granted += amount;
    left -= amount;
  }
  if (granted) p.roadCreditedEarningKeys.push(key);
  syncLegacy(p);
  return granted;
}

/** Compatibility for existing new-star delta callers; all modes still share the cap. */
export function addRoadPoints(p: Profile, amount: number, day = today(), source: RoadPointSource = 'campaign'): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const serial = ++p.roadLegacySerial;
  return grantProfileRoadPoints(p, { source, date: day, earningKey: `legacy:${serial}`, delta: amount });
}

export function roadReady(p: Profile, id: RoadId = COSMIC_ROAD_ID, catalog: readonly RoadDefinition[] = ROAD_CATALOG): number[] {
  const def = catalog.find((road) => road.id === id);
  if (!def) return [];
  const state = ensureRoad(p, id);
  return def.tiers.flatMap((tier, index) =>
    state.points >= tier.stars &&
    (!state.claimedFreeTierIds.includes(tier.id) || (roadHasPass(p, id) && !state.claimedPaidTierIds.includes(tier.id)))
      ? [index]
      : [],
  );
}
export function claimRoad(
  p: Profile,
  index: number,
  id: RoadId = COSMIC_ROAD_ID,
  catalog: readonly RoadDefinition[] = ROAD_CATALOG,
): Reward[] {
  const def = catalog.find((road) => road.id === id);
  const tier = def?.tiers[index];
  if (!tier) return [];
  const state = ensureRoad(p, id);
  if (state.points < tier.stars) return [];
  const got: Reward[] = [];
  if (!state.claimedFreeTierIds.includes(tier.id)) {
    state.claimedFreeTierIds.push(tier.id);
    applyReward(p, tier.reward, 'star_road');
    got.push(tier.reward);
  }
  if (roadHasPass(p, id) && !state.claimedPaidTierIds.includes(tier.id)) {
    state.claimedPaidTierIds.push(tier.id);
    applyReward(p, tier.pass, 'star_road');
    got.push(tier.pass);
  }
  syncLegacy(p);
  return got;
}
export function claimReachedPaidRoad(p: Profile, id: RoadId = COSMIC_ROAD_ID, catalog: readonly RoadDefinition[] = ROAD_CATALOG): Reward[] {
  if (!roadHasPass(p, id)) return [];
  const def = catalog.find((road) => road.id === id);
  if (!def) return [];
  const state = ensureRoad(p, id);
  const got: Reward[] = [];
  for (const tier of def.tiers) {
    if (state.points < tier.stars || state.claimedPaidTierIds.includes(tier.id)) continue;
    state.claimedPaidTierIds.push(tier.id);
    applyReward(p, tier.pass, 'star_road');
    got.push(tier.pass);
  }
  syncLegacy(p);
  return got;
}
export const PASS_GEMS = STAR_ROAD.reduce((sum, tier) => sum + (tier.pass.gems ?? 0), 0);
export const FREE_ROAD_GEMS = STAR_ROAD.reduce((sum, tier) => sum + (tier.reward.gems ?? 0), 0);
