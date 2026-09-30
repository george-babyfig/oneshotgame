import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS, modifiersFor } from '../src/core/modifiers';
import {
  NOVA_CHARGE,
  ROUND_RULES_V0,
  novaForThrow,
  previewStep,
  restoreRound,
  roundState,
  serializeRound,
  stepRound,
} from '../src/core/round';
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
    expect(step.spawned).toContainEqual({ id: 'goat', at: 2 });
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

  it('gentle mode skips Clashes and keeps Fusions', () => {
    const planet = newPlanet();
    planet.sectors[0].biome = 'volcano';
    const rules = { version: 2, reactions: ['scorch', 'steam'] as ('scorch' | 'steam')[], troubles: [], combo: true };
    const state = roundState(planet);
    const normal = stepRound(state, { kind: 'sun', sector: 0 }, NO_MODIFIERS, rules);
    const gentle = stepRound(state, { kind: 'sun', sector: 0 }, { ...NO_MODIFIERS, gentle: true }, rules);
    expect(normal.reactions.map((r) => r.id)).toContain('scorch');
    expect(gentle.reactions).toEqual([]);
    const icy = newPlanet();
    icy.sectors[0].biome = 'icesheet';
    expect(
      stepRound(roundState(icy), { kind: 'magma', sector: 0 }, { ...NO_MODIFIERS, gentle: true }, rules).reactions.map((r) => r.id),
    ).toContain('steam');
    for (const mode of ['daily', 'rush', 'challenge'] as const) expect(modifiersFor(mode, { gentle: true }).gentle).toBe(true);
    expect(modifiersFor('campaign', { gentle: true }).gentle).toBe(true);
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
    expect(JSON.parse(serializeRound(state)).rulesVersion).toBe(1);
    expect(restored).toEqual(state);
    expect(stepRound(restored!, { kind: 'seed', sector: 4 })).toEqual(stepRound(state, { kind: 'seed', sector: 4 }));
    expect(restoreRound('{"version":2,"state":{}}')).toBeNull();
    expect(restoreRound('broken')).toBeNull();
    const changedRules = JSON.parse(serializeRound(state));
    changedRules.rulesVersion++;
    expect(restoreRound(JSON.stringify(changedRules))).toBeNull();
  });

  it('restores a version 1 round with a fresh Combo', () => {
    const state = roundState(newPlanet());
    const saved = JSON.parse(serializeRound(state));
    saved.version = 1;
    delete saved.state.combo;
    delete saved.state.comboCharge;
    expect(restoreRound(JSON.stringify(saved))).toEqual(state);
    saved.state.planet.sectors.pop();
    expect(restoreRound(JSON.stringify(saved))).toBeNull();
  });

  it('previews the held Supernova on the final throw', () => {
    const state = roundState(newPlanet());
    state.nova = { ...state.nova, charge: NOVA_CHARGE, held: true };
    state.charge = NOVA_CHARGE;
    state.throwsLeft = 2;
    expect(novaForThrow(state)).toBe(false);
    state.throwsLeft = 1;
    expect(novaForThrow(state)).toBe(true);
  });
});
