import { writeFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import {
  budgetFor,
  difficultyOf,
  goalsMet,
  levelMeta,
  makeLevel,
  pressureOf,
  skyWall,
  solve0,
  solve2,
  starsEarned,
  starsFor,
  type GenerationProfile,
  type LevelDef,
} from '../src/core/levels';
import { lifeScore } from '../src/core/world';
import { CHAPTER_BANDS, lintCampaign } from './sim/lint';
import { POLICIES, runPlanet, type PlanetMetrics } from './sim/harness';

// Use the same runPlanet/lintCampaign imports for both sides of the comparison.
vi.mock('../src/core/levels', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/core/levels')>();
  return {
    ...original,
    makeLevel: (n: number, prefix?: string, options: Parameters<typeof original.makeLevel>[2] = {}) =>
      original.makeLevel(n, prefix, process.env.GENERATOR_PROFILE === 'reviewed-v1' ? { ...options, profile: 'reviewed-v1' } : options),
  };
});

// Diagnostic owned by the generator package. The CI gates live in tests/sim.
const measured = process.env.SIM_GENERATOR === '1' ? it : it.skip;
const policies = [POLICIES.casual, POLICIES.decent, POLICIES.sharp];
const masters = ['curve-a', 'curve-b'];
const mean = (rows: PlanetMetrics[], field: 'fail' | 'threeStar') =>
  rows.reduce((sum, row) => sum + row[field] * row.runs, 0) / rows.reduce((sum, row) => sum + row.runs, 0);

measured(
  'reports shadow generator bands on paired master seeds',
  async () => {
    const started = performance.now();
    const runs = Number(process.env.GENERATOR_RUNS ?? 2);
    const profile = (process.env.GENERATOR_PROFILE ?? 'raw-v2') as GenerationProfile;
    const first = Number(process.env.GENERATOR_FIRST ?? 1);
    const last = Number(process.env.GENERATOR_LAST ?? 120);
    const tierFilter = process.env.GENERATOR_TIER;
    if (process.env.GENERATOR_SEED_PAIRS) {
      const pairs = process.env.GENERATOR_SEED_PAIRS.split(',').map((entry) => entry.split(':').map(Number));
      const report = pairs.map(([n, requested, selected]) => {
        const candidate = makeLevel(n, 'PP', { salt: selected });
        const actual = makeLevel(n, 'PP', { salt: requested });
        return {
          n,
          requested,
          selected,
          actualSeed: actual.seed,
          candidateSeed: candidate.seed,
          same: JSON.stringify(actual) === JSON.stringify(candidate),
        };
      });
      console.log(JSON.stringify(report));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(report, null, 2) + '\n');
      expect(report).toHaveLength(pairs.length);
      return;
    }
    if (process.env.GENERATOR_TIMING_DAILY === '1') {
      const { dailyLevel } = await import('../src/meta/modes');
      const start = Date.parse('2026-10-14T00:00:00Z');
      const timings = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
        const begun = performance.now();
        dailyLevel(day);
        return { day, ms: performance.now() - begun };
      });
      const sorted = timings.map((row) => row.ms).sort((a, b) => a - b);
      const report = { median: sorted[15], p95: sorted[28], max: sorted[29], slowest: timings.sort((a, b) => b.ms - a.ms).slice(0, 5) };
      console.log(JSON.stringify(report));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(report, null, 2) + '\n');
      expect(timings).toHaveLength(30);
      return;
    }
    if (process.env.GENERATOR_REJECTIONS === '1') {
      const rejected: { n: number; salt: number; selected: string }[] = [];
      for (let n = first; n <= last; n++) {
        const needed = difficultyOf(n) === 'normal' ? 10 : 30;
        for (let salt = 1001; salt < 1001 + needed; salt++) {
          const level = makeLevel(n, 'PP', { salt });
          if (level.seed !== `PP-${n}~${1_000_000 + salt}`) rejected.push({ n, salt, selected: level.seed });
        }
      }
      console.log(JSON.stringify(rejected));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(rejected, null, 2) + '\n');
      expect(rejected.length).toBeLessThan(100);
      return;
    }
    if (process.env.GENERATOR_FEASIBLE === '1') {
      const issues: string[] = [];
      for (let n = first; n <= last; n++) {
        const needed = difficultyOf(n) === 'normal' ? 10 : 30;
        for (let salt = 1001; salt < 1001 + needed; salt++) {
          const level = makeLevel(n, 'PP', { salt });
          const blind = solve0(level);
          if (starsEarned(blind, lifeScore(blind), level) < 1) issues.push(`${n}~${salt}: Solver 0 cannot earn 1★`);
          if (pressureOf(level) > budgetFor(level) || skyWall(level)) issues.push(`${n}~${salt}: pressure/sky`);
        }
      }
      console.log(JSON.stringify({ first, last, issues }));
      expect(issues).toEqual([]);
      return;
    }
    if (process.env.GENERATOR_CALENDAR === '1') {
      const [{ dailyLevel }, { isoWeek }, { VOYAGE_LEN, voyageBase, voyageLevel }] = await Promise.all([
        import('../src/meta/modes'),
        import('../src/meta/events'),
        import('../src/meta/voyage'),
      ]);
      const issues: string[] = [];
      const check = (level: LevelDef, label: string) => {
        if (pressureOf(level) > budgetFor(level) || skyWall(level)) issues.push(`${label}: pressure/sky`);
        for (const solve of [solve0, solve2]) {
          const planet = solve(level);
          if (!goalsMet(planet, level.goals) || starsFor(lifeScore(planet), level.stars) < 1)
            issues.push(`${label}: solver cannot earn 1★`);
        }
      };
      const start = Date.parse('2026-10-14T00:00:00Z');
      for (let day = 0; day < 30; day++) {
        const date = new Date(start + day * 86_400_000).toISOString().slice(0, 10);
        for (const taught of [16, 28, 36]) check(dailyLevel(date, taught), `Daily ${date} taught ${taught}`);
      }
      for (let week = 0; week < 8; week++) {
        const key = isoWeek(new Date(start + week * 7 * 86_400_000));
        for (const taught of [16, 28, 36])
          for (let stop = 0; stop < VOYAGE_LEN; stop++)
            check(voyageLevel(key, voyageBase(taught), stop, taught), `Voyage ${key} stop ${stop + 1} taught ${taught}`);
      }
      console.log(JSON.stringify({ days: 30, weeks: 8, issues }, null, 2));
      expect(issues).toEqual([]);
      return;
    }
    if (process.env.GENERATOR_META === '1') {
      const mismatches = Array.from({ length: last - first + 1 }, (_, i) => first + i).flatMap((n) => {
        const meta = levelMeta(n);
        const level = makeLevel(n);
        return meta.name === level.name && meta.twist === level.twist && meta.obstacle === level.sky.obstacle
          ? []
          : [{ n, meta, actual: { name: level.name, twist: level.twist, obstacle: level.sky.obstacle } }];
      });
      console.log(JSON.stringify(mismatches));
      expect(mismatches).toEqual([]);
      return;
    }
    if (process.env.GENERATOR_SELECT === '1') {
      const candidates = Number(process.env.GENERATOR_CANDIDATES ?? 8);
      const saltStart = Number(process.env.GENERATOR_SALT_START ?? 0);
      const selectionMasters = process.env.GENERATOR_SELECT_PAIRED === '1' ? masters : ['curve-a'];
      const numbers = process.env.GENERATOR_PLANETS
        ? process.env.GENERATOR_PLANETS.split(',').map(Number)
        : Array.from({ length: last - first + 1 }, (_, i) => first + i);
      const chosen = numbers.map((n) => {
        const difficulty = difficultyOf(n);
        const target =
          difficulty === 'normal' ? [0.21, 0.13, 0.21, 0.47] : difficulty === 'hard' ? [0.4, 0.25, 0.28, 0.35] : [0.55, 0.4, 0.2, 0.25];
        const choices = Array.from({ length: candidates }, (_, offset) => {
          const salt = saltStart + offset;
          const level = makeLevel(n, 'PP', { salt, profile: 'raw-v2' });
          const sample = (policy: Parameters<typeof runPlanet>[1]) => {
            const batch = selectionMasters.map((master) => runPlanet(n, policy, runs, salt, undefined, master));
            return {
              fail: mean(batch, 'fail'),
              threeStar: mean(batch, 'threeStar'),
              scoreMet: batch.reduce((total, row) => total + row.scoreMet, 0),
              goalMetWhenScoreMet: batch.reduce((total, row) => total + row.goalMetWhenScoreMet, 0),
            };
          };
          const c = sample(POLICIES.casual);
          const d = sample(POLICIES.decent);
          const s = sample(POLICIES.sharp);
          const values = [c.fail, d.fail, c.threeStar, d.threeStar];
          const failMin = difficulty === 'super' ? 0.25 : difficulty === 'hard' ? 0.12 : 0.08;
          const failMax = difficulty === 'normal' ? 0.18 : difficulty === 'hard' ? 0.45 : 0.6;
          const stack =
            !!level.sky.obstacle &&
            !!level.troubles.length &&
            (difficulty !== 'super' || n < 10 + ({ rocks: 33, bubble: 41, mist: 46, ring: 51, tug: 57 }[level.sky.obstacle] ?? 120));
          const wall = d.fail > failMax || (difficulty === 'normal' && c.fail > 0.6);
          const easy = difficulty !== 'normal' && d.fail < failMin;
          const goalTrap = d.fail > 0 && (d.scoreMet - d.goalMetWhenScoreMet) / (d.fail * runs * selectionMasters.length) >= 0.7;
          const penalty =
            values.reduce((sum, value, index) => sum + (value - target[index]) ** 2 * (index < 2 ? 4 : 1), 0) +
            (difficulty === 'normal' && level.goals.length === 0 ? 0.02 : 0) +
            (stack || wall || easy || d.threeStar >= 0.9 ? 2 : 0) +
            (goalTrap ? 0.3 : 0) +
            (s.threeStar >= 0.95 && difficulty === 'normal' ? 0.05 : 0);
          return {
            salt,
            seed: level.seed,
            penalty,
            stack,
            wall,
            easy,
            goalTrap,
            casualFail: c.fail,
            decentFail: d.fail,
            casualThree: c.threeStar,
            decentThree: d.threeStar,
            sharpFail: s.fail,
            sharpThree: s.threeStar,
            goals: level.goals.length,
          };
        });
        choices.sort((a, b) => a.penalty - b.penalty || a.salt - b.salt);
        return process.env.GENERATOR_SELECT_ALL === '1' ? { n, difficulty, choices } : { n, difficulty, ...choices[0] };
      });
      console.log(JSON.stringify(chosen));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(chosen, null, 2) + '\n');
      expect(chosen).toHaveLength(numbers.length);
      return;
    }
    if (process.env.GENERATOR_TIMING === '1') {
      const timings = Array.from({ length: last - first + 1 }, (_, i) => i + first).flatMap((n) => {
        const shadow = process.env.GENERATOR_TIMING_SHADOW === '1';
        const salts = shadow
          ? []
          : process.env.GENERATOR_TIMING_SALT
            ? [Number(process.env.GENERATOR_TIMING_SALT)]
            : process.env.GENERATOR_TIMING_DEFAULT === '1'
              ? [undefined]
              : [200001 + n];
        if (shadow) {
          const seen = new Set<string>();
          const needed = difficultyOf(n) === 'normal' ? 10 : 30;
          const sampled: { n: number; seed: string; ms: number }[] = [];
          for (let salt = 1001; seen.size < needed; salt++) {
            const start = performance.now();
            const level = makeLevel(n, 'PP', { profile: 'raw-v2', salt });
            if (seen.has(level.seed)) continue;
            seen.add(level.seed);
            sampled.push({ n, seed: level.seed, ms: performance.now() - start });
          }
          return sampled;
        }
        return salts.map((salt) => {
          const start = performance.now();
          const level = makeLevel(n, 'PP', { profile: 'raw-v2', salt });
          return { n, seed: level.seed, ms: performance.now() - start };
        });
      });
      const sorted = timings.map((row) => row.ms).sort((a, b) => a - b);
      const report = {
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        max: sorted[sorted.length - 1],
        slowest: timings.sort((a, b) => b.ms - a.ms).slice(0, 10),
      };
      console.log(JSON.stringify(report, null, 2));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(report, null, 2) + '\n');
      expect(timings.length).toBeGreaterThanOrEqual(last - first + 1);
      return;
    }
    if (process.env.GENERATOR_LINT === '1') {
      const rows = policies.map((policy) =>
        Array.from({ length: 120 }, (_, index) => runPlanet(index + 1, policy, runs, undefined, undefined, 'curve-a')),
      );
      const issues = lintCampaign(rows[0], rows[1], rows[2], 120).filter((issue) => issue.planet >= first && issue.planet <= last);
      const byFlag = Object.fromEntries(
        [...new Set(issues.map((issue) => issue.flag))].map((flag) => [flag, issues.filter((issue) => issue.flag === flag).length]),
      );
      const report = { profile, first, last, runs, byFlag, issues, seconds: (performance.now() - started) / 1000 };
      console.log(JSON.stringify({ profile, first, last, runs, byFlag, seconds: report.seconds }, null, 2));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(report, null, 2) + '\n');
      expect(rows[0]).toHaveLength(120);
      return;
    }
    if (process.env.GENERATOR_DIAG === '1') {
      const salt = process.env.GENERATOR_SALT ? Number(process.env.GENERATOR_SALT) : undefined;
      const diagnostics = Array.from({ length: last - first + 1 }, (_, i) => i + first).map((n) => {
        const c = runPlanet(n, POLICIES.casual, runs, salt, undefined, 'curve-a');
        const d = runPlanet(n, POLICIES.decent, runs, salt, undefined, 'curve-a');
        return {
          n,
          difficulty: c.difficulty,
          seed: makeLevel(n, 'PP', salt === undefined ? {} : { salt }).seed,
          goal: makeLevel(n, 'PP', salt === undefined ? {} : { salt }).goals,
          casualFail: c.fail,
          casualThree: c.threeStar,
          decentFail: d.fail,
          decentThree: d.threeStar,
          goalMisses: d.scoreMet - d.goalMetWhenScoreMet,
          scoreMet: d.scoreMet,
          runs,
        };
      });
      console.log(JSON.stringify(diagnostics));
      if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(diagnostics, null, 2) + '\n');
      expect(diagnostics).toHaveLength(last - first + 1);
      return;
    }
    const rows: Record<string, PlanetMetrics[]> = { casual: [], decent: [], sharp: [] };
    const slots: { n: number; salts: number[] }[] = [];
    for (let n = first; n <= last; n++) {
      if (tierFilter && difficultyOf(n) !== tierFilter) continue;
      const needed = difficultyOf(n) === 'normal' ? 10 : 30;
      const seen = new Set<string>();
      const salts: number[] = [];
      for (let salt = 1001; seen.size < needed; salt++) {
        const seed = makeLevel(n, 'PP', { salt, profile }).seed;
        if (seen.has(seed)) continue;
        seen.add(seed);
        salts.push(salt);
        for (const master of masters)
          for (const policy of policies) rows[policy.name].push(runPlanet(n, policy, runs, salt, undefined, master));
      }
      slots.push({ n, salts });
    }
    const bands = CHAPTER_BANDS.filter((band) => band.first >= first && band.last <= last).map((band) => {
      const scope = (policy: string) =>
        rows[policy].filter((row) => row.n >= band.first && row.n <= band.last && row.difficulty === 'normal');
      const c = scope('casual'),
        d = scope('decent'),
        s = scope('sharp');
      return {
        chapter: `${band.first}-${band.last}`,
        runs: c.reduce((sum, row) => sum + row.runs, 0),
        casualFail: mean(c, 'fail'),
        casualThree: mean(c, 'threeStar'),
        decentFail: mean(d, 'fail'),
        decentThree: mean(d, 'threeStar'),
        sharpFail: mean(s, 'fail'),
        sharpThree: mean(s, 'threeStar'),
      };
    });
    const tier = (label: string, select: (n: number) => boolean) => {
      const c = rows.casual.filter((row) => select(row.n));
      const d = rows.decent.filter((row) => select(row.n));
      return {
        label,
        runs: c.reduce((sum, row) => sum + row.runs, 0),
        casualFail: mean(c, 'fail'),
        decentFail: mean(d, 'fail'),
        decentThree: mean(d, 'threeStar'),
      };
    };
    const tiers = [
      tier('first Hard', (n) => n === 15 || n === 20),
      tier('Hard 25+', (n) => n >= 25 && difficultyOf(n) === 'hard'),
      tier('Super', (n) => difficultyOf(n) === 'super'),
    ];
    const byPlanet = slots.map(({ n }) => {
      const c = rows.casual.filter((row) => row.n === n),
        d = rows.decent.filter((row) => row.n === n),
        s = rows.sharp.filter((row) => row.n === n);
      return {
        n,
        difficulty: difficultyOf(n),
        casualFail: mean(c, 'fail'),
        casualThree: mean(c, 'threeStar'),
        decentFail: mean(d, 'fail'),
        decentThree: mean(d, 'threeStar'),
        sharpFail: mean(s, 'fail'),
        sharpThree: mean(s, 'threeStar'),
      };
    });
    const failures: string[] = [];
    const watches: string[] = [];
    for (const band of bands) {
      const limits = CHAPTER_BANDS.find((entry) => `${entry.first}-${entry.last}` === band.chapter)!;
      for (const [field, bounds] of [
        ['casualFail', limits.casualFail],
        ['casualThree', limits.casualThree],
        ['decentFail', limits.decentFail],
        ['decentThree', limits.decentThree],
      ] as const)
        if (band[field] < bounds[0] || band[field] > bounds[1])
          failures.push(`${band.chapter} ${field} ${band[field].toFixed(4)} outside ${bounds.join('-')}`);
      for (const [field, bounds] of [
        ['sharpFail', limits.sharpFail],
        ['sharpThree', limits.sharpThree],
      ] as const)
        if (band[field] < bounds[0] || band[field] > bounds[1])
          watches.push(`${band.chapter} ${field} ${band[field].toFixed(4)} outside ${bounds.join('-')}`);
    }
    for (const row of tiers.filter((entry) => entry.runs && ((first === 1 && last === 120) || process.env.GENERATOR_GATE_TIERS === '1'))) {
      const limits =
        row.label === 'first Hard'
          ? { casual: 0.4, fail: [0.18, 0.32], three: [0.25, 0.45] }
          : row.label === 'Hard 25+'
            ? { casual: 0.5, fail: [0.12, 0.45], three: [0.25, 0.45] }
            : { casual: 0.7, fail: [0.25, 0.6], three: [0.15, 0.35] };
      if (
        row.casualFail > limits.casual ||
        row.decentFail < limits.fail[0] ||
        row.decentFail > limits.fail[1] ||
        row.decentThree < limits.three[0] ||
        row.decentThree > limits.three[1]
      )
        failures.push(
          `${row.label}: casual fail ${row.casualFail.toFixed(4)}, decent fail ${row.decentFail.toFixed(4)}, decent 3★ ${row.decentThree.toFixed(4)}`,
        );
    }
    const report = {
      profile,
      first,
      last,
      runs,
      masters,
      slots,
      bands,
      tiers,
      byPlanet,
      failures,
      watches,
      seconds: (performance.now() - started) / 1000,
    };
    console.log(JSON.stringify({ profile, first, last, runs, bands, tiers, seconds: report.seconds }, null, 2));
    if (process.env.GENERATOR_REPORT) writeFileSync(process.env.GENERATOR_REPORT, JSON.stringify(report, null, 2) + '\n');
    expect(slots.length).toBe(
      Array.from({ length: last - first + 1 }, (_, i) => first + i).filter((n) => !tierFilter || difficultyOf(n) === tierFilter).length,
    );
    if (process.env.GENERATOR_GATE === '1') expect(failures, failures.join('\n')).toEqual([]);
    if (process.env.GENERATOR_SHARP_GATE === '1') expect(watches, watches.join('\n')).toEqual([]);
  },
  3_600_000,
);
