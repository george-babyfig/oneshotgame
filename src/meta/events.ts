// Weekly events: a rotating theme picked from the ISO week number, so every player
// sees the same event with no server (Two Dots / Royal Match style live-ops).
import type { BiomeId } from '../core/world';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';

export interface EventDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Tokens per changed region of these biomes. */
  biomes?: BiomeId[];
  /** Tokens per creature appearing. */
  creatures?: boolean;
  /** Tokens per star earned. */
  stars?: boolean;
  color: string;
  skin: string;
}

export const EVENTS: EventDef[] = [
  {
    id: 'volcano',
    name: 'Volcano Week',
    emoji: '🌋',
    desc: 'Build volcanoes and hot springs',
    biomes: ['volcano', 'springs', 'desert', 'savanna'],
    color: '#ff7a3d',
    skin: 'ember',
  },
  {
    id: 'ocean',
    name: 'Ocean Week',
    emoji: '🌊',
    desc: 'Fill the planet with oceans and reefs',
    biomes: ['ocean', 'reef', 'icesheet'],
    color: '#3fb9ff',
    skin: 'teal',
  },
  {
    id: 'bloom',
    name: 'Bloom Week',
    emoji: '🌸',
    desc: 'Grow meadows, forests and jungles',
    biomes: ['meadow', 'forest', 'jungle', 'highland', 'marsh'],
    color: '#5ef2b0',
    skin: 'lime',
  },
  {
    id: 'critter',
    name: 'Critter Week',
    emoji: '🦊',
    desc: 'Welcome as many creatures as you can',
    creatures: true,
    color: '#ffb13d',
    skin: 'gold',
  },
  {
    id: 'frost',
    name: 'Frost Week',
    emoji: '❄️',
    desc: 'Make tundra, taiga and ice sheets',
    biomes: ['tundra', 'taiga', 'icesheet', 'mountain'],
    color: '#bfe8ff',
    skin: 'violet',
  },
  { id: 'star', name: 'Starfall Week', emoji: '🌟', desc: 'Earn stars on any planet', stars: true, color: '#ffd84a', skin: 'rose' },
];

export interface EventTier {
  tokens: number;
  reward: Reward;
}

export const EVENT_TIERS: EventTier[] = [
  { tokens: 10, reward: { gems: 10 } },
  { tokens: 25, reward: { dust: 300 } },
  { tokens: 45, reward: { boosters: { shower: 1, spark: 1 } } },
  { tokens: 70, reward: { gems: 25 } },
  { tokens: 100, reward: { dust: 900, boosters: { scope: 2 } } },
  { tokens: 140, reward: { gems: 50 } },
];

/** ISO-8601 week key like "2026-W39". */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

export function eventFor(week: string): EventDef {
  const [y, w] = week.split('-W').map(Number);
  return EVENTS[(y * 53 + w) % EVENTS.length];
}

/** Milliseconds until the event ends (next Monday 00:00 local). */
export function eventEndsIn(now = new Date()): number {
  const d = new Date(now);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + (8 - day));
  d.setHours(0, 0, 0, 0);
  return d.getTime() - now.getTime();
}

export const EVENT_UNLOCK_LEVEL = 8;

export function ensureEvent(p: Profile, week = isoWeek()) {
  if (p.event.week !== week) p.event = { week, tokens: 0, claimed: [] };
  return eventFor(week);
}

export function eventActive(p: Profile) {
  return p.level >= EVENT_UNLOCK_LEVEL;
}

/** Tokens earned by one landed throw. */
export function tokensForLand(ev: EventDef, changed: BiomeId[], spawned: number): number {
  let n = 0;
  if (ev.biomes) n += changed.filter((b) => ev.biomes!.includes(b)).length;
  if (ev.creatures) n += spawned * 2;
  return n;
}

export function addTokens(p: Profile, n: number) {
  if (n > 0 && eventActive(p)) p.event.tokens += n;
}

export function eventReady(p: Profile): number[] {
  return EVENT_TIERS.map((t, i) => (p.event.tokens >= t.tokens && !p.event.claimed.includes(i) ? i : -1)).filter((i) => i >= 0);
}

/** Claim a tier; the last tier also grants the event's atmosphere. */
export function claimEventTier(p: Profile, i: number): Reward | null {
  const t = EVENT_TIERS[i];
  if (!t || p.event.tokens < t.tokens || p.event.claimed.includes(i)) return null;
  p.event.claimed.push(i);
  const r: Reward = { ...t.reward };
  if (i === EVENT_TIERS.length - 1) r.skin = eventFor(p.event.week).skin;
  applyReward(p, r);
  return r;
}
