import { expect, it } from 'vitest';
import { POLICIES, runSurvey } from './sim/harness';
import { classifyLauncherLock, lintCampaign, type LintFlag } from './sim/lint';
import { makeLevel, rngFrom } from '../src/core/levels';
import { LAUNCH_ROSTER, LAUNCHERS } from '../src/core/launchers';
import { PHONES } from './sim/flying';
import { playLevel } from './sim/harness';

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
      console.log(
        `Sling chapter bands 61-120: Watch (${last === 120 ? 'abstract survey printed above' : 'not sampled in CI'}; physical flight has a different absolute scale)`,
      );
    },
    60 * 60_000,
  );

  it(
    'gates paired physical LAUNCHER-LOCK on campaign planets',
    () => {
      const started = performance.now();
      const last = 120;
      const runs = Number(process.env.LOCK_RUNS ?? 8);
      if (runs < 4) throw Error('LAUNCHER-LOCK needs at least four paired runs per launcher');
      const locks: string[] = [];
      const screened: string[] = [];
      const flight = { phone: PHONES[0], timed: true };
      const only = process.env.LOCK_ONLY ? new Set(process.env.LOCK_ONLY.split(',').map(Number)) : null;
      for (let n = 31; n <= last; n++) {
        if (only && !only.has(n)) continue;
        const level = makeLevel(n);
        const available = LAUNCH_ROSTER.filter((id) => id !== 'sling' && LAUNCHERS[id].debut <= n);
        let slingWins = 0;
        const wins = Object.fromEntries(available.map((id) => [id, 0])) as Record<string, number>;
        for (let run = 0; run < runs; run++) {
          const seed = `launcher-lock:${n}:${run}`;
          slingWins += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight).stars === 3);
          for (const id of available)
            wins[id] += Number(
              playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, undefined, { id, tune: 1 }).stars === 3,
            );
        }
        for (const id of available) {
          const issue = classifyLauncherLock(n, slingWins, id, wins[id], runs);
          if (!issue) continue;
          screened.push(`P${n} ${issue.detail}`);
          let confirmSling = slingWins;
          let confirmLauncher = wins[id];
          const confirmRuns = runs + 16;
          for (let run = runs; run < confirmRuns; run++) {
            const seed = `launcher-lock-confirm:${n}:${run}`;
            confirmSling += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight).stars === 3);
            confirmLauncher += Number(
              playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, undefined, { id, tune: 1 }).stars === 3,
            );
          }
          const confirmed = classifyLauncherLock(n, confirmSling, id, confirmLauncher, confirmRuns);
          console.log(
            `LAUNCHER-LOCK confirm P${n} ${id}: Sling ${confirmSling}/${confirmRuns}, launcher ${confirmLauncher}/${confirmRuns}`,
          );
          if (confirmed) locks.push(`P${n} ${confirmed.detail}`);
        }
      }
      console.log(
        `Paired physical LAUNCHER-LOCK 1-${last}${only ? ` sampled ${[...only].join(',')}` : ''}: ${screened.length} screened, ${locks.length} confirmed flags, ${runs} screening runs/launcher/planet and ${runs + 16} confirmation runs/flag, ≥25-point paired margin; ${((performance.now() - started) / 1000).toFixed(1)}s`,
      );
      for (const lock of locks) console.log(`LAUNCHER-LOCK ${lock}`);
      expect(classifyLauncherLock(31, 0, 'swoop', 3, 8)?.flag, 'classifier can fire').toBe('LAUNCHER-LOCK');
      expect(locks, 'zero LAUNCHER-LOCK planets against paired Sling').toEqual([]);
    },
    60 * 60_000,
  );
}
