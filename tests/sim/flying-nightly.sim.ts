import { expect, it } from 'vitest';
import { POLICIES, runPlanet } from './harness';
import { makeLevel } from '../../src/core/levels';

// Run with: SIM=1 SIM_NIGHTLY=1 npx vitest run tests/sim/flying-nightly.sim.ts --disableConsoleIntercept
if (process.env.SIM === '1') {
  const nightly = process.env.SIM_NIGHTLY === '1' ? it : it.skip;
  nightly(
    'flies every campaign planet 1-120',
    () => {
      const started = performance.now();
      const runs = Number(process.env.NIGHTLY_FLIGHT_RUNS ?? 1);
      const last = Number(process.env.NIGHTLY_LAST ?? 120);
      let surprise = 0;
      for (const policy of [POLICIES.casual, POLICIES.decent, POLICIES.sharp]) {
        let bonks = 0;
        let fizzles = 0;
        let misses = 0;
        let total = 0;
        for (let n = 1; n <= last; n++) {
          const stableRuns = makeLevel(n).sky.obstacle ? Math.max(8, runs) : runs;
          const row = runPlanet(n, policy, stableRuns, undefined, { timed: policy !== POLICIES.casual });
          bonks += row.flight?.bonks ?? 0;
          fizzles += row.flight?.fizzles ?? 0;
          misses += row.flight?.misses ?? 0;
          surprise += row.flight?.surpriseBonks ?? 0;
          total += row.runs;
        }
        console.log(
          `${policy.name}: bonks ${(bonks / total).toFixed(2)}, fizzles ${(fizzles / total).toFixed(2)}, misses ${(misses / total).toFixed(2)} per round`,
        );
      }
      console.log(`Nightly flying 1-${last}: ${((performance.now() - started) / 1000).toFixed(1)}s; surprise bonks ${surprise}`);
      expect(surprise).toBe(0);
    },
    60 * 60_000,
  );
}
