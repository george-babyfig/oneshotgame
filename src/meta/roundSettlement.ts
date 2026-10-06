import { BIOMES, type BiomeId } from '../core/world';
import { eligibleStepEvidence, type ReactionId, type StepResult } from '../core/round';
import type { Difficulty } from '../core/levels';
import type { Profile } from './profile';
import type { EconomyMode } from './homeworldTypes';
import { grownSectorsOf, queueHomeCelebration, recordHomeworldWin } from './homeworld';
import { recordLandmarkRound } from './landmarks';
import type { Planet } from '../core/world';
import type { EligibleRoundResult } from './homeworldLife';

export interface RoundStepEvidence {
  firstArrivals: string[];
  improvedSectors: Partial<Record<BiomeId, number>>;
  improvedSectorIds?: Partial<Record<BiomeId, number[]>>;
  fusions: number;
  supernovas: number;
  settledTroubles: number;
  settledVent: number;
  settledVine: number;
  reactions: Partial<Record<ReactionId, number>>;
}

/** Keep exact sector IDs before a later step changes the same land again. */
export function landmarkStepEvidence(step: StepResult): RoundStepEvidence {
  const evidence = eligibleStepEvidence(step);
  const improvedSectorIds: Partial<Record<BiomeId, number[]>> = {};
  for (const index of step.newRegionBests) {
    const biome = step.state.planet.sectors[index]?.biome;
    if (biome) (improvedSectorIds[biome] ??= []).push(index);
  }
  return { ...evidence, improvedSectorIds };
}

export interface SettledRound {
  mode: EconomyMode;
  roundKey: string;
  planetKey: string;
  planet: Planet;
  startPlanet?: Planet;
  won: boolean;
  writesProgress: boolean;
  stars: number;
  difficulty: Difficulty;
  newStars: number;
  knownKindsBefore?: string[];
  firstPlanetWin?: boolean;
  buddySpecies: string | null;
  at: number;
  steps: RoundStepEvidence[];
}

/** Credit the completed round once; the saved key and step summaries survive a web view restore. */
export function settleHomeworldRound(p: Profile, round: SettledRound): EligibleRoundResult {
  const empty: EligibleRoundResult = { earned: [], celebrations: [] };
  if (!round.won || !round.writesProgress || !['campaign', 'voyage', 'zen', 'daily'].includes(round.mode)) return empty;
  const grownSectors = grownSectorsOf(round.planet);
  recordHomeworldWin(p, {
    mode: round.mode,
    roundKey: round.roundKey,
    planetKey: round.planetKey,
    buddySpecies: round.buddySpecies,
    grownSectors,
    at: round.at,
  });
  const evidence: RoundStepEvidence = {
    firstArrivals: [],
    improvedSectors: {},
    fusions: 0,
    supernovas: 0,
    settledTroubles: 0,
    settledVent: 0,
    settledVine: 0,
    reactions: {},
  };
  for (const step of round.steps) {
    evidence.firstArrivals.push(...step.firstArrivals);
    for (const [biome, count] of Object.entries(step.improvedSectors))
      evidence.improvedSectors[biome as BiomeId] = (evidence.improvedSectors[biome as BiomeId] ?? 0) + count;
    for (const [biome, ids] of Object.entries(step.improvedSectorIds ?? {}))
      (evidence.improvedSectorIds ??= {})[biome as BiomeId] = [...(evidence.improvedSectorIds?.[biome as BiomeId] ?? []), ...ids];
    for (const [reaction, count] of Object.entries(step.reactions))
      evidence.reactions[reaction as ReactionId] = (evidence.reactions[reaction as ReactionId] ?? 0) + count;
    evidence.fusions += step.fusions;
    evidence.supernovas += step.supernovas;
    evidence.settledTroubles += step.settledTroubles;
    evidence.settledVent += step.settledVent;
    evidence.settledVine += step.settledVine;
  }
  if (round.startPlanet) {
    evidence.improvedSectorIds ??= {};
    // A route remembers sector IDs, so Mountain → Highland still grows one sector.
    for (let i = 0; i < round.planet.sectors.length; i++) {
      const before = round.startPlanet.sectors[i];
      const after = round.planet.sectors[i];
      if (!before || !after || BIOMES[after.biome].value <= BIOMES[before.biome].value) continue;
      (evidence.improvedSectorIds![after.biome] ??= []).push(i);
    }
  }
  const result = recordLandmarkRound(p, {
    ...round,
    ...evidence,
    grownSectors,
  });
  for (const id of result.celebrations) queueHomeCelebration(p, id);
  return result;
}
