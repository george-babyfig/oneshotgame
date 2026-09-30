import { expect, it } from 'vitest';
import { difficultyOf, makeLevel } from '../../src/core/levels';
import { CHAPTER_BANDS } from './lint';
import { POLICIES, runPlanet, type PlanetMetrics } from './harness';

const nightly = process.env.SIM_NIGHTLY === '1' ? it : it.skip;

nightly(
  'measures chapter curves on 10 Normal and 30 Hard/Super shadow seeds per slot',
  () => {
    const runs = Number(process.env.SHADOW_RUNS ?? 2);
    const rows: Record<string, PlanetMetrics[]> = { casual: [], decent: [], sharp: [] };
    const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
    for (let n = 1; n <= 120; n++) {
      const needed = difficultyOf(n) === 'normal' ? 10 : 30;
      const seen = new Set<string>();
      for (let salt = 1001; seen.size < needed; salt++) {
        const actual = makeLevel(n, 'PP', { salt }).seed;
        if (seen.has(actual)) continue;
        seen.add(actual);
        for (const policy of policies) rows[policy.name].push(runPlanet(n, policy, runs, salt));
      }
    }
    const failures: string[] = [];
    const mean = (group: PlanetMetrics[], field: 'fail' | 'threeStar') => group.reduce((sum, row) => sum + row[field], 0) / group.length;
    for (const band of CHAPTER_BANDS) {
      const scope = (policy: string) =>
        rows[policy].filter((row) => row.n >= band.first && row.n <= band.last && row.difficulty === 'normal');
      const c = scope('casual'),
        d = scope('decent'),
        s = scope('sharp');
      console.log(
        `Shadow ${band.first}-${band.last}${band.first > 60 ? ' WATCH' : ''}: casual ${mean(c, 'fail').toFixed(3)}/${mean(c, 'threeStar').toFixed(3)}, decent ${mean(d, 'fail').toFixed(3)}/${mean(d, 'threeStar').toFixed(3)}, sharp WATCH ${mean(s, 'fail').toFixed(3)}/${mean(s, 'threeStar').toFixed(3)}`,
      );
      if (band.first > 60) continue;
      for (const [name, value, limits] of [
        ['casual fail', mean(c, 'fail'), band.casualFail],
        ['casual 3★', mean(c, 'threeStar'), band.casualThree],
        ['decent fail', mean(d, 'fail'), band.decentFail],
        ['decent 3★', mean(d, 'threeStar'), band.decentThree],
      ] as const)
        if (value < limits[0] || value > limits[1])
          failures.push(`${band.first}-${band.last} ${name} ${value.toFixed(3)} outside ${limits.join('-')}`);
    }
    for (const [label, planets, limits] of [
      ['first Hard', [15, 20], { fail: [0.18, 0.32], three: [0.25, 0.45] }],
      ['Hard', Array.from({ length: 8 }, (_, i) => 25 + i * 5), { fail: [0.25, 0.45], three: [0.25, 0.45] }],
      ['Super Hard', [19, 29, 39, 49, 59], { fail: [0.35, 0.6], three: [0.15, 0.35] }],
    ] as const) {
      const group = rows.decent.filter((row) => (planets as readonly number[]).includes(row.n));
      const fail = mean(group, 'fail'),
        three = mean(group, 'threeStar');
      console.log(`Shadow ${label}: decent fail ${(fail * 100).toFixed(1)}%, 3★ ${(three * 100).toFixed(1)}%`);
      if (fail < limits.fail[0] || fail > limits.fail[1])
        failures.push(`${label} decent fail ${fail.toFixed(3)} outside ${limits.fail.join('-')}`);
      if (three < limits.three[0] || three > limits.three[1])
        failures.push(`${label} decent 3★ ${three.toFixed(3)} outside ${limits.three.join('-')}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  },
  60 * 60_000,
);
