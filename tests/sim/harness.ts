import { goalProgress, goalsMet, makeLevel, rngFrom, starsEarned, starsFor, type Difficulty, type LevelDef } from '../../src/core/levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge, type Planet } from '../../src/core/world';
import { NOVA_CHARGE } from '../../src/meta/lab';

export interface BotContext {
  level: LevelDef;
  planet: Planet;
  turn: number;
  nova: boolean;
  labLevel: number;
  random: () => number;
}

export interface BotPolicy {
  name: string;
  labLevel: number;
  chooseAim: (context: BotContext) => number;
}

function oneStep(context: BotContext): number {
  const { level, planet, turn, nova, labLevel } = context;
  let best = -Infinity;
  let aim = 0;
  for (let sector = 0; sector < SECTORS; sector++) {
    const copy = clonePlanet(planet);
    const result = impact(copy, level.queue[turn], sector, 0, { nova });
    const value =
      result.after +
      labBonus(labLevel, result.changed.length, result.spawned.length) +
      level.goals.reduce((sum, goal) => sum + 25 * Math.min(goal.count, goalProgress(copy, goal)), 0);
    if (value > best) {
      best = value;
      aim = sector;
    }
  }
  return aim;
}

function blindPolicy(name: string, aimError: number, randomShare: number, labLevel: number): BotPolicy {
  return {
    name,
    labLevel,
    chooseAim(context) {
      const { random } = context;
      if (random() < randomShare) return Math.floor(random() * SECTORS);
      let aim = oneStep(context);
      if (random() < aimError) aim += random() < 0.5 ? -1 : 1;
      return aim;
    },
  };
}

// More policies can supply their own chooseAim without changing the runner.
export const POLICIES = {
  casual: blindPolicy('casual', 0.4, 0.3, 1),
  decent: blindPolicy('decent', 0.25, 0.1, 1),
  sharp: blindPolicy('sharp', 0.1, 0, 1),
  'decent+lab3': blindPolicy('decent+lab3', 0.25, 0.1, 3),
} satisfies Record<string, BotPolicy>;

export interface PlayResult {
  stars: number;
  halfStars: number;
  scoreMet: boolean;
  goalsMet: boolean;
}

export function playLevel(level: LevelDef, policy: BotPolicy, random: () => number): PlayResult {
  const planet = clonePlanet(level.start);
  let charge = 0;
  let bonus = 0;
  let halfStars = 0;
  for (let turn = 0; turn < level.throws; turn++) {
    const nova = charge >= NOVA_CHARGE;
    const aim = policy.chooseAim({ level, planet, turn, nova, labLevel: policy.labLevel, random });
    const result = impact(planet, level.queue[turn], ((aim % SECTORS) + SECTORS) % SECTORS, 0, { nova });
    bonus += labBonus(policy.labLevel, result.changed.length, result.spawned.length);
    charge = nova ? 0 : Math.min(NOVA_CHARGE, charge + novaCharge(result.changed.length, result.spawned.length, policy.labLevel));
    if (turn + 1 === Math.floor(level.throws / 2)) halfStars = starsEarned(planet, lifeScore(planet) + bonus, level);
  }
  const score = lifeScore(planet) + bonus;
  return {
    stars: starsEarned(planet, score, level),
    halfStars,
    scoreMet: starsFor(score, level.stars) > 0,
    goalsMet: goalsMet(planet, level.goals),
  };
}

export interface PlanetMetrics {
  n: number;
  difficulty: Difficulty;
  runs: number;
  fail: number;
  threeStar: number;
  attemptsPerClear: number;
  halfThreeStar: number;
  scoreMet: number;
  goalMetWhenScoreMet: number;
}

export function runPlanet(n: number, policy: BotPolicy, runs: number, salt?: number): PlanetMetrics {
  const level = makeLevel(n, 'PP', salt === undefined ? {} : { salt });
  let failures = 0;
  let threeStars = 0;
  let halfThreeStars = 0;
  let scoreMet = 0;
  let goalMetWhenScoreMet = 0;
  for (let run = 0; run < runs; run++) {
    // The same bot decisions compare an original layout with its shadow seeds.
    const result = playLevel(level, policy, rngFrom(`sim-${policy.name}-${n}-${run}`));
    if (result.stars === 0) failures++;
    if (result.stars === 3) threeStars++;
    if (result.halfStars === 3) halfThreeStars++;
    if (result.scoreMet) {
      scoreMet++;
      if (result.goalsMet) goalMetWhenScoreMet++;
    }
  }
  return {
    n,
    difficulty: level.difficulty,
    runs,
    fail: failures / runs,
    threeStar: threeStars / runs,
    attemptsPerClear: failures === runs ? Infinity : runs / (runs - failures),
    halfThreeStar: halfThreeStars / runs,
    scoreMet,
    goalMetWhenScoreMet,
  };
}

export const BANDS = [
  [1, 10],
  [11, 20],
  [21, 30],
  [31, 45],
  [46, 60],
] as const;

export interface BandMetrics {
  band: string;
  difficulty: Difficulty;
  policy: string;
  planets: number;
  runs: number;
  fail: number;
  threeStar: number;
  attemptsPerClear: number;
}

export function summarizeBands(planets: PlanetMetrics[], policy: string): BandMetrics[] {
  const rows: BandMetrics[] = [];
  for (const [first, last] of BANDS) {
    for (const difficulty of ['normal', 'hard', 'super'] as const) {
      const group = planets.filter((planet) => planet.n >= first && planet.n <= last && planet.difficulty === difficulty);
      if (!group.length) continue;
      const totalRuns = group.reduce((sum, planet) => sum + planet.runs, 0);
      const failures = group.reduce((sum, planet) => sum + planet.fail * planet.runs, 0);
      rows.push({
        band: `${first}-${last}`,
        difficulty,
        policy,
        planets: group.length,
        runs: totalRuns,
        fail: failures / totalRuns,
        threeStar: group.reduce((sum, planet) => sum + planet.threeStar * planet.runs, 0) / totalRuns,
        attemptsPerClear: failures === totalRuns ? Infinity : totalRuns / (totalRuns - failures),
      });
    }
  }
  return rows;
}

export function runSurvey(policy: BotPolicy, runs: number, first = 1, last = 60): { planets: PlanetMetrics[]; bands: BandMetrics[] } {
  const planets = Array.from({ length: last - first + 1 }, (_, index) => runPlanet(first + index, policy, runs));
  return { planets, bands: summarizeBands(planets, policy.name) };
}
