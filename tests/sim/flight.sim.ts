import { expect, it } from 'vitest';
import { makeLevel } from '../../src/core/levels';
import { OBSTACLES, type ObstacleId } from '../../src/core/sky';
import { POLICIES, oneStep, runPlanet, type PlanetMetrics } from './harness';
import { ROUND_RULES_V0 } from '../../src/core/round';

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : 0;
};
const perRound = (rows: PlanetMetrics[]) => {
  const rounds = rows.reduce((n, row) => n + row.runs, 0);
  const bonks = rows.reduce((n, row) => n + (row.flight?.bonks ?? 0) + (row.flight?.fizzles ?? 0), 0);
  return rounds ? bonks / rounds : 0;
};

/** Quick CI flies obstacle planets only. The old survey keeps its perfect-aim model elsewhere. */
export function flyingSurvey(first = 1, last = 60, runs = 8) {
  const obstacles = Array.from({ length: last - first + 1 }, (_, i) => first + i).filter((n) => !!makeLevel(n).sky.obstacle);
  const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
  const rows = new Map<string, PlanetMetrics[]>();
  for (const policy of policies)
    rows.set(
      policy.name,
      obstacles.map((n) => runPlanet(n, policy, runs, undefined, { timed: policy !== POLICIES.casual })),
    );
  const casualUntimed = obstacles.map((n) => runPlanet(n, POLICIES.casual, runs, undefined, { timed: false, badgeAware: false }));
  let surprise = 0;
  for (const group of [...rows.values(), casualUntimed]) for (const row of group) surprise += row.flight?.surpriseBonks ?? 0;
  console.log('Flying bots (bonks + fizzles / round; M8 obstacle gates)');
  console.log('Obstacle       planets casual  casual-untimed decent sharp teach noise-bonks median 31-60');
  const failures: string[] = [];
  for (const obstacle of Object.keys(OBSTACLES) as ObstacleId[]) {
    const levels = obstacles.filter((n) => makeLevel(n).sky.obstacle === obstacle);
    const group = (name: string) => (rows.get(name) ?? []).filter((r) => levels.includes(r.n));
    const teaching = group('casual').filter((r) => r.n === OBSTACLES[obstacle].debut);
    const d = perRound(group('decent'));
    const cu = perRound(casualUntimed.filter((r) => levels.includes(r.n)));
    const noise =
      group('casual').reduce((sum, row) => sum + (row.flight?.noiseBonks ?? 0), 0) /
      Math.max(
        1,
        group('casual').reduce((sum, row) => sum + row.runs, 0),
      );
    const times = group('decent')
      .filter((r) => r.n >= 31 && r.n <= 60)
      .flatMap((r) => r.flight?.roundTimes ?? []);
    const decentRows = group('decent');
    for (const n of levels) {
      const c = group('casual').find((row) => row.n === n)!;
      const dec = decentRows.find((row) => row.n === n)!;
      const casualBonks = ((c.flight?.bonks ?? 0) + (c.flight?.fizzles ?? 0)) / c.runs;
      const decentBonks = ((dec.flight?.bonks ?? 0) + (dec.flight?.fizzles ?? 0)) / dec.runs;
      const limit = n === OBSTACLES[obstacle].debut ? 1 : 1.5;
      if (casualBonks > limit) failures.push(`planet ${n} casual bonks ${casualBonks.toFixed(2)} > ${limit}`);
      if (decentBonks > 0.8) failures.push(`planet ${n} decent bonks ${decentBonks.toFixed(2)} > 0.8`);
      if (c.fail > 0.33 || dec.fail > 0.26)
        failures.push(`planet ${n} obstacle fail casual/decent ${Math.round(c.fail * 100)}%/${Math.round(dec.fail * 100)}% > 33%/26%`);
      const floor: typeof POLICIES.casual = { name: 'casual', chooseAim: (context) => oneStep(context, ROUND_RULES_V0) };
      const floorRow = runPlanet(n, floor, runs, undefined, { timed: false, badgeAware: true });
      if (floorRow.fail > 0.1) failures.push(`planet ${n} Solver 0 with casual flight fails ${Math.round(floorRow.fail * 100)}% > 10%`);
    }
    const wait =
      decentRows.reduce((sum, row) => sum + (row.flight?.waits ?? 0), 0) /
      Math.max(
        1,
        decentRows.reduce((sum, row) => sum + row.runs, 0),
      );
    const misses =
      decentRows.reduce((sum, row) => sum + (row.flight?.misses ?? 0), 0) /
      Math.max(
        1,
        decentRows.reduce((sum, row) => sum + row.runs, 0),
      );
    console.log(
      `${OBSTACLES[obstacle].name.padEnd(14)} ${String(levels.length).padStart(3)}     ${perRound(group('casual')).toFixed(2)}    ${cu.toFixed(2)}    ${d.toFixed(2)}    ${perRound(group('sharp')).toFixed(2)}   ${perRound(teaching).toFixed(2)}   ${noise.toFixed(2)}       ${median(times).toFixed(1)}s`,
    );
    console.log(`  decent wait ${wait.toFixed(1)}s/round; misses ${misses.toFixed(2)}/round`);
  }
  const obstacleTimes = rows.get('decent')?.flatMap((r) => (r.n >= 31 && r.n <= 60 ? (r.flight?.roundTimes ?? []) : [])) ?? [];
  console.log(`All obstacles: ${obstacles.join(', ')}; median round ${median(obstacleTimes).toFixed(1)}s; surprise bonks ${surprise}`);
  const time = median(obstacleTimes);
  if (time < 60 || time > 100) failures.push(`obstacle median round ${time.toFixed(1)}s outside 60-100s`);
  expect(surprise, 'M7.5 surprise bonks').toBe(0);
  expect(failures, `M8 obstacle bands:\n${failures.join('\n')}`).toEqual([]);
  return { obstacles, rows, casualUntimed, surprise };
}

if (process.env.SIM === '1') {
  it('flies obstacle planets and gates surprise bonks', () => {
    flyingSurvey(1, 60, Number(process.env.FLIGHT_RUNS ?? 8));
  });
}
