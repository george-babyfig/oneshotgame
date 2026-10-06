import { expect, it } from 'vitest';
import { difficultyOf, makeLevel } from '../../src/core/levels';
import { CHAPTER_BANDS } from './lint';
import { POLICIES, runPlanet, type PlanetMetrics } from './harness';

const gate = process.env.SIM_SHADOW_GATE === '1' || process.env.SIM_NIGHTLY === '1' ? it : it.skip;
const masters = ['curve-a', 'curve-b'];
const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
const rate = (rows: PlanetMetrics[], field: 'fail' | 'threeStar') => {
  const attempts = rows.reduce((sum, row) => sum + row.runs, 0);
  const count = rows.reduce((sum, row) => sum + row[field] * row.runs, 0);
  return { count, attempts, value: count / attempts };
};

// A shard must cover complete chapter bands; the default measures all 120 planets.
const first = Number(process.env.SHADOW_FIRST ?? 1);
const last = Number(process.env.SHADOW_LAST ?? 120);

gate(
  'gates the generator curve on two master seeds and distinct shadow layouts',
  () => {
    const started = performance.now();
    const runs = Number(process.env.SHADOW_RUNS ?? 8);
    const rows: Record<string, PlanetMetrics[]> = { casual: [], decent: [], sharp: [] };
    for (let n = first; n <= last; n++) {
      const needed = difficultyOf(n) === 'normal' ? 10 : 30;
      const seen = new Set<string>();
      for (let salt = 1001; seen.size < needed; salt++) {
        const actual = makeLevel(n, 'PP', { salt }).seed;
        if (seen.has(actual)) continue;
        seen.add(actual);
        for (const master of masters)
          for (const policy of policies) rows[policy.name].push(runPlanet(n, policy, runs, salt, undefined, master));
      }
      if (n % 10 === 0) console.log(`Shadow completed planet ${n} in ${((performance.now() - started) / 1000).toFixed(1)}s`);
    }
    const failures: string[] = [];
    const report = (
      label: string,
      name: string,
      rows: PlanetMetrics[],
      field: 'fail' | 'threeStar',
      limits: readonly number[],
      watch = false,
    ) => {
      const result = rate(rows, field);
      const message = `${label} ${name} ${result.value.toFixed(3)} (${result.count.toFixed(0)}/${result.attempts}) target ${limits.join('-')}`;
      console.log(`${watch ? 'Shadow Watch' : 'Shadow Gate'} ${message}`);
      if (!watch && (result.value < limits[0] || result.value > limits[1])) failures.push(message);
    };
    for (const band of CHAPTER_BANDS.filter((entry) => entry.first >= first && entry.last <= last)) {
      const scope = (policy: string) =>
        rows[policy].filter((row) => row.n >= band.first && row.n <= band.last && difficultyOf(row.n) === 'normal');
      const label = `${band.first}-${band.last}`;
      report(label, 'casual fail', scope('casual'), 'fail', band.casualFail);
      report(label, 'casual 3★', scope('casual'), 'threeStar', band.casualThree);
      report(label, 'decent fail', scope('decent'), 'fail', band.decentFail);
      report(label, 'decent 3★', scope('decent'), 'threeStar', band.decentThree);
      report(label, 'sharp fail', scope('sharp'), 'fail', band.sharpFail, true);
      report(label, 'sharp 3★', scope('sharp'), 'threeStar', band.sharpThree, true);
    }
    for (const [label, includes, casualMax, failBand, threeBand] of [
      ['first Hard', (n: number) => n === 15 || n === 20, 0.4, [0.18, 0.32], [0.25, 0.45]],
      ['Hard 25+', (n: number) => n >= 25 && difficultyOf(n) === 'hard', 0.5, [0.12, 0.45], [0.25, 0.45]],
      ['Super Hard', (n: number) => difficultyOf(n) === 'super', 0.7, [0.25, 0.6], [0.15, 0.35]],
    ] as const) {
      const casual = rows.casual.filter((row) => includes(row.n));
      const decent = rows.decent.filter((row) => includes(row.n));
      if (!casual.length) continue;
      report(label, 'casual fail', casual, 'fail', [0, casualMax]);
      report(label, 'decent fail', decent, 'fail', failBand);
      report(label, 'decent 3★', decent, 'threeStar', threeBand);
    }
    const attempts = Object.values(rows)
      .flat()
      .reduce((sum, row) => sum + row.runs, 0);
    console.log(
      `Shadow ${first}-${last}: ${attempts} policy attempts across ${masters.length} masters in ${((performance.now() - started) / 1000).toFixed(1)}s; ${failures.length} gate failures`,
    );
    expect(failures, failures.join('\n')).toEqual([]);
  },
  60 * 60_000,
);
