import { goalProgress, goalsMet, makeLevel, rngFrom, starsEarned, starsFor, type Difficulty, type LevelDef } from '../../src/core/levels';
import { SECTORS, lifeScore, type Planet } from '../../src/core/world';
import { NO_MODIFIERS } from '../../src/core/modifiers';
import { ROUND_RULES_V0, novaReady, roundState, rulesForLevel, stepRound, type RoundRules, type RoundState } from '../../src/core/round';

export interface BotContext {
  level: LevelDef;
  planet: Planet;
  state?: RoundState;
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

export function oneStep(context: BotContext, rules: RoundRules = ROUND_RULES_V0, gainOut?: { best: number }): number {
  const { level, turn, nova, labLevel } = context;
  const state = context.state ?? roundState(context.planet, level.nova);
  let best = -Infinity;
  let aim = 0;
  for (let sector = 0; sector < SECTORS; sector++) {
    const result = stepRound(state, { kind: level.queue[turn], sector, nova }, NO_MODIFIERS, rules);
    if (gainOut) gainOut.best = Math.max(gainOut.best, result.after - result.before);
    const value =
      result.after +
      (labLevel >= 2 ? result.changed.length * 2 : 0) +
      (labLevel >= 4 ? result.spawned.length * 6 : 0) +
      (labLevel >= 5 ? 3 : 0) +
      level.goals.reduce((sum, goal) => sum + 25 * Math.min(goal.count, goalProgress(result.state.planet, goal)), 0);
    if (value > best) {
      best = value;
      aim = sector;
    }
  }
  return aim;
}

function aimingPolicy(name: string, aimError: number, randomShare: number, labLevel: number, aware = false): BotPolicy {
  return {
    name,
    labLevel,
    chooseAim(context) {
      const { random } = context;
      if (random() < randomShare) return Math.floor(random() * SECTORS);
      let aim = oneStep(context, aware ? rulesForLevel(context.level.n) : ROUND_RULES_V0);
      if (random() < aimError) aim += random() < 0.5 ? -1 : 1;
      return aim;
    },
  };
}

// More policies can supply their own chooseAim without changing the runner.
export const POLICIES = {
  casual: aimingPolicy('casual', 0.4, 0.3, 1),
  decent: aimingPolicy('decent', 0.25, 0.1, 1),
  'decent-blind': aimingPolicy('decent-blind', 0.25, 0.1, 1),
  'decent-aware': aimingPolicy('decent-aware', 0.25, 0.1, 1, true),
  sharp: aimingPolicy('sharp', 0.1, 0, 1, true),
  'decent+lab3': aimingPolicy('decent+lab3', 0.25, 0.1, 3),
} satisfies Record<string, BotPolicy>;

export interface PlayResult {
  score: number;
  frostSectors: number;
  stars: number;
  halfStars: number;
  scoreMet: boolean;
  goalsMet: boolean;
  novas: number;
  fusion: number;
  clash: number;
  reactionCounts: Record<string, number>;
  bestCombo: number;
  deadThrows: number;
  bestDeadThrows: number;
  totalThrows: number;
  gainByKind: Partial<Record<(typeof levelKinds)[number], { gain: number; throws: number }>>;
  deadByKind: Partial<Record<(typeof levelKinds)[number], number>>;
  choiceDifferences: number;
}

const levelKinds = ['rock', 'ice', 'magma', 'seed', 'storm', 'sun'] as const;

export function playLevel(level: LevelDef, policy: BotPolicy, random: () => number, rules = rulesForLevel(level.n)): PlayResult {
  let state = roundState(level.start, level.nova);
  let halfStars = 0;
  let throws = level.throws;
  let gifts = 0;
  let novas = 0;
  let fusion = 0;
  let clash = 0;
  const reactionCounts: Record<string, number> = {};
  let deadThrows = 0;
  let bestDeadThrows = 0;
  let choiceDifferences = 0;
  const gainByKind: PlayResult['gainByKind'] = {};
  const deadByKind: PlayResult['deadByKind'] = {};
  for (let turn = 0; turn < throws; turn++) {
    const nova = novaReady(state);
    const blindBest = oneStep({ level, planet: state.planet, state, turn, nova, labLevel: policy.labLevel, random });
    const bestGain = { best: -Infinity };
    const awareBest = oneStep(
      { level, planet: state.planet, state, turn, nova, labLevel: policy.labLevel, random },
      rulesForLevel(level.n),
      bestGain,
    );
    if (blindBest !== awareBest) choiceDifferences++;
    if (bestGain.best <= 3) bestDeadThrows++;
    const aim = policy.chooseAim({ level, planet: state.planet, state, turn, nova, labLevel: policy.labLevel, random });
    const step = stepRound(
      state,
      { kind: level.queue[turn], sector: ((aim % SECTORS) + SECTORS) % SECTORS, nova },
      { ...NO_MODIFIERS, lab: { [level.queue[turn]]: policy.labLevel } },
      rules,
    );
    state = step.state;
    for (const reaction of step.reactions) {
      reactionCounts[reaction.id] = (reactionCounts[reaction.id] ?? 0) + 1;
      if (reaction.id === 'scorch') clash++;
      else fusion++;
    }
    if (step.after - step.before <= 3) {
      deadThrows++;
      deadByKind[level.queue[turn]] = (deadByKind[level.queue[turn]] ?? 0) + 1;
    }
    const kindGain = gainByKind[level.queue[turn]] ?? { gain: 0, throws: 0 };
    kindGain.gain += step.after - step.before;
    kindGain.throws++;
    gainByKind[level.queue[turn]] = kindGain;
    if (step.novaFired) novas++;
    if (turn + 1 === Math.floor(level.throws / 2)) halfStars = starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level);
    if (level.n <= 3 && turn + 1 === throws && starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level) === 0) {
      if (gifts < 2) {
        gifts++;
        throws += 3;
      } else {
        state.bonus += Math.max(0, level.stars[0] - lifeScore(state.planet) - state.bonus);
      }
    }
  }
  const score = lifeScore(state.planet) + state.bonus;
  return {
    score,
    frostSectors: state.planet.sectors.filter((sector) => ['tundra', 'icesheet', 'taiga'].includes(sector.biome)).length,
    stars: starsEarned(state.planet, score, level),
    halfStars,
    scoreMet: starsFor(score, level.stars) > 0,
    goalsMet: goalsMet(state.planet, level.goals),
    novas,
    fusion,
    clash,
    reactionCounts,
    bestCombo: state.combo.best,
    deadThrows,
    bestDeadThrows,
    totalThrows: throws,
    gainByKind,
    deadByKind,
    choiceDifferences,
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
  novas: number;
}

export function runPlanet(n: number, policy: BotPolicy, runs: number, salt?: number): PlanetMetrics {
  const level = makeLevel(n, 'PP', salt === undefined ? {} : { salt });
  let failures = 0;
  let threeStars = 0;
  let halfThreeStars = 0;
  let scoreMet = 0;
  let goalMetWhenScoreMet = 0;
  let novas = 0;
  for (let run = 0; run < runs; run++) {
    // The same bot decisions compare an original layout with its shadow seeds.
    const result = playLevel(level, policy, rngFrom(`sim-${policy.name}-${n}-${run}`));
    novas += result.novas;
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
    novas: novas / runs,
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
  novas?: number;
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
        novas: group.reduce((sum, planet) => sum + planet.novas * planet.runs, 0) / totalRuns,
      });
    }
  }
  return rows;
}

export function runSurvey(policy: BotPolicy, runs: number, first = 1, last = 60): { planets: PlanetMetrics[]; bands: BandMetrics[] } {
  const planets = Array.from({ length: last - first + 1 }, (_, index) => runPlanet(first + index, policy, runs));
  return { planets, bands: summarizeBands(planets, policy.name) };
}
