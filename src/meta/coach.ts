import { UNLOCKS, type Unlock } from './unlocks';
import { unlocked } from './unlocks';
import type { Profile } from './profile';

/** The start tip is shown before the first throw. */
export const COACH: Record<number, Record<number, string>> = {
  1: { 0: 'Fill the bar past a ★ to finish the planet.', 1: 'Make an Ocean beside a Mountain for three stars.' },
  2: { 0: 'Tap the next throw to swap it. Try Rock before Ice Comet!' },
  3: { 0: 'Watch the landing card for a friend moving in.' },
};

export type CoachEvent = 'creature' | 'wander' | 'goal' | 'nova';

export const COACH_EVENTS: Record<CoachEvent, string> = {
  creature: 'A new friend moved in! Watch the life bar grow.',
  wander: 'A friend wandered off. They can come back as the land grows.',
  goal: 'You made a goal! Keep growing your planet.',
  nova: 'Supernova is ready! Your next fling will sparkle.',
};

/** The Keeper gives practice throws as a gift. */
export const PRACTICE_GIFT_LINE = 'Here, try these!';

export function roundIntro(planet: number, objectId?: string): Unlock | undefined {
  return UNLOCKS.find((row) => row.placement === 'round' && row.planet === planet && !!row.intro && (!objectId || row.id === objectId));
}

/** Round cards a save has encountered before its current campaign planet. */
export function earlierRoundIntroIds(level: number): string[] {
  return UNLOCKS.filter((row) => row.placement === 'round' && row.intro && row.planet < level).map((row) => row.id);
}

export function introAlreadySeen(id: string, saved: readonly string[], shown: ReadonlySet<string>): boolean {
  return saved.includes(id) || shown.has(id);
}

/** Missed cards wait until a win, then remain pending until shown. */
export function pendingIntroAfterWin(p: Profile): Unlock | undefined {
  return UNLOCKS.find(
    (row) =>
      row.placement === 'home' &&
      !!row.intro &&
      unlocked(p, row.id) &&
      (row.planet === 0 || p.level > row.planet) &&
      !p.mailSeen.includes(`coach-${row.id}`),
  );
}

export function introWordCount(row: Unlock): number {
  return `${row.intro?.title ?? ''} ${row.intro?.body ?? ''}`.trim().split(/\s+/u).filter(Boolean).length;
}

/** Warm-ups keep helping until the goals and first star are earned. */
export function practiceHelp(
  planet: number,
  practice: boolean,
  stars: number,
  gifts: number,
  firstClear = true,
): 'none' | 'throws' | 'star' {
  if (stars > 0 || (!practice && (planet > 3 || !firstClear))) return 'none';
  if (practice) return 'throws';
  return gifts < 2 ? 'throws' : 'star';
}
