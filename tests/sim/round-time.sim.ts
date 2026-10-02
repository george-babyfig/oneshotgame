import { expect, it } from 'vitest';
import { POLICIES, runPlanet } from './harness';

const active = process.env.SIM_NIGHTLY === '1' || process.env.ROUND_TIME_REPORT === '1' ? it : it.skip;
active(
  'keeps full-flight rounds on planets 21-60 within 60-100 seconds',
  () => {
    const times: number[] = [];
    const runs = Number(process.env.ROUND_TIME_RUNS ?? 4);
    for (let n = 21; n <= 60; n++) {
      const row = runPlanet(n, POLICIES.decent, runs, undefined, { timed: true });
      times.push(...(row.flight?.roundTimes ?? []));
    }
    times.sort((a, b) => a - b);
    const middle = Math.floor(times.length / 2);
    const median = (times[middle - 1] + times[middle]) / 2;
    console.log(`Full-flight 21-60 median round: ${median.toFixed(1)}s (${times.length} rounds)`);
    expect(median).toBeGreaterThanOrEqual(60);
    expect(median).toBeLessThanOrEqual(100);
  },
  60 * 60_000,
);
