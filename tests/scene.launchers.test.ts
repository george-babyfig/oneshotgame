import { describe, expect, it } from 'vitest';
import { newPlanet, SPECIES_BY_ID } from '../src/core/world';
import { roundState as initialState, serializeRound, restoreRound, stepRound, type RoundState } from '../src/core/round';
import { carryLauncherRoundState, roundState as sceneRoundState } from '../src/ui/fx';
import type { LevelScene } from '../src/ui/game';
import { NO_MODIFIERS } from '../src/core/modifiers';

function scene(): LevelScene {
  const state = initialState(newPlanet());
  return {
    planet: state.planet,
    nova: state.nova,
    combo: state.combo,
    comboCharge: state.comboCharge,
    throwsLeft: 8,
    bonus: 0,
    regionBests: state.regionBests,
    arrived: new Set(state.arrived),
    novaOn: true,
    qi: 2,
    troubles: state.troubles,
    buddyShieldUsed: false,
    calmUsed: false,
    labMarks: state.labMarks,
    skipperBounces: 0,
    sparklerPlainUsed: false,
  } as unknown as LevelScene;
}

function apply(scene: LevelScene, state: RoundState): void {
  scene.planet = state.planet;
  scene.nova = state.nova;
  scene.combo = state.combo;
  scene.comboCharge = state.comboCharge;
  carryLauncherRoundState(scene, state);
}

describe('live scene launcher state', () => {
  it('uses the second bounced landing at Skipper Tune 3 and restores its counter in a checkpoint', () => {
    const live = scene();
    const mods = { ...NO_MODIFIERS, launcher: { id: 'skipper' as const, tune: 3 as const } };
    const first = stepRound(sceneRoundState(live), { kind: 'rock', sector: 5, bounced: true }, mods);
    apply(live, first.state);
    expect(sceneRoundState(live).skipperBounces).toBe(1);
    const checkpoint = restoreRound(serializeRound(sceneRoundState(live)))!;
    expect(checkpoint.skipperBounces).toBe(1);
    const second = stepRound(checkpoint, { kind: 'rock', sector: 10, bounced: true }, mods);
    const reset = stepRound({ ...checkpoint, skipperBounces: 0 }, { kind: 'rock', sector: 10, bounced: true }, mods);
    expect(second.state.skipperBounces).toBe(2);
    expect(second.state.planet.sectors[10].land).toBeLessThan(reset.state.planet.sectors[10].land);
  });

  it('uses Sparkler Tune 4 first plain throw only once', () => {
    const live = scene();
    const mods = { ...NO_MODIFIERS, launcher: { id: 'sparkler' as const, tune: 4 as const } };
    const first = stepRound(sceneRoundState(live), { kind: 'storm', sector: 5 }, mods);
    apply(live, first.state);
    expect(sceneRoundState(live).sparklerPlainUsed).toBe(true);
    live.nova.charge = 0;
    live.arrived = new Set(Object.keys(SPECIES_BY_ID));
    const second = stepRound(sceneRoundState(live), { kind: 'storm', sector: 10 }, mods);
    const reset = stepRound({ ...sceneRoundState(live), sparklerPlainUsed: false }, { kind: 'storm', sector: 10 }, mods);
    expect(second.novaGain).toBe(reset.novaGain - 1);
  });
});
