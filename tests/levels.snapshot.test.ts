// Frozen level generator (M2 guard). The M2 refactor (Solver 2.0 / Solver 0,
// memoised makeLevel, levelMeta) must leave every generated planet identical.
// This file records full LevelDefs for the campaign and every mode's seed family,
// plus the greedy solver's line of play, and compares them with the committed fixtures.
//
// Regenerate (only for an intended generator change): UPDATE_FIXTURES=1 npx vitest run tests/levels.snapshot.test.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BOSS_HP,
  DIFFICULTY_DUST,
  GOALS_FROM,
  LEVEL_SALT,
  NOVA_CHARGE,
  TUNE,
  TWISTS,
  availableKinds,
  difficultyOf,
  greedyPlan,
  greedyScore,
  makeLevel,
  type LevelDef,
} from '../src/core/levels';
import { SECTORS, lifeScore, type Kind, type Planet } from '../src/core/world';
import { novaReady, roundState, stepRound } from '../src/core/round';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { challengeLevel, dailyLevel, rushLevel, zenLevel } from '../src/meta/modes';
import { VOYAGE_LEN, voyageBase, voyageLevel } from '../src/meta/voyage';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__', 'levels');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

// ------------------------------------------------------------------ fixture helpers
type Row = { id: string } & Record<string, unknown>;

/** One row per line: small, stable git diffs and a readable failure per row. */
function writeRows(file: string, rows: Row[]) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
}

function checkRows(name: string, rows: Row[]) {
  const file = join(DIR, name);
  const actual = rows.map((r) => JSON.parse(JSON.stringify(r)) as Row);
  if (UPDATE) {
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

// ------------------------------------------------------------------ encoding
/** Every LevelDef field. A new field must be added here (and to the encoder) on purpose. */
const LEVEL_KEYS = [
  'difficulty',
  'goals',
  'hue',
  'n',
  'name',
  'nova',
  'queue',
  'seed',
  'size',
  'sky',
  'spin',
  'stars',
  'start',
  'throws',
  'troubles',
  'twist',
];
const PLANET_KEYS = ['sectors', 'speciesFound'];
const SECTOR_KEYS = ['biome', 'heat', 'land', 'life', 'species', 'water'];

/** Sectors as [land, water, heat, life, biome, species]. */
const planetRow = (p: Planet) => ({
  sectors: p.sectors.map((s) => [s.land, s.water, s.heat, s.life, s.biome, s.species]),
  found: p.speciesFound,
});

function levelRow(id: string, L: LevelDef): Row {
  return {
    id,
    n: L.n,
    seed: L.seed,
    name: L.name,
    hue: L.hue,
    difficulty: L.difficulty,
    ...(L.nova ? {} : { nova: false }),
    twist: L.twist,
    sky: L.sky,
    spin: L.spin,
    size: L.size,
    throws: L.throws,
    stars: L.stars,
    goals: L.goals.map((g) => [g.type, g.id, g.count]),
    troubles: L.troubles.map((trouble) => [trouble.id, trouble.source]),
    queue: L.queue.join(' '),
    start: planetRow(L.start),
  };
}

function expectShape(id: string, L: LevelDef) {
  expect(Object.keys(L).sort(), `${id}: LevelDef keys`).toEqual(LEVEL_KEYS);
  expect(Object.keys(L.start).sort(), `${id}: Planet keys`).toEqual(PLANET_KEYS);
  for (const s of L.start.sectors) expect(Object.keys(s).sort(), `${id}: Sector keys`).toEqual(SECTOR_KEYS);
  for (const g of L.goals) expect(Object.keys(g).sort(), `${id}: Goal keys`).toEqual(['count', 'id', 'type']);
}

// ------------------------------------------------------------------ level families
const CAMPAIGN_MAX = 120;
const MODE_MAX = 20;

/** Seed families the app passes to makeLevel (src/meta/modes.ts, src/meta/voyage.ts). */
const FAMILIES: { prefix: string; o?: { goals?: boolean; boss?: boolean } }[] = [
  { prefix: 'VOY-2026-W40-0', o: { goals: true, boss: false } },
  { prefix: 'VOY-2026-W40-6', o: { goals: true, boss: true } },
  { prefix: 'DAY-2026-09-28' },
  { prefix: 'RUSH-K7M2Q' },
  { prefix: 'ZEN' },
  { prefix: 'CH-K7M2Q' },
];

function campaignRows(): Row[] {
  const rows: Row[] = [];
  for (let n = 1; n <= CAMPAIGN_MAX; n++) {
    const L = makeLevel(n);
    expectShape(`PP-${n}`, L);
    rows.push(levelRow(`PP-${n}`, L));
  }
  // the reviewed layout substitution and the original it replaced
  rows.push(levelRow('PP-24/salt0', makeLevel(24, 'PP', { salt: 0 })));
  rows.push(levelRow('PP-7/salt5', makeLevel(7, 'PP', { salt: 5 })));
  return rows;
}

function modeRows(): Row[] {
  const rows: Row[] = [];
  for (const f of FAMILIES) {
    for (let n = 1; n <= MODE_MAX; n++) {
      const L = f.o ? makeLevel(n, f.prefix, f.o) : makeLevel(n, f.prefix);
      expectShape(`${f.prefix}/${n}`, L);
      rows.push(levelRow(`${f.prefix}/${n}`, L));
    }
  }
  // the mode wrappers exactly as the app calls them
  for (const day of ['2026-01-01', '2026-09-28', '2027-02-28', '2028-12-31']) rows.push(levelRow(`dailyLevel(${day})`, dailyLevel(day)));
  for (const seed of ['K7M2Q', '22222', 'ZZZZZ']) {
    rows.push(levelRow(`rushLevel(${seed})`, rushLevel(seed)));
    rows.push(levelRow(`challengeLevel(${seed})`, challengeLevel(seed)));
  }
  rows.push(levelRow('zenLevel(null)', zenLevel(null)));
  for (const week of ['2026-W01', '2026-W40'])
    for (const level of [1, 30, 80]) {
      const base = voyageBase(level);
      for (let i = 0; i < VOYAGE_LEN; i++) rows.push(levelRow(`voyageLevel(${week},${base},${i})`, voyageLevel(week, base, i)));
    }
  return rows;
}

/**
 * Today's greedy rule, replayed step by step so its moves can be recorded.
 * It must reproduce greedyPlan's final planet exactly (checked below), so the moves
 * are the solver's real line of play: best `after` wins, first sector on ties.
 */
function greedyMoves(start: Planet, queue: Kind[], throws: number, splash = 0, novaEnabled = true) {
  let state = roundState(start, novaEnabled);
  const moves: [Kind, number, boolean][] = [];
  for (let t = 0; t < throws; t++) {
    const kind = queue[t];
    const nova = novaReady(state);
    let best = -1;
    let bestAt = 0;
    for (let i = 0; i < SECTORS; i++) {
      const r = stepRound(state, { kind, sector: i }, { ...NO_MODIFIERS, splash });
      if (r.after > best) {
        best = r.after;
        bestAt = i;
      }
    }
    state = stepRound(state, { kind, sector: bestAt }, { ...NO_MODIFIERS, splash }).state;
    moves.push([kind, bestAt, nova]);
  }
  return { moves, planet: state.planet };
}

function greedyRows(): Row[] {
  const rows: Row[] = [];
  for (let n = 1; n <= 60; n++) {
    const L = makeLevel(n);
    const plan = greedyPlan(L.start, L.queue, L.throws, 0, L.nova);
    const replay = greedyMoves(L.start, L.queue, L.throws, 0, L.nova);
    expect(replay.planet, `PP-${n}: replayed greedy line matches greedyPlan`).toEqual(plan);
    rows.push({
      id: `PP-${n}`,
      score: lifeScore(plan),
      greedyScore: greedyScore(L.start, L.queue, L.throws, 0, L.nova),
      moves: replay.moves.map(([k, at, nova]) => `${k}@${at}${nova ? '!' : ''}`).join(' '),
      final: planetRow(plan),
    });
  }
  return rows;
}

function constantRows(): Row[] {
  const campaign = (n: number) => [difficultyOf(n), difficultyOf(n, 'PP'), difficultyOf(n, 'VOY-2026-W40-0'), availableKinds(n).join(' ')];
  return [
    { id: 'TUNE', data: TUNE },
    { id: 'LEVEL_SALT', data: LEVEL_SALT },
    { id: 'NOVA_CHARGE/BOSS_HP/GOALS_FROM', data: [NOVA_CHARGE, BOSS_HP, GOALS_FROM] },
    { id: 'DIFFICULTY_DUST', data: DIFFICULTY_DUST },
    { id: 'TWISTS', data: Object.keys(TWISTS) },
    { id: 'difficultyOf/availableKinds 1-120', data: Array.from({ length: CAMPAIGN_MAX }, (_, i) => campaign(i + 1)) },
  ];
}

// ------------------------------------------------------------------ tests
describe('level snapshot (M2 guard)', () => {
  it('campaign planets 1-120 (PP) are unchanged in every field', () => {
    checkRows('campaign-PP.json', campaignRows());
  });

  it('every mode seed family (Voyage, Daily, Rush, Zen, Challenge) is unchanged', () => {
    checkRows('modes.json', modeRows());
  });

  it("greedy solver's moves and final planet for planets 1-60 are unchanged", () => {
    checkRows('greedy-PP.json', greedyRows());
  });

  it('generator constants and ladders are unchanged', () => {
    checkRows('constants.json', constantRows());
  });

  it('is deterministic and hands out independent copies', () => {
    for (const n of [1, 17, 24, 50, 99]) {
      const a = makeLevel(n);
      const json = JSON.stringify(a);
      a.start.sectors[0].land = 5;
      a.queue.reverse();
      a.stars[0] = -1;
      a.goals.push({ type: 'biome', id: 'ocean', count: 99 });
      expect(JSON.stringify(makeLevel(n)), `planet ${n}`).toBe(json);
    }
    // order of generation does not matter
    const forward = [3, 4, 5].map((n) => JSON.stringify(makeLevel(n, 'DAY-2026-09-28')));
    const backward = [5, 4, 3].map((n) => JSON.stringify(makeLevel(n, 'DAY-2026-09-28'))).reverse();
    expect(backward).toEqual(forward);
  });
});
