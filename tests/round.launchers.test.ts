import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { roundState, stepRound, previewStep, NOVA_CHARGE, type RoundState } from '../src/core/round';
import { newPlanet, settle } from '../src/core/world';
import { rulesForLevel } from '../src/core/levels';
import type { LauncherId, Tune } from '../src/core/launchers';

const withLauncher = (id: LauncherId, tune: Tune = 1) => ({ ...NO_MODIFIERS, launcher: { id, tune } });

describe('launcher landing rules', () => {
  it('changes ordinary footprint by one and respects Pinpoint tune exceptions', () => {
    const state = roundState(newPlanet());
    const sling = stepRound(state, { kind: 'rock', sector: 5 });
    const wide = stepRound(state, { kind: 'rock', sector: 5 }, withLauncher('thumper'));
    const exact = stepRound(state, { kind: 'rock', sector: 5 }, withLauncher('pinpoint'));
    expect(wide.state.planet.sectors[7].land).toBeGreaterThan(sling.state.planet.sectors[7].land);
    expect(exact.state.planet.sectors[6].land).toBe(state.planet.sectors[6].land);
    const rain1 = stepRound(state, { kind: 'storm', sector: 5 }, withLauncher('pinpoint', 1));
    const rain2 = stepRound(state, { kind: 'storm', sector: 5 }, withLauncher('pinpoint', 2));
    expect(rain1.state.planet.sectors[8].water).toBe(0);
    expect(rain2.state.planet.sectors[8].water).toBeGreaterThan(0);
    expect(previewStep(state, { kind: 'rock', sector: 5 }, withLauncher('thumper'))).toEqual(wide);
  });

  it('caps a wide Supernova and Lab reach at four', () => {
    const initial = roundState(newPlanet());
    const charged: RoundState = { ...initial, charge: NOVA_CHARGE, nova: { ...initial.nova, charge: NOVA_CHARGE } };
    const result = stepRound(charged, { kind: 'storm', sector: 10 }, { ...withLauncher('thumper'), lab: { storm: 5 } });
    expect(result.state.planet.sectors[14].water).toBeGreaterThan(0);
    expect(result.state.planet.sectors[15].water).toBe(0);
  });

  it('uses Pinpoint and Thumper Rain Cloud footprints for Rinse', () => {
    const state = roundState(newPlanet(), false, [{ id: 'vine', source: 0 }]);
    const mods = { ...NO_MODIFIERS, lab: { storm: 4 } };
    state.troubles[0].tangled = [3];
    expect(stepRound(state, { kind: 'storm', sector: 0 }, mods).state.troubles[0].settled).toBe(true);
    expect(
      stepRound(state, { kind: 'storm', sector: 0 }, { ...mods, launcher: { id: 'pinpoint', tune: 1 } }).state.troubles[0].settled,
    ).toBe(false);
    state.troubles[0].tangled = [4];
    expect(stepRound(state, { kind: 'storm', sector: 0 }, mods).state.troubles[0].settled).toBe(false);
    expect(
      stepRound(state, { kind: 'storm', sector: 0 }, { ...mods, launcher: { id: 'thumper', tune: 1 } }).state.troubles[0].settled,
    ).toBe(true);
  });

  it('adds Sparkler Fusion reach and two charge, while plain throws lose one', () => {
    const planet = newPlanet((i) => (i === 5 ? { life: 1, water: 1 } : {}));
    settle(planet);
    const state = roundState(planet);
    const rules = rulesForLevel(37);
    const fused = stepRound(state, { kind: 'storm', sector: 5 }, withLauncher('sparkler'), rules);
    expect(fused.reactions[0].id).toBe('rainGarden');
    expect(fused.reactions[0].sectors).toHaveLength(9);
    expect(fused.novaGain).toBe(fused.changedBetter.length + fused.firstArrivals.length * 2 + 3 + 2);
    const plainState = roundState(newPlanet());
    plainState.arrived = ['goat'];
    const sling = stepRound(plainState, { kind: 'rock', sector: 0 });
    const sparkler = stepRound(plainState, { kind: 'rock', sector: 0 }, withLauncher('sparkler'));
    expect(sparkler.novaGain).toBe(Math.max(0, sling.novaGain - 1));
    const tuned = stepRound(roundState(newPlanet()), { kind: 'rock', sector: 0 }, withLauncher('sparkler', 2));
    const untuned = stepRound(roundState(newPlanet()), { kind: 'rock', sector: 0 }, withLauncher('sparkler', 1));
    expect(tuned.novaGain).toBe(untuned.novaGain + 1);
  });

  it('weakens only Skipper special bounced landings, tracking tune relief by round', () => {
    const state = roundState(newPlanet());
    const full = stepRound(state, { kind: 'rock', sector: 5 }, withLauncher('skipper'));
    const bounced = stepRound(state, { kind: 'rock', sector: 5, bounced: true }, withLauncher('skipper'));
    expect(bounced.state.planet.sectors[5].land).toBe(full.state.planet.sectors[5].land - 1);
    expect(bounced.state.skipperBounces).toBe(1);
    const tuned = stepRound(state, { kind: 'rock', sector: 5, bounced: true }, withLauncher('skipper', 3));
    expect(tuned.state.planet.sectors[5].land).toBe(full.state.planet.sectors[5].land);
    expect(previewStep(state, { kind: 'rock', sector: 5, bounced: true }, withLauncher('skipper'))).toEqual(bounced);
  });
});
