import { describe, expect, it } from 'vitest';
import {
  GOALS_FROM,
  difficultyOf,
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
import { lifeScore } from '../src/core/world';
import { roundState, stepRound } from '../src/core/round';

describe('level generator', () => {
  it('every level in the first twelve chapters is beatable with rising targets', () => {
    for (let n = 1; n <= 120; n++) {
      const L = makeLevel(n);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      expect(L.stars[1]).toBeLessThan(L.stars[2]);
      expect(L.stars[0]).toBeGreaterThan(lifeScore(L.start));
      // the solver that set the targets can reach 3 stars
      const rules = rulesForLevel(n);
      expect(greedyScore(L.start, L.queue, L.throws, 0, L.nova, rules)).toBeGreaterThanOrEqual(L.stars[2]);
      expect(L.queue.length).toBeGreaterThanOrEqual(L.throws);
      // goals come from the solver's own line of play, so stars and goals are reachable together
      expect(goalsMet(greedyPlan(L.start, L.queue, L.throws, 0, L.nova, rules), L.goals)).toBe(true);
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
      expect(levelMeta(n)).toEqual({
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

  it('offers frost and ember goals from planet 25', () => {
    const source = new Set(['tundra', 'icesheet', 'taiga', 'volcano', 'desert', 'savanna']);
    const count = Array.from({ length: 96 }, (_, index) => makeLevel(index + 25)).filter((level) =>
      level.goals.some((goal) => goal.type === 'biome' && source.has(goal.id)),
    ).length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(22);
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
