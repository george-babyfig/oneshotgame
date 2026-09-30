import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { BANDS, POLICIES, runSurvey, type BandMetrics } from './harness';
import './reactions.sim';
import './flight.sim';

interface Baseline {
  runs: number;
  bands: BandMetrics[];
}

const baselineFile = new URL('./baseline.json', import.meta.url);
const percentage = (value: number) => `${Math.round(value * 100)}%`;
const signedPoints = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value * 100)}`;
const cell = (row: BandMetrics | undefined) =>
  row ? `${percentage(row.fail)}/${percentage(row.threeStar)}/${row.attemptsPerClear.toFixed(2)}` : '—';
const key = (row: BandMetrics) => `${row.band}:${row.difficulty}:${row.policy}`;

if (process.env.SIM === '1') {
  it('surveys planets 1-60 and watches baseline drift', () => {
    const start = performance.now();
    const runs = Number(process.env.RUNS ?? 16);
    const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
    const surveys = policies.map((policy) => runSurvey(policy, runs));
    const rows = surveys.flatMap((survey) => survey.bands);
    const byKey = new Map(rows.map((row) => [key(row), row]));

    console.log('Band    Difficulty  Casual fail/3★/attempts  Decent fail/3★/attempts  Sharp fail/3★/attempts');
    for (const [first, last] of BANDS) {
      for (const difficulty of ['normal', 'hard', 'super'] as const) {
        const band = `${first}-${last}`;
        if (!byKey.has(`${band}:${difficulty}:decent`)) continue;
        console.log(
          `${band.padEnd(7)} ${difficulty.padEnd(10)} ${policies.map((policy) => cell(byKey.get(`${band}:${difficulty}:${policy.name}`)).padEnd(25)).join('')}`,
        );
      }
    }
    for (const band of ['21-30', '31-45', '46-60']) {
      const sharp = byKey.get(`${band}:normal:sharp`);
      if (sharp && sharp.threeStar > 0.8) throw new Error(`Sharp 3★ on normal planets ${band}: ${percentage(sharp.threeStar)} exceeds 80%`);
    }

    const decentActive = surveys[1].planets.filter((planet) => planet.n >= 9);
    const novaAverage = decentActive.reduce((sum, planet) => sum + planet.novas, 0) / decentActive.length;
    console.log(`Decent Supernovas per planet: ${novaAverage.toFixed(2)}`);
    const current: Baseline = { runs, bands: rows };
    if (process.env.BASELINE === 'write') {
      writeFileSync(baselineFile, JSON.stringify(current, null, 2) + '\n');
      console.log('Wrote tests/sim/baseline.json');
    } else {
      const baseline = JSON.parse(readFileSync(baselineFile, 'utf8')) as Baseline;
      const prior = new Map(baseline.bands.map((row) => [key(row), row]));
      if (baseline.runs !== runs) console.log(`⚠ Baseline has ${baseline.runs} runs; current survey has ${runs}.`);
      console.log('Drift from baseline (fail/3★ percentage points):');
      for (const row of rows) {
        const old = prior.get(key(row));
        if (!old) {
          console.log(`⚠ ${key(row)} has no baseline`);
          continue;
        }
        const failDrift = row.fail - old.fail;
        const starDrift = row.threeStar - old.threeStar;
        const warning = Math.abs(failDrift) > 0.05 || Math.abs(starDrift) > 0.05 ? ' ⚠' : '';
        console.log(`${key(row)} ${signedPoints(failDrift)}/${signedPoints(starDrift)}${warning}`);
      }
    }
    console.log(`Quick sim: ${((performance.now() - start) / 1000).toFixed(1)}s, ${runs} runs per planet/policy`);
  });
}
