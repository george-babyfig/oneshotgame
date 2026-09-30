import { it } from 'vitest';
import { POLICIES, runSurvey } from './sim/harness';
import { lintCampaign, type LintFlag } from './sim/lint';

if (process.env.SIM === '1') {
  it(
    'reports both sides of the level curve on campaign seeds',
    () => {
      const runs = Number(process.env.LINT_RUNS ?? 24);
      const last = process.env.SIM_NIGHTLY === '1' ? 120 : 60;
      const [casual, decent, sharp] = [POLICIES.casual, POLICIES.decent, POLICIES.sharp].map((policy) => runSurvey(policy, runs, 1, last));
      const issues = lintCampaign(casual.planets, decent.planets, sharp.planets, last);
      for (const range of [
        [1, 60],
        [61, 120],
      ] as const) {
        if (range[0] > last) continue;
        const scoped = issues.filter((issue) => issue.planet >= range[0] && issue.planet <= range[1]);
        const counts = Object.fromEntries(
          (['WALL', 'CLIFF', 'GOAL-TRAP', 'STACK', 'BONK-HEAVY', 'EASY', 'TRIVIAL', 'EASY-EARLY', 'FLAT', 'SLACK'] as LintFlag[]).map(
            (flag) => [flag, scoped.filter((issue) => issue.flag === flag).length],
          ),
        );
        console.log(`Level lint ${range[0]}-${range[1]} (${runs} runs/planet/policy): ${JSON.stringify(counts)}`);
        for (const issue of scoped) console.log(`${issue.flag} planet ${issue.planet}: ${issue.detail}. Fix: ${issue.fix}`);
      }
    },
    60 * 60_000,
  );
}
