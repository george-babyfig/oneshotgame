// Frozen rules behaviour (M2 guard). The M2 refactor (stepRound, RoundModifiers,
// Solver 2.0) must not change what a throw does. This file records today's
// outcome of every land × object pair, some long scripted rounds and the
// bonus tables, and compares them with the committed fixtures.
//
// Regenerate (only for an intended rules change): UPDATE_FIXTURES=1 npx vitest run tests/rules.snapshot.test.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOVA_CHARGE, rngFrom } from '../src/core/levels';
import {
  BIOMES,
  KINDS,
  SECTORS,
  biomeOf,
  boostRadius,
  clonePlanet,
  impact,
  labBonus,
  landingLabBonus,
  newPlanet,
  novaCharge,
  settle,
  type BiomeId,
  type ImpactBoost,
  type ImpactResult,
  type Kind,
  type Planet,
  type Sector,
} from '../src/core/world';
import { earnedLandingProgress } from '../src/meta/events';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'rules');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

// ------------------------------------------------------------------ fixture helpers
type Row = { id: string } & Record<string, unknown>;

/** One row per line: small, stable git diffs and a readable failure per row. */
function writeRows(file: string, rows: Row[]) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
}

function checkRows(name: string, rows: Row[], frozen = false) {
  const file = join(DIR, name);
  const actual = rows.map((r) => JSON.parse(JSON.stringify(r)) as Row);
  if (UPDATE && !frozen) {
    writeRows(file, actual);
    return;
  }
  if (!existsSync(file)) throw new Error(`Missing fixture ${file}. Generate it with UPDATE_FIXTURES=1.`);
  const expected = JSON.parse(readFileSync(file, 'utf8')) as Row[];
  expect(
    actual.map((r) => r.id),
    `${name}: row ids`,
  ).toEqual(expected.map((r) => r.id));
  const bad = actual.map((r, i) => (JSON.stringify(r) === JSON.stringify(expected[i]) ? -1 : i)).filter((i) => i >= 0);
  if (bad.length) {
    const labels = bad.slice(0, 12).map((i) => actual[i].id);
    expect(actual[bad[0]], `${name}: ${bad.length} rows differ (first: ${labels.join(', ')})`).toEqual(expected[bad[0]]);
  }
}

// ------------------------------------------------------------------ planet helpers
const BIOME_IDS = Object.keys(BIOMES) as BiomeId[];
const KIND_IDS = Object.keys(KINDS) as Kind[];

type Numbers = Pick<Sector, 'land' | 'water' | 'heat' | 'life'>;

/** A canonical sector state for each of the 17 lands. */
const LAND: Record<BiomeId, Numbers> = {
  barren: { land: 1, water: 0, heat: 0, life: 0 },
  ocean: { land: 0, water: 2, heat: 0, life: 0 },
  reef: { land: 0, water: 2, heat: 0, life: 1 },
  icesheet: { land: 0, water: 3, heat: -2, life: 0 },
  springs: { land: 0, water: 2, heat: 2, life: 0 },
  meadow: { land: 1, water: 0, heat: 0, life: 1 },
  forest: { land: 1, water: 0, heat: 0, life: 2 },
  jungle: { land: 1, water: 0, heat: 1, life: 2 },
  mountain: { land: 3, water: 0, heat: 0, life: 0 },
  highland: { land: 3, water: 0, heat: 0, life: 1 },
  desert: { land: 1, water: 0, heat: 2, life: 0 },
  savanna: { land: 1, water: 0, heat: 2, life: 1 },
  tundra: { land: 1, water: 0, heat: -2, life: 0 },
  taiga: { land: 1, water: 0, heat: -2, life: 1 },
  swamp: { land: 2, water: 2, heat: 0, life: 0 },
  marsh: { land: 2, water: 2, heat: 0, life: 1 },
  volcano: { land: 3, water: 0, heat: 2, life: 0 },
};

/** Neighbourhood contexts for the centre land. */
const CONTEXTS: { id: string; at: number; build: (centre: BiomeId, at: number) => Planet }[] = [
  // the centre on an otherwise bare planet
  { id: 'lone', at: 12, build: (c, at) => newPlanet((i) => (i === at ? LAND[c] : {})) },
  // the whole planet is this land
  { id: 'field', at: 12, build: (c) => newPlanet(() => LAND[c]) },
  // a varied ring of every land, so neighbours and creatures differ per sector
  { id: 'mixed', at: 12, build: (c, at) => newPlanet((i) => (i === at ? LAND[c] : LAND[BIOME_IDS[(i * 5 + 3) % BIOME_IDS.length]])) },
  // the same varied ring, but the throw lands on sector 0 so the splash wraps around
  { id: 'wrap', at: 0, build: (c, at) => newPlanet((i) => (i === at ? LAND[c] : LAND[BIOME_IDS[(i * 7 + 2) % BIOME_IDS.length]])) },
];

const VARIANTS: { id: string; splash: number; boost: ImpactBoost }[] = [
  { id: 'plain', splash: 0, boost: {} },
  { id: 'splash', splash: 1, boost: {} },
  { id: 'nova', splash: 0, boost: { nova: true } },
  { id: 'splash+nova', splash: 1, boost: { nova: true } },
];

const sectorRow = (s: Sector) => [s.land, s.water, s.heat, s.life, s.biome, s.species];

/** Sectors that changed in any field: [index, land, water, heat, life, biome, species]. */
function sectorDiff(before: Planet, after: Planet) {
  const out: unknown[][] = [];
  after.sectors.forEach((s, i) => {
    const a = sectorRow(before.sectors[i]);
    const b = sectorRow(s);
    if (a.some((v, k) => v !== b[k])) out.push([i, ...b]);
  });
  return out;
}

const resultRow = (r: ImpactResult) => ({
  before: r.before,
  after: r.after,
  changed: r.changed,
  spawned: r.spawned.map((s) => [s.id, s.at]),
  lost: r.lost,
});

/** What the game scene derives from a landing (events progress and Lab bonus at every level). */
function landingRow(res: ImpactResult, planet: Planet, regionBests: number[], arrived: Set<string>) {
  const earned = earnedLandingProgress(res, planet, regionBests, arrived);
  const lab: number[] = [];
  for (let lv = 1; lv <= 4; lv++) lab.push(landingLabBonus(lv, res, planet, [...regionBests], new Set(arrived)));
  lab.push(landingLabBonus(5, res, planet, regionBests, arrived)); // the last call keeps the running state
  return { earned: [earned.regions, earned.arrivals, [...earned.firstArrivals]], lab };
}

const startBests = (p: Planet) => p.sectors.map((s) => BIOMES[s.biome].value);
const startArrived = (p: Planet) => new Set(p.sectors.map((s) => s.species).filter((id): id is string => !!id));

// ------------------------------------------------------------------ builders
function matrixRows(): Row[] {
  const rows: Row[] = [];
  for (const ctx of CONTEXTS) {
    for (const centre of BIOME_IDS) {
      const base = ctx.build(centre, ctx.at);
      settle(base); // creatures that fit the starting ring are already there
      expect(base.sectors[ctx.at].biome, `${ctx.id}/${centre} builds its centre land`).toBe(centre);
      for (const kind of KIND_IDS) {
        for (const v of VARIANTS) {
          const p = clonePlanet(base);
          const res = impact(p, kind, ctx.at, v.splash, v.boost);
          rows.push({
            id: `${ctx.id}/${centre}/${kind}/${v.id}`,
            centre: p.sectors[ctx.at].biome,
            ...resultRow(res),
            diff: sectorDiff(base, p),
            found: p.speciesFound,
            ...landingRow(res, p, startBests(base), startArrived(base)),
          });
        }
      }
    }
  }
  return rows;
}

/** A seeded planet with a bit of everything. */
function seededPlanet(rnd: () => number): Planet {
  const p = newPlanet(() => ({
    land: Math.floor(rnd() * 4),
    water: rnd() < 0.35 ? 1 + Math.floor(rnd() * 3) : 0,
    heat: Math.floor(rnd() * 5) - 2,
    life: rnd() < 0.3 ? 1 : 0,
  }));
  settle(p);
  return p;
}

const SEQUENCES = [
  { seed: 'rules-seq-0', lv: 1, splash: 0, shower: false },
  { seed: 'rules-seq-1', lv: 2, splash: 1, shower: false },
  { seed: 'rules-seq-2', lv: 3, splash: 0, shower: true },
  { seed: 'rules-seq-3', lv: 4, splash: 1, shower: true },
  { seed: 'rules-seq-4', lv: 5, splash: 0, shower: false },
];
const SEQ_THROWS = 30;

/** Scripted rounds that mirror the game scene's landing: charge, Supernova, Lab bonus. */
function sequenceRows(): Row[] {
  const rows: Row[] = [];
  for (const cfg of SEQUENCES) {
    const rnd = rngFrom(cfg.seed);
    const p = seededPlanet(rnd);
    const regionBests = startBests(p);
    const arrived = startArrived(p);
    rows.push({ id: `${cfg.seed}/start`, sectors: p.sectors.map(sectorRow), found: p.speciesFound });
    let charge = 0;
    for (let t = 0; t < SEQ_THROWS; t++) {
      const kind = KIND_IDS[Math.floor(rnd() * KIND_IDS.length)];
      const at = Math.floor(rnd() * SECTORS);
      const nova = charge >= NOVA_CHARGE;
      const before = clonePlanet(p);
      const res = impact(p, kind, at, cfg.splash, { nova });
      const landing = landingRow(res, p, regionBests, arrived);
      if (nova) charge = 0;
      else charge = Math.min(NOVA_CHARGE, charge + novaCharge(res.changed.length, res.spawned.length, cfg.lv) * (cfg.shower ? 2 : 1));
      rows.push({
        id: `${cfg.seed}/${t}`,
        kind,
        at,
        nova,
        ...resultRow(res),
        diff: sectorDiff(before, p),
        found: p.speciesFound,
        ...landing,
        charge,
        bests: [...regionBests],
      });
    }
    rows.push({ id: `${cfg.seed}/end`, sectors: p.sectors.map(sectorRow), found: p.speciesFound, arrived: [...arrived] });
  }
  return rows;
}

function tableRows(): Row[] {
  const rows: Row[] = [];
  // biomeOf over its whole domain: land 0..5 × water 0..5 × heat -3..3 × life 0..3
  const biome: string[] = [];
  for (let land = 0; land <= 5; land++)
    for (let water = 0; water <= 5; water++)
      for (let heat = -3; heat <= 3; heat++) for (let life = 0; life <= 3; life++) biome.push(biomeOf({ land, water, heat, life }));
  rows.push({ id: 'biomeOf[land][water][heat+3][life]', data: biome });
  // novaCharge[lv][changed][spawned], lv 0 = the default argument
  const nova: number[][][] = [];
  for (let lv = 0; lv <= 6; lv++) {
    const byChanged: number[][] = [];
    for (let changed = 0; changed <= SECTORS; changed++) {
      const bySpawned: number[] = [];
      for (let spawned = 0; spawned <= 6; spawned++)
        bySpawned.push(lv === 0 ? novaCharge(changed, spawned) : novaCharge(changed, spawned, lv));
      byChanged.push(bySpawned);
    }
    nova.push(byChanged);
  }
  rows.push({ id: 'novaCharge[lv|0=default][changed][spawned]', data: nova });
  // labBonus[lv][changed][spawned]
  const lab: number[][][] = [];
  for (let lv = 0; lv <= 6; lv++) {
    const byChanged: number[][] = [];
    for (let changed = 0; changed <= SECTORS; changed++) {
      const bySpawned: number[] = [];
      for (let spawned = 0; spawned <= 6; spawned++) bySpawned.push(labBonus(lv, changed, spawned));
      byChanged.push(bySpawned);
    }
    lab.push(byChanged);
  }
  rows.push({ id: 'labBonus[lv][changed][spawned]', data: lab });
  rows.push({
    id: 'boostRadius',
    data: [boostRadius(), boostRadius({}), boostRadius({ nova: false }), boostRadius({ nova: true, lv: 5 })],
  });
  rows.push({ id: 'NOVA_CHARGE', data: NOVA_CHARGE });
  // hand-made landingLabBonus cases, including a worse throw and repeat arrivals
  const planet = newPlanet((i) => (i < 6 ? LAND.forest : i < 12 ? LAND.ocean : {}));
  settle(planet);
  const cases: { name: string; res: ImpactResult; bests: number[]; arrived: string[] }[] = [
    { name: 'no change', res: { before: 10, after: 10, changed: [], spawned: [], lost: [] }, bests: startBests(planet), arrived: [] },
    {
      name: 'new bests and arrivals',
      res: {
        before: 10,
        after: 30,
        changed: [0, 1, 6, 12],
        spawned: [
          { id: 'deer', at: 0 },
          { id: 'fish', at: 6 },
        ],
        lost: [],
      },
      bests: Array(SECTORS).fill(0),
      arrived: ['fish'],
    },
    {
      name: 'worse throw pays nothing but still tracks',
      res: { before: 30, after: 20, changed: [0, 1], spawned: [{ id: 'otter', at: 5 }], lost: ['deer'] },
      bests: Array(SECTORS).fill(0),
      arrived: [],
    },
    {
      name: 'regions already at their best',
      res: { before: 10, after: 12, changed: [0, 1, 2], spawned: [{ id: 'deer', at: 0 }], lost: [] },
      bests: Array(SECTORS).fill(9),
      arrived: ['deer'],
    },
  ];
  for (const c of cases) {
    const out: unknown[] = [];
    for (let lv = 0; lv <= 6; lv++) {
      const bests = [...c.bests];
      const arrived = new Set(c.arrived);
      out.push([landingLabBonus(lv, c.res, planet, bests, arrived), bests, [...arrived]]);
    }
    rows.push({ id: `landingLabBonus/${c.name}`, data: out });
  }
  return rows;
}

// ------------------------------------------------------------------ tests
describe('rules snapshot (M2 guard)', () => {
  it('builds every land from its canonical numbers', () => {
    for (const id of BIOME_IDS) expect(biomeOf(LAND[id]), id).toBe(id);
    expect(BIOME_IDS).toHaveLength(17);
    expect(KIND_IDS).toHaveLength(6);
  });

  it('17 lands × 6 objects preserve every ordinary impact', () => {
    const rows = matrixRows();
    checkRows(
      'base-impact-matrix.json',
      rows.filter((row) => !row.id.endsWith('/nova') && !row.id.endsWith('/splash+nova')),
      true,
    );
    expect(rows).toHaveLength(CONTEXTS.length * 17 * 6 * VARIANTS.length);
    checkRows('impact-matrix.json', rows);
  });

  it('scripted multi-throw rounds record the new Supernova rules', () => {
    const rows = sequenceRows();
    expect(rows).toHaveLength(SEQUENCES.length * (SEQ_THROWS + 2));
    checkRows('sequences.json', rows);
  });

  it('biome, Supernova charge and Object Lab tables are recorded', () => {
    checkRows('tables.json', tableRows());
  });

  it('is deterministic within a run', () => {
    expect(JSON.stringify(sequenceRows())).toBe(JSON.stringify(sequenceRows()));
  });
});
