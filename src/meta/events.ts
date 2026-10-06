import { EVENT_TIERS } from './tuning';
// Weekly Voyage themes are selected from the ISO week and local hemisphere.
import { BIOMES, type BiomeId, type ImpactResult, type Planet } from '../core/world';
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { seasonOf, type Hemisphere } from './seasons';

export interface EventDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Lands preferred by themed Voyage goals. */
  biomes?: BiomeId[];
  /** A creature goal fits this theme. */
  creatures?: boolean;
  /** This theme celebrates any earned star. */
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
    name: 'Blossom Week',
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

/** A weekly Voyage theme has no earnable token currency. */
export type WeeklyTheme = EventDef;

const SEASON_THEMES: Record<ReturnType<typeof seasonOf>, readonly string[]> = {
  spring: ['bloom', 'ocean', 'critter'],
  summer: ['ocean', 'volcano', 'star'],
  autumn: ['critter', 'star', 'volcano'],
  winter: ['frost', 'star', 'critter'],
};

/** Monday of an ISO week, independent of the device's current week. */
export function weekStart(week: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) throw new Error(`Invalid ISO week: ${week}`);
  const year = Number(match[1]);
  const number = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + (number - 1) * 7));
  if (isoWeek(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 12)) !== week)
    throw new Error(`Invalid ISO week: ${week}`);
  return monday;
}

export { EVENT_TIERS } from './tuning';

/** ISO-8601 week key like "2026-W39". */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

const themeCache = new Map<string, string>();

function themeId(monday: Date, hemisphere: Hemisphere): string {
  const ordinal = Math.floor(monday.getTime() / (7 * 86400000));
  const key = `${hemisphere}:${ordinal}`;
  const cached = themeCache.get(key);
  if (cached) return cached;
  const localNoon = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 12);
  const choices = SEASON_THEMES[seasonOf(localNoon, hemisphere)];
  let index = ((ordinal % choices.length) + choices.length) % choices.length;
  // Cache the chain so a season's phase never repeats a theme at its boundary.
  if (monday.getUTCFullYear() >= 2020 && choices[index] === themeId(new Date(monday.getTime() - 7 * 86400000), hemisphere))
    index = (index + 1) % choices.length;
  const id = choices[index];
  themeCache.set(key, id);
  return id;
}

export function eventFor(week: string, hemisphere: Hemisphere = 'north'): WeeklyTheme {
  // Open pre-M12 weeks keep the theme and atmosphere children were already shown.
  if (week >= '2026-W41' && week <= '2026-W44') {
    const [year, number] = week.split('-W').map(Number);
    return EVENTS[(year * 53 + number) % EVENTS.length];
  }
  const id = themeId(weekStart(week), hemisphere);
  return EVENTS.find((theme) => theme.id === id)!;
}

/** Milliseconds until the event ends (next Monday 00:00 local). */
export function eventEndsIn(now = new Date()): number {
  const d = new Date(now);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + (8 - day));
  d.setHours(0, 0, 0, 0);
  return d.getTime() - now.getTime();
}

/** One saved week ahead can happen when local time zones change. */
export function weekAtMostOneAhead(saved: string, current: string): boolean {
  const start = (key: string) => {
    const match = /^(\d{4})-W(\d{2})$/.exec(key);
    if (!match) return NaN;
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (week < 1 || week > 53) return NaN;
    const jan4 = new Date(Date.UTC(year, 0, 4));
    return Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7);
  };
  return start(saved) - start(current) === 7 * 86400000;
}

/** Count first arrivals and improved regions before the Lab updates their history. */
export function earnedLandingProgress(result: ImpactResult, planet: Planet, regionBests: number[], arrived: Set<string>) {
  const firstArrivals = new Set(result.spawned.filter((s) => !arrived.has(s.id)).map((s) => s.id));
  if (result.after < result.before) return { regions: [] as BiomeId[], arrivals: 0, firstArrivals };
  const regions = result.changed.filter((i) => BIOMES[planet.sectors[i].biome].value > regionBests[i]).map((i) => planet.sectors[i].biome);
  return { regions, arrivals: firstArrivals.size, firstArrivals };
}

type RetiredEvent = Profile['event'] & { retired?: boolean; legacyGems?: number };

/** Convert every saved Event on its first M12 launch, even after its week has passed. */
export function retireEventProgress(p: Profile, _savedWeek?: string): number {
  const saved = p.event as RetiredEvent;
  if (!saved.week) return 0;
  if (saved.retired) return saved.legacyGems ?? 0;
  let gems = 0;
  const claimed = new Set(saved.claimed);
  for (let i = 0; i < EVENT_TIERS.length; i++) {
    const tier = EVENT_TIERS[i];
    if (claimed.has(i)) gems += tier.reward.gems ?? 0;
    else if (saved.tokens >= tier.tokens) {
      const reward = { ...tier.reward };
      if (i === EVENT_TIERS.length - 1) reward.skin = eventFor(saved.week, p.voyage.hemisphere ?? p.settings.hemi).skin;
      applyReward(p, reward, 'event');
      gems += reward.gems ?? 0;
      claimed.add(i);
    }
  }
  // Unspent progress between tiers becomes gems instead of disappearing.
  const previous = Math.max(0, ...EVENT_TIERS.filter((tier) => tier.tokens <= saved.tokens).map((tier) => tier.tokens));
  const next = EVENT_TIERS.find((tier) => tier.tokens > saved.tokens)?.tokens;
  if (next) {
    const extra = Math.floor(((saved.tokens - previous) / (next - previous)) * 5);
    if (extra) {
      applyReward(p, { gems: extra }, 'event');
      gems += extra;
    }
  }
  saved.claimed = [...claimed].sort((a, b) => a - b);
  saved.tokens = 0;
  saved.retired = true;
  saved.legacyGems = gems;
  return gems;
}

export function legacyEventGems(p: Profile, week: string): number {
  const saved = p.event as RetiredEvent;
  return saved.week === week && saved.retired ? (saved.legacyGems ?? 0) : 0;
}

export function legacyEventAtmospherePaid(p: Profile, week: string): boolean {
  return p.event.week === week && p.event.claimed.includes(EVENT_TIERS.length - 1);
}
