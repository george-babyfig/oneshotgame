import { expect, it } from 'vitest';
import { makeLevel, rngFrom } from '../../src/core/levels';
import { clonePlanet, lifeScore, settle } from '../../src/core/world';
import { lifeSparkSectors } from '../../src/core/round';
import { POLICIES, playLevel, type BotPolicy } from './harness';

if (process.env.SIM === '1') {
  it('measures blind, aware and max-loadout Trouble cost on identical deals', () => {
    const nightly = process.env.SIM_NIGHTLY === '1';
    const teaching = [14, 25, 28, 36, 49, 59];
    const planets = nightly ? Array.from({ length: 47 }, (_, i) => i + 14).filter((n) => makeLevel(n).troubles.length > 0) : teaching;
    const runs = Number(process.env.TROUBLE_RUNS ?? (nightly ? 32 : 16));
    const maxPolicy: BotPolicy = { ...POLICIES['decent-blind'], name: 'decent-blind-max', labLevel: 5 };
    const gated: Record<string, number[]> = { blind: [], aware: [], max: [] };
    const survey: Record<string, number[]> = { blind: [], aware: [], max: [] };
    const other: Record<string, number[]> = { blind: [], aware: [], max: [] };
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    if (nightly) console.log('Trouble cost watch (all Trouble planets, not gating): planet | Trouble | blind | aware | max loadout');
    for (const n of planets) {
      const level = makeLevel(n);
      const quiet = { ...level, troubles: [] };
      const base = lifeScore(level.start);
      const boostedStart = clonePlanet(level.start);
      for (const sector of lifeSparkSectors(level, boostedStart))
        boostedStart.sectors[sector].life = Math.min(3, boostedStart.sectors[sector].life + 1);
      settle(boostedStart);
      // Spark is a shared pre-round gift, not gain earned during either paired
      // round. Its score must not dilute the measured Trouble loss.
      const maxBase = lifeScore(boostedStart);
      const perPlanet: Record<string, number[]> = { blind: [], aware: [], max: [] };
      for (let run = 0; run < runs; run++) {
        for (const [name, policy, max] of [
          ['blind', POLICIES['decent-blind'], false],
          ['aware', POLICIES['decent-aware'], false],
          ['max', maxPolicy, true],
        ] as const) {
          const seed = `${level.seed}-cost-${name}-${run}`;
          const withTrouble = playLevel(level, policy, rngFrom(seed), undefined, undefined, 0, max);
          const without = playLevel(quiet, policy, rngFrom(seed), undefined, undefined, 0, max);
          const cost = (without.score - withTrouble.score) / Math.max(1, without.score - (max ? maxBase : base));
          perPlanet[name].push(cost);
          survey[name].push(cost);
          if (teaching.includes(n)) gated[name].push(cost);
          else other[name].push(cost);
        }
      }
      console.log(
        `${nightly ? 'Trouble cost watch (all Trouble planets, not gating)' : 'Trouble teaching'}: ${n} | ${level.troubles.map((trouble) => trouble.id).join('+')} | ${['blind', 'aware', 'max'].map((name) => `${(mean(perPlanet[name]) * 100).toFixed(1)}%`).join(' | ')}`,
      );
    }
    const result = { blind: mean(gated.blind), aware: mean(gated.aware), max: mean(gated.max) };
    console.log(
      `Trouble teaching gate (${teaching.length} planets × ${runs} paired runs): blind ${(result.blind * 100).toFixed(1)}%, aware ${(result.aware * 100).toFixed(1)}%, max loadout ${(result.max * 100).toFixed(1)}%`,
    );
    if (nightly)
      console.log(
        `Trouble cost watch (all Trouble planets, not gating; ${planets.length} planets × ${runs} paired runs): blind ${(mean(survey.blind) * 100).toFixed(1)}%, aware ${(mean(survey.aware) * 100).toFixed(1)}%, max loadout ${(mean(survey.max) * 100).toFixed(1)}%`,
      );
    if (nightly)
      console.log(
        `Trouble cost watch (other ${planets.length - teaching.length} planets, not gating): blind ${(mean(other.blind) * 100).toFixed(1)}%, aware ${(mean(other.aware) * 100).toFixed(1)}%, max loadout ${(mean(other.max) * 100).toFixed(1)}%`,
      );
    expect(result.blind, 'blind Trouble cost ≥5%').toBeGreaterThanOrEqual(0.05);
    expect(result.aware, 'aware Trouble cost ≤8%').toBeLessThanOrEqual(0.08);
    expect(result.max, 'blind max-loadout Trouble cost ≥3%').toBeGreaterThanOrEqual(0.03);
  }, 600_000); // slower CI runners
}
