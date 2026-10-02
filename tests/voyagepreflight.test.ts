import { expect, it } from 'vitest';
import { goalsMet, makeLevel, solve0, solve2, starsFor } from '../src/core/levels';
import { rulesForLevel } from '../src/core/round';
import { lifeScore } from '../src/core/world';
import { VOYAGE_LEN, portName, voyageBase, voyageLevel } from '../src/meta/voyage';

it('keeps active Voyage weeks byte-identical', () => {
  for (const week of ['2026-W40', '2026-W41', '2026-W42', '2026-W43'])
    for (const taught of [16, 28, 36])
      for (let stop = 0; stop < VOYAGE_LEN; stop++) {
        const n = voyageBase(taught) + stop * 2;
        const original = makeLevel(n, `VOY-${week}-${stop}`, {
          goals: true,
          boss: stop === VOYAGE_LEN - 1,
          rules: rulesForLevel(Math.min(n, taught)),
          obstacleCap: taught,
        });
        expect(JSON.stringify(voyageLevel(week, voyageBase(taught), stop, taught))).toBe(
          JSON.stringify({ ...original, name: portName(week, stop) }),
        );
      }
});

it('redraws solver traps deterministically in the first affected weeks', () => {
  for (const week of ['2026-W46', '2026-W47', '2026-W52', '2027-W01'])
    for (const taught of [16, 28, 36])
      for (let stop = 0; stop < VOYAGE_LEN; stop++) {
        const level = voyageLevel(week, voyageBase(taught), stop, taught);
        for (const solved of [solve0(level), solve2(level)])
          expect(
            goalsMet(solved, level.goals) && starsFor(lifeScore(solved), level.stars) >= 1,
            `${week} stop ${stop + 1} taught ${taught}`,
          ).toBe(true);
        expect(voyageLevel(week, voyageBase(taught), stop, taught)).toEqual(level);
      }
});
