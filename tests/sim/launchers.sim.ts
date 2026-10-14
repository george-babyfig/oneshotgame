import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeLevel, rngFrom } from '../../src/core/levels';
import { NO_MODIFIERS } from '../../src/core/modifiers';
import { fly, flightParamsForLauncher } from '../../src/core/flight';
import { LAUNCHERS, LAUNCH_ROSTER, launcherAtTune, type LauncherId, type LauncherSelection } from '../../src/core/launchers';
import { PHONES, PULL_TO_SPEED, findPull, flightWorld, flyPull, seedPulls, seedHint, emptySkyState } from './flying';
import {
  PICK_RUNS,
  POLICIES,
  aimNoiseForSteps,
  bestLauncherFor,
  goodHere,
  maxLegalExtraThrows,
  maxLegalLoadout,
  playLevel,
} from './harness';
import { MOMENTUM_MAX, MOMENTUM_PERKS } from '../../src/meta/momentum';

const rate = (part: number, total: number) => (100 * part) / Math.max(1, total);
const cappedLift = (row: { total: number; campaignBase: number; campaignMax: number; max: number; maxSling: number; maxNoScope: number }) =>
  rate(row.campaignMax - row.campaignBase, row.total) +
  Math.max(0, rate(row.max - row.maxSling, row.total)) +
  Math.max(0, rate(row.max - row.maxNoScope, row.total));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};

if (process.env.SIM === '1') {
  it('includes Scope and never lets a worse launcher cancel other uplift', () => {
    expect(cappedLift({ total: 100, campaignBase: 20, campaignMax: 27, max: 30, maxSling: 32, maxNoScope: 28 })).toBe(9);
  });

  it('keeps the max-loadout throws tied to the game and Momentum values', () => {
    const shower = readFileSync('src/ui/game.ts', 'utf8').match(/opts\.boosters\.shower\s*\?\s*(\d+)\s*:\s*0/);
    expect(shower, 'read the live Comet Shower bonus').not.toBeNull();
    expect(maxLegalExtraThrows()).toBe(Number(shower?.[1]) + MOMENTUM_PERKS[MOMENTUM_MAX].throws);
  });
  it('bounds the unvalidated visible-line precision hypothesis', () => {
    expect(aimNoiseForSteps(28)).toBe(1);
    expect(aimNoiseForSteps(90)).toBeGreaterThanOrEqual(0.8);
    expect(aimNoiseForSteps(16)).toBeLessThanOrEqual(1.1);
    console.log(`Aim noise: 16 steps ${aimNoiseForSteps(16).toFixed(4)}×; 28 steps 1×; 90 steps ${aimNoiseForSteps(90).toFixed(4)}×`);
  });

  if (process.env.LAUNCHER_PRECISION_DIAGNOSTIC === '1')
    it('diagnoses how much max loadout gains from the 90-step assists', () => {
      const started = performance.now();
      const runs = Number(process.env.LAUNCHER_DIAGNOSTIC_RUNS ?? 8);
      const counts = { total: 0, sling: 0, full: 0, noAim: 0, scopeOnly: 0 };
      for (let n = 21; n <= 60; n++) {
        const level = makeLevel(n);
        if (level.difficulty !== 'normal') continue;
        const max = maxLegalLoadout(level);
        const noAim = {
          ...max,
          mods: { ...max.mods, scopeLevel: 0, boosters: { ...max.mods.boosters, scope: false } },
        };
        const scopeOnly = {
          mods: { ...NO_MODIFIERS, boosters: { ...NO_MODIFIERS.boosters, scope: true } },
          extraThrows: 0,
          lifeSpark: false,
        };
        for (let run = 0; run < runs; run++) {
          const seed = `launcher-paired:${n}:${run}`;
          const flight = { phone: PHONES[0], timed: true };
          counts.total++;
          counts.sling += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight).stars === 3);
          counts.full += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, max).stars === 3);
          counts.noAim += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, noAim).stars === 3);
          counts.scopeOnly += Number(
            playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, scopeOnly).stars === 3,
          );
        }
      }
      console.log(
        `90-step diagnostic ${counts.total} paired normal rounds: Sling ${rate(counts.sling, counts.total).toFixed(2)}%; full max ${rate(counts.full, counts.total).toFixed(2)}%; max without 90-step assists ${rate(counts.noAim, counts.total).toFixed(2)}%; 90-step scope in otherwise Sling loadout ${rate(counts.scopeOnly, counts.total).toFixed(2)}%; max-assist contribution ${rate(counts.full - counts.noAim, counts.total).toFixed(2)}pt; ${((performance.now() - started) / 1000).toFixed(1)}s`,
      );
    }, 1_200_000);

  if (process.env.LAUNCHER_MAX_ABLATION === '1')
    it('separates launcher contribution from the rest of max legal loadout', () => {
      const started = performance.now();
      const runs = Number(process.env.LAUNCHER_RUNS ?? 32);
      const counts = { total: 0, sling: 0, max: 0, maxWithSling: 0 };
      for (let n = 21; n <= 60; n++) {
        const level = makeLevel(n);
        if (level.difficulty !== 'normal') continue;
        const max = maxLegalLoadout(level);
        const maxWithSling = { ...max, mods: { ...max.mods, launcher: NO_MODIFIERS.launcher } };
        for (let run = 0; run < runs; run++) {
          const seed = `launcher-paired:${n}:${run}`;
          const flight = { phone: PHONES[0], timed: true };
          counts.total++;
          counts.sling += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight).stars === 3);
          counts.max += Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, max).stars === 3);
          counts.maxWithSling += Number(
            playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, maxWithSling).stars === 3,
          );
        }
      }
      console.log(
        `Max launcher ablation ${counts.total} paired normal rounds: Sling ${rate(counts.sling, counts.total).toFixed(2)}%, selected max ${rate(counts.max, counts.total).toFixed(2)}%, max with Sling ${rate(counts.maxWithSling, counts.total).toFixed(2)}%; selected launcher contribution ${rate(counts.max - counts.maxWithSling, counts.total).toFixed(2)}pt; non-launcher uplift ${rate(counts.maxWithSling - counts.sling, counts.total).toFixed(2)}pt; ${((performance.now() - started) / 1000).toFixed(1)}s`,
      );
    }, 1_200_000);

  it('gates relative-to-paired-Sling best launcher and max loadout on 21-60', () => {
    const started = performance.now();
    const runs = Number(process.env.LAUNCHER_RUNS ?? 32);
    if (runs < 32 || runs % 2)
      throw Error('Relative launcher uplift gate needs at least 16 paired runs per planet on each of two master seeds');
    // maxSling: the same max loadout flown with the Star Sling (isolates the max-tuned launcher);
    // campaignBase/campaignMax: the same seeds on the campaign aim model, where §7.5's bands live (decision 28).
    const counts = { total: 0, sling: 0, best: 0, max: 0, maxSling: 0, maxNoScope: 0, campaignBase: 0, campaignMax: 0 };
    const seedCounts = [0, 1].map(() => ({
      total: 0,
      sling: 0,
      best: 0,
      max: 0,
      maxSling: 0,
      maxNoScope: 0,
      campaignBase: 0,
      campaignMax: 0,
    }));
    const maxChoices = Object.fromEntries(LAUNCH_ROSTER.map((id) => [id, 0])) as Record<LauncherId, number>;
    const hard = { total: 0, slingFail: 0, maxFail: 0 };
    const seedHard = [0, 1].map(() => ({ total: 0, slingFail: 0, maxFail: 0 }));
    const superHard = { total: 0, slingFail: 0, maxFail: 0 };
    const seedSuperHard = [0, 1].map(() => ({ total: 0, slingFail: 0, maxFail: 0 }));
    for (let n = 21; n <= 60; n++) {
      const level = makeLevel(n);
      const maxBySeed = [maxLegalLoadout(level, { masterSeed: 'pick-max-a' }), maxLegalLoadout(level, { masterSeed: 'pick-max-b' })];
      for (const max of maxBySeed) {
        // Decision 35 gates boosters and Momentum (Comet Shower +3, Momentum ×3 +2); the Extra Throws upgrade retired in M11.
        expect(max.extraThrows, 'decision 35 gated loadout: Comet Shower and Momentum throws only').toBe(maxLegalExtraThrows());
        expect(max.mods.extraThrows, 'retired Extra Throws upgrade').toBe(0);
      }
      for (const max of maxBySeed) maxChoices[max.mods.launcher.id]++;
      for (let run = 0; run < runs; run++) {
        const seed = `launcher-paired-${run % 2 ? 'b' : 'a'}:${n}:${Math.floor(run / 2)}`;
        const max = maxBySeed[run % 2];
        const flight = { phone: PHONES[0], timed: true };
        const sling = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight);
        const boosted = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, max);
        if (level.difficulty === 'normal') {
          const best = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, undefined, {
            id: bestLauncherFor(level, run % 2 ? 'pick-b' : 'pick-a'),
            tune: 1,
          });
          const maxSling = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, {
            ...max,
            mods: { ...max.mods, launcher: NO_MODIFIERS.launcher },
          });
          const maxNoScope = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, {
            ...max,
            mods: { ...max.mods, scopeLevel: 0, boosters: { ...max.mods.boosters, scope: false } },
          });
          const campaignBase = playLevel(level, POLICIES['decent-aware'], rngFrom(seed));
          const campaignMax = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, undefined, 0, max);
          for (const row of [counts, seedCounts[run % 2]]) {
            row.total++;
            row.sling += Number(sling.stars === 3);
            row.best += Number(best.stars === 3);
            row.max += Number(boosted.stars === 3);
            row.maxSling += Number(maxSling.stars === 3);
            row.maxNoScope += Number(maxNoScope.stars === 3);
            row.campaignBase += Number(campaignBase.stars === 3);
            row.campaignMax += Number(campaignMax.stars === 3);
          }
        } else if (level.difficulty === 'hard' && n >= 25) {
          hard.total++;
          hard.slingFail += Number(sling.stars === 0);
          hard.maxFail += Number(boosted.stars === 0);
          seedHard[run % 2].total++;
          seedHard[run % 2].slingFail += Number(sling.stars === 0);
          seedHard[run % 2].maxFail += Number(boosted.stars === 0);
        } else if (level.difficulty === 'super') {
          superHard.total++;
          superHard.slingFail += Number(sling.stars === 0);
          superHard.maxFail += Number(boosted.stars === 0);
          seedSuperHard[run % 2].total++;
          seedSuperHard[run % 2].slingFail += Number(sling.stars === 0);
          seedSuperHard[run % 2].maxFail += Number(boosted.stars === 0);
        }
      }
    }
    const lift = rate(counts.best - counts.sling, counts.total);
    const maxLift = rate(counts.max - counts.sling, counts.total);
    const launcherInMax = Math.max(0, rate(counts.max - counts.maxSling, counts.total));
    const scopeInMax = Math.max(0, rate(counts.max - counts.maxNoScope, counts.total));
    const campaignLift = rate(counts.campaignMax - counts.campaignBase, counts.total);
    const capped = cappedLift(counts);
    console.log(
      `Relative to paired Sling, normal 21-60: Sling ${rate(counts.sling, counts.total).toFixed(2)}%, best ${rate(counts.best, counts.total).toFixed(2)}%, uplift ${lift.toFixed(2)}pt, max ${rate(counts.max, counts.total).toFixed(2)}%, max uplift ${maxLift.toFixed(2)}pt; ${counts.total} paired rounds; ${((performance.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(
      `Relative to paired Sling, Hard 25+ fail: Sling ${rate(hard.slingFail, hard.total).toFixed(2)}%, max ${rate(hard.maxFail, hard.total).toFixed(2)}% (${hard.total} paired rounds); Super Hard Sling ${rate(superHard.slingFail, superHard.total).toFixed(2)}%, max ${rate(superHard.maxFail, superHard.total).toFixed(2)}% (${superHard.total} paired rounds)`,
    );
    console.log(
      `Decision 54 max-loadout cap: campaign-model loadout uplift ${campaignLift.toFixed(2)}pt (${rate(counts.campaignBase, counts.total).toFixed(2)}% → ${rate(counts.campaignMax, counts.total).toFixed(2)}%) + real-flight max-tuned launcher inside the max loadout ${launcherInMax.toFixed(2)}pt + Scope ${scopeInMax.toFixed(2)}pt = ${capped.toFixed(2)}pt (cap 15); Watch real-flight total ${maxLift.toFixed(2)}pt on a ${rate(counts.sling, counts.total).toFixed(2)}% Sling base`,
    );
    console.log(`Max-loadout chosen launcher by planet: ${JSON.stringify(maxChoices)}`);
    console.log('Physical-flight absolute rates above are context; chapter bands use the campaign aim model.');
    const seedMetrics: {
      label: string;
      bestLift: number;
      maxLift: number;
      capped: number;
      hardFail: number;
      slingHardFail: number;
      superFail: number;
      slingSuperFail: number;
    }[] = [];
    for (let arm = 0; arm < 2; arm++) {
      const row = seedCounts[arm];
      const h = seedHard[arm];
      const sh = seedSuperHard[arm];
      const label = arm ? 'b' : 'a';
      const bestLift = rate(row.best - row.sling, row.total);
      const maxLift = rate(row.max - row.sling, row.total);
      const seedCapped = cappedLift(row);
      const hardFail = rate(h.maxFail, h.total);
      const superFail = rate(sh.maxFail, sh.total);
      console.log(
        `Paired master ${label}: best +${bestLift.toFixed(2)}pt, decision 54 capped max +${seedCapped.toFixed(2)}pt, real-flight max Watch +${maxLift.toFixed(2)}pt (${row.total} normal pairs); Hard fail ${hardFail.toFixed(2)}% vs Sling ${rate(h.slingFail, h.total).toFixed(2)}% (${h.total}); Super Hard fail ${superFail.toFixed(2)}% vs Sling ${rate(sh.slingFail, sh.total).toFixed(2)}% (${sh.total})`,
      );
      seedMetrics.push({
        label,
        bestLift,
        maxLift,
        capped: seedCapped,
        hardFail,
        slingHardFail: rate(h.slingFail, h.total),
        superFail,
        slingSuperFail: rate(sh.slingFail, sh.total),
      });
    }
    for (const row of seedMetrics) {
      console.log(`Watch master ${row.label} best-launcher uplift: +${row.bestLift.toFixed(2)}pt`);
      // Decision 54: the +15 cap is gated on the pooled 896 pairs below. One seed's 448 pairs swing several points
      // (the launcher share alone ran +2.68 vs −0.22), so each seed's composite is a Watch.
      console.log(`Watch master ${row.label} decision 54 composite: +${row.capped.toFixed(2)}pt (cap 15 is gated pooled)`);
      expect(row.hardFail, `master ${row.label} Hard fail ≥6%`).toBeGreaterThanOrEqual(6);
      expect(row.hardFail, `master ${row.label} Hard fail ≥half Sling`).toBeGreaterThanOrEqual(row.slingHardFail / 2);
      expect(row.superFail, `master ${row.label} Super Hard fail ≥15%`).toBeGreaterThanOrEqual(15);
      expect(row.superFail, `master ${row.label} Super Hard fail ≥half Sling`).toBeGreaterThanOrEqual(row.slingSuperFail / 2);
    }
    expect(lift, 'best launcher 3★ uplift vs paired Sling +0.5 to +6 points').toBeGreaterThanOrEqual(0.5);
    expect(lift, 'best launcher 3★ uplift vs paired Sling +2 to +6 points').toBeLessThanOrEqual(6);
    expect(capped, 'decision 54 max legal loadout 3★ uplift ≤15 points').toBeLessThanOrEqual(15);
    expect(hard.slingFail, 'Hard paired Sling failures needed for relative gate').toBeGreaterThan(0);
    expect(superHard.slingFail, 'Super Hard paired Sling failures needed for relative gate').toBeGreaterThan(0);
    expect(rate(hard.maxFail, hard.total), 'Hard max fail ≥half paired Sling fail').toBeGreaterThanOrEqual(
      rate(hard.slingFail, hard.total) / 2,
    );
    expect(rate(hard.maxFail, hard.total), 'decision 34 Hard max fail ≥6%').toBeGreaterThanOrEqual(6);
    expect(rate(superHard.maxFail, superHard.total), 'Super Hard max fail ≥half paired Sling fail').toBeGreaterThanOrEqual(
      rate(superHard.slingFail, superHard.total) / 2,
    );
    expect(rate(superHard.maxFail, superHard.total), 'decision 34 Super Hard max fail ≥15%').toBeGreaterThanOrEqual(15);
  }, 5_400_000);

  it('gates each post-debut pick share and prints the Sling tester-use watch', () => {
    const counts = [0, 1].map(
      () =>
        Object.fromEntries(LAUNCH_ROSTER.map((id) => [id, { picked: 0, available: 0 }])) as Record<
          LauncherId,
          { picked: number; available: number }
        >,
    );
    const lateSling = [0, 0];
    let stable = 0;
    const pickedPlanets = [0, 1].map(
      () => Object.fromEntries(LAUNCH_ROSTER.map((id) => [id, [] as number[]])) as Record<LauncherId, number[]>,
    );
    const started = performance.now();
    for (let n = 31; n <= 120; n++) {
      const level = makeLevel(n);
      const picks = [bestLauncherFor(level), bestLauncherFor(level, 'pick-b')];
      stable += Number(picks[0] === picks[1]);
      for (let arm = 0; arm < 2; arm++) {
        const pick = picks[arm];
        counts[arm][pick].picked++;
        pickedPlanets[arm][pick].push(n);
        for (const id of LAUNCH_ROSTER) if (LAUNCHERS[id].debut <= n) counts[arm][id].available++;
        if (n >= 62 && pick === 'sling') lateSling[arm]++;
      }
      if (n % 10 === 0)
        console.log(
          `Launcher pick sweep through P${n}: 2 master seeds × ${PICK_RUNS} runs/candidate; ${((performance.now() - started) / 1000).toFixed(1)}s`,
        );
    }
    const shares = counts.map(
      (arm) => Object.fromEntries(LAUNCH_ROSTER.map((id) => [id, rate(arm[id].picked, arm[id].available)])) as Record<LauncherId, number>,
    );
    for (let arm = 0; arm < 2; arm++) {
      for (const id of LAUNCH_ROSTER) {
        const share = shares[arm][id];
        console.log(
          `${id === 'sling' ? 'Watch Sling' : 'Launcher'} pick share seed ${arm ? 'b' : 'a'} ${id}: ${counts[arm][id].picked}/${counts[arm][id].available} = ${share.toFixed(1)}%`,
        );
        console.log(`Launcher pick planets seed ${arm ? 'b' : 'a'} ${id}: ${pickedPlanets[arm][id].join(', ') || 'none'}`);
      }
      console.log(
        `Watch Sling bot pick after planet 62 seed ${arm ? 'b' : 'a'}: ${lateSling[arm]}/59 = ${rate(lateSling[arm], 59).toFixed(1)}% (proxy for 20-60% tester-use target)`,
      );
    }
    console.log(
      `Pick stability across two independent master seeds: ${stable}/90 planets = ${rate(stable, 90).toFixed(1)}%; ${PICK_RUNS} runs/candidate/seed; ${((performance.now() - started) / 1000).toFixed(1)}s`,
    );
    const outside = [0, 1].flatMap((arm) =>
      LAUNCH_ROSTER.filter((id) => id !== 'sling' && (shares[arm][id] < 8 || shares[arm][id] > 35)).map(
        (id) => `${arm ? 'b' : 'a'} ${id} ${shares[arm][id].toFixed(1)}%`,
      ),
    );
    expect(outside, 'each shipped non-Sling launcher pick share 8-35% after debut on both master seeds').toEqual([]);
  }, 6_000_000);

  it('gates unit fly-vs-preview sector agreement per launcher and best-launcher round time', () => {
    const started = performance.now();
    const selections: LauncherSelection[] = [...LAUNCH_ROSTER.map((id): LauncherSelection => ({ id, tune: 1 })), { id: 'zip', tune: 4 }];
    for (const selection of selections) {
      const id = selection.id;
      let same = 0;
      let total = 0;
      const level = makeLevel(Math.max(31, LAUNCHERS[id].debut));
      const { world, launch } = flightWorld(level, level.start, emptySkyState(), PHONES[0], 0);
      const hints = seedPulls(`scene-bot:${level.seed}`, launch, world, selection);
      for (let sector = 0; sector < 24; sector++) {
        total++;
        const pull = findPull(sector, 0, launch, world, seedHint(hints, sector, world), false, selection);
        if (!pull) continue;
        const predicted = flyPull(pull, 0, launch, world, selection);
        const speed = launcherAtTune(selection.id, selection.tune).maxPull * PULL_TO_SPEED * pull.power;
        let state = { ...launch, vx: Math.cos(pull.angle) * speed, vy: Math.sin(pull.angle) * speed, elapsed: 0 };
        let actual: ReturnType<typeof fly> | null = null;
        for (let frame = 0; frame < 300; frame++) {
          actual = fly(flightParamsForLauncher(selection), state, world, 0, 1 / 60);
          state = actual.state;
          if (actual.hit) break;
        }
        same += Number(actual?.sector === predicted.sector);
      }
      console.log(`Unit fly-vs-preview ${id} Tune ${selection.tune}: ${same}/${total} = ${rate(same, total).toFixed(1)}%`);
      expect(rate(same, total), `${id} Tune ${selection.tune} unit fly-vs-preview agreement ≥95%`).toBeGreaterThanOrEqual(95);
    }
    const times: number[] = [];
    for (let n = 21; n <= 60; n++) {
      const level = makeLevel(n);
      if (level.difficulty !== 'normal') continue;
      const result = playLevel(level, POLICIES['best-launcher'], rngFrom(`launcher-duration:${n}`), undefined, {
        phone: PHONES[0],
        timed: true,
      });
      if (result.flight) times.push(result.flight.roundTime);
    }
    const duration = median(times);
    console.log(
      `Best launcher normal 21-60 median round ${duration.toFixed(1)}s (${times.length} rounds); ${((performance.now() - started) / 1000).toFixed(1)}s`,
    );
    expect(duration, 'round median ≥60s').toBeGreaterThanOrEqual(60);
    expect(duration, 'round median ≤100s').toBeLessThanOrEqual(100);
  }, 1_200_000);

  it("gates decision 44 relative-to-paired-Sling never-hurts on each launcher's Good here planets", () => {
    const started = performance.now();
    const runs = Number(process.env.LAUNCHER_HURT_RUNS ?? 24);
    if (runs < 12) throw Error('Never-hurts needs at least 12 paired runs per planet');
    const tolerance = (pairs: number[], floor: number) => {
      const n = pairs.length;
      if (!n) return Infinity;
      const mean = pairs.reduce((sum, value) => sum + value, 0) / n;
      const variance = pairs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, n - 1);
      // Two paired standard errors, with a floor wider than one run's weight.
      return Math.max(floor, 1.96 * 100 * Math.sqrt(variance / n), 200 / n + 0.01);
    };
    for (const id of LAUNCH_ROSTER.filter((id) => id !== 'sling')) {
      const levels = Array.from({ length: 121 - LAUNCHERS[id].debut }, (_, index) => makeLevel(LAUNCHERS[id].debut + index)).filter(
        (level) => goodHere(level, id),
      );
      const counts = { n: 0, base3: 0, chosen3: 0, hard: 0, baseFail: 0, chosenFail: 0, goals: 0, baseMiss: 0, chosenMiss: 0 };
      const diffs = { three: [] as number[], fail: [] as number[], miss: [] as number[] };
      for (const level of levels)
        for (let run = 0; run < runs; run++) {
          const seed = `never-hurts-${run % 2 ? 'b' : 'a'}:${id}:${level.n}:${Math.floor(run / 2)}`;
          const flight = { phone: PHONES[0], timed: true };
          const base = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight);
          const chosen = playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, undefined, { id, tune: 1 });
          counts.n++;
          if (level.difficulty === 'normal') {
            counts.base3 += Number(base.stars === 3);
            counts.chosen3 += Number(chosen.stars === 3);
            diffs.three.push(Number(chosen.stars === 3) - Number(base.stars === 3));
          }
          if (level.difficulty !== 'normal') {
            counts.hard++;
            counts.baseFail += Number(base.stars === 0);
            counts.chosenFail += Number(chosen.stars === 0);
            diffs.fail.push(Number(chosen.stars === 0) - Number(base.stars === 0));
          }
          if (level.goals.length) {
            counts.goals++;
            counts.baseMiss += Number(!base.goalsMet);
            counts.chosenMiss += Number(!chosen.goalsMet);
            diffs.miss.push(Number(!chosen.goalsMet) - Number(!base.goalsMet));
          }
        }
      const delta3 = rate(counts.chosen3 - counts.base3, diffs.three.length);
      const deltaFail = rate(counts.chosenFail - counts.baseFail, counts.hard);
      const deltaMiss = rate(counts.chosenMiss - counts.baseMiss, counts.goals);
      const noise3 = tolerance(diffs.three, 3);
      const noiseFail = tolerance(diffs.fail, 5);
      const noiseGoal = tolerance(diffs.miss, 3);
      console.log(
        `Never hurts ${id} vs paired Sling (${levels.length} Good here planets × ${runs}; normal ${diffs.three.length}, Hard ${counts.hard}, goals ${counts.goals} paired runs): 3★ Sling ${rate(counts.base3, diffs.three.length).toFixed(2)}% / launcher ${rate(counts.chosen3, diffs.three.length).toFixed(2)}%, Δ${delta3.toFixed(2)}pt (floor -${Number.isFinite(noise3) ? noise3.toFixed(2) : 'no normal rounds'}); Hard fail Sling ${rate(counts.baseFail, counts.hard).toFixed(2)}% / launcher ${rate(counts.chosenFail, counts.hard).toFixed(2)}%, Δ${deltaFail.toFixed(2)}pt (ceiling +${Number.isFinite(noiseFail) ? noiseFail.toFixed(2) : 'no Hard rounds'}); goal misses Sling ${rate(counts.baseMiss, counts.goals).toFixed(2)}% / launcher ${rate(counts.chosenMiss, counts.goals).toFixed(2)}%, Δ${deltaMiss.toFixed(2)}pt (ceiling +${Number.isFinite(noiseGoal) ? noiseGoal.toFixed(2) : 'no goal rounds'})`,
      );
      if (diffs.three.length) expect(delta3, `${id} Good here normal 3★ vs paired Sling`).toBeGreaterThanOrEqual(-noise3);
      if (counts.hard) expect(deltaFail, `${id} Good here Hard fail vs paired Sling`).toBeLessThanOrEqual(noiseFail);
      if (counts.goals) expect(deltaMiss, `${id} Good here goal misses vs paired Sling`).toBeLessThanOrEqual(noiseGoal);
      const other = Array.from({ length: 121 - LAUNCHERS[id].debut }, (_, index) => makeLevel(LAUNCHERS[id].debut + index)).filter(
        (level) => !goodHere(level, id),
      );
      let watch = 0;
      let watchN = 0;
      for (const level of other) {
        if (level.difficulty !== 'normal') continue;
        const seed = `launcher-watch:${id}:${level.n}`;
        const flight = { phone: PHONES[0], timed: true };
        watch += Number(
          playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight, 0, undefined, { id, tune: 1 }).stars === 3,
        );
        watch -= Number(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), undefined, flight).stars === 3);
        watchN++;
      }
      console.log(`Watch ${id} other normal planets: 3★ ${rate(watch, watchN).toFixed(2)}pt (${watchN} paired rounds; not a gate)`);
    }
    console.log(`Decision 44 paired launcher run time ${((performance.now() - started) / 1000).toFixed(1)}s`);
  }, 1_200_000);
}
