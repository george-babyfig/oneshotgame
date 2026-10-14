import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeLevel, rulesForSeed, solve0, solve2, type LevelDef } from '../src/core/levels';
import { NO_MODIFIERS, type RoundMode, type RoundModifiers } from '../src/core/modifiers';
import {
  roundState,
  rulesForLevel,
  stepRound,
  restoreRoundWithVersion,
  serializeRound,
  ROUND_RULES_V0,
  REACTIONS,
  type RoundAction,
  type StepResult,
} from '../src/core/round';
import { RULESETS, effectiveVersion, includeFlood, voyagePlay } from '../src/core/rulesets';
import { RULES_LATEST, RULES_SUPPORTED, RULES_VERSION } from '../src/core/rules-version';
import { TROUBLES } from '../src/core/troubles';
import { remixLevel } from '../src/meta/remix';
import { migrate, readInterruptedRound } from '../src/meta/profile';
import { voyageRules } from '../src/meta/voyage';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
type Row = {
  n: number;
  policy: string;
  variant: string;
  level: LevelDef;
  mods: RoundModifiers;
  rules: ReturnType<typeof rulesForLevel>;
  steps: { action: RoundAction; sha256: string; events: Omit<StepResult, 'state'> }[];
};
const rows = JSON.parse(readFileSync('tests/fixtures/rules/round-v1.json', 'utf8')) as Row[];
for (const play of [1, 2] as const)
  describe(`frozen v1 round contract at play ${play}`, () => {
    it('replays every stored LevelDef and step, including hidden launchers', () => {
      expect(new Set(rows.map((row) => row.mods.launcher.id)).size).toBe(7);
      const old = JSON.parse(readFileSync('tests/fixtures/saves/m-release-1.2.v8.json', 'utf8'));
      const checkpoint = readInterruptedRound(migrate(old, { play }), play)!;
      expect(checkpoint).not.toBeNull();
      const pinned = checkpoint.rulesVersion ?? 1;
      for (const row of rows) {
        const rules = rulesForLevel(row.n, 'campaign', row.n, pinned);
        expect(rules).toEqual(row.rules);
        let state = roundState(row.level.start, row.level.nova, row.level.troubles, row.level.difficulty !== 'normal');
        for (let turn = 0; turn < row.steps.length; turn++) {
          const step = row.steps[turn];
          state.throwsLeft = row.level.throws - turn;
          const { state: next, ...events } = stepRound(state, step.action, row.mods, rules);
          expect(hash(next), `${row.n}/${row.mods.launcher.id}/${row.policy}/${row.variant}/${turn}`).toBe(step.sha256);
          expect(events).toEqual(step.events);
          state = next;
        }
        expect(restoreRoundWithVersion(serializeRound(state, 1))?.rulesVersion).toBe(1);
      }
    });
    it('retains the old unsalted default layout hashes with explicit v1 generation', () => {
      const hashes = JSON.parse(readFileSync('tests/sim/levels.default.snapshot.json', 'utf8')) as string[];
      for (let n = 1; n <= 60; n++) {
        const { nova: _nova, ...level } = makeLevel(n, 'PP', { salt: 0, rulesVersion: 1 });
        expect(hash(level), `PP-${n}`).toBe(hashes[n - 1]);
      }
    });
  });

it('pins launch rules and per-mode v1 lists, with planned v2 content isolated', () => {
  expect(RULES_VERSION).toBe(process.env.RULES_PLAY === '2' ? 2 : 1);
  expect(RULES_SUPPORTED).toEqual([1, 2]);
  expect(RULES_LATEST).toBe(2);
  expect(ROUND_RULES_V0.version).toBe(1);
  expect(RULESETS[2].salt).toBe(RULESETS[1].salt);
  const modes: RoundMode[] = ['campaign', 'voyage', 'daily', 'challenge', 'zen', 'rush', 'remix'];
  for (const mode of modes)
    for (let n = 1; n <= 120; n++) {
      const cap = mode === 'campaign' ? n : Math.min(n, 70);
      expect(rulesForLevel(n, mode, 70, 1)).toEqual({
        version: 1,
        reactions: Object.entries(REACTIONS)
          .filter(([, r]) => cap >= r.debut)
          .map(([id]) => id),
        troubles: ['zen', 'rush', 'remix'].includes(mode)
          ? []
          : Object.entries(TROUBLES)
              .filter(([, t]) => cap >= t.debut)
              .map(([id]) => id),
        combo: cap >= 26,
      });
      expect(RULESETS[2].troubles[mode].includes('pebble')).toBe(mode === 'campaign');
    }
  expect(RULESETS[2].reactions.includes('flood')).toBe(includeFlood);
  expect(effectiveVersion(51, 'campaign', 120, 2)).toBe(1);
  expect(effectiveVersion(52, 'campaign', 120, 2)).toBe(2);
  expect(effectiveVersion(62, 'voyage', 120, 2)).toBe(1);
  expect(effectiveVersion(63, 'voyage', 120, 2)).toBe(2);
  expect(effectiveVersion(63, 'remix', 62, 2)).toBe(1);
  for (const [mode, cap] of [
    ['daily', 16],
    ['challenge', 14],
    ['rush', 14],
    ['zen', 20],
  ] as const)
    expect(effectiveVersion(cap, mode, 120, 2)).toBe(1);
  expect(voyagePlay('2099-W01', 2)).toBe(1);
  expect(voyageRules('2099-W01', 67, 120, 2).version).toBe(1);
  expect(rulesForSeed('PP-63', 2).version).toBe(2);
});

it('deals the fixed Rainbow bonus in every family, with v1 keys unchanged', () => {
  for (const prefix of ['PP', 'RX', 'VOY-synthetic-0']) {
    const rules = rulesForLevel(67, prefix === 'RX' ? 'remix' : prefix === 'PP' ? 'campaign' : 'voyage', 120, 2);
    const level = makeLevel(67, prefix, { rulesVersion: 2, rules });
    expect(level.rulesVersion).toBe(2);
    expect(level.bonusKind).toBeDefined();
    expect(makeLevel(67, prefix, { rulesVersion: 2, rules }).bonusKind).toBe(level.bonusKind);
    const classic = makeLevel(67, prefix, { rulesVersion: 1 });
    expect(classic).not.toHaveProperty('rulesVersion');
    expect(classic).not.toHaveProperty('bonusKind');
  }
  expect(remixLevel(67, undefined, 2).bonusKind).toBeDefined();
  const level = makeLevel(63, 'PP', { rulesVersion: 1 });
  expect(solve0(level)).toEqual(solve0(level, rulesForLevel(63, 'campaign', 63, 1)));
  expect(solve2(level)).toEqual(solve2(level, rulesForLevel(63, 'campaign', 63, 1)));
  expect(NO_MODIFIERS.launcher.id).toBe('sling');
});
