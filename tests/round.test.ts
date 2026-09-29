import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { NOVA_CHARGE, ROUND_RULES_V0, previewStep, restoreRound, roundState, serializeRound, stepRound } from '../src/core/round';
import { BIOMES, clonePlanet, impact, landingLabBonus, newPlanet, settle } from '../src/core/world';

describe('round engine', () => {
  it('is pure and previews exactly the same transition', () => {
    const state = roundState(newPlanet());
    const original = structuredClone(state);
    const mods = { ...NO_MODIFIERS, lab: { rock: 4 } };
    const action = { kind: 'rock' as const, sector: 3 };
    const step = stepRound(state, action, mods, ROUND_RULES_V0);
    expect(state).toEqual(original);
    expect(previewStep(state, action, mods, ROUND_RULES_V0)).toEqual(step);
    expect(step.reactions).toEqual([]);
    expect(step.troubleEvents).toEqual([]);
    expect(step.changed).toContain(3);
    expect(step.spawned).toContainEqual({ id: 'goat', at: 3 });
    expect(step.firstArrivals).toContain('goat');
    expect(step.newRegionBests).toContain(3);
  });

  it('matches the existing first-arrival and region-best bonus', () => {
    let state = roundState(newPlanet());
    const mods = { ...NO_MODIFIERS, lab: { rock: 4 } };
    for (const sector of [2, 2, 3]) {
      const prior = state;
      const result = stepRound(state, { kind: 'rock', sector }, mods, ROUND_RULES_V0);
      const planet = clonePlanet(prior.planet);
      const impactResult = impact(planet, 'rock', sector);
      const regionBests = [...prior.regionBests];
      const arrived = new Set(prior.arrived);
      const expected = landingLabBonus(4, impactResult, planet, regionBests, arrived);
      expect(result.labBonus).toBe(expected);
      expect(result.state.regionBests).toEqual(regionBests);
      expect(result.state.arrived).toEqual([...arrived]);
      state = result.state;
    }
  });

  it('reports a creature that wanders off with its sector', () => {
    const planet = newPlanet(() => ({ life: 1 }));
    settle(planet);
    const priorAt = planet.sectors.findIndex((s) => s.species === 'bunny');
    const step = stepRound(roundState(planet), { kind: 'magma', sector: priorAt });
    expect(step.lost).toContainEqual({ species: 'bunny', sector: priorAt });
  });

  it('charges and fires a Supernova like the existing game', () => {
    const initial = roundState(newPlanet());
    const charged = { ...initial, charge: NOVA_CHARGE, nova: { ...initial.nova, charge: NOVA_CHARGE } };
    const step = stepRound(charged, { kind: 'rock', sector: 0, nova: true });
    expect(step.state.charge).toBe(0);
    expect(step.novaCharge).toBe(0);
    expect(step.after).toBeGreaterThanOrEqual(step.before);
    expect(step.state.regionBests[0]).toBe(BIOMES[step.state.planet.sectors[0].biome].value);
  });
  it('reports a returning creature without repeating its first arrival', () => {
    const state = roundState(newPlanet());
    state.arrived = ['goat'];
    const back = stepRound(state, { kind: 'rock', sector: 0 });
    expect(back.cameBack).toContainEqual({ species: 'goat', sector: 0 });
    expect(back.firstArrivals).not.toContain('goat');
  });

  it('round-trips the full continuation state and rejects other versions', () => {
    const state = roundState(newPlanet());
    state.queueIndex = 7;
    state.throwsLeft = 8;
    state.continuesUsed = 1;
    state.goalsProgress = [2, 0];
    state.guardianHp = 2;
    state.nova.held = true;
    const restored = restoreRound(serializeRound(state));
    expect(restored).toEqual(state);
    expect(stepRound(restored!, { kind: 'seed', sector: 4 })).toEqual(stepRound(state, { kind: 'seed', sector: 4 }));
    expect(restoreRound('{"version":2,"state":{}}')).toBeNull();
    expect(restoreRound('broken')).toBeNull();
  });
});
