import { expect, it } from 'vitest';
import { makeLevel, rngFrom } from '../../src/core/levels';
import { lifeSparkSectors, previewStep, roundState, stepRound } from '../../src/core/round';
import { clonePlanet, settle } from '../../src/core/world';
import { KINDS, type Kind } from '../../src/core/world';
import { maxLabModifiers, NO_MODIFIERS } from '../../src/core/modifiers';
import { POLICIES, maxLegalLoadout, playLevel } from './harness';

if (process.env.SIM === '1') {
  it('gates all level-5 Labs with forms off on paired seeds; watches each perk and form', () => {
    const kinds = Object.keys(KINDS) as Kind[];
    const gateRuns = Number(process.env.GATE_RUNS ?? 16);
    const watchRuns = Number(process.env.PERK_RUNS ?? 1);
    const seeds = (process.env.LOADOUT_SEEDS ?? 'm10,m10b').split(',');
    const loadout = (lab: Partial<Record<Kind, number>>, forms: Partial<Record<Kind, boolean>> = {}) => ({
      mods: { ...NO_MODIFIERS, lab, forms },
      extraThrows: 0,
      lifeSpark: false,
    });
    const variants = kinds.flatMap((kind) =>
      [2, 3, 4, 5].map((level) => ({ label: `${kind} L${level}`, lab: { [kind]: level }, forms: {} })),
    );
    variants.push(...kinds.map((kind) => ({ label: `${kind} form`, lab: { [kind]: 5 }, forms: { [kind]: true } })));
    const allLabs = loadout(maxLabModifiers().lab, {});
    const violations: string[] = [];
    for (const policy of [POLICIES['decent-aware'], POLICIES.casual]) {
      const metrics = new Map<
        string,
        {
          normal3: number;
          hardFail: number;
          superFail: number;
          goalMiss: number;
          normalN: number;
          hardN: number;
          superN: number;
          goalN: number;
        }
      >();
      const add = (key: string, level: ReturnType<typeof makeLevel>, result: ReturnType<typeof playLevel>) => {
        let row = metrics.get(key);
        if (!row) {
          row = { normal3: 0, hardFail: 0, superFail: 0, goalMiss: 0, normalN: 0, hardN: 0, superN: 0, goalN: 0 };
          metrics.set(key, row);
        }
        if (level.difficulty === 'normal' && level.n <= 60) {
          row.normalN++;
          row.normal3 += Number(result.stars === 3);
        }
        if (level.difficulty === 'hard' && level.n >= 25) {
          row.hardN++;
          row.hardFail += Number(result.stars === 0);
        }
        if (level.difficulty === 'super') {
          row.superN++;
          row.superFail += Number(result.stars === 0);
        }
        if (level.goals.length) {
          row.goalN++;
          row.goalMiss += Number(!result.goalsMet);
        }
      };
      for (const seed of seeds)
        for (let n = 21; n <= 120; n++) {
          const level = makeLevel(n);
          const watchPlanet = n <= 60 || level.difficulty !== 'normal';
          for (let run = 0; run < Math.max(gateRuns, watchRuns); run++) {
            const paired = `${seed}-${n}-${run}`;
            if (run < gateRuns) {
              add('none', level, playLevel(level, policy, rngFrom(paired)));
              add('all L5 forms OFF', level, playLevel(level, policy, rngFrom(paired), undefined, undefined, 0, allLabs));
            }
            if (watchPlanet && run < watchRuns) {
              add('watch none', level, playLevel(level, policy, rngFrom(paired)));
              for (const variant of variants)
                add(
                  variant.label,
                  level,
                  playLevel(level, policy, rngFrom(paired), undefined, undefined, 0, loadout(variant.lab, variant.forms)),
                );
            }
          }
        }
      const base = metrics.get('none')!;
      const rate = (n: number, total: number) => (100 * n) / Math.max(1, total);
      const deltas = (row: typeof base, against: typeof base) => [
        rate(row.normal3 - against.normal3, against.normalN),
        rate(row.hardFail - against.hardFail, against.hardN),
        rate(row.superFail - against.superFail, against.superN),
        rate(row.goalMiss - against.goalMiss, against.goalN),
      ];
      console.log(
        `Labs-only-help ${policy.name} baseline: 3★ ${rate(base.normal3, base.normalN).toFixed(1)}%, Hard fail ${rate(base.hardFail, base.hardN).toFixed(1)}%, Super fail ${rate(base.superFail, base.superN).toFixed(1)}%, goals missed ${rate(base.goalMiss, base.goalN).toFixed(1)}%`,
      );
      console.log(
        `Gate ${policy.name} samples: normal ${base.normalN} (one run ${(100 / base.normalN).toFixed(3)}pt), Hard ${base.hardN} (one run ${(100 / base.hardN).toFixed(3)}pt), Super ${base.superN} (one run ${(100 / base.superN).toFixed(3)}pt), goals ${base.goalN} (one run ${(100 / base.goalN).toFixed(3)}pt); ${gateRuns} runs × ${seeds.length} seeds per planet`,
      );
      const all = metrics.get('all L5 forms OFF')!;
      const [all3, allHard, allSuper, allGoals] = deltas(all, base);
      console.log(
        `Gate ${policy.name} all L5 forms OFF: 3★ ${all3.toFixed(2)}pt, Hard fail ${allHard.toFixed(2)}pt, Super fail ${allSuper.toFixed(2)}pt, goal misses ${allGoals.toFixed(2)}pt`,
      );
      if (all3 < -1.5) violations.push(`${policy.name} all L5 normal 3★ ${all3.toFixed(2)}pt`);
      if (allHard > (policy.name === 'casual' ? 3 : 2)) violations.push(`${policy.name} all L5 Hard fail +${allHard.toFixed(2)}pt`);
      if (allGoals > 1) violations.push(`${policy.name} all L5 goal misses +${allGoals.toFixed(2)}pt`);
      const watchBase = metrics.get('watch none')!;
      console.log(
        `Watch ${policy.name} samples: normal ${watchBase.normalN}, Hard ${watchBase.hardN}, Super ${watchBase.superN}, goals ${watchBase.goalN}; ${watchRuns} runs × ${seeds.length} seeds per planet`,
      );
      for (const variant of variants) {
        const row = metrics.get(variant.label)!;
        const [d3, dh, ds, dg] = deltas(row, watchBase);
        console.log(
          `Watch ${policy.name} ${variant.label} (normal n=${row.normalN}, Hard n=${row.hardN}, Super n=${row.superN}, goals n=${row.goalN}): 3★ ${d3.toFixed(1)}pt, Hard fail ${dh.toFixed(1)}pt, Super fail ${ds.toFixed(1)}pt, goal misses ${dg.toFixed(2)}pt`,
        );
      }
    }
    expect(violations, 'decision 44 all-Labs paired gate').toEqual([]);
  }, 1_200_000);
  it('gates M10 max loadout relative to paired Sling on campaign seeds', () => {
    const runs = Number(process.env.LOADOUT_RUNS ?? (process.env.SIM_NIGHTLY === '1' ? 96 : 48));
    const seeds = (process.env.LOADOUT_SEEDS ?? 'm10').split(',');
    const counts = {
      normal: { base3: 0, max3: 0, full3: 0, total: 0 },
      hard: { baseFail: 0, maxFail: 0, total: 0 },
      super: { baseFail: 0, maxFail: 0, total: 0 },
    };
    let surprise = 0;
    for (const seed of seeds)
      for (let n = 21; n <= 60; n++) {
        const level = makeLevel(n);
        const max = maxLegalLoadout(level);
        const full = maxLegalLoadout(level, { retiringUpgrades: true });
        for (let i = 0; i < runs; i++) {
          const paired = `${seed}-${n}-${i}`;
          const base = playLevel(level, POLICIES['decent-aware'], rngFrom(paired));
          const boosted = playLevel(level, POLICIES['decent-aware'], rngFrom(paired), undefined, undefined, 0, max);
          if (level.difficulty === 'normal') {
            counts.normal.total++;
            counts.normal.base3 += Number(base.stars === 3);
            counts.normal.max3 += Number(boosted.stars === 3);
            counts.normal.full3 += Number(
              playLevel(level, POLICIES['decent-aware'], rngFrom(paired), undefined, undefined, 0, full).stars === 3,
            );
          } else if (level.difficulty === 'hard' && n >= 25) {
            counts.hard.total++;
            counts.hard.baseFail += Number(base.stars === 0);
            counts.hard.maxFail += Number(boosted.stars === 0);
          } else if (level.difficulty === 'super') {
            counts.super.total++;
            counts.super.baseFail += Number(base.stars === 0);
            counts.super.maxFail += Number(boosted.stars === 0);
          }
        }
      }
    // fx.ts uses previewStep for the aim badge and stepRound for land(), both with
    // scene.roundState() and scene.roundModifiers(). The two core entry points
    // intentionally share the same pure transition; this checks that contract.
    for (let n = 14; n <= 60; n++) {
      const level = makeLevel(n);
      if (!level.troubles.length) continue;
      const mods = maxLegalLoadout(level).mods;
      for (let run = 0; run < (process.env.SIM_NIGHTLY === '1' ? 4 : 2); run++) {
        const random = rngFrom(`m10-surprise-${n}-${run}`);
        const start = clonePlanet(level.start);
        for (const sector of lifeSparkSectors(level, start)) start.sectors[sector].life = Math.min(3, start.sectors[sector].life + 1);
        settle(start);
        let state = roundState(start, level.nova, level.troubles, level.difficulty !== 'normal');
        for (let turn = 0; turn < level.throws; turn++) {
          const action = { kind: level.queue[turn], sector: Math.floor(random() * 24) };
          const preview = previewStep(state, action, mods);
          const actual = stepRound(state, action, mods);
          if (JSON.stringify(preview.lost) !== JSON.stringify(actual.lost)) surprise++;
          state = actual.state;
        }
      }
    }
    const normal = counts.normal;
    const hard = counts.hard;
    const superHard = counts.super;
    const lift = (normal.max3 - normal.base3) / normal.total;
    const baseHardFail = hard.baseFail / hard.total;
    const maxHardFail = hard.maxFail / hard.total;
    const baseSuperFail = superHard.baseFail / superHard.total;
    const superFail = superHard.maxFail / superHard.total;
    console.log(
      `G5 relative to paired Sling normal 21-60 3★: base ${((100 * normal.base3) / normal.total).toFixed(1)}%, max ${((100 * normal.max3) / normal.total).toFixed(1)}%, lift ${(100 * lift).toFixed(1)} points (${normal.total} paired rounds)`,
    );
    console.log(
      `G6 relative to paired Sling Hard 25+ fail: base ${(100 * baseHardFail).toFixed(1)}%, max ${(100 * maxHardFail).toFixed(1)}% (${hard.total} paired rounds); Super base ${(100 * baseSuperFail).toFixed(1)}%, max ${(100 * superFail).toFixed(1)}% (${superHard.total} paired rounds)`,
    );
    console.log(`G7 surprise losses: ${surprise}`);
    console.log(
      `Watch full legal loadout: normal 3★ ${((100 * normal.full3) / normal.total).toFixed(1)}%; ${JSON.stringify(maxLegalLoadout(makeLevel(60), { retiringUpgrades: true }))}`,
    );
    expect(lift, 'G5 max loadout 3★ uplift vs paired Sling ≤15 points').toBeLessThanOrEqual(0.15);
    expect(hard.baseFail, 'G6 Hard relative gate needs paired Sling failures').toBeGreaterThan(0);
    expect(superHard.baseFail, 'G6 Super relative gate needs paired Sling failures').toBeGreaterThan(0);
    expect(maxHardFail, 'G6 Hard max fail ≥half paired Sling fail').toBeGreaterThanOrEqual(baseHardFail / 2);
    expect(superFail, 'G6 Super max fail ≥half paired Sling fail').toBeGreaterThanOrEqual(baseSuperFail / 2);
    expect(surprise, 'G7 surprise losses').toBe(0);
  }, 5_400_000);
}
