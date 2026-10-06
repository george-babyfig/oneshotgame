// The Comet Pier's permanent feat ledger. Its site and art arrive in M11.5.
import type { Profile } from './profile';
import type { StepResult } from '../core/round';
import { REACTIONS } from '../core/round';
import { balance, earn, spend } from './wallet';

export interface CometPierProgress {
  hardWins: number;
  normalThreeStars: number;
  hardPlanets: string[];
  normalPlanets: string[];
  troubles: number;
  fusions: number;
  stage: 0 | 1 | 2 | 3 | 4;
}

export const defaultCometPier = (): CometPierProgress => ({
  hardWins: 0,
  normalThreeStars: 0,
  hardPlanets: [],
  normalPlanets: [],
  troubles: 0,
  fusions: 0,
  stage: 0,
});

export type PierMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix' | 'practice';
const counts = (mode: PierMode) => ['campaign', 'voyage', 'zen', 'daily'].includes(mode);

/** Count real stepRound events once, at the step callback. */
export function recordCometPierStep(p: Profile, step: Pick<StepResult, 'troubleEvents' | 'reactions'>, mode: PierMode): void {
  if (!counts(mode) || p.home.level < 4) return;
  if (p.cometPier.stage === 1) p.cometPier.troubles += step.troubleEvents.filter((e) => e.kind === 'settled').length;
  if (p.cometPier.stage === 2) p.cometPier.fusions += step.reactions.filter((r) => REACTIONS[r.id].kind === 'fusion').length;
  advanceCometPier(p);
}

/** A win is recorded only once per planet by the caller. */
export function recordCometPierWin(p: Profile, mode: PierMode, planet: string | number, hard: boolean, stars: number): void {
  if (!counts(mode) || p.home.level < 4 || p.cometPier.stage !== 0) return;
  const key = `${mode}:${planet}`;
  if (hard && !p.cometPier.hardPlanets.includes(key)) {
    p.cometPier.hardPlanets.push(key);
    p.cometPier.hardWins++;
  } else if (!hard && stars >= 3 && !p.cometPier.normalPlanets.includes(key)) {
    p.cometPier.normalPlanets.push(key);
    p.cometPier.normalThreeStars++;
  }
  advanceCometPier(p);
}

export function cometPierStageProgress(p: Profile): { done: number; total: number } {
  const pier = p.cometPier;
  if (pier.stage === 0) return { done: Math.max(Math.min(pier.hardWins, 3) / 3, Math.min(pier.normalThreeStars, 6) / 6), total: 1 };
  if (pier.stage === 1) return { done: Math.min(pier.troubles, 8), total: 8 };
  if (pier.stage === 2) return { done: Math.min(pier.fusions, 10), total: 10 };
  if (pier.stage === 3) return { done: Math.min(balance(p, 'leaf') / 40, balance(p, 'dew') / 30), total: 1 };
  return { done: 1, total: 1 };
}

/** Each stage starts with fresh counters when it opens. */
export function advanceCometPier(p: Profile): number {
  const pier = p.cometPier;
  if (p.home.level < 4) return pier.stage;
  if (pier.stage === 0 && (pier.hardWins >= 3 || pier.normalThreeStars >= 6)) {
    pier.stage = 1;
    pier.troubles = 0;
    earn(p, 'dust', 200, 'generic_reward');
  }
  if (pier.stage === 1 && pier.troubles >= 8) {
    pier.stage = 2;
    pier.fusions = 0;
    earn(p, 'gems', 15, 'generic_reward');
  }
  if (pier.stage === 2 && pier.fusions >= 10) {
    pier.stage = 3;
    earn(p, 'dust', 250, 'generic_reward');
  }
  return pier.stage;
}

export function finishCometPierWithResult(p: Profile): 'ok' | 'locked' | 'resources' | 'finished' {
  advanceCometPier(p);
  const status = cometPierFinishStatus(p);
  if (status !== 'ready') return status;
  spend(p, 'leaf', 40, 'comet_pier');
  spend(p, 'dew', 30, 'comet_pier');
  p.cometPier.stage = 4;
  return 'ok';
}

/** Existing Bay controls can keep their boolean click contract. */
export function finishCometPier(p: Profile): boolean {
  return finishCometPierWithResult(p) === 'ok';
}

/** The Bay can explain why the final Pier action is unavailable. */
export function cometPierFinishStatus(p: Profile): 'ready' | 'locked' | 'resources' | 'finished' {
  if (p.cometPier.stage === 4) return 'finished';
  if (p.home.level < 4 || p.cometPier.stage !== 3) return 'locked';
  return balance(p, 'leaf') >= 40 && balance(p, 'dew') >= 30 ? 'ready' : 'resources';
}
