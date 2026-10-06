import { expect, it } from 'vitest';
import { goalsMet, makeLevel, solve0, solve2, starsFor } from '../src/core/levels';
import { rulesForLevel } from '../src/core/round';
import { lifeScore } from '../src/core/world';
import { VOYAGE_LEN, voyageBase, voyageLevel } from '../src/meta/voyage';

const SHIPPED_PORTS: Record<string, string[]> = {
  '2026-W40': ['Beacon', 'Drift', 'Summit', 'Haven', 'Cove', 'Isle', 'Harbor'],
  '2026-W41': ['Haven', 'Cove', 'Isle', 'Harbor', 'Reef', 'Lighthouse', 'Lagoon'],
  '2026-W42': ['Harbor', 'Reef', 'Lighthouse', 'Lagoon', 'Beacon', 'Drift', 'Summit'],
  '2026-W43': ['Lagoon', 'Beacon', 'Drift', 'Summit', 'Haven', 'Cove', 'Isle'],
  '2026-W44': ['Summit', 'Haven', 'Cove', 'Isle', 'Harbor', 'Reef', 'Lighthouse'],
};

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
          JSON.stringify({ ...original, name: SHIPPED_PORTS[week][stop] }),
        );
      }
});

it('keeps the current week plus three, including W44 solver redraws, byte-identical', () => {
  const week = '2026-W44';
  for (const taught of [16, 28, 36])
    for (let stop = 0; stop < VOYAGE_LEN; stop++) {
      const n = voyageBase(taught) + stop * 2;
      const options = {
        goals: true,
        boss: stop === VOYAGE_LEN - 1,
        rules: rulesForLevel(Math.min(n, taught)),
        obstacleCap: taught,
      };
      const first = makeLevel(n, `VOY-${week}-${stop}`, options);
      let old = first;
      for (let salt = 0; salt <= 256; salt++) {
        if (salt) old = makeLevel(n, `VOY-${week}-${stop}`, { ...options, salt });
        const blind = solve0(old);
        const aware = solve2(old);
        if (
          goalsMet(blind, old.goals) &&
          starsFor(lifeScore(blind), old.stars) >= 1 &&
          goalsMet(aware, old.goals) &&
          starsFor(lifeScore(aware), old.stars) >= 1
        )
          break;
        if (salt === 256) old = first;
      }
      expect(JSON.stringify(voyageLevel(week, voyageBase(taught), stop, taught))).toBe(
        JSON.stringify({ ...old, name: SHIPPED_PORTS[week][stop] }),
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
