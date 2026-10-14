import { BIOMES, SECTORS, type BiomeId, type Planet, type Sector } from '../core/world';
import type { GalaxyPlanet } from './profile';

// Append only: these base-36 codes are part of save v7, independent of catalogue order.
export const GALAXY_BIOMES: readonly BiomeId[] = Object.freeze([
  'barren',
  'ocean',
  'reef',
  'icesheet',
  'springs',
  'meadow',
  'forest',
  'jungle',
  'mountain',
  'highland',
  'desert',
  'savanna',
  'tundra',
  'taiga',
  'swamp',
  'marsh',
  'volcano',
]);
const digit = (n: number, max: number) => (Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0).toString(36);
const bare = (): Sector => ({ biome: 'barren', land: 1, water: 0, life: 0, heat: 0, species: null });
const heatFor = (biome: BiomeId) =>
  ['icesheet', 'tundra', 'taiga'].includes(biome)
    ? -2
    : ['springs', 'desert', 'savanna', 'volcano'].includes(biome)
      ? 2
      : biome === 'jungle'
        ? 1
        : 0;

/** The species alphabet indexes the same speciesFound array saved alongside sec. */
export function encodeSectors(planet: Planet): string {
  return Array.from({ length: SECTORS }, (_, i) => {
    const sector = planet.sectors[i] ?? bare();
    const species = sector.species ? planet.speciesFound.indexOf(sector.species) : -1;
    return (
      digit(Math.max(0, GALAXY_BIOMES.indexOf(sector.biome)), 35) +
      digit(sector.land, 5) +
      digit(sector.water, 5) +
      digit(sector.life, 3) +
      (species >= 0 && species < 36 ? species.toString(36) : '-')
    );
  }).join('');
}

/** Legacy colours have no land geometry; keep the approximation deterministic and visibly coherent. */
export function approxSectors(colors: readonly string[]): string {
  const biomes = [
    ...new Set(
      (Array.isArray(colors) ? colors : [])
        .filter((color): color is string => typeof color === 'string')
        .map((color) => GALAXY_BIOMES.find((id) => BIOMES[id].color.toLowerCase() === color.toLowerCase()))
        .filter((id): id is BiomeId => !!id && id !== 'barren'),
    ),
  ].slice(0, 4);
  const sectors: Sector[] = biomes.flatMap((biome, i) =>
    Array.from({ length: [8, 6, 4, 3][i] }, () => ({
      biome,
      land: BIOMES[biome].sea ? 0 : ['mountain', 'highland', 'tundra', 'taiga', 'volcano'].includes(biome) ? 4 : 1,
      water: BIOMES[biome].sea ? 3 : ['swamp', 'marsh'].includes(biome) ? 2 : 0,
      life: ['reef', 'meadow', 'forest', 'jungle', 'highland', 'savanna', 'taiga', 'marsh'].includes(biome) ? 2 : 0,
      heat: heatFor(biome),
      species: null,
    })),
  );
  while (sectors.length < SECTORS) sectors.push(bare());
  return encodeSectors({ sectors, speciesFound: [] });
}

/** Corrupt records degrade to barren sectors; a postcard must never break a save load. */
export function decodePlanet(entry: GalaxyPlanet): Planet {
  const sec = typeof entry.sec === 'string' && entry.sec.length === SECTORS * 5 ? entry.sec : approxSectors(entry.colors);
  const sectors = Array.from({ length: SECTORS }, (_, i): Sector => {
    const code = sec.slice(i * 5, i * 5 + 5);
    if (!/^[0-9a-g][0-5][0-5][0-3][0-9a-z-]$/.test(code)) return bare();
    const biome = GALAXY_BIOMES[parseInt(code[0], 36)];
    return {
      biome,
      land: Number(code[1]),
      water: Number(code[2]),
      life: Number(code[3]),
      heat: heatFor(biome),
      species: code[4] === '-' ? null : (entry.species[parseInt(code[4], 36)] ?? null),
    };
  });
  return { sectors, speciesFound: [...new Set(sectors.flatMap((sector) => (sector.species ? [sector.species] : [])))] };
}
