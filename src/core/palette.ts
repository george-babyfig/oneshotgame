import { BIOMES, type BiomeId } from './world';

export type PlanetPalette = 'classic' | 'clear';

// Classic stays sourced from world.ts until its owner moves the table.
export const CLASSIC_PALETTE: Record<BiomeId, string> = Object.fromEntries(
  Object.entries(BIOMES).map(([id, biome]) => [id, biome.color]),
) as Record<BiomeId, string>;

/** Chosen for >= 10 CIE76 after each full-severity Machado CVD simulation. */
export const CLEAR_PALETTE: Record<BiomeId, string> = {
  barren: '#7878a0',
  ocean: '#0028ff',
  reef: '#00a0ff',
  icesheet: '#c8c8ff',
  springs: '#ff50f0',
  meadow: '#a0f000',
  forest: '#005028',
  jungle: '#50a050',
  mountain: '#502850',
  highland: '#7850a0',
  desert: '#ff5000',
  savanna: '#f0a028',
  tundra: '#f0c8c8',
  taiga: '#a05050',
  swamp: '#a00078',
  marsh: '#50ff78',
  volcano: '#f00000',
};

export function landColor(biome: BiomeId, palette: PlanetPalette): string {
  return palette === 'clear' ? CLEAR_PALETTE[biome] : CLASSIC_PALETTE[biome];
}
