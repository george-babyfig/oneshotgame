import type { Profile } from './profile';
import { today } from './profile';
import { applyReward, type Reward } from './progression';

/** Stable Road identity; Cosmic Road is the first Road. */
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
}

export interface RoadTier {
  id: RoadTierId;
  stars: number;
  /** Free lane. */
  reward: Reward;
  /** Cosmic Pass lane. */
  pass: Reward;
}

// Road 0 retains its original 15 thresholds and rewards for existing saves.
export const STAR_ROAD: RoadTier[] = [
  { id: 'road00:tier00', stars: 5, reward: { gems: 15 }, pass: { skin: 'cosmic', item: 'l_orbit' } },
  { id: 'road00:tier01', stars: 12, reward: { boosters: { shower: 2 }, gems: 40 }, pass: {} },
  { id: 'road00:tier02', stars: 20, reward: { dust: 400 }, pass: {} },
  { id: 'road00:tier03', stars: 30, reward: { skin: 'rose', gems: 10 }, pass: { item: 'hat_halo' } },
  { id: 'road00:tier04', stars: 42, reward: { gems: 30 }, pass: {} },
  { id: 'road00:tier05', stars: 55, reward: { boosters: { spark: 2, scope: 2 }, item: 'l_crystal' }, pass: {} },
  { id: 'road00:tier06', stars: 70, reward: { dust: 1200 }, pass: {} },
  { id: 'road00:tier07', stars: 85, reward: { skin: 'lime', gems: 20 }, pass: { item: 'tr_cosmic' } },
  { id: 'road00:tier08', stars: 100, reward: { gems: 50 }, pass: {} },
  { id: 'road00:tier09', stars: 120, reward: { boosters: { shower: 3, spark: 3, scope: 3 }, item: 'tr_rainbow' }, pass: {} },
  { id: 'road00:tier10', stars: 140, reward: { dust: 3000 }, pass: {} },
  { id: 'road00:tier11', stars: 165, reward: { skin: 'gold', gems: 40 }, pass: { item: 'suit_star' } },
  { id: 'road00:tier12', stars: 190, reward: { gems: 80, item: 'em_fireworks' }, pass: {} },
  { id: 'road00:tier13', stars: 220, reward: { dust: 6000, gems: 50, item: 'hat_crown' }, pass: {} },
  { id: 'road00:tier14', stars: 260, reward: { gems: 120 }, pass: {} },
];

export const ROAD_DAILY_CAP = 4;

/** Credit an idempotent M12 point event, returning the amount actually credited. */
export function grantRoadPoints(state: RoadState, event: RoadPointEvent): number {
  const key = `${event.source}:${event.earningKey}`;
  if (event.delta <= 0 || state.creditedEarningKeys.includes(key)) return 0;
  if (!state.lastCreditedDay || event.date > state.lastCreditedDay) {
    state.lastCreditedDay = event.date;
    state.earnedOnLastCreditedDay = 0;
  }
  const granted = Math.min(event.delta, Math.max(0, ROAD_DAILY_CAP - state.earnedOnLastCreditedDay));
  state.earnedOnLastCreditedDay += granted;
  state.points += granted;
  // Zero-credit events may be retried after the day changes.
  if (granted) state.creditedEarningKeys.push(key);
  return granted;
}

/** Legacy Profile adapter; preserves the current save and clock behavior. */
export function addRoadPoints(p: Profile, amount: number, day = today()): number {
  if (amount <= 0) return 0;
  if (!p.roadDay.day || day > p.roadDay.day) p.roadDay = { day, earned: 0 };
  const granted = Math.min(amount, Math.max(0, ROAD_DAILY_CAP - p.roadDay.earned));
  p.roadDay.earned += granted;
  p.roadPoints += granted;
  return granted;
}

export function roadReady(p: Profile): number[] {
  const out: number[] = [];
  STAR_ROAD.forEach((t, i) => {
    if (p.roadPoints < t.stars) return;
    if (!p.road.includes(i)) out.push(i);
    else if (p.pass && !p.roadPass.includes(i)) out.push(i);
  });
  return out;
}

/** Claim everything unlocked on tier i (free lane, plus pass lane if owned). */
export function claimRoad(p: Profile, i: number): Reward[] {
  const t = STAR_ROAD[i];
  const got: Reward[] = [];
  if (!t || p.roadPoints < t.stars) return got;
  if (!p.road.includes(i)) {
    p.road.push(i);
    applyReward(p, t.reward, 'star_road');
    got.push(t.reward);
  }
  if (p.pass && !p.roadPass.includes(i)) {
    p.roadPass.push(i);
    applyReward(p, t.pass, 'star_road');
    got.push(t.pass);
  }
  return got;
}

/** The current pass lane contains looks only. */
export const PASS_GEMS = STAR_ROAD.reduce((a, t) => a + (t.pass.gems ?? 0), 0);
