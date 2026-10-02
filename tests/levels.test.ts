import { describe, expect, it } from 'vitest';
import {
  GOALS_FROM,
  difficultyOf,
  goalProgress,
  goalsMet,
  greedyPlan,
  greedyScore,
  levelMeta,
  makeLevel,
  pressureOf,
  budgetFor,
  skyWall,
  rulesForLevel,
  solve0,
  solve2,
  starsEarned,
} from '../src/core/levels';
import { OBSTACLES } from '../src/core/sky';
import { lifeScore, SECTORS } from '../src/core/world';
import { novaReady, roundState, stepRound } from '../src/core/round';

describe('level generator', () => {
  it('every level in the first twelve chapters is beatable with rising targets', () => {
    for (let n = 1; n <= 120; n++) {
      const L = makeLevel(n);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      expect(L.stars[1]).toBeLessThan(L.stars[2]);
      expect(L.stars[0]).toBeGreaterThan(lifeScore(L.start));
      // the solver that set the targets can reach 3 stars
      const rules = rulesForLevel(n);
      if (!L.troubles.length && n !== 2)
        expect(greedyScore(L.start, L.queue, L.throws, 0, L.nova, rules)).toBeGreaterThanOrEqual(L.stars[2]);
      expect(L.queue.length).toBeGreaterThanOrEqual(L.throws);
      // goals come from the solver's own line of play, so stars and goals are reachable together
      if (!L.troubles.length) expect(goalsMet(greedyPlan(L.start, L.queue, L.throws, 0, L.nova, rules), L.goals)).toBe(true);
      const plan2 = solve2(L);
      expect(starsEarned(plan2, lifeScore(plan2), L), `solver 2 planet ${n}`).toBe(3);
      expect(goalsMet(plan2, L.goals), `solver 2 goals planet ${n}`).toBe(true);
      const plan0 = solve0(L);
      expect(starsEarned(plan0, lifeScore(plan0), L), `solver 0 planet ${n}`).toBeGreaterThanOrEqual(1);
      if (n < GOALS_FROM) expect(L.goals).toEqual([]);
      if (n >= GOALS_FROM && difficultyOf(n) !== 'normal') expect(L.goals.length).toBeGreaterThan(0);
    }
  });

  it('keeps the first Super Hard planet out of chapter one', () => {
    expect(difficultyOf(9)).toBe('normal');
    expect(difficultyOf(5)).toBe('normal');
    expect(difficultyOf(10)).toBe('normal');
    expect(difficultyOf(19)).toBe('super');
    expect(difficultyOf(15)).toBe('hard');
    expect(difficultyOf(20)).toBe('hard');
  });

  it('teaches one dealt biome goal on planet 6 and keeps the shipped goal ramp', () => {
    const lesson = makeLevel(6);
    expect(lesson.goals).toEqual([{ type: 'biome', id: 'highland', count: 1 }]);
    expect(lesson.queue.slice(0, 3)).toEqual(['seed', 'seed', 'rock']);
    let opening = roundState(lesson.start, lesson.nova);
    for (const kind of lesson.queue.slice(0, 3)) opening = stepRound(opening, { kind, sector: 0, nova: false }).state;
    expect(goalProgress(opening.planet, lesson.goals[0])).toBeGreaterThanOrEqual(1);
    expect(starsEarned(solve0(lesson), lifeScore(solve0(lesson)), lesson)).toBeGreaterThanOrEqual(1);
    for (const [first, last, target] of [
      [7, 10, 0.3],
      [11, 20, 0.45],
      [21, 30, 0.6],
      [31, 40, 0.6],
      [41, 50, 0.6],
      [51, 60, 0.6],
    ]) {
      const normal = Array.from({ length: last - first + 1 }, (_, i) => makeLevel(first + i)).filter(
        (level) => level.difficulty === 'normal',
      );
      const share = normal.filter((level) => level.goals.length > 0).length / normal.length;
      expect(Math.abs(share - target), `Normal ${first}-${last} goal share`).toBeLessThanOrEqual(0.15);
    }
  });

  it('makes the practice 3★ path use its lesson', () => {
    const lesson = (n: number, planet: ReturnType<typeof solve2>) =>
      n === 1
        ? planet.sectors.some(
            (sector, index) =>
              (sector.biome === 'ocean' && planet.sectors[(index + 1) % SECTORS].biome === 'mountain') ||
              (sector.biome === 'mountain' && planet.sectors[(index + 1) % SECTORS].biome === 'ocean'),
          )
        : planet.speciesFound.some((id) => !makeLevel(3).start.speciesFound.includes(id));
    for (const n of [1, 3]) {
      const level = makeLevel(n);
      const aware = solve2(level);
      expect(lesson(n, aware), `planet ${n} lesson`).toBe(true);
      expect(starsEarned(aware, lifeScore(aware), level)).toBe(3);
      let state = roundState(level.start, level.nova);
      for (let turn = 0; turn < level.throws; turn++) {
        const candidates = Array.from({ length: SECTORS }, (_, sector) =>
          stepRound(state, { kind: level.queue[turn], sector, nova: novaReady(state) }),
        ).filter((candidate) => !lesson(n, candidate.state.planet));
        if (!candidates.length) break;
        state = candidates.sort((a, b) => b.after - a.after)[0].state;
      }
      expect(lesson(n, state.planet), `planet ${n} no-lesson path`).toBe(false);
      expect(starsEarned(state.planet, lifeScore(state.planet), level)).toBeLessThan(3);
    }
    const swap = makeLevel(2);
    expect(swap.queue.slice(0, 3)).toEqual(['ice', 'rock', 'seed']);
    expect(starsEarned(solve0(swap), lifeScore(solve0(swap)), swap)).toBeLessThan(3);
    expect(starsEarned(solve2(swap), lifeScore(solve2(swap)), swap)).toBe(3);
  });

  it('enables Supernova from planet 9', () => {
    for (let n = 1; n <= 20; n++) expect(makeLevel(n).nova).toBe(n >= 9);
    const early = makeLevel(8);
    const state = roundState(early.start, early.nova);
    const result = stepRound(state, { kind: early.queue[0], sector: 0, nova: true });
    expect(result.after).toBe(stepRound(state, { kind: early.queue[0], sector: 0, nova: false }).after);
    expect(result.state.charge).toBe(0);
    expect(result.novaCharge).toBe(0);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(makeLevel(17))).toBe(JSON.stringify(makeLevel(17)));
    for (let n = 1; n <= 120; n++) {
      const level = makeLevel(n);
      expect(makeLevel(n)).toEqual(level);
      expect(levelMeta(n), `planet ${n} seed ${level.seed}`).toEqual({
        name: level.name,
        hue: level.hue,
        twist: level.twist,
        difficulty: level.difficulty,
        boss: level.twist === 'boss',
        obstacle: level.sky.obstacle,
      });
    }
  });

  it('keeps sky obstacles on their ladder and within the pressure budget', () => {
    const levels = Array.from({ length: 120 }, (_, i) => makeLevel(i + 1));
    for (const [n, id] of [
      [33, 'rocks'],
      [41, 'bubble'],
      [46, 'mist'],
      [51, 'ring'],
      [57, 'tug'],
    ] as const) {
      expect(levels[n - 1].difficulty).toBe('normal');
      expect(levels[n - 1].sky.obstacle).toBe(id);
      expect(levels[n - 1].queue.slice(0, 3)).toEqual(['rock', 'ice', 'seed']);
    }
    expect(levels.slice(0, 30).every((l) => l.sky.obstacle === null)).toBe(true);
    expect(levels[54].sky.gusty).toBe(true); // reviewed Hard Solar Wind debut
    expect(levels.filter((l) => l.sky.gusty).map((l) => l.n)).toEqual([55]);
    expect(levels.every((l) => l.twist !== 'heavy')).toBe(true);
    expect(levels.every((l) => pressureOf(l) <= budgetFor(l))).toBe(true);
    const walls = levels.filter(skyWall).map((l) => l.n);
    expect(walls).toEqual([]);
    if (process.env.SHOW_SKY === '1')
      console.log(
        levels
          .filter((l) => l.sky.obstacle)
          .map((l) => `${l.n}:${OBSTACLES[l.sky.obstacle!].name}:${pressureOf(l)}`)
          .join(', '),
      );
  });

  it('paces Troubles after their lessons without stacking teaching planets', () => {
    for (const n of [16, 18]) {
      const level = makeLevel(n);
      expect(level.difficulty).toBe('normal');
      expect(level.troubles).toEqual([{ id: 'vent', source: 10 }]);
      expect(level.queue.slice(1, 3)).toContain('ice');
      expect(level.twist).toBe('none');
    }
    for (const n of [15, 19]) expect(makeLevel(n).troubles).toEqual([]);
    for (let n = 1; n <= 120; n++) {
      const level = makeLevel(n);
      if (n <= 13 || [33, 41, 46, 51, 57].includes(n)) expect(level.troubles).toEqual([]);
      if (n >= 20 && level.difficulty === 'hard') expect(level.troubles.length, `Hard planet ${n}`).toBeGreaterThan(0);
      if (n >= 29 && n <= 40) expect(level.troubles.length).toBeLessThanOrEqual(1);
      if (level.troubles.length > 1) expect(level.difficulty).toBe('super');
      for (const trouble of level.troubles) expect(rulesForLevel(n).troubles).toContain(trouble.id);
    }
  });

  it('uses a date-seeded Daily Trouble only after the lesson, and keeps quiet modes clear', () => {
    const before = makeLevel(16, 'DAY-2026-09-29', { rules: rulesForLevel(13) });
    const taught = makeLevel(16, 'DAY-2026-09-29', { rules: rulesForLevel(16) });
    expect(before.troubles).toEqual([]);
    expect(taught.troubles).toHaveLength(1);
    expect(taught.troubles[0].id).toBe('vent');
    expect(makeLevel(28, 'ZEN', { rules: rulesForLevel(28) }).troubles).toEqual([]);
    expect(makeLevel(28, 'RUSH-day', { rules: rulesForLevel(28) }).troubles).toEqual([]);
    expect(makeLevel(28, 'REMIX-day', { rules: rulesForLevel(28) }).troubles).toEqual([]);
  });

  it('offers frost and ember goals from planet 25', () => {
    const source = new Set(['tundra', 'icesheet', 'taiga', 'volcano', 'desert', 'savanna']);
    const count = Array.from({ length: 96 }, (_, index) => makeLevel(index + 25)).filter((level) =>
      level.goals.some((goal) => goal.type === 'biome' && source.has(goal.id)),
    ).length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(35);
  });

  it.skipIf(process.env.BENCH !== '1')('measures uncached generation and metadata', () => {
    const generation: number[] = [];
    const metadata: number[] = [];
    for (let n = 1; n <= 120; n++) {
      let start = performance.now();
      const meta = levelMeta(n, 'BENCH');
      metadata.push(performance.now() - start);
      start = performance.now();
      const level = makeLevel(n, 'BENCH', { goals: true });
      generation.push(performance.now() - start);
      expect(meta.name).toBe(level.name);
    }
    const report = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return { median: sorted[59].toFixed(2), p95: sorted[113].toFixed(2), max: sorted[119].toFixed(2) };
    };
    console.log('makeLevel ms', report(generation), 'levelMeta ms', report(metadata));
  });
});
