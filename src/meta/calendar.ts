// Star Calendar: 28 stamps, one per day you visit. Missing a day never resets
// it (kinder than a streak for kids) — the next visit simply takes the next stamp.
// Days 14 and 28 give calendar-exclusive Keeper items.
import { dayGap, type Profile } from './profile';
import { applyReward, type Reward } from './progression';

export const CALENDAR: Reward[] = [
  { gems: 10 },
  { dust: 200 },
  { gems: 15 },
  { boosters: { shower: 1 } },
  { gems: 20 },
  { dust: 400 },
  { gems: 50, boosters: { spark: 1 } },
  { gems: 15 },
  { dust: 300 },
  { boosters: { scope: 1 } },
  { gems: 20 },
  { dust: 500 },
  { gems: 25 },
  { item: 'hat_beanie', gems: 20 },
  { gems: 20 },
  { dust: 600 },
  { boosters: { spark: 2 } },
  { gems: 25 },
  { dust: 700 },
  { gems: 30 },
  { gems: 40, boosters: { shower: 1, spark: 1, scope: 1 } },
  { gems: 25 },
  { dust: 800 },
  { boosters: { shower: 2 } },
  { gems: 30 },
  { dust: 1000 },
  { gems: 35 },
  { item: 'suit_night', gems: 60 },
];
export const CALENDAR_DAYS = CALENDAR.length;

/** Stamps collected so far (all cycles). Stored in the old streak field. */
export const stamps = (p: Profile) => p.daily.streak;

/** Calendar day (0-based) a given stamp count lands on. */
export const calendarIndex = (n: number) => n % CALENDAR_DAYS;

/** Items are only given the first time round; later cycles pay gems instead. */
export function calendarReward(stampNo: number): Reward {
  const r = CALENDAR[calendarIndex(stampNo)];
  if (stampNo >= CALENDAR_DAYS && r.item) return { gems: (r.gems ?? 0) + 40 };
  return r;
}

export function canStamp(p: Profile, day: string) {
  if (p.daily.last === day) return false;
  if (p.daily.last && dayGap(p.daily.last, day) < 0) return false; // clock moved back
  return true;
}

export function stamp(p: Profile, day: string): Reward | null {
  if (!canStamp(p, day)) return null;
  const r = calendarReward(p.daily.streak);
  p.daily = { last: day, streak: p.daily.streak + 1 };
  applyReward(p, r);
  return r;
}
