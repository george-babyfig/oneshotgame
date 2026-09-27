import { expect, it } from 'vitest';
import { impact, newPlanet } from '../src/core/world';

// Each Lifebook recipe must actually produce its biome.
it('recipes are true', () => {
  let p = newPlanet();
  impact(p, 'rock', 5);
  expect(p.sectors[5].biome).toBe('mountain');
  impact(p, 'magma', 5);
  expect(p.sectors[5].biome).toBe('volcano');
  p = newPlanet();
  impact(p, 'magma', 5);
  expect(p.sectors[5].biome).toBe('desert');
  p = newPlanet();
  impact(p, 'seed', 5);
  expect(p.sectors[5].biome).toBe('forest');
  expect(p.sectors[6].biome).toBe('meadow');
  p = newPlanet();
  impact(p, 'ice', 5);
  impact(p, 'ice', 5);
  expect(p.sectors[5].biome).toBe('icesheet');
  p = newPlanet();
  impact(p, 'ice', 5);
  impact(p, 'magma', 6);
  impact(p, 'magma', 6);
  expect(['springs', 'ocean']).toContain(p.sectors[5].biome);
  p = newPlanet();
  impact(p, 'rock', 5);
  impact(p, 'rock', 5);
  impact(p, 'ice', 5);
  impact(p, 'ice', 5);
  expect(p.sectors[5].biome).toBe('tundra');
  p = newPlanet();
  impact(p, 'rock', 5);
  impact(p, 'ice', 5);
  expect(p.sectors[5].biome).toBe('swamp');
});
