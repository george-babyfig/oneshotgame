import { describe, expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { lifeSparkSectors, novaReady, roundState, starScopePreview, stepRound } from '../src/core/round';
import { clonePlanet, impact, newPlanet, settle } from '../src/core/world';

describe('Supernova 2.0', () => {
  it('charges improved lands and first arrivals, then fires at 12 and 18', () => {
    const start = roundState(newPlanet());
    const first = stepRound(start, { kind: 'rock', sector: 0 });
    expect(first.novaGain).toBe(first.changedBetter.length + first.firstArrivals.length * 2);
    expect(first.novaCharge).toBe(first.novaGain);
    const ready = { ...first.state, charge: 12, nova: { ...first.state.nova, charge: 12 } };
    expect(novaReady(ready)).toBe(true);
    expect(stepRound(first.state, { kind: 'rock', sector: 6, nova: true }).novaFired).toBe(false);
    const held = { ...ready, nova: { ...ready.nova, held: true } };
    expect(novaReady(held)).toBe(false);
    expect(stepRound(held, { kind: 'rock', sector: 6 }).novaFired).toBe(false);
    const fired = stepRound(ready, { kind: 'rock', sector: 6 });
    expect(fired.novaFired).toBe(true);
    expect(fired.state.nova).toEqual({ charge: 0, threshold: 18, fired: 1, held: false });
    expect(fired.novaGain).toBe(0);
    const later = { ...fired.state, charge: 18, nova: { ...fired.state.nova, charge: 18 } };
    expect(stepRound(later, { kind: 'ice', sector: 12 }).state.nova.fired).toBe(2);
  });

  it('gives no charge for a worse throw or before planet 9', () => {
    const planet = newPlanet((i) => (i < 6 ? { water: 3 } : {}));
    settle(planet);
    const worse = stepRound(roundState(planet), { kind: 'rock', sector: 3 });
    expect(worse.after).toBeLessThan(worse.before);
    expect(worse.novaGain).toBe(0);
    const early = makeLevel(8);
    const off = stepRound(roundState(early.start, early.nova), { kind: early.queue[0], sector: 0, nova: true });
    expect(off.novaFired).toBe(false);
    expect(off.novaGain).toBe(0);
  });

  it.each([
    ['rock', 'land', 2, 4],
    ['ice', 'water', 2, 4],
    ['seed', 'life', 2, 3],
    ['magma', 'heat', 2, 3],
    ['storm', 'water', 4, 2],
    ['sun', 'life', 4, 1],
  ] as const)('%s repeats its main effect through the extra reach', (kind, field, distance, gain) => {
    const plain = newPlanet();
    const nova = clonePlanet(plain);
    impact(plain, kind, 10);
    impact(nova, kind, 10, 0, { nova: true });
    expect(nova.sectors[10 + distance][field] - plain.sectors[10 + distance][field]).toBe(gain);
  });

  it('deals two guardian hits on a charged throw', () => {
    const state = roundState(newPlanet());
    state.guardianHp = 3;
    state.charge = 12;
    state.nova.charge = 12;
    const step = stepRound(state, { kind: 'rock', sector: 0, guardianHit: true });
    expect(step.state.guardianHp).toBe(1);
  });

  it('shows five upcoming objects and picks Spark sectors that advance a goal', () => {
    const level = makeLevel(20);
    const state = roundState(level.start, level.nova);
    state.queueIndex = 2;
    expect(starScopePreview(level, state)).toEqual(level.queue.slice(2, 7));
    const planet = newPlanet((i) => (i === 8 ? { land: 3 } : {}));
    expect(lifeSparkSectors({ goals: [{ type: 'biome', id: 'mountain', count: 1 }] }, planet)).not.toContain(8);
    const meadow = newPlanet((i) => (i === 8 ? { life: 1 } : {}));
    expect(lifeSparkSectors({ goals: [{ type: 'biome', id: 'forest', count: 1 }] }, meadow)[0]).toBe(8);
    expect(lifeSparkSectors({ goals: [] }, planet)).toEqual([3, 11, 19]);
  });
});
