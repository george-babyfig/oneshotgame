import { goalProgress, goalsMet, makeLevel, rngFrom, starsEarned, starsFor, type Difficulty, type LevelDef } from '../../src/core/levels';
import {
  SECTORS,
  SPECIES,
  traitOf,
  clonePlanet,
  lifeScore,
  settle,
  type BiomeId,
  type Kind,
  type Planet,
  type TraitId,
} from '../../src/core/world';
import { NO_MODIFIERS, maxLabModifiers, type RoundModifiers } from '../../src/core/modifiers';
import {
  ROUND_RULES_V0,
  lifeSparkSectors,
  novaReady,
  roundState,
  rulesForLevel,
  stepRound,
  type RoundRules,
  type RoundState,
} from '../../src/core/round';
import { landmarkStepEvidence } from '../../src/meta/roundSettlement';
import { emptySkyState, findPull, flightWorld, flyPull, isBonk, noise, PHONES, seedHint, seedPulls, type Phone, type Pull } from './flying';
import { OBSTACLES } from '../../src/core/sky';
import { bonkRefund, rockAfterBonk } from '../../src/ui/feel';
import { fly, flightParamsForLauncher, type FlightWorld, type FlightHit } from '../../src/core/flight';
import {
  LAUNCHERS,
  LAUNCH_ROSTER,
  STAR_SLING_SELECTION,
  launcherAtTune,
  type LauncherId,
  type LauncherSelection,
} from '../../src/core/launchers';
import { PULL_TO_SPEED } from './flying';
import { forecastTroubles } from '../../src/core/troubles';
import { MOMENTUM_MAX, MOMENTUM_PERKS } from '../../src/meta/momentum';

export const maxLegalExtraThrows = () => 3 + MOMENTUM_PERKS[MOMENTUM_MAX].throws;

export interface BotContext {
  level: LevelDef;
  planet: Planet;
  state?: RoundState;
  turn: number;
  nova: boolean;
  random: () => number;
  blindBest?: number;
  awareBest?: number;
  retry?: number;
  modifiers?: RoundModifiers;
}

export interface BotPolicy {
  name: string;
  chooseAim: (context: BotContext) => number;
}

export function oneStep(context: BotContext, rules: RoundRules = ROUND_RULES_V0, gainOut?: { best: number }): number {
  const { level, turn, nova } = context;
  const state = context.state ?? roundState(context.planet, level.nova, level.troubles, level.difficulty !== 'normal');
  let best = -Infinity;
  let aim = 0;
  for (let sector = 0; sector < SECTORS; sector++) {
    const result = stepRound(
      rules === ROUND_RULES_V0 ? { ...state, troubles: [] } : state,
      { kind: level.queue[turn % level.queue.length], sector, nova },
      context.modifiers ?? NO_MODIFIERS,
      rules,
    );
    if (gainOut) gainOut.best = Math.max(gainOut.best, result.after - result.before);
    const value =
      result.after +
      (rules === ROUND_RULES_V0 ? 0 : result.troubleEvents.filter((event) => event.kind === 'settled').length * 12) -
      (rules === ROUND_RULES_V0
        ? 0
        : forecastTroubles(result.state, context.modifiers ?? NO_MODIFIERS).some(
              (beat) => beat.inThrows === 1 && beat.sector !== null && !beat.blockedBy && result.state.planet.sectors[beat.sector].species,
            )
          ? 12
          : 0) +
      level.goals.reduce((sum, goal) => sum + 25 * Math.min(goal.count, goalProgress(result.state.planet, goal)), 0);
    if (value > best) {
      best = value;
      aim = sector;
    }
  }
  return aim;
}

function aimingPolicy(name: string, aimError: number, randomShare: number, aware = false): BotPolicy {
  return {
    name,
    chooseAim(context) {
      const { random } = context;
      const learning = Math.pow(0.9, context.retry ?? 0);
      if (random() < randomShare * learning) return Math.floor(random() * SECTORS);
      let aim = aware
        ? (context.awareBest ?? oneStep(context, rulesForLevel(context.level.n)))
        : (context.blindBest ?? oneStep(context, ROUND_RULES_V0));
      if (random() < aimError * learning) aim += random() < 0.5 ? -1 : 1;
      return aim;
    },
  };
}

// More policies can supply their own chooseAim without changing the runner.
export const POLICIES = {
  casual: aimingPolicy('casual', 0.4, 0.3),
  decent: aimingPolicy('decent', 0.25, 0.1, true),
  'decent-blind': aimingPolicy('decent-blind', 0.25, 0.1),
  'decent-aware': aimingPolicy('decent-aware', 0.25, 0.1, true),
  sharp: aimingPolicy('sharp', 0.1, 0, true),
  sling: aimingPolicy('sling', 0.25, 0.1, true),
  'best-launcher': aimingPolicy('best-launcher', 0.25, 0.1, true),
} satisfies Record<string, BotPolicy>;

/** A visibility hypothesis for T0: 28 steps is unchanged, 90 helps ~17%, 16 hurts ~9%. */
export function aimNoiseForSteps(visibleSteps: number): number {
  return Math.pow(28 / visibleSteps, 0.16);
}

/** Fixed player advice; the offline choice sweep evaluates every owned launcher. */
export function goodHere(level: LevelDef, id: LauncherId): boolean {
  if (id === 'swoop') return level.twist === 'moon' || level.twist === 'twin';
  if (id === 'zip') return ['fast', 'wobble', 'wind'].includes(level.twist) || level.sky.obstacle === 'mist';
  if (id === 'thumper') return level.sky.obstacle === 'rocks' || level.sky.obstacle === 'ring';
  return false;
}

const bestLauncherCache = new Map<string, LauncherId>();
export const PICK_RUNS = 16;
export function bestLauncherFor(level: LevelDef, masterSeed = 'pick-a', loadout?: Loadout): LauncherId {
  const tune = loadout ? 4 : 1;
  const key = `${level.seed}:${level.n}:${masterSeed}:${tune}:${loadout ? JSON.stringify(loadout) : 'base'}`;
  const cached = bestLauncherCache.get(key);
  if (cached) return cached;
  const available = LAUNCH_ROSTER.filter((id) => LAUNCHERS[id].debut <= level.n);
  let best: LauncherId = 'sling';
  let score = -Infinity;
  const samples = new Map<LauncherId, number[]>();
  for (const id of available) {
    const points: number[] = [];
    for (let run = 0; run < PICK_RUNS; run++) {
      const result = playLevel(
        level,
        POLICIES['decent-aware'],
        rngFrom(`launcher-pick:${level.seed}:${level.n}:${masterSeed}:${run}`),
        undefined,
        { phone: PHONES[0], timed: true },
        0,
        loadout,
        { id, tune: id === 'sling' ? 1 : tune },
      );
      points.push(result.stars * 100 + result.score / Math.max(1, level.stars[2]));
    }
    samples.set(id, points);
    const total = points.reduce((sum, value) => sum + value, 0);
    if (total > score) {
      score = total;
      best = id;
    }
  }
  const leader = samples.get(best)!;
  const tied = available.filter((id) => {
    const other = samples.get(id)!;
    const deltas = leader.map((value, run) => value - other[run]);
    const mean = deltas.reduce((sum, value) => sum + value, 0) / PICK_RUNS;
    const variance = deltas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (PICK_RUNS - 1);
    return mean <= 1.96 * Math.sqrt(variance / PICK_RUNS) + 1e-9;
  });
  // Badge advice wins statistical ties. Without a badge, require one paired
  // standard error of evidence before replacing the familiar Sling.
  const badged = tied.filter((id) => goodHere(level, id));
  if (badged.length)
    best = badged.sort((a, b) => samples.get(b)!.reduce((x, y) => x + y, 0) - samples.get(a)!.reduce((x, y) => x + y, 0))[0];
  else if (best !== 'sling' && tied.includes('sling')) {
    const sling = samples.get('sling')!;
    const deltas = leader.map((value, run) => value - sling[run]);
    const mean = deltas.reduce((sum, value) => sum + value, 0) / PICK_RUNS;
    const variance = deltas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (PICK_RUNS - 1);
    if (mean <= Math.sqrt(variance / PICK_RUNS)) best = 'sling';
  }
  bestLauncherCache.set(key, best);
  return best;
}

export interface Loadout {
  mods: RoundModifiers;
  extraThrows: number;
  lifeSpark: boolean;
  continues?: number;
}

/** Only currently obtainable power belongs in the max-loadout gate. */
export function maxLegalLoadout(level: LevelDef, opts: { masterSeed?: string } = {}): Loadout {
  const shield: TraitId | null =
    level.n < 18
      ? null
      : level.troubles[0]?.id === 'vent'
        ? 'fireproof'
        : level.troubles[0]?.id === 'vine'
          ? 'weedproof'
          : level.troubles[0]?.id === 'frost'
            ? 'frostproof'
            : null;
  const species = shield ? (SPECIES.find((candidate) => traitOf(candidate.id) === shield)?.id ?? null) : null;
  const result: Loadout = {
    mods: {
      ...NO_MODIFIERS,
      ...maxLabModifiers(),
      extraThrows: 0,
      scopeLevel: 0,
      splash: 0,
      momentum: 3,
      buddy: species ? { species, acc: '' } : null,
      buddyShield: species ? shield : null,
      boosters: { shower: true, spark: true, scope: true },
      launcher: STAR_SLING_SELECTION,
    },
    extraThrows: maxLegalExtraThrows(), // Shower's three throws are also legal.
    lifeSpark: true,
  };
  const bestLauncher = bestLauncherFor(level, opts.masterSeed ?? 'pick-max', result);
  result.mods.launcher = { id: bestLauncher, tune: bestLauncher === 'sling' ? 1 : 4 };
  return result;
}

export interface PlayResult {
  landmarkSteps: ReturnType<typeof landmarkStepEvidence>[];
  planet: Planet;
  regions: BiomeId[];
  arrivals: string[];
  labSteps: {
    kind: Kind;
    reactions: ReturnType<typeof stepRound>['reactions'];
    troubleEvents: ReturnType<typeof stepRound>['troubleEvents'];
  }[];
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
  continuesUsed: number;
  firstClearLeft: number;
  finalStarLeft: number;
  flight?: { bonks: number; fizzles: number; misses: number; surpriseBonks: number; noiseBonks: number; roundTime: number; waits: number };
}

const levelKinds = ['rock', 'ice', 'magma', 'seed', 'storm', 'sun'] as const;

/** The scene advances the held aim in frames; this independently checks the full-path badge. */
function heldFlightHit(
  base: Pull,
  at: number,
  launch: { x: number; y: number },
  world: FlightWorld,
  selection: LauncherSelection,
): FlightHit | null {
  const speed = launcherAtTune(selection.id, selection.tune).maxPull * PULL_TO_SPEED * base.power;
  let state = { ...launch, vx: Math.cos(base.angle) * speed, vy: Math.sin(base.angle) * speed, elapsed: 0 };
  for (let frame = 0; frame < 300; frame++) {
    const step = fly(flightParamsForLauncher(selection), state, world, at, 1 / 60);
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
  retry = 0,
  loadout?: Loadout,
  launcher?: LauncherSelection,
): PlayResult {
  if (level.n === 2 && level.seed.startsWith('PP-')) {
    const chance = policy.name === 'sharp' ? 1 : policy.name === 'casual' ? 0.4 : policy.name === 'decent-blind' ? 0 : 0.7;
    if (random() < chance) level = { ...level, queue: [level.queue[1], level.queue[0], ...level.queue.slice(2)] };
  }
  const start = clonePlanet(level.start);
  if (loadout?.lifeSpark) {
    for (const sector of lifeSparkSectors(level, start)) start.sectors[sector].life = Math.min(3, start.sectors[sector].life + 1);
    settle(start);
  }
  let state = roundState(start, level.nova, level.troubles, level.difficulty !== 'normal');
  const selectedLauncher =
    launcher ??
    loadout?.mods.launcher ??
    (policy.name === 'best-launcher' ? { id: bestLauncherFor(level), tune: 1 } : STAR_SLING_SELECTION);
  const rawModifiers = loadout?.mods ?? NO_MODIFIERS;
  const modifiers: RoundModifiers = {
    ...rawModifiers,
    launcher: selectedLauncher,
    buddyShield: rawModifiers.buddy && traitOf(rawModifiers.buddy.species) === rawModifiers.buddyShield ? rawModifiers.buddyShield : null,
  };
  let halfStars = 0;
  let throws = level.throws + (loadout?.extraThrows ?? 0);
  let continuesLeft = loadout?.continues ?? 0;
  let continuesUsed = 0;
  const maybeContinue = (turn: number) => {
    if (turn + 1 !== throws || !continuesLeft || starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level) > 0) return;
    continuesLeft--;
    continuesUsed++;
    throws += 5;
  };
  let gifts = 0;
  let novas = 0;
  let fusion = 0;
  let clash = 0;
  const reactionCounts: Record<string, number> = {};
  let deadThrows = 0;
  let bestDeadThrows = 0;
  let choiceDifferences = 0;
  let firstClearLeft = -1;
  const starHistory: number[] = [];
  const gainByKind: PlayResult['gainByKind'] = {};
  const deadByKind: PlayResult['deadByKind'] = {};
  const regions: BiomeId[] = [];
  const arrivals = new Set<string>();
  const labSteps: PlayResult['labSteps'] = [];
  const landmarkSteps: PlayResult['landmarkSteps'] = [];
  let skyState = emptySkyState();
  const flightStats = { bonks: 0, fizzles: 0, misses: 0, surpriseBonks: 0, noiseBonks: 0, roundTime: 0, waits: 0 };
  let practiceBonkUsed = false;
  let priorPull: Pull | undefined;
  let priorSector = -1;
  retry = flight?.retry ?? retry;
  const baseNoise = policy.name === 'casual' ? [4, 6, 0.25, 3] : policy.name === 'sharp' ? [1, 2, 0.05, 5] : [2.5, 4, 0.15, 4];
  const visibleSteps =
    modifiers.boosters.scope || modifiers.scopeLevel === 3 ? 90 : launcherAtTune(selectedLauncher.id, selectedLauncher.tune).aimSteps;
  // Conservative visibility hypothesis pending child T0; only hand angle and power noise change.
  const precision = aimNoiseForSteps(visibleSteps);
  const noiseScale = [baseNoise[0] * precision, baseNoise[1] * precision, baseNoise[2], baseNoise[3]];
  const seeded = flight
    ? (() => {
        const { world, launch } = flightWorld(level, state.planet, skyState, flight.phone, 0);
        return seedPulls(`${level.seed}:${flight.phone.width}x${flight.phone.height}`, launch, world, selectedLauncher);
      })()
    : undefined;
  for (let turn = 0; turn < throws; turn++) {
    const nova = novaReady(state);
    const blindBest = oneStep({ level, planet: state.planet, state, turn, nova, random, modifiers });
    const bestGain = { best: -Infinity };
    const awareBest = oneStep({ level, planet: state.planet, state, turn, nova, random, modifiers }, rules, bestGain);
    if (blindBest !== awareBest) choiceDifferences++;
    if (bestGain.best <= 3) bestDeadThrows++;
    const aim = policy.chooseAim({
      level,
      planet: state.planet,
      state,
      turn,
      nova,
      random,
      blindBest,
      awareBest,
      retry,
      modifiers,
    });
    let sector = ((aim % SECTORS) + SECTORS) % SECTORS;
    let bounced = false;
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
      planned = findPull(sector, startAt, start.launch, aimingWorld, hint, false, selectedLauncher);
      if (badgeAware && !planned)
        planned = findPull(sector, startAt, start.launch, { ...start.world, sky: undefined }, hint, false, selectedLauncher);
      if (badgeAware && planned && isBonk(flyPull(planned, startAt, start.launch, start.world, selectedLauncher).hit) && random() < 0.6) {
        for (let tick = 4; tick <= 19; tick++) {
          const at = startAt + tick * 0.1;
          const candidateWorld = flightWorld(level, state.planet, skyState, flight.phone, at);
          if (!isBonk(flyPull(planned, at, candidateWorld.launch, candidateWorld.world, selectedLauncher).hit)) {
            wait = tick * 0.1;
            break;
          }
          if (tick === 4) {
            const guess = seeded ? seedHint(seeded, sector, candidateWorld.world) : undefined;
            const candidate = findPull(sector, at, candidateWorld.launch, candidateWorld.world, guess, false, selectedLauncher);
            if (candidate) {
              planned = candidate;
              wait = tick * 0.1;
              break;
            }
          }
        }
        if (!wait) wait = 1.9;
      }
      if (timed && (!planned || flyPull(planned, startAt, start.launch, start.world, selectedLauncher).hit?.kind !== 'land')) {
        for (let tick = 1; tick <= 30; tick++) {
          const at = startAt + tick * 0.1;
          const { world, launch } = flightWorld(level, state.planet, skyState, flight.phone, at);
          const guess = seeded ? seedHint(seeded, sector, world) : undefined;
          const candidate = findPull(sector, at, launch, world, guess, tick % 5 !== 0, selectedLauncher);
          if (candidate && flyPull(candidate, at, launch, world, selectedLauncher).hit?.kind === 'land') {
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
      const predicted = flyPull(base, intendedAt, intended.launch, intended.world, selectedLauncher);
      if (isBonk(heldFlightHit(base, intendedAt, intended.launch, intended.world, selectedLauncher)) && !isBonk(predicted.hit))
        flightStats.surpriseBonks++;
      const pull = noisy(base);
      const actual = flyPull(pull, at, launch, world, selectedLauncher);
      bounced = !!actual.specialBounced;
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
        starHistory.push(starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level));
        maybeContinue(turn);
        continue;
      }
      sector = actual.hit.sector;
    }
    const thrownKind = level.queue[turn % level.queue.length];
    const step = stepRound(state, { kind: thrownKind, sector, nova, bounced }, modifiers, rules);
    state = step.state;
    landmarkSteps.push(landmarkStepEvidence(step));
    labSteps.push({ kind: thrownKind, reactions: step.reactions, troubleEvents: step.troubleEvents });
    for (const index of step.changed) regions.push(state.planet.sectors[index].biome);
    for (const species of step.spawned) arrivals.add(species.id);
    for (const reaction of step.reactions) {
      reactionCounts[reaction.id] = (reactionCounts[reaction.id] ?? 0) + 1;
      if (reaction.id === 'scorch') clash++;
      else fusion++;
    }
    if (step.after - step.before <= 3) {
      deadThrows++;
      deadByKind[thrownKind] = (deadByKind[thrownKind] ?? 0) + 1;
    }
    const kindGain = gainByKind[thrownKind] ?? { gain: 0, throws: 0 };
    kindGain.gain += step.after - step.before;
    kindGain.throws++;
    gainByKind[thrownKind] = kindGain;
    if (step.novaFired) novas++;
    if (firstClearLeft < 0 && starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level) > 0)
      firstClearLeft = Math.max(0, throws - turn - 1);
    starHistory.push(starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level));
    if (turn + 1 === Math.floor(level.throws / 2)) halfStars = starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level);
    if (
      level.seed.startsWith('PP-') &&
      level.n <= 3 &&
      turn + 1 === throws &&
      starsEarned(state.planet, lifeScore(state.planet) + state.bonus, level) === 0
    ) {
      if (gifts < 2) {
        gifts++;
        throws += 3;
      } else {
        state.bonus += Math.max(0, level.stars[0] - lifeScore(state.planet) - state.bonus);
      }
    }
    maybeContinue(turn);
  }
  const score = lifeScore(state.planet) + state.bonus;
  const finalStars = starsEarned(state.planet, score, level);
  const finalStarTurn = finalStars > 0 ? starHistory.findIndex((count) => count >= finalStars) : -1;
  return {
    planet: state.planet,
    regions,
    arrivals: [...arrivals],
    labSteps,
    landmarkSteps,
    score,
    frostSectors: state.planet.sectors.filter((sector) => ['tundra', 'icesheet', 'taiga'].includes(sector.biome)).length,
    stars: finalStars,
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
    continuesUsed,
    firstClearLeft,
    finalStarLeft: finalStarTurn < 0 ? -1 : Math.max(0, throws - finalStarTurn - 1),
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
  attemptsMedian: number;
  attemptsP90: number;
  slack: number;
  choiceDifferenceRate: number;
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
  masterSeed = 'default',
  loadout?: Loadout,
): PlanetMetrics {
  const level = makeLevel(n, 'PP', salt === undefined ? {} : { salt });
  let failures = 0;
  let threeStars = 0;
  let halfThreeStars = 0;
  let scoreMet = 0;
  let goalMetWhenScoreMet = 0;
  let novas = 0;
  let retryCount = 0;
  const attempts: number[] = [];
  let slackTotal = 0;
  let clears = 0;
  let choiceDifferences = 0;
  const flightTotals = { bonks: 0, fizzles: 0, misses: 0, surpriseBonks: 0, noiseBonks: 0, roundTimes: [] as number[], waits: 0 };
  for (let run = 0; run < runs; run++) {
    // The same bot decisions compare an original layout with its shadow seeds.
    const result = playLevel(
      level,
      policy,
      rngFrom(`sim-${masterSeed === 'default' ? '' : `${masterSeed}-`}${policy.name}-${n}-${run}`),
      rulesForLevel(level.n),
      flight
        ? {
            phone: flight.phone ?? PHONES[(run + n + (policy.name === 'decent' ? 1 : 0)) % PHONES.length],
            timed: flight.timed,
            badgeAware: flight.badgeAware,
            retry: retryCount,
          }
        : undefined,
      retryCount,
      loadout,
    );
    if (result.stars === 0) retryCount = Math.min(7, retryCount + 1);
    else {
      attempts.push(retryCount + 1);
      retryCount = 0;
    }
    if (result.finalStarLeft >= 0) {
      slackTotal += result.finalStarLeft / Math.max(1, result.totalThrows);
      clears++;
    }
    choiceDifferences += result.choiceDifferences;
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
    attemptsMedian: percentile(attempts, 0.5),
    attemptsP90: percentile(attempts, 0.9),
    slack: clears ? slackTotal / clears : 0,
    choiceDifferenceRate: choiceDifferences / Math.max(1, runs * level.throws),
    novas: novas / runs,
    flight: flight ? flightTotals : undefined,
  };
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 9;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
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
