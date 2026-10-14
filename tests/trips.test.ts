import { describe, expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { BIOMES, KINDS, SPECIES, traitOf, type BiomeId, type Kind, type Planet } from '../src/core/world';
import { defaultProfile } from '../src/meta/profile';
import { encodeSectors } from '../src/meta/galaxyCodec';
import { homeLandFor } from '../src/meta/friends';
import { COUNTERS, buddyEligible, setBuddy } from '../src/meta/buddy';
import { homeBadge, recordHomeworldWin, sendHome, tickHome } from '../src/meta/homeworld';
import { awayCollectables, awayRecapLines } from '../src/meta/economy';
import { nextUp, homeworldNextUp, nextEssenceNeeded, essenceStillWanted, essencesCovered } from '../src/meta/nextup';
import { TRIP_FACTOR, TRIP_CAP, TRIP_GEMS, TRIP_FRIENDSHIP, CONSTELLATIONS, HOME_LEVEL_REQUIREMENTS } from '../src/meta/tuning';
import { LAB_ESSENCE } from '../src/meta/labs';
import {
  callHome,
  pickFriend,
  previewTrip,
  settleTrips,
  speedUpTrip,
  startTrip,
  tripOptions,
  tripPlanets,
  tripStatus,
} from '../src/meta/trips';
import { dropsFor, MATS, unlockedConstellation, type Mat } from '../src/meta/constellations';
import { legacyExpeditionLoot } from '../src/meta/tripsLegacy';
import type { TripHours } from '../src/meta/m13types';

const HOUR = 3_600_000;
function planet(lands: BiomeId[]): Planet {
  return {
    sectors: Array.from({ length: 24 }, (_, i) => ({ biome: lands[i] ?? 'barren', land: 1, water: 0, life: 0, heat: 0, species: null })),
    speciesFound: [],
  };
}
function fixture(lands: BiomeId[] = Array(6).fill('tundra')) {
  const p = defaultProfile(0);
  p.level = 30;
  p.chapters = [1, 2];
  p.home.firstHour = 2;
  p.home.plots[0] = { type: 'launch_bay', lv: 4, since: 0 };
  p.home.residents = [
    { species: 'penguin', fp: 0, rewarded: 1 },
    { species: 'bunny', fp: 0, rewarded: 1 },
  ];
  p.galaxy = [
    { n: 25, name: 'Snow', hue: 0, stars: 3, life: 20, species: [], colors: [BIOMES.icesheet.color], sec: encodeSectors(planet(lands)) },
  ];
  return p;
}
const win = (p: ReturnType<typeof fixture>, mode: 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush', at: number, key = `${mode}:${at}`) =>
  recordHomeworldWin(p, { mode, at, roundKey: key, planetKey: 'campaign:30', buddySpecies: null });

describe('M13 trip unit gates A5–A7', () => {
  it('A5: a matching 8-hour trip to six frost sectors pays nine frost', () => {
    const p = fixture();
    expect(homeLandFor('penguin')).toBe('tundra');
    expect(previewTrip(p, 25, 8, 'penguin', 0)).toMatchObject({ match: true, yield: { mats: { frost: 9 }, gems: 3, fp: 3 } });
  });
  it('A6: every length and fixture pays exactly its frozen preview, without dust or boosters', () => {
    expect(TRIP_FACTOR[1]).toBeLessThanOrEqual(TRIP_FACTOR[4] / 4);
    expect(TRIP_FACTOR[4] / 4).toBeLessThanOrEqual(TRIP_FACTOR[8] / 8);
    expect(TRIP_FACTOR[8]).toBe(1.25);
    for (const biome of Object.keys(BIOMES) as BiomeId[])
      for (const hours of [1, 4, 8] as TripHours[]) {
        const p = fixture(Array(24).fill(biome));
        const base = dropsFor(planet(Array(24).fill(biome)), 0);
        const preview = previewTrip(p, 25, hours, 'bunny', 0);
        const expected = Object.fromEntries(
          Object.entries(base)
            .map(([mat, count]) => [
              mat,
              Math.min(TRIP_CAP[hours], Math.round(count * TRIP_FACTOR[hours] * (homeLandFor('bunny') === biome ? 1.25 : 1))),
            ])
            .filter(([, amount]) => Number(amount) > 0),
        );
        if (!Object.keys(expected).length) {
          expect(preview).toBeNull();
          continue;
        }
        expect(preview!.yield).toEqual({ mats: expected, gems: TRIP_GEMS[hours], fp: TRIP_FRIENDSHIP[hours][preview!.match ? 1 : 0] });
        const dust = p.dust;
        const boosters = { ...p.boosters };
        expect(startTrip(p, 25, hours, 'bunny', 0)).toBe('ok');
        p.home.plots[0] = { type: 'launch_bay', lv: 5, since: 0, done: hours * HOUR + 1 };
        p.galaxy[0].sec = encodeSectors(planet(Array(24).fill('barren')));
        const returned = settleTrips(p, hours * HOUR)!;
        expect(returned.yield).toEqual(preview!.yield);
        expect(p.home.residents[1].fp).toBe(preview!.yield.fp);
        expect(p.dust).toBe(dust);
        expect(p.boosters).toEqual(boosters);
        for (const [mat, amount] of Object.entries(expected)) expect(p.mats[mat as keyof typeof p.mats]).toBe(amount);
        expect(settleTrips(p, 2 * hours * HOUR)).toBeNull();
      }
  });
  it('A7: unlocks only at effective Bay levels 2, 3 and 4', () => {
    const p = fixture();
    for (const [lv, options] of [
      [1, []],
      [2, [1]],
      [3, [1, 4]],
      [4, [1, 4, 8]],
      [5, [1, 4, 8]],
    ] as const) {
      p.home.plots[0]!.lv = lv;
      expect(tripOptions(p.home, 0)).toEqual(options);
      p.home.plots[0]!.done = HOUR;
      expect(tripOptions(p.home, 0)).toEqual(
        lv === 1 ? [] : tripOptions({ ...p.home, plots: [{ type: 'launch_bay', lv: lv - 1, since: 0 }] }, 0),
      );
      expect(tripOptions(p.home, HOUR)).toEqual(options);
      delete p.home.plots[0]!.done;
    }
  });
});

describe('trip choice and win-first guards', () => {
  it('sorts by the closest Essence checklist, then total base yield; never offers barren planets', () => {
    const p = fixture();
    p.home.level = 5;
    p.home.plots[1] = { type: 'lab', kind: 'ice', lv: 2, since: 0 };
    p.galaxy.push({ ...p.galaxy[0], n: 26, sec: encodeSectors(planet(Array(20).fill('forest'))) });
    p.galaxy.push({ ...p.galaxy[0], n: 27, sec: encodeSectors(planet([])), colors: [] });
    expect(nextEssenceNeeded(p)).toBe('frost');
    expect(tripPlanets(p).map((row) => row.n)).toEqual([25, 26]);
    p.mats.frost = 25;
    expect(tripPlanets(p)[0].n).toBe(26);
  });
  it('picks a match, then low friendship below 25, then Den order, excluding the Buddy', () => {
    const p = fixture();
    p.home.residents[0].fp = 25;
    expect(pickFriend(p, 25, 4)).toBe('penguin');
    p.buddy.species = 'penguin';
    expect(pickFriend(p, 25, 4)).toBe('bunny');
    expect(startTrip(p, 25, 4, 'penguin', 0)).toBe('only_buddy');
    p.buddy.species = null;
    p.galaxy[0].sec = encodeSectors(planet(Array(12).fill('desert')));
    p.home.residents.push({ species: 'otter', fp: 0, rewarded: 1 });
    expect(pickFriend(p, 25, 4)).toBe('bunny');
    p.home.residents[1].fp = 24;
    expect(pickFriend(p, 25, 4)).toBe('otter');
  });
  it('keeps the sole Trouble counter home when another traveller is free', () => {
    const p = fixture();
    const n = Array.from({ length: 100 }, (_, i) => i + 21).find((n) =>
      makeLevel(n, 'PP').troubles.some((trouble) => trouble.id === 'frost'),
    )!;
    p.level = n;
    const counters = COUNTERS.frost;
    const counter = SPECIES.find((species) => counters.includes(traitOf(species.id)!))!;
    const other = SPECIES.find(
      (species) => !makeLevel(n, 'PP').troubles.some((trouble) => COUNTERS[trouble.id].includes(traitOf(species.id)!)),
    )!;
    p.home.residents = [
      { species: counter.id, fp: 0, rewarded: 1 },
      { species: other.id, fp: 24, rewarded: 1 },
    ];
    p.galaxy[0].sec = encodeSectors(planet(Array(24).fill(homeLandFor(counter.id)!)));
    expect(pickFriend(p, 25, 8)).toBe(other.id);
  });
  it('accepts only counted wins between sends, never repeated callbacks or rollback wins', () => {
    for (const mode of ['campaign', 'voyage', 'zen', 'daily'] as const) {
      const p = fixture();
      expect(startTrip(p, 25, 1, undefined, 0)).toBe('ok');
      settleTrips(p, HOUR);
      expect(startTrip(p, 25, 1, undefined, HOUR)).toBe('needs_win');
      win(p, mode, HOUR);
      expect(startTrip(p, 25, 1, undefined, HOUR)).toBe('ok');
      win(p, mode, HOUR);
      expect(p.home.tripFuel).toBe(false);
    }
    const p = fixture();
    p.home.tripFuel = false;
    p.home.lastTick = HOUR;
    win(p, 'daily', 0);
    win(p, 'rush', HOUR);
    expect(p.home.tripFuel).toBe(false);
    expect(startTrip(p, 25, 4, undefined, 0)).toBe('clock');
  });
  it('reports blocking states and keeps trips hidden before planet 21', () => {
    const p = fixture();
    p.level = 20;
    expect(startTrip(p, 25, 4, undefined, 0)).toBe('before_planet_21');
    p.level = 21;
    p.home.residents = [];
    expect(tripStatus(p, 0).block).toBe('no_friend');
    p.home.residents.push({ species: 'bunny', fp: 0, rewarded: 1 });
    p.buddy.species = 'bunny';
    expect(tripStatus(p, 0).block).toBe('only_buddy');
    p.buddy.species = null;
    p.galaxy = [];
    expect(tripStatus(p, 0).block).toBe('no_planets');
  });
});

describe('settlement, Call home and presentation', () => {
  it('Call home pays nothing, frees the resident and allows another send', () => {
    const p = fixture();
    expect(startTrip(p, 25, 8, 'penguin', 0)).toBe('ok');
    expect(startTrip(p, 25, 8, undefined, 0)).toBe('busy');
    expect(buddyEligible(p)).not.toContain('penguin');
    expect(setBuddy(p, 'penguin')).toBe(false);
    expect(sendHome(p, 'penguin')).toBe(false);
    const before = { dust: p.dust, gems: p.gems, mats: { ...p.mats }, boosters: { ...p.boosters }, fp: p.home.residents[0].fp };
    expect(callHome(p, HOUR)).toBe(true);
    expect({ dust: p.dust, gems: p.gems, mats: p.mats, boosters: p.boosters, fp: p.home.residents[0].fp }).toEqual(before);
    expect(buddyEligible(p)).toContain('penguin');
    expect(p.home.tripReturn).toBeNull();
    expect(startTrip(p, 25, 8, 'penguin', HOUR)).toBe('ok');
    expect(callHome(p, 0)).toBe(false);
  });
  it('campaign wins take ten minutes off, clamp to now and settle at the end of the win', () => {
    const p = fixture();
    startTrip(p, 25, 1, 'penguin', 0);
    win(p, 'voyage', 0);
    expect(p.home.expedition!.ends).toBe(HOUR);
    win(p, 'campaign', 0);
    expect(p.home.expedition!.ends).toBe(HOUR - 600_000);
    expect(speedUpTrip(p.home, 4 * HOUR, 0)).toBe(true);
    expect(p.home.expedition!.ends).toBe(0);
    expect(speedUpTrip(p.home, 600_000, 0)).toBe(false);
    win(p, 'campaign', 1);
    expect(p.home.expedition).toBeNull();
    expect(p.home.tripReturn).toMatchObject({ n: 25, returnedAt: 1 });
    expect(p.home.residents[0].fp).toBe(1);
    const gems = p.gems;
    win(p, 'campaign', 1);
    expect(p.gems).toBe(gems);
  });
  it('ticks pay once, count the return only through celebrations, and expose it first and in away data', () => {
    const p = fixture();
    p.tutorial = true;
    startTrip(p, 25, 8, 'penguin', 0);
    expect(homeBadge(p, 8 * HOUR)).toBe(0);
    tickHome(p, 8 * HOUR);
    const after = JSON.stringify(p);
    tickHome(p, 8 * HOUR);
    expect(JSON.stringify(p)).toBe(after);
    expect(homeBadge(p, 8 * HOUR)).toBe(1);
    expect(nextUp(p, 8 * HOUR)).toMatchObject({ title: 'A friend is back from a trip', homeTarget: 'expedition' });
    expect(homeworldNextUp(p, 8 * HOUR).title).toBe('A friend is back from a trip');
    expect(awayCollectables(p, HOUR, 8 * HOUR)).toMatchObject({ trip: p.home.tripReturn, show: true });
    expect(awayRecapLines(p, HOUR, 8 * HOUR)[1]).toBe('A friend is back from a trip');
    p.home.seen.celebrations = [];
    expect(homeBadge(p, 8 * HOUR)).toBe(0);
  });
  it('preserves legacy loot without giving friendship, and cannot settle through a rollback', () => {
    const p = fixture();
    const legacyLoot = legacyExpeditionLoot(4, 3, 'penguin');
    p.home.expedition = { species: 'penguin', hours: 4, ends: HOUR, planet: 0, n: 25, legacyLoot };
    p.home.lastTick = 2 * HOUR;
    const gems = p.gems,
      dust = p.dust;
    expect(settleTrips(p, HOUR)).toBeNull();
    expect(settleTrips(p, 2 * HOUR)).toMatchObject({ legacyLoot });
    expect(p.dust - dust).toBe(legacyLoot.dust);
    expect(p.gems - gems).toBe(legacyLoot.gems);
    expect(p.home.residents[0].fp).toBe(0);
    expect(settleTrips(p, 7 * 24 * HOUR)).toBeNull();
  });
});

describe('trip rate and friendship regression pins', () => {
  it('counts frost per sector and other Essences per pair without a star bonus', () => {
    const p = fixture(['volcano', 'volcano', 'forest', 'forest', 'reef', 'reef', 'mountain', 'mountain', 'tundra', 'tundra']);
    const preview = previewTrip(p, 25, 8, 'bunny', 0)!;
    expect(preview.match).toBe(false);
    expect(preview.yield.mats).toEqual({ ember: 1, leaf: 1, dew: 1, stone: 1, frost: 3 });
    p.galaxy[0].stars = 1;
    expect(previewTrip(p, 25, 8, 'bunny', 0)!.yield).toEqual(preview.yield);
  });
  it('trip friendship still pays levels, keepsakes and the best-friend letter once', () => {
    const p = fixture();
    p.home.residents[0].fp = 24;
    p.home.residents[0].rewarded = 4;
    const before = p.gems;
    startTrip(p, 25, 1, 'penguin', 0);
    settleTrips(p, HOUR);
    expect(p.home.residents[0]).toMatchObject({ fp: 25, rewarded: 5 });
    expect(p.gems - before).toBe(51);
    expect(p.mementos).toContain('penguin');
    expect(p.mail.filter((mail) => mail.id === 'best-penguin')).toHaveLength(1);
    expect(settleTrips(p, 2 * HOUR)).toBeNull();
    expect(p.gems - before).toBe(51);
  });
});

describe('multiple Trouble counter preservation', () => {
  it('does not automatically send either sole counter when both would leave a Trouble uncovered', () => {
    const p = fixture();
    const n = Array.from({ length: 100 }, (_, i) => i + 21).find((n) => {
      const ids = makeLevel(n, 'PP').troubles.map((trouble) => trouble.id);
      return ids.includes('frost') && (ids.includes('vent') || ids.includes('vine'));
    });
    expect(n).toBeDefined();
    p.level = n!;
    const secondTrouble = makeLevel(n!, 'PP').troubles.find((trouble) => trouble.id !== 'frost')!.id;
    const cold = SPECIES.find(
      (species) => COUNTERS.frost.includes(traitOf(species.id)!) && !COUNTERS[secondTrouble].includes(traitOf(species.id)!),
    )!;
    const other = SPECIES.find(
      (species) => COUNTERS[secondTrouble].includes(traitOf(species.id)!) && !COUNTERS.frost.includes(traitOf(species.id)!),
    )!;
    p.home.residents = [
      { species: cold.id, fp: 0, rewarded: 1 },
      { species: other.id, fp: 0, rewarded: 1 },
    ];
    expect(pickFriend(p, 25, 8)).toBeNull();
    expect(startTrip(p, 25, 8, undefined, 0)).toBe('no_friend');
    // Someone else is an explicit choice; the automatic pick remains protective.
    expect(previewTrip(p, 25, 8, cold.id, 0)).not.toBeNull();
  });
});

// Decision 61 amendment 2 / decision 65 amendment: one planet per colour plus a frost-heavy mixed planet.
const orderEntry = (n: number, lands: BiomeId[]) => ({
  n,
  name: `P${n}`,
  hue: 0,
  stars: 3,
  life: 20,
  species: [],
  colors: [BIOMES[lands[0]].color],
  sec: encodeSectors(planet(lands)),
});
const ORDER_GALAXY: [number, BiomeId[]][] = [
  [30, Array(10).fill('tundra')],
  [31, Array(12).fill('mountain')],
  [32, Array(14).fill('forest')],
  [33, Array(12).fill('ocean')],
  [34, Array(12).fill('volcano')],
  [35, [...Array(8).fill('tundra'), ...Array(8).fill('forest')]],
];
function orderFixture() {
  const p = defaultProfile(0);
  p.level = 60;
  p.chapters = [1, 2, 3, 4, 5];
  p.home.firstHour = 2;
  p.home.plots[0] = { type: 'launch_bay', lv: 4, since: 0 };
  p.home.residents = [{ species: 'bunny', fp: 0, rewarded: 1 }];
  p.galaxy = ORDER_GALAXY.map(([n, lands]) => orderEntry(n, lands));
  return p;
}

describe('decision 61 amendment 2: A1 unit Gate', () => {
  it('the first row has the most of the colour Next Up names, for every colour', () => {
    for (const mat of MATS) {
      const p = orderFixture();
      p.home.level = 5;
      for (const kind of Object.keys(KINDS) as Kind[]) p.lab[kind] = 5;
      const kind = (Object.keys(KINDS) as Kind[]).find((k) => LAB_ESSENCE[k] === mat)!;
      p.lab[kind] = 2;
      p.home.plots[1] = { type: 'lab', kind, lv: 2, since: 0 };
      for (const other of MATS) p.mats[other] = other === mat ? 0 : 10_000;
      expect(nextEssenceNeeded(p)).toBe(mat);
      const rows = tripPlanets(p);
      expect(rows[0].mats[mat]).toBe(Math.max(...rows.map((row) => row.mats[mat] ?? 0)));
    }
  });
});

describe('decision 65 amendment (a): list order when Next Up names no colour', () => {
  it('reads every sink Next Up can name from data: Levels, Labs, open Atlas bundles; dyes are not counted', () => {
    const p = orderFixture();
    const want = essenceStillWanted(p);
    const levels = [2, 3, 4, 5].reduce((sum, l) => sum + ((HOME_LEVEL_REQUIREMENTS as any)[l].essence.frost ?? 0), 0);
    const open = CONSTELLATIONS.filter((_, i) => unlockedConstellation(p, i)).flatMap((c) => c.bundles);
    const bundles = open.reduce((sum, b) => sum + (b.need.frost ?? 0), 0);
    expect(want.frost).toBe(levels + (10 + 25 + 50 + 180) + bundles);
    p.dyes = [];
    expect(essenceStillWanted(p).frost).toBe(want.frost);
    p.bundles = open.map((b) => b.id);
    expect(essenceStillWanted(p).frost).toBe(want.frost - bundles);
  });
  it('a colour is covered once the balance meets every remaining sink, and only then', () => {
    const p = orderFixture();
    p.home.level = 5;
    for (const kind of Object.keys(KINDS) as Kind[]) p.lab[kind] = 5;
    const left = essenceStillWanted(p).frost;
    p.mats.frost = left - 1;
    expect(essencesCovered(p)).not.toContain('frost');
    p.mats.frost = left;
    expect(essencesCovered(p)).toContain('frost');
  });
  it('leads with planets that add least to covered colours, then the biggest yield, and never changes a payout', () => {
    const p = orderFixture();
    p.home.level = 5;
    for (const kind of Object.keys(KINDS) as Kind[]) p.lab[kind] = 5;
    for (const mat of ['stone', 'dew', 'leaf'] as Mat[]) p.mats[mat] = 200; // the open Landmark is covered; later sinks are not
    p.constellations = ['otter', 'mill']; // lit, so the Atlas now offers the ember and frost constellations
    p.bundles = CONSTELLATIONS.slice(0, 2).flatMap((c) => c.bundles.map((b) => b.id));
    expect(nextEssenceNeeded(p)).toBeUndefined();
    expect(essencesCovered(p)).toEqual([]);
    const before = tripPlanets(p).map((row) => row.n);
    expect(before[0]).toBe(35); // biggest total: 8 frost + 4 leaf
    const previews = Object.fromEntries(before.map((n) => [n, previewTrip(p, n, 8, 'bunny', 0)]));
    p.mats.frost = essenceStillWanted(p).frost; // 22: the frost constellation's three bundles
    p.mats.ember = essenceStillWanted(p).ember; // 20: the ember constellation's three bundles
    expect([p.mats.frost, p.mats.ember]).toEqual([22, 20]);
    expect(essencesCovered(p)).toEqual(['ember', 'frost']);
    const after = tripPlanets(p);
    expect(after.slice(0, 3).every((row) => !row.mats.frost && !row.mats.ember)).toBe(true);
    expect(after.at(-1)!.n).toBe(30);
    for (const n of before) expect(previewTrip(p, n, 8, 'bunny', 0)).toEqual(previews[n]);
  });
});
