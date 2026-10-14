import { describe, expect, it } from 'vitest';
import { makeLevel, rulesForLevel } from '../src/core/levels';
import { NOVA_CHARGE, novaReady, roundState, stepRound } from '../src/core/round';
import { newPlanet, settle } from '../src/core/world';

const steamPlanet = () => {
  const planet = newPlanet((i) => ([4, 10, 16].includes(i) ? { water: 3, heat: -2 } : {}));
  settle(planet);
  return planet;
};

describe('Combos', () => {
  it('starts only after the planet 26 lesson in every mode', () => {
    for (const mode of ['campaign', 'voyage', 'daily', 'rush', 'challenge', 'zen', 'remix'] as const) {
      expect(rulesForLevel(25, mode).combo).toBe(false);
      expect(rulesForLevel(26, mode).combo).toBe(true);
    }
    const prior = stepRound(roundState(steamPlanet()), { kind: 'magma', sector: 5 }, undefined, rulesForLevel(25));
    expect(prior.reactions[0].id).toBe('steam');
    expect(prior.state.combo.links).toBe(0);
    expect(prior.state.comboCharge).toBe(0);
  });
  it('links Fusions, allows one rest throw, and ends on the next plain throw', () => {
    const rules = rulesForLevel(26);
    let state = roundState(steamPlanet(), false);
    const first = stepRound(state, { kind: 'magma', sector: 5 }, undefined, rules);
    expect(first.state.combo).toMatchObject({ links: 1, rest: false, best: 1 });
    state = first.state;
    const rest = stepRound(state, { kind: 'rock', sector: 22 }, undefined, rules);
    expect(rest.state.combo).toMatchObject({ links: 1, rest: true });
    const second = stepRound(rest.state, { kind: 'magma', sector: 11 }, undefined, rules);
    expect(second.state.combo).toMatchObject({ links: 2, rest: false, best: 2 });
    expect(second.combo.step).toBe(2);
    expect(second.state.comboCharge).toBe(2);
    const restAgain = stepRound(second.state, { kind: 'rock', sector: 21 }, undefined, rules);
    const ended = stepRound(restAgain.state, { kind: 'rock', sector: 20 }, undefined, rules);
    expect(ended.combo.ended).toBe('rest');
    expect(ended.state.combo).toMatchObject({ links: 0, best: 2 });
  });

  it('counts a Supernova Fusion as two links and pays the second step', () => {
    const initial = roundState(steamPlanet());
    const state = { ...initial, charge: NOVA_CHARGE, nova: { ...initial.nova, charge: NOVA_CHARGE } };
    const result = stepRound(state, { kind: 'magma', sector: 5, nova: true }, undefined, rulesForLevel(26));
    expect(result.combo).toMatchObject({ links: 2, step: 2, superFusion: true });
    expect(result.state.comboCharge).toBe(2);
    expect(result.state.nova.fired).toBe(1);
  });

  it('caps Combo charge at twelve and Fusion reach at four', () => {
    const planet = newPlanet((i) => (i === 5 ? { life: 1, water: 1 } : {}));
    settle(planet);
    const initial = roundState(planet);
    const state = { ...initial, combo: { links: 3, rest: false, best: 3 }, comboCharge: 11 };
    const result = stepRound(state, { kind: 'storm', sector: 5 }, undefined, rulesForLevel(26));
    expect(result.reactions[0].id).toBe('rainGarden');
    expect(result.reactions[0].sectors).toHaveLength(7);
    expect(result.state.comboCharge).toBe(12);
    expect(result.combo.step).toBe(4);
    const third = stepRound(
      { ...initial, combo: { links: 2, rest: false, best: 2 } },
      { kind: 'storm', sector: 5 },
      undefined,
      rulesForLevel(26),
    );
    expect(third.reactions[0].sectors).toHaveLength(9);
  });

  it('ends on a Clash or a worse planet', () => {
    const planet = newPlanet((i) => (i === 5 ? { heat: 2 } : {}));
    settle(planet);
    const initial = roundState(planet);
    const state = { ...initial, combo: { links: 2, rest: false, best: 2 } };
    const clash = stepRound(state, { kind: 'sun', sector: 6 }, undefined, rulesForLevel(32));
    expect(clash.reactions[0].id).toBe('scorch');
    expect(clash.combo.ended).toBe('worse');
    expect(clash.state.combo.links).toBe(0);
    const green = newPlanet((i) => (i < 6 ? { water: 3 } : {}));
    settle(green);
    const greenState = roundState(green);
    greenState.combo = { links: 2, rest: false, best: 2 };
    const worse = stepRound(greenState, { kind: 'rock', sector: 3 }, undefined, rulesForLevel(26));
    expect(worse.after).toBeLessThan(worse.before);
    expect(worse.combo.ended).toBe('worse');
  });

  it('marks the final linked throw as the end of this round', () => {
    const state = roundState(steamPlanet());
    state.throwsLeft = 1;
    const result = stepRound(state, { kind: 'magma', sector: 5 }, undefined, rulesForLevel(26));
    expect(result.combo.ended).toBe('round');
    state.throwsLeft = 2;
    expect(stepRound(state, { kind: 'magma', sector: 5 }, undefined, rulesForLevel(26)).combo.ended).toBeUndefined();
  });

  it.each(['bonk', 'fizzle', 'miss'] as const)('ends on a %s without changing the planet', (outcome) => {
    const initial = roundState(steamPlanet());
    const state = { ...initial, combo: { links: 2, rest: false, best: 2 } };
    const result = stepRound(state, { kind: 'rock', sector: 0, outcome }, undefined, rulesForLevel(26));
    expect(result.state.planet).toBe(state.planet);
    expect(result.state.combo).toEqual({ links: 0, rest: false, best: 2 });
    expect(result.combo.ended).toBe('worse');
  });

  it('the planet 26 teaching path reaches Combo 2', () => {
    const level = makeLevel(26);
    let state = roundState(level.start, level.nova);
    const early: string[] = [];
    for (const [turn, sector] of [11, 0, 17].entries()) {
      const landed = stepRound(state, { kind: level.queue[turn], sector, nova: novaReady(state) }, undefined, rulesForLevel(26));
      early.push(...landed.reactions.map((reaction) => reaction.id));
      state = landed.state;
    }
    expect(state.combo.best).toBeGreaterThanOrEqual(2);
    expect(level.queue.slice(0, 3)).toEqual(['magma', 'ice', 'storm']);
    expect(early).toContain('steam');
    expect(early).toContain('rainGarden');
  });
});
