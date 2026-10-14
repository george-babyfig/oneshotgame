import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { makeLevel, rngFrom } from '../../src/core/levels';
import { rulesForLevel } from '../../src/core/round';
import { defaultProfile } from '../../src/meta/profile';
import { remixLevel } from '../../src/meta/remix';
import { playLevel, POLICIES, type BotPolicy } from './harness';
import { PHONES } from './flying';

const measured = process.env.SIM === '1' && process.env.SIM_BALANCE === '1' ? it : it.skip;
const groups = [
  ['chapters 1–5', [1, 2, 3, 4, 5]],
  ['later sample through 50', [6, 10, 15, 20, 30, 40, 50]],
] as const;
const masters = ['curve-a', 'curve-b'];
const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
type Counts = { runs: number; three: number; fail: number };
type Mode = 'Classic' | 'Remix';
const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;
const rate = (row: Counts, field: 'three' | 'fail') => row[field] / row.runs;

/** Same random stream, no-flight aim model and retry learning as runPlanet(). */
function survey(chapters: readonly number[], mode: Mode, master: string, runs: number, flight: boolean, policy: BotPolicy): Counts {
  const counts = { runs: 0, three: 0, fail: 0 };
  for (const chapter of chapters) {
    const last = chapter * 10;
    const profile = defaultProfile();
    profile.level = last + 1;
    for (let n = last - 9; n <= last; n++) {
      const level = mode === 'Remix' ? remixLevel(n, profile) : makeLevel(n);
      const rules = mode === 'Remix' ? rulesForLevel(n, 'remix', last) : rulesForLevel(n);
      let retryCount = 0;
      for (let run = 0; run < runs; run++) {
        const random = rngFrom(`sim-${master}-${policy.name}-${n}-${run}`);
        const phone = PHONES[(run + n + (policy.name === 'decent' ? 1 : 0)) % PHONES.length];
        const result = playLevel(level, policy, random, rules, flight ? { phone, retry: retryCount } : undefined, retryCount);
        counts.runs++;
        if (result.stars === 3) counts.three++;
        if (result.stars === 0) counts.fail++;
        retryCount = result.stars === 0 ? Math.min(7, retryCount + 1) : 0;
      }
    }
  }
  return counts;
}

measured(
  'gates Remix on the campaign aim model and watches paired real flight',
  () => {
    const started = performance.now();
    const runs = Number(process.env.REMIX_RUNS ?? 12);
    const flightRuns = Number(process.env.REMIX_FLIGHT_RUNS ?? 1);
    const failures: string[] = [];
    const report: { group: string; harness: string; mode: Mode; policy: string; three: number; fail: number; runs: number }[] = [];
    for (const [label, chapters] of groups) {
      const rows: Record<Mode, Record<string, Counts>> = { Classic: {}, Remix: {} };
      for (const mode of ['Classic', 'Remix'] as const) {
        for (const policy of policies) {
          const pooled = { runs: 0, three: 0, fail: 0 };
          for (const master of masters) {
            const result = survey(chapters, mode, master, runs, false, policy);
            pooled.runs += result.runs;
            pooled.three += result.three;
            pooled.fail += result.fail;
          }
          rows[mode][policy.name] = pooled;
          report.push({
            group: label,
            harness: 'campaign-scale',
            mode,
            policy: policy.name,
            three: rate(pooled, 'three'),
            fail: rate(pooled, 'fail'),
            runs: pooled.runs,
          });
        }
        console.log(
          `${mode} campaign-scale ${label}: ${policies.map((policy) => `${policy.name} 3★ ${pct(rate(rows[mode][policy.name], 'three'))}, fail ${pct(rate(rows[mode][policy.name], 'fail'))}`).join('; ')}`,
        );
      }
      const classic = rows.Classic;
      const remix = rows.Remix;
      if (rate(remix.decent, 'three') < 0.25 || rate(remix.decent, 'three') > 0.45)
        failures.push(`${label}: decent Remix 3★ ${pct(rate(remix.decent, 'three'))} outside 25–45%`);
      if (rate(remix.decent, 'three') > rate(classic.decent, 'three')) failures.push(`${label}: decent Remix 3★ exceeds classic`);
      if (rate(remix.casual, 'fail') < rate(classic.casual, 'fail')) failures.push(`${label}: casual Remix fail below classic`);

      const watch: Record<Mode, Record<string, Counts>> = { Classic: {}, Remix: {} };
      for (const mode of ['Classic', 'Remix'] as const) {
        for (const policy of [POLICIES.casual, POLICIES.decent]) {
          watch[mode][policy.name] = survey(chapters, mode, 'flight-watch', flightRuns, true, policy);
          const result = watch[mode][policy.name];
          report.push({
            group: label,
            harness: 'real-flight watch',
            mode,
            policy: policy.name,
            three: rate(result, 'three'),
            fail: rate(result, 'fail'),
            runs: result.runs,
          });
        }
        console.log(
          `Remix real-flight watch (not gating) ${label} ${mode}: decent 3★ ${pct(rate(watch[mode].decent, 'three'))}, casual fail ${pct(rate(watch[mode].casual, 'fail'))}`,
        );
      }
    }
    console.log(
      `Remix measurement ${((performance.now() - started) / 1000).toFixed(1)}s; aim ${runs} runs/planet/policy/master × 2, flight ${flightRuns} runs/planet/policy`,
    );
    if (process.env.REMIX_REPORT) writeFileSync(process.env.REMIX_REPORT, JSON.stringify({ report, failures }, null, 2) + '\n');
    expect(failures, failures.join('\n')).toEqual([]);
  },
  1_500_000,
);
