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

export function calendarPreflight(days: number, weeks: number, start = new Date()): string[] {
  const errors: string[] = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + day));
    const key = date.toISOString().slice(0, 10);
    for (const taught of [16, 28, 36]) errors.push(...issue(dailyLevel(key, taught), `Daily ${key} taught ${taught}`));
  }
  for (let week = 0; week < weeks; week++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + week * 7));
    const key = isoWeek(date);
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

if (process.env.SIM === '1') {
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
