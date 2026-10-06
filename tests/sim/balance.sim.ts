import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { difficultyOf } from '../../src/core/levels';
import { CHAPTER_BANDS, lintCampaign } from './lint';
import { POLICIES, runPlanet, type PlanetMetrics } from './harness';

const measured = process.env.SIM_BALANCE === '1' ? it : it.skip;
const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
const masters = ['curve-a', 'curve-b'];
const mean = (rows: PlanetMetrics[], field: 'fail' | 'threeStar') =>
  rows.reduce((sum, row) => sum + row[field] * row.runs, 0) / rows.reduce((sum, row) => sum + row.runs, 0);
const pool = (sets: PlanetMetrics[][]): PlanetMetrics[] =>
  sets[0].map((row, index) => {
    const other = sets[1][index];
    const runs = row.runs + other.runs;
    const weighted = (field: 'fail' | 'threeStar' | 'halfThreeStar' | 'slack' | 'choiceDifferenceRate' | 'novas') =>
      (row[field] * row.runs + other[field] * other.runs) / runs;
    const scoreMet = row.scoreMet + other.scoreMet;
    return {
      ...row,
      runs,
      fail: weighted('fail'),
      threeStar: weighted('threeStar'),
      halfThreeStar: weighted('halfThreeStar'),
      scoreMet,
      goalMetWhenScoreMet: row.goalMetWhenScoreMet + other.goalMetWhenScoreMet,
      slack: weighted('slack'),
      choiceDifferenceRate: weighted('choiceDifferenceRate'),
      novas: weighted('novas'),
      attemptsPerClear: runs / (runs - row.fail * row.runs - other.fail * other.runs),
      attemptsMedian: Math.max(row.attemptsMedian, other.attemptsMedian),
      attemptsP90: Math.max(row.attemptsP90, other.attemptsP90),
      flight:
        row.flight && other.flight
          ? {
              bonks: row.flight.bonks + other.flight.bonks,
              fizzles: row.flight.fizzles + other.flight.fizzles,
              misses: row.flight.misses + other.flight.misses,
              surpriseBonks: row.flight.surpriseBonks + other.flight.surpriseBonks,
              noiseBonks: row.flight.noiseBonks + other.flight.noiseBonks,
              roundTimes: [...row.flight.roundTimes, ...other.flight.roundTimes],
              waits: row.flight.waits + other.flight.waits,
            }
          : undefined,
    };
  });

measured(
  'gates the reviewed campaign curve with two independent master seeds',
  () => {
    const started = performance.now();
    const runs = Number(process.env.BALANCE_RUNS ?? 96);
    const failures: string[] = [];
    const flagSets: Set<string>[] = [];
    let firstRows: PlanetMetrics[][] = [];
    const seedRows: PlanetMetrics[][][] = [];
    for (const master of masters) {
      const rows = policies.map((policy) =>
        Array.from({ length: 60 }, (_, index) => runPlanet(index + 1, policy, runs, undefined, undefined, master)),
      );
      seedRows.push(rows);
      const lint = lintCampaign(rows[0], rows[1], rows[2], 60);
      if (master === masters[0]) firstRows = rows;
      const flags = new Set(lint.map((issue) => `${issue.flag}:${issue.planet}`));
      flagSets.push(flags);
      console.log(
        `${master}: ${runs} runs/planet/policy; lint ${JSON.stringify(
          Object.fromEntries(
            [...new Set(lint.map((issue) => issue.flag))].map((flag) => [flag, lint.filter((issue) => issue.flag === flag).length]),
          ),
        )}`,
      );
      for (const band of CHAPTER_BANDS.filter((entry) => entry.last <= 60)) {
        const subset = rows.map((group) => group.filter((row) => row.n >= band.first && row.n <= band.last && row.difficulty === 'normal'));
        const label = `${master} ${band.first}-${band.last}`;
        console.log(
          `${label}: C ${mean(subset[0], 'fail').toFixed(3)}/${mean(subset[0], 'threeStar').toFixed(3)} D ${mean(subset[1], 'fail').toFixed(3)}/${mean(subset[1], 'threeStar').toFixed(3)} S ${mean(subset[2], 'fail').toFixed(3)}/${mean(subset[2], 'threeStar').toFixed(3)}`,
        );
      }
      for (const [first, last] of [
        [31, 45],
        [46, 60],
      ] as const) {
        const subset = rows.map((group) => group.filter((row) => row.n >= first && row.n <= last && row.difficulty === 'normal'));
        console.log(
          `${master} ${first}-${last}: C ${mean(subset[0], 'fail').toFixed(3)}/${mean(subset[0], 'threeStar').toFixed(3)} D ${mean(subset[1], 'fail').toFixed(3)}/${mean(subset[1], 'threeStar').toFixed(3)} S ${mean(subset[2], 'fail').toFixed(3)}/${mean(subset[2], 'threeStar').toFixed(3)}`,
        );
      }
      for (const [name, numbers] of [
        ['first Hard', [15, 20]],
        ['Hard 25+', Array.from({ length: 36 }, (_, i) => i + 25).filter((n) => difficultyOf(n) === 'hard')],
        ['Super', Array.from({ length: 60 }, (_, i) => i + 1).filter((n) => difficultyOf(n) === 'super')],
      ] as const) {
        const c = rows[0].filter((row) => (numbers as readonly number[]).includes(row.n));
        const d = rows[1].filter((row) => (numbers as readonly number[]).includes(row.n));
        const cf = mean(c, 'fail'),
          df = mean(d, 'fail'),
          dt = mean(d, 'threeStar');
        console.log(`${master} ${name}: C fail ${cf.toFixed(3)} D ${df.toFixed(3)}/${dt.toFixed(3)}`);
      }
    }
    const unstable = [...new Set([...flagSets[0], ...flagSets[1]])].filter((flag) => flagSets[0].has(flag) !== flagSets[1].has(flag));
    console.log(`Master-seed flag disagreements: ${unstable.length} ${unstable.join(', ')}`);
    const pooled = policies.map((_, index) => pool(seedRows.map((rows) => rows[index])));
    const pooledLint = lintCampaign(pooled[0], pooled[1], pooled[2], 60);
    console.log(
      `Pooled lint 1-60 ${JSON.stringify(Object.fromEntries([...new Set(pooledLint.map((issue) => issue.flag))].map((flag) => [flag, pooledLint.filter((issue) => issue.flag === flag).length])))}`,
    );
    for (const issue of pooledLint) failures.push(`pooled ${issue.flag} ${issue.planet}: ${issue.detail}`);
    for (const band of CHAPTER_BANDS.filter((entry) => entry.last <= 60)) {
      const subset = pooled.map((group) => group.filter((row) => row.n >= band.first && row.n <= band.last && row.difficulty === 'normal'));
      for (const [name, value, [min, max]] of [
        ['C fail', mean(subset[0], 'fail'), band.casualFail],
        ['C 3★', mean(subset[0], 'threeStar'), band.casualThree],
        ['D fail', mean(subset[1], 'fail'), band.decentFail],
        ['D 3★', mean(subset[1], 'threeStar'), band.decentThree],
      ] as const)
        if (value < min || value > max)
          failures.push(`pooled ${band.first}-${band.last} ${name} ${value.toFixed(3)} outside ${min}-${max}`);
    }
    for (const [name, numbers, failBand, threeBand, casualMax] of [
      ['first Hard', [15, 20], [0.18, 0.32], [0.25, 0.45], 0.4],
      ['Hard 25+', Array.from({ length: 36 }, (_, i) => i + 25).filter((n) => difficultyOf(n) === 'hard'), [0.12, 0.45], [0.25, 0.45], 0.5],
      ['Super', Array.from({ length: 60 }, (_, i) => i + 1).filter((n) => difficultyOf(n) === 'super'), [0.25, 0.6], [0.15, 0.35], 0.7],
    ] as const) {
      const c = pooled[0].filter((row) => (numbers as readonly number[]).includes(row.n));
      const d = pooled[1].filter((row) => (numbers as readonly number[]).includes(row.n));
      const cf = mean(c, 'fail'),
        df = mean(d, 'fail'),
        dt = mean(d, 'threeStar');
      console.log(`pooled ${name}: C fail ${cf.toFixed(3)} D ${df.toFixed(3)}/${dt.toFixed(3)}`);
      if (cf > casualMax || df < failBand[0] || df > failBand[1] || dt < threeBand[0] || dt > threeBand[1])
        failures.push(`pooled ${name} outside tier bands`);
    }
    const watchRows = policies.map((policy, index) => [
      ...firstRows[index],
      ...Array.from({ length: 60 }, (_, i) =>
        runPlanet(i + 61, policy, Math.max(16, Math.floor(runs / 4)), undefined, undefined, masters[0]),
      ),
    ]);
    const watches = lintCampaign(watchRows[0], watchRows[1], watchRows[2], 120).filter((issue) => issue.planet > 60);
    console.log(
      `61-120 WATCH lint ${JSON.stringify(
        Object.fromEntries(
          [...new Set(watches.map((issue) => issue.flag))].map((flag) => [flag, watches.filter((issue) => issue.flag === flag).length]),
        ),
      )}`,
    );

    console.log(`Balance measurement ${((performance.now() - started) / 1000).toFixed(1)}s; ${runs} runs × 2 masters`);
    if (process.env.BALANCE_REPORT)
      writeFileSync(process.env.BALANCE_REPORT, JSON.stringify({ pooled, pooledLint, watches, failures }, null, 2) + '\n');
    expect(failures, failures.join('\n')).toEqual([]);
  },
  1_500_000, // the GitHub runner is ~1.5-2x slower than a dev Mac
);
