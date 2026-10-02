import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID, type Kind } from '../core/world';
import { type Goal, type LevelDef } from '../core/levels';
import { NO_MODIFIERS, type RoundMode } from '../core/modifiers';
import { novaReady, roundState, stepRound, rulesForLevel, type ReactionId } from '../core/round';
import { TROUBLES, type TroubleEvent } from '../core/troubles';
import { OBSTACLES } from '../core/sky';
import { t, tp } from '../i18n';
import type { Profile } from './profile';

export type HelpRung = 'whatHappened' | 'tip' | 'buddyThrows' | 'hintTry';
export type RoundEventLog = {
  troubles: TroubleEvent[];
  reactions: ReactionId[];
  bonks: ('moon' | 'rock' | 'ring' | 'bubble' | 'mist' | 'miss')[];
  wandered: string[];
  missedGoals: Goal[];
};

export const emptyRoundLog = (): RoundEventLog => ({ troubles: [], reactions: [], bonks: [], wandered: [], missedGoals: [] });

/** Rungs accumulate. The fourth counted fail repeats the Buddy gift; the fifth adds a hint try. */
export function helpAtFailCount(fails: number): HelpRung[] {
  if (fails < 1) return [];
  return [
    'whatHappened',
    ...(fails >= 2 ? (['tip'] as const) : []),
    ...(fails >= 3 ? (['buddyThrows'] as const) : []),
    ...(fails >= 5 ? (['hintTry'] as const) : []),
  ];
}

export function helpFor(p: Profile, planet: number, mode: RoundMode): HelpRung[] {
  if (mode !== 'campaign' || planet < 1 || p.level > planet || (p.stars[planet] ?? 0) > 0) return [];
  return helpAtFailCount(p.fails[planet] ?? 0);
}

export function helpThrowsForAttempt(p: Profile, planet: number, mode: RoundMode): number {
  return helpFor(p, planet, mode).includes('buddyThrows') ? 2 : 0;
}

/** Most concrete, actionable events lead; the missed goal is the fallback. */
export function whatHappened(events: RoundEventLog): string[] {
  const facts: string[] = [];
  for (const id of ['vent', 'vine', 'frost'] as const) {
    const acts = events.troubles.filter((event) => event.id === id && (event.kind === 'act' || event.kind === 'spread'));
    if (acts.length) {
      const sectors = new Set(acts.map((event) => event.sector)).size;
      const vars = { trouble: t(TROUBLES[id].name), counter: t(TROUBLES[id].counter) };
      facts.push(
        id === 'vent'
          ? tp(sectors, '{trouble} dried one sector · {counter}', '{trouble} dried {n} sectors · {counter}', vars)
          : id === 'frost'
            ? tp(sectors, '{trouble} cooled one sector · {counter}', '{trouble} cooled {n} sectors · {counter}', vars)
            : tp(sectors, '{trouble} reached one sector · {counter}', '{trouble} reached {n} sectors · {counter}', vars),
      );
    }
  }
  if (events.reactions.includes('scorch')) facts.push(t('A Dry Spell dried the land.'));
  for (const by of ['rock', 'moon', 'ring', 'bubble', 'mist', 'miss'] as const) {
    const count = events.bonks.filter((value) => value === by).length;
    if (count)
      facts.push(
        by === 'miss'
          ? tp(count, 'One throw flew past the planet.', '{n} throws flew past the planet.')
          : tp(count, 'One throw met {obstacle}.', '{n} throws met {obstacle}.', {
              obstacle:
                by === 'moon'
                  ? t('the moon')
                  : by === 'mist'
                    ? t('the mist')
                    : t(OBSTACLES[by === 'rock' ? 'rocks' : by === 'bubble' ? 'bubble' : 'ring'].name),
            }),
      );
  }
  for (const species of [...new Set(events.wandered)]) {
    const name = SPECIES_BY_ID[species]?.name;
    if (name) facts.push(t('{creature} wandered off.', { creature: t(name) }));
  }
  for (const goal of events.missedGoals) {
    if (goal.type === 'biome' && goal.id in BIOMES)
      facts.push(t('The {land} goal needs more sectors.', { land: t(BIOMES[goal.id as keyof typeof BIOMES].name) }));
    else if (goal.type === 'species' && SPECIES_BY_ID[goal.id])
      facts.push(t('{creature} needs a home here.', { creature: t(SPECIES_BY_ID[goal.id].name) }));
  }
  return facts.slice(0, 3);
}

export function failureFacts(events: RoundEventLog): string[] {
  const facts = whatHappened(events);
  return facts.length ? facts : [t('Every planet is different. Try a new plan!')];
}

export function giftFromBuddy(hasEligibleBuddy: boolean): boolean {
  return hasEligibleBuddy;
}

/** The same immediate-score choice as solve2, exposed as targets for gentle visual hints. */
export function firstTargets(level: LevelDef, count = 3): number[] {
  let state = roundState(level.start, level.nova, level.troubles, level.difficulty !== 'normal');
  const rules = rulesForLevel(level.n);
  const targets: number[] = [];
  for (let turn = 0; turn < Math.min(count, level.throws); turn++) {
    const kind = level.queue[turn];
    if (!kind) break;
    const nova = novaReady(state);
    let best = -Infinity;
    let target = 0;
    for (let sector = 0; sector < SECTORS; sector++) {
      const trial = stepRound(state, { kind, sector, nova }, NO_MODIFIERS, rules);
      if (trial.after > best) {
        best = trial.after;
        target = sector;
      }
    }
    targets.push(target);
    state = stepRound(state, { kind, sector: target, nova }, NO_MODIFIERS, rules).state;
  }
  return targets;
}

export function tipFor(level: LevelDef): string {
  const sector = firstTargets(level, 1)[0];
  const kind: Kind | undefined = level.queue[0];
  if (sector === undefined || !kind) return t('Try a new place for your next throw.');
  return t('Try {object} on the {land}.', { object: t(KINDS[kind].name), land: t(BIOMES[level.start.sectors[sector].biome].name) });
}
