import { expect, it } from 'vitest';
import { budgetFor, goalsMet, pressureOf, skyWall, solve0, solve2, starsFor, type LevelDef } from '../../src/core/levels';
import { lifeScore } from '../../src/core/world';
import { dailyLevel } from '../../src/meta/modes';
import { isoWeek } from '../../src/meta/events';
import { VOYAGE_LEN, voyageBase, voyageLevel } from '../../src/meta/voyage';

function issue(level: LevelDef, label: string): string[] {
  const errors: string[] = [];
  if (pressureOf(level) > budgetFor(level)) errors.push(`${label}: STACK ${pressureOf(level)} > ${budgetFor(level)}`);
  if (skyWall(level)) errors.push(`${label}: sky wall`);
  const aware = solve2(level);
  if (!goalsMet(aware, level.goals) || starsFor(lifeScore(aware), level.stars) < 1) errors.push(`${label}: aware solver cannot earn 1★`);
  const blind = solve0(level);
  if (!goalsMet(blind, level.goals) || starsFor(lifeScore(blind), level.stars) < 1) errors.push(`${label}: blind solver cannot earn 1★`);
  return errors;
}

/** UTC day keys must not depend on the runner's locale or daylight saving time. */
export function calendarDays(from: string | Date, days: number): string[] {
  const start = typeof from === 'string' ? new Date(`${from}T12:00:00Z`) : from;
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(days) || days < 1) throw new Error('Invalid calendar window');
  return Array.from({ length: days }, (_, i) =>
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i)).toISOString().slice(0, 10),
  );
}
export function coveringWeeks(from: string | Date, days: number): string[] {
  return [...new Set(calendarDays(from, days).map((day) => isoWeek(new Date(`${day}T12:00:00`))))];
}

export function preflight({ from, days, weeks }: { from: string | Date; days: number; weeks: number | 'cover' }): string[] {
  const errors: string[] = [];
  for (const key of calendarDays(from, days))
    for (const taught of [16, 28, 36]) errors.push(...issue(dailyLevel(key, taught), `Daily ${key} taught ${taught}`));
  const keys =
    weeks === 'cover'
      ? coveringWeeks(from, days)
      : calendarDays(from, Math.max(1, weeks * 7))
          .filter((_, i) => i % 7 === 0)
          .slice(0, weeks)
          .map((day) => isoWeek(new Date(`${day}T12:00:00`)));
  for (const key of keys) {
    // Live Voyage scales from early play through level 120, in either hemisphere.
    for (const taught of [16, 28, 36, 60, 120])
      for (const hemisphere of ['north', 'south'] as const)
        for (let stop = 0; stop < VOYAGE_LEN; stop++)
          errors.push(
            ...issue(
              voyageLevel(key, voyageBase(taught), stop, taught, hemisphere),
              `Voyage ${key} stop ${stop + 1} taught ${taught} ${hemisphere}`,
            ),
          );
  }
  return errors;
}

export function calendarPreflight(days: number, weeks: number, start = new Date()): string[] {
  return preflight({ from: start, days, weeks });
}

// quick.sim imports this file; nightly runs the long sweep only in its dedicated step.
if (process.env.SIM === '1' && (process.env.SIM_NIGHTLY !== '1' || process.env.CALENDAR_PREFLIGHT === '1')) {
  const count = process.env.SIM_NIGHTLY === '1' ? { days: 120, weeks: 104 } : { days: 7, weeks: 1 };
  if (process.env.CALENDAR_WEEKS) count.weeks = Number(process.env.CALENDAR_WEEKS);
  it(
    `pre-flights ${count.days} Daily Planets and ${count.weeks} Voyage weeks`,
    () => {
      const errors = calendarPreflight(count.days, count.weeks);
      console.log(
        `Calendar pre-flight: ${count.days * 3} Daily layouts, ${count.weeks * VOYAGE_LEN * 5 * 2} Voyage stops; ${errors.length} issues`,
      );
      expect(errors).toEqual([]);
    },
    60 * 60_000,
  );
}
