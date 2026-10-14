import { describe, expect, it } from 'vitest';
import { LAUNCHERS, LAUNCHER_IDS, LAUNCH_ROSTER, launcherAtTune, launcherReach, skipperLosesPower } from '../src/core/launchers';
import { modifiersFor, NO_MODIFIERS } from '../src/core/modifiers';
import { flightParamsForLauncher } from '../src/core/flight';
import { roundState, rulesForLevel, stepRound } from '../src/core/round';
import { newPlanet, settle } from '../src/core/world';

const expected = {
  sling: [1, 1, 28, 0, 1],
  swoop: [0.92, 1.35, 28, 0, 31],
  sparkler: [1, 1, 28, 0, 37],
  zip: [1.22, 0.8, 28, 0, 43],
  thumper: [0.9, 1.15, 16, 1, 48],
  pinpoint: [1, 1, 90, -1, 53],
  skipper: [1, 1, 28, 0, 62],
};

describe('launcher data', () => {
  it('has the contracted roster and bounded stats', () => {
    expect(LAUNCHER_IDS).toEqual(Object.keys(expected));
    expect(LAUNCH_ROSTER).toEqual(['sling', 'swoop', 'zip', 'thumper']);
    for (const id of LAUNCHER_IDS) {
      const def = LAUNCHERS[id];
      expect([def.speedMultiplier, def.curveMultiplier, def.aimSteps, def.reachDelta, def.debut]).toEqual(expected[id]);
      expect(def.speedMultiplier).toBeGreaterThanOrEqual(0.85);
      expect(def.speedMultiplier).toBeLessThanOrEqual(1.25);
      expect(def.curveMultiplier).toBeGreaterThanOrEqual(0.8);
      expect(def.curveMultiplier).toBeLessThanOrEqual(1.4);
      expect(def.emblem).toBeTruthy();
      expect(def.bandColor).toBeTruthy();
      for (const tune of [1, 2, 3, 4] as const) expect(launcherAtTune(id, tune).maxPull).toBeLessThanOrEqual(150);
    }
  });

  it('resolves drawback-only tunes without mutating definitions', () => {
    expect([1, 2, 3, 4].map((tune) => launcherAtTune('swoop', tune as 1 | 2 | 3 | 4).speedMultiplier)).toEqual([0.92, 0.94, 0.96, 0.98]);
    expect([1, 2, 3, 4].map((tune) => launcherAtTune('thumper', tune as 1 | 2 | 3 | 4).aimSteps)).toEqual([16, 19, 21, 23]);
    expect([1, 2, 3, 4].map((tune) => launcherAtTune('zip', tune as 1 | 2 | 3 | 4).maxPull)).toEqual([150, 150, 145, 140]);
    expect(launcherAtTune('zip', 2).overPullTip).toBe(true);
    expect(LAUNCHERS.swoop.speedMultiplier).toBe(0.92);
    expect(LAUNCHERS.thumper.aimSteps).toBe(16);
  });

  it('keeps Sparkler, Thumper and Skipper flight identical at every tune for the shared reach sweep', () => {
    for (const id of ['sparkler', 'thumper', 'skipper'] as const) {
      const base = flightParamsForLauncher({ id, tune: 1 });
      for (const tune of [2, 3, 4] as const) {
        expect(flightParamsForLauncher({ id, tune })).toEqual(base);
        expect(launcherAtTune(id, tune).maxPull).toBe(launcherAtTune(id, 1).maxPull);
      }
    }
  });

  it('applies Pinpoint and Skipper tune exceptions', () => {
    expect([1, 2, 3, 4].map((tune) => launcherReach({ id: 'pinpoint', tune: tune as 1 | 2 | 3 | 4 }, 'storm'))).toEqual([-1, 0, 0, 0]);
    expect(launcherReach({ id: 'pinpoint', tune: 3 }, 'seed')).toBe(-1);
    expect(launcherReach({ id: 'pinpoint', tune: 4 }, 'seed')).toBe(0);
    expect(skipperLosesPower({ id: 'skipper', tune: 2 }, 'seed', 1)).toBe(false);
    expect(skipperLosesPower({ id: 'skipper', tune: 2 }, 'rock', 1)).toBe(true);
    expect(skipperLosesPower({ id: 'skipper', tune: 3 }, 'rock', 1)).toBe(false);
    expect(skipperLosesPower({ id: 'skipper', tune: 3 }, 'rock', 2)).toBe(true);
    expect(skipperLosesPower({ id: 'skipper', tune: 4 }, 'rock', 2)).toBe(false);
    expect(skipperLosesPower({ id: 'skipper', tune: 4 }, 'rock', 3)).toBe(true);
  });

  it('extends Sparkler Glacier Fusions by two sectors without exceeding reach four', () => {
    const planet = newPlanet((i) => (i === 5 ? { land: 4 } : {}));
    settle(planet);
    const state = roundState(planet);
    const rules = rulesForLevel(37);
    const sling = stepRound(state, { kind: 'ice', sector: 5 }, NO_MODIFIERS, rules);
    const sparkler = stepRound(state, { kind: 'ice', sector: 5 }, { ...NO_MODIFIERS, launcher: { id: 'sparkler', tune: 1 } }, rules);
    const tuned = stepRound(state, { kind: 'ice', sector: 5 }, { ...NO_MODIFIERS, launcher: { id: 'sparkler', tune: 4 } }, rules);
    expect(sling.reactions[0]?.id).toBe('glacier');
    expect(sling.reactions[0].sectors).toHaveLength(3);
    expect(sparkler.reactions[0].sectors).toHaveLength(7);
    expect(tuned.reactions[0].sectors).toEqual(sparkler.reactions[0].sectors);
  });

  it('forces the untuned Sling in shared modes', () => {
    expect(NO_MODIFIERS.launcher).toEqual({ id: 'sling', tune: 1 });
    for (const mode of ['daily', 'rush', 'challenge', 'remix'] as const)
      expect(modifiersFor(mode, { launcher: { id: 'zip', tune: 4 } }).launcher).toEqual(NO_MODIFIERS.launcher);
    for (const mode of ['campaign', 'voyage', 'zen'] as const)
      expect(modifiersFor(mode, { launcher: { id: 'zip', tune: 4 } }).launcher).toEqual({ id: 'zip', tune: 4 });
    expect(modifiersFor('campaign', { launcher: { id: 'skipper', tune: 4 } }).launcher).toEqual(NO_MODIFIERS.launcher);
  });
});
