import { describe, expect, it } from 'vitest';
import { makeLevel, rulesForLevel } from '../src/core/levels';
import { REACTIONS, ROUND_RULES_V0, novaReady, previewStep, roundState, stepRound, type ReactionId } from '../src/core/round';
import { SECTORS, newPlanet, settle, traitOf, type Kind, type Planet } from '../src/core/world';
import { dailyLevel, rushLevel, challengeLevel, zenLevel } from '../src/meta/modes';
import { voyageLevel } from '../src/meta/voyage';

const fired = (planet: Planet, kind: Kind, sector: number, n: number) =>
  stepRound(roundState(planet), { kind, sector }, undefined, rulesForLevel(n));

describe('reactions', () => {
  it('teaches the same five pairs in every mode', () => {
    for (const [id, reaction] of Object.entries(REACTIONS) as [ReactionId, (typeof REACTIONS)[ReactionId]][]) {
      expect(rulesForLevel(reaction.debut - 1).reactions).not.toContain(id);
      for (const mode of ['campaign', 'voyage', 'zen', 'daily', 'rush', 'challenge', 'remix'] as const)
        expect(rulesForLevel(reaction.debut, mode).reactions).toContain(id);
    }
  });

  it('caps mode level targets to the campaign rules already taught', () => {
    expect(dailyLevel('2026-09-29', 7).stars).toEqual(makeLevel(16, 'DAY-2026-09-29', { rules: rulesForLevel(7) }).stars);
    expect(rushLevel('cap', 7).start).toEqual(makeLevel(14, 'RUSH-cap', { rules: rulesForLevel(7) }).start);
    expect(challengeLevel('CAP', 7).stars).toEqual(makeLevel(14, 'CH-CAP', { rules: rulesForLevel(7) }).stars);
    expect(zenLevel(null, 7).start).toEqual(makeLevel(20, 'ZEN', { rules: rulesForLevel(7) }).start);
    expect(voyageLevel('2026-W40', 30, 2, 25).stars).toEqual(
      makeLevel(34, 'VOY-2026-W40-2', { goals: true, boss: false, rules: rulesForLevel(25) }).stars,
    );
  });

  it.each([
    ['steam', 'magma', { water: 3, heat: -2 }, 8],
    ['rainGarden', 'storm', { life: 1 }, 13],
    ['wildflowers', 'sun', { life: 1 }, 22],
    ['glacier', 'ice', { land: 3 }, 25],
    ['scorch', 'sun', { heat: 2 }, 32],
  ] as const)('%s fires on neighbouring partner land', (id, kind, land, n) => {
    const planet = newPlanet((i) => (i === 6 ? land : {}));
    settle(planet);
    const source = roundState(planet);
    const action = { kind, sector: 7 };
    const result = fired(planet, kind, 7, n);
    expect(result.reactions).toHaveLength(1);
    expect(result.reactions[0]).toMatchObject({ id, at: 7, partner: 6 });
    expect(previewStep(source, action, undefined, rulesForLevel(n))).toEqual(result);
    expect(fired(planet, kind, 7, n - 1).reactions).toEqual([]);
  });

  it('applies Steam after the normal landing and adds Fusion charge', () => {
    const planet = newPlanet((i) => (i === 6 ? { water: 3, heat: -2 } : {}));
    settle(planet);
    const result = fired(planet, 'magma', 7, 8);
    expect(result.state.planet.sectors[7].biome).toBe('springs');
    expect(result.reactions[0].sectors).toEqual([5, 6, 7, 8, 9]);
    expect(result.novaGain).toBeGreaterThanOrEqual(3);
  });

  it('gives no Fusion charge when the throw lowers total life', () => {
    let found: [number, number, number, number, string] | undefined;
    for (const land of [0, 1, 2, 3, 4, 5])
      for (const water of [0, 1, 2, 3, 4, 5])
        for (const heat of [-2, -1, 0, 1, 2])
          for (const life of [0, 1, 2, 3]) {
            for (const [kind, partner, level] of [
              ['magma', { water: 3, heat: -2 }, 8],
              ['storm', { land: 1, life: 1 }, 13],
              ['sun', { land: 1, life: 1 }, 22],
              ['ice', { land: 3 }, 25],
            ] as const) {
              const planet = newPlanet((i) => (i === 6 ? partner : { land, water, heat, life }));
              settle(planet);
              const result = fired(planet, kind, 7, level);
              if (result.reactions.length && result.after < result.before) {
                found = [land, water, heat, life, kind];
                expect(result.novaGain).toBe(0);
                break;
              }
            }
            if (found) break;
          }
    expect(found).toBeDefined();
  });

  it('adds life in wet Rain Garden sectors', () => {
    const planet = newPlanet((i) => (i === 6 ? { life: 1 } : i === 8 ? { water: 2 } : {}));
    settle(planet);
    const base = stepRound(roundState(planet), { kind: 'storm', sector: 7 }, undefined, ROUND_RULES_V0);
    const fusion = fired(planet, 'storm', 7, 13);
    expect(fusion.state.planet.sectors[8].life).toBe(base.state.planet.sectors[8].life + 1);
    expect(fusion.reactions[0].sectors).toHaveLength(7);
  });

  it('grows Wildflowers on habitable neighbours', () => {
    const planet = newPlanet((i) => (i === 6 ? { life: 1 } : {}));
    settle(planet);
    const base = stepRound(roundState(planet), { kind: 'sun', sector: 7 }, undefined, ROUND_RULES_V0);
    const fusion = fired(planet, 'sun', 7, 22);
    expect(fusion.state.planet.sectors[9].life).toBe(Math.min(3, base.state.planet.sectors[9].life + 1));
  });

  it('makes frost land with Glacier', () => {
    const planet = newPlanet((i) => (i === 6 ? { land: 3 } : {}));
    settle(planet);
    const base = stepRound(roundState(planet), { kind: 'ice', sector: 7 }, undefined, ROUND_RULES_V0);
    const fusion = fired(planet, 'ice', 7, 25);
    expect(fusion.state.planet.sectors[7].land).toBe(base.state.planet.sectors[7].land + 1);
    expect(fusion.state.planet.sectors[7].heat).toBe(base.state.planet.sectors[7].heat - 2);
    expect(['tundra', 'icesheet', 'taiga']).toContain(fusion.state.planet.sectors[7].biome);
  });

  it('Dry Spell dries the two sectors on each side', () => {
    const planet = newPlanet((i) => (i === 6 ? { heat: 2 } : { heat: 1, life: 2 }));
    settle(planet);
    const base = stepRound(roundState(planet), { kind: 'sun', sector: 7 }, undefined, ROUND_RULES_V0);
    const clash = fired(planet, 'sun', 7, 32);
    expect(clash.state.planet.sectors[7].life).toBe(base.state.planet.sectors[7].life);
    for (const sector of [5, 6, 8, 9]) {
      const resident = planet.sectors[sector].species;
      const fireproof = resident !== null && traitOf(resident) === 'fireproof';
      expect(clash.state.planet.sectors[sector].life).toBe(
        fireproof ? base.state.planet.sectors[sector].life : Math.max(0, base.state.planet.sectors[sector].life - 1),
      );
      expect(clash.state.planet.sectors[sector].heat).toBe(
        fireproof ? base.state.planet.sectors[sector].heat : Math.min(3, base.state.planet.sectors[sector].heat + 1),
      );
    }
  });

  it('limits simultaneous reactions to the first Fusion', () => {
    const planet = newPlanet((i) => (i === 6 ? { life: 1 } : i === 8 ? { heat: 2 } : {}));
    settle(planet);
    const result = fired(planet, 'sun', 7, 32);
    expect(result.reactions.map((reaction) => reaction.id)).toEqual(['wildflowers']);
  });

  it('each debut deals a path to its reaction in the opening throws', () => {
    for (const [n, expected] of [
      [8, 'steam'],
      [13, 'rainGarden'],
      [22, 'wildflowers'],
      [25, 'glacier'],
      [32, 'scorch'],
    ] as [number, ReactionId][]) {
      const level = makeLevel(n);
      const first = Array.from({ length: SECTORS }, (_, sector) =>
        stepRound(roundState(level.start, level.nova), { kind: level.queue[0], sector }, undefined, rulesForLevel(n)),
      );
      const opens = first.some((result) => result.reactions.some((reaction) => reaction.id === expected));
      const follows = first.some((result) =>
        Array.from({ length: SECTORS }, (_, sector) =>
          stepRound(result.state, { kind: level.queue[1], sector, nova: novaReady(result.state) }, undefined, rulesForLevel(n)),
        ).some((next) => next.reactions.some((reaction) => reaction.id === expected)),
      );
      expect(opens || follows, `planet ${n}`).toBe(true);
    }
  });
});
