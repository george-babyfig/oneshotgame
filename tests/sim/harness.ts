import { goalProgress, goalsMet, makeLevel, rngFrom, starsEarned, starsFor, type Difficulty, type LevelDef } from '../../src/core/levels';
import { SECTORS, lifeScore, type Planet } from '../../src/core/world';
import { NO_MODIFIERS } from '../../src/core/modifiers';
import { ROUND_RULES_V0, novaReady, roundState, rulesForLevel, stepRound, type RoundRules, type RoundState } from '../../src/core/round';
import { emptySkyState, findPull, flightWorld, flyPull, isBonk, noise, PHONES, seedHint, seedPulls, type Phone, type Pull } from './flying';
import { OBSTACLES } from '../../src/core/sky';
import { bonkRefund, rockAfterBonk } from '../../src/ui/feel';
import { fly, STAR_SLING, type FlightWorld, type FlightHit } from '../../src/core/flight';

export interface BotContext {
  level: LevelDef;
  planet: Planet;
  state?: RoundState;
  turn: number;
  nova: boolean;
  labLevel: number;
  random: () => number;
  blindBest?: number;
  awareBest?: number;
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
      let aim = aware
        ? (context.awareBest ?? oneStep(context, rulesForLevel(context.level.n)))
        : (context.blindBest ?? oneStep(context, ROUND_RULES_V0));
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
  flight?: { bonks: number; fizzles: number; misses: number; surpriseBonks: number; noiseBonks: number; roundTime: number; waits: number };
}

const levelKinds = ['rock', 'ice', 'magma', 'seed', 'storm', 'sun'] as const;

/** The scene advances the held aim in frames; this independently checks the full-path badge. */
function heldFlightHit(base: Pull, at: number, launch: { x: number; y: number }, world: FlightWorld): FlightHit | null {
  const speed = 930 * base.power;
  let state = { ...launch, vx: Math.cos(base.angle) * speed, vy: Math.sin(base.angle) * speed, elapsed: 0 };
  for (let frame = 0; frame < 300; frame++) {
    const step = fly(STAR_SLING, state, world, at, 1 / 60);
    if (step.hit) return step.hit;
    state = step.state;
  }
  return null;
}

export function playLevel(
  level: LevelDef,
  policy: BotPolicy,
  random: () => number,
  rules = rulesForLevel(level.n),
  flight?: { phone: Phone; timed?: boolean; badgeAware?: boolean; retry?: number },
): PlayResult {
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
  let skyState = emptySkyState();
  const flightStats = { bonks: 0, fizzles: 0, misses: 0, surpriseBonks: 0, noiseBonks: 0, roundTime: 0, waits: 0 };
  let practiceBonkUsed = false;
  let priorPull: Pull | undefined;
  let priorSector = -1;
  const noiseScale = policy.name === 'casual' ? [4, 6, 0.25, 3] : policy.name === 'sharp' ? [1, 2, 0.05, 5] : [2.5, 4, 0.15, 4];
  const seeded = flight
    ? (() => {
        const { world, launch } = flightWorld(level, state.planet, skyState, flight.phone, 0);
        return seedPulls(`${level.seed}:${flight.phone.width}x${flight.phone.height}`, launch, world);
      })()
    : undefined;
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
    const aim = policy.chooseAim({
      level,
      planet: state.planet,
      state,
      turn,
      nova,
      labLevel: policy.labLevel,
      random,
      blindBest,
      awareBest,
    });
    let sector = ((aim % SECTORS) + SECTORS) % SECTORS;
    if (flight) {
      const timed = flight.timed ?? policy.name !== 'casual';
      const badgeAware = (flight.badgeAware ?? policy.name === 'casual') && !!level.sky.obstacle;
      let planned: Pull | null = null;
      let wait = 0;
      const learning = Math.pow(0.9, flight.retry ?? 0);
      const aimError = (noise(random) * noiseScale[0] * learning * Math.PI) / 180;
      const powerError = (noise(random) * noiseScale[1] * learning) / 100;
      const jitter = Math.max(0, noise(random) * noiseScale[2] * learning);
      const noisy = (base: Pull) => ({
        angle: base.angle + aimError,
        power: Math.max(0.02, Math.min(1, base.power + powerError)),
      });
      // The preview belongs to the held aim and intended release time. Hand
      // noise and release jitter happen only after that choice.
      const startAt = flightStats.roundTime;
      const start = flightWorld(level, state.planet, skyState, flight.phone, startAt);
      const hint = (priorSector === sector ? priorPull : undefined) ?? (seeded ? seedHint(seeded, sector, start.world) : undefined);
      // The badge-aware bot uses its preview while aiming. An untimed comparison
      // bot ignores obstacles, preserving a meaningful timing control.
      const aimingWorld = timed || badgeAware ? start.world : { ...start.world, sky: undefined };
      planned = findPull(sector, startAt, start.launch, aimingWorld, hint);
      if (badgeAware && !planned) planned = findPull(sector, startAt, start.launch, { ...start.world, sky: undefined }, hint);
      if (badgeAware && planned && isBonk(flyPull(planned, startAt, start.launch, start.world).hit) && random() < 0.6) {
        for (let tick = 4; tick <= 19; tick++) {
          const at = startAt + tick * 0.1;
          const candidateWorld = flightWorld(level, state.planet, skyState, flight.phone, at);
          if (!isBonk(flyPull(planned, at, candidateWorld.launch, candidateWorld.world).hit)) {
            wait = tick * 0.1;
            break;
          }
          if (tick === 4) {
            const guess = seeded ? seedHint(seeded, sector, candidateWorld.world) : undefined;
            const candidate = findPull(sector, at, candidateWorld.launch, candidateWorld.world, guess);
            if (candidate) {
              planned = candidate;
              wait = tick * 0.1;
              break;
            }
          }
        }
        if (!wait) wait = 1.9;
      }
      if (timed && (!planned || flyPull(planned, startAt, start.launch, start.world).hit?.kind !== 'land')) {
        for (let tick = 1; tick <= 30; tick++) {
          const at = startAt + tick * 0.1;
          const { world, launch } = flightWorld(level, state.planet, skyState, flight.phone, at);
          const guess = seeded ? seedHint(seeded, sector, world) : undefined;
          const candidate = findPull(sector, at, launch, world, guess, tick % 5 !== 0);
          if (candidate && flyPull(candidate, at, launch, world).hit?.kind === 'land') {
            planned = candidate;
            wait = tick * 0.1;
            break;
          }
        }
      }
      const intendedAt = startAt + wait;
      const at = intendedAt + jitter;
      const intended = flightWorld(level, state.planet, skyState, flight.phone, intendedAt);
      const { world, launch } = flightWorld(level, state.planet, skyState, flight.phone, at);
      const fallbackAngle = Math.atan2(intended.world.cy - intended.launch.y, intended.world.cx - intended.launch.x);
      const base = planned ?? { angle: fallbackAngle, power: 0.75 };
      priorPull = planned ?? undefined;
      priorSector = sector;
      // The held preview is fixed before hand noise. The game fires that exact
      // preview; a bonk introduced by a slipped hand is reported separately.
      const predicted = flyPull(base, intendedAt, intended.launch, intended.world);
      if (isBonk(heldFlightHit(base, intendedAt, intended.launch, intended.world)) && !isBonk(predicted.hit)) flightStats.surpriseBonks++;
      const pull = noisy(base);
      const actual = flyPull(pull, at, launch, world);
      if (isBonk(actual.hit) && !isBonk(predicted.hit)) flightStats.noiseBonks++;
      const teaching = !!level.sky.obstacle && level.n === OBSTACLES[level.sky.obstacle].debut;
      const refund: { refund: boolean; practiceUsed: boolean } = isBonk(actual.hit)
        ? bonkRefund(false, teaching, practiceBonkUsed)
        : { refund: false, practiceUsed: practiceBonkUsed };
      const teachingBonk = refund.refund;
      practiceBonkUsed = refund.practiceUsed;
      if (actual.hit?.kind === 'bonk') {
        flightStats.bonks++;
        if (actual.hit.by === 'rock' && actual.hit.rock !== undefined) skyState = rockAfterBonk(skyState, actual.hit.rock, teachingBonk);
      } else if (actual.hit?.kind === 'fizzle') flightStats.fizzles++;
      else if (actual.hit?.kind === 'miss') flightStats.misses++;
      flightStats.waits += wait;
      flightStats.roundTime = at + actual.state.elapsed + noiseScale[3];
      if (actual.hit?.kind !== 'land') {
        state.combo = { links: 0, rest: false, best: state.combo.best };
        if (teachingBonk) {
          turn--; // Same object, same turn; the round clock and obstacle keep moving.
          continue;
        }
        if (turn + 1 === Math.floor(level.throws / 2)) halfStars = starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level);
        continue;
      }
      sector = actual.hit.sector;
    }
    const step = stepRound(
      state,
      { kind: level.queue[turn], sector, nova },
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
    flight: flight ? flightStats : undefined,
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
  flight?: {
    bonks: number;
    fizzles: number;
    misses: number;
    surpriseBonks: number;
    noiseBonks: number;
    roundTimes: number[];
    waits: number;
  };
}

export function runPlanet(
  n: number,
  policy: BotPolicy,
  runs: number,
  salt?: number,
  flight?: { phone?: Phone; timed?: boolean; badgeAware?: boolean },
): PlanetMetrics {
  const level = makeLevel(n, 'PP', salt === undefined ? {} : { salt });
  let failures = 0;
  let threeStars = 0;
  let halfThreeStars = 0;
  let scoreMet = 0;
  let goalMetWhenScoreMet = 0;
  let novas = 0;
  let retryCount = 0;
  const flightTotals = { bonks: 0, fizzles: 0, misses: 0, surpriseBonks: 0, noiseBonks: 0, roundTimes: [] as number[], waits: 0 };
  for (let run = 0; run < runs; run++) {
    // The same bot decisions compare an original layout with its shadow seeds.
    const result = playLevel(
      level,
      policy,
      rngFrom(`sim-${policy.name}-${n}-${run}`),
      rulesForLevel(level.n),
      flight
        ? {
            phone: flight.phone ?? PHONES[(run + n + (policy.name === 'decent' ? 1 : 0)) % PHONES.length],
            timed: flight.timed,
            badgeAware: flight.badgeAware,
            retry: retryCount,
          }
        : undefined,
    );
    if (flight) retryCount = result.stars === 0 ? Math.min(8, retryCount + 1) : 0;
    if (result.flight) {
      flightTotals.bonks += result.flight.bonks;
      flightTotals.fizzles += result.flight.fizzles;
      flightTotals.misses += result.flight.misses;
      flightTotals.surpriseBonks += result.flight.surpriseBonks;
      flightTotals.noiseBonks += result.flight.noiseBonks;
      flightTotals.waits += result.flight.waits;
      flightTotals.roundTimes.push(result.flight.roundTime);
    }
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
    flight: flight ? flightTotals : undefined,
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
