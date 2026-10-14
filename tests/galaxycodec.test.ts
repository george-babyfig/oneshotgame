import { describe, expect, it } from 'vitest';
import { BIOMES, newPlanet, SPECIES, type BiomeId } from '../src/core/world';
import { approxSectors, decodePlanet, encodeSectors, GALAXY_BIOMES } from '../src/meta/galaxyCodec';
import { defaultProfile, type GalaxyPlanet } from '../src/meta/profile';
import { applyLevelWin } from '../src/meta/economy';
import { expeditionLoot } from '../src/meta/homeworld';
import { legacyExpeditionLoot } from '../src/meta/tripsLegacy';
import { homeLandFor } from '../src/meta/friends';
import * as trips from '../src/meta/trips';
import * as backup from '../src/meta/backup';
import { wishBubbles } from '../src/meta/wishes';

const entry = (extra: Partial<GalaxyPlanet> = {}): GalaxyPlanet => ({
  n: 25,
  name: 'Garden',
  hue: 30,
  stars: 2,
  species: [],
  life: 80,
  colors: [],
  ...extra,
});

describe('save v7 galaxy codec', () => {
  it('keeps all 24 sectors, all biome codes and multi-digit species indexes in 120 characters', () => {
    const planet = newPlanet();
    planet.speciesFound = SPECIES.map((s) => s.id);
    planet.sectors.forEach((sector, i) =>
      Object.assign(sector, {
        biome: GALAXY_BIOMES[i % GALAXY_BIOMES.length],
        land: i % 6,
        water: (i + 1) % 6,
        life: i % 4,
        species: planet.speciesFound[i],
      }),
    );
    const sec = encodeSectors(planet);
    expect(sec).toHaveLength(120);
    expect(sec[10 * 5 + 4]).toBe('a');
    const decoded = decodePlanet(entry({ sec, species: planet.speciesFound }));
    decoded.sectors.forEach((sector, i) => {
      const { heat: _heat, ...expected } = planet.sectors[i];
      expect(sector).toMatchObject(expected);
    });
    expect(encodeSectors(decoded)).toBe(sec);
  });
  it('uses unique top colours at 8/6/4/3, then barren, without making up species', () => {
    const colors = ['forest', 'ocean', 'tundra', 'desert'].map((id) => BIOMES[id as BiomeId].color);
    const planet = decodePlanet(entry({ sec: approxSectors(colors), species: ['bunny'] }));
    for (const [biome, count] of [
      ['forest', 8],
      ['ocean', 6],
      ['tundra', 4],
      ['desert', 3],
      ['barren', 3],
    ] as const)
      expect(planet.sectors.filter((s) => s.biome === biome)).toHaveLength(count);
    expect(planet.speciesFound).toEqual([]);
    expect(decodePlanet(entry({ sec: approxSectors([colors[0], colors[0]]) })).sectors.filter((s) => s.biome === 'forest')).toHaveLength(8);
  });
  it('keeps colourless saves barren, with no Essence-producing land', () => {
    expect(decodePlanet(entry()).sectors.every((s) => s.biome === 'barren')).toBe(true);
    expect(decodePlanet(entry({ sec: '!'.repeat(120) })).sectors.every((s) => s.biome === 'barren')).toBe(true);
  });
  it('writes real sec only with a replacement, keeping a lower-score replay coherent', () => {
    const p = defaultProfile(0);
    const win = (score: number, land: number) =>
      applyLevelWin(p, { n: 25, stars: 3, score, planet: newPlanet(() => ({ land })), name: 'Garden', hue: land, difficulty: 'normal' });
    win(80, 4);
    const saved = structuredClone(p.galaxy[0]);
    p.galaxy[0].approx = 1;
    win(79, 1);
    expect(p.galaxy[0]).toEqual({ ...saved, approx: 1 });
    win(80, 3);
    expect(p.galaxy[0].sec).not.toBe(saved.sec);
    expect(p.galaxy[0].approx).toBeUndefined();
  });
});

describe('step-0 contracts remain dormant', () => {
  it('freezes the complete 1.0 loot formula for every species, length and Bay level', () => {
    for (const species of SPECIES)
      for (const hours of [1, 4, 8])
        for (let bay = 0; bay <= 5; bay++)
          expect(legacyExpeditionLoot(hours, bay, species.id)).toEqual(expeditionLoot(hours, bay, species.id));
    expect(legacyExpeditionLoot(8, 3, 'bunny')).toEqual({ dust: 52, gems: 6, boosters: { shower: 1, spark: 1, scope: 1 } });
  });
  it('shares the home-land rule without changing the current Homeworld spot implementation', () => {
    expect(homeLandFor('leviathan')).toBe('ocean');
    expect(homeLandFor('worldtree')).toBe('forest');
    expect(homeLandFor('bunny')).toBe(SPECIES.find((s) => s.id === 'bunny')?.home?.[0]);
    expect(homeLandFor('invalid')).toBeNull();
  });
  it('never mutates or pays from a trip, Wish bubble or backup stub', async () => {
    const p = defaultProfile(0);
    const before = JSON.stringify(p);
    expect(trips.tripOptions(p.home, 0)).toEqual([]);
    expect(trips.tripPlanets(p)).toEqual([]);
    expect(trips.pickFriend(p, 1, 4)).toBeNull();
    expect(trips.previewTrip(p, 1, 4, undefined, 0)).toBeNull();
    expect(trips.startTrip(p, 1, 4, undefined, 0)).toBe('no_bay');
    expect(trips.callHome(p, 0)).toBe(false);
    expect(trips.settleTrips(p, 0)).toBeNull();
    expect(trips.speedUpTrip(p.home, 600000, 0)).toBe(false);
    expect(trips.tripStatus(p, 0)).toMatchObject({ options: [], trip: null });
    expect(wishBubbles(p)).toEqual([]);
    expect(await backup.backupStatus()).toMatchObject({ enabled: false, on: false });
    expect(await backup.setBackupOn(true)).toMatchObject({ enabled: false, on: false });
    expect(await backup.maybeBackup(p, 'save')).toBe(false);
    expect(await backup.listBackups()).toEqual([]);
    expect(await backup.restoreBackup('anything')).toBe('unavailable');
    expect(await backup.undoRestore()).toBe(false);
    expect(JSON.stringify(p)).toBe(before);
  });
});
