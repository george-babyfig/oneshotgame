import { expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { pairTriedWithoutReaction } from '../src/ui/screens/fieldguide';
import { RULESETS, includeFlood, ruleReactionForPair } from '../src/core/rulesets';
import { rulesForLevel } from '../src/core/round';

it('defers pair cleanup until the play flip, including pairs recorded after the v9 install', () => {
  const p = defaultProfile(0);
  p.reactionPairsTried = ['magma+rock', 'storm+sun', 'ice+storm', 'rock+sun'];
  const v9 = migrate(JSON.parse(JSON.stringify(p)), { play: 1 });
  expect(v9.rulesSeen).toBe(1);
  expect(v9.reactionPairsTried).toEqual(p.reactionPairsTried);
  const flipped = migrate(JSON.parse(JSON.stringify(v9)), { play: 2 });
  expect(flipped.rulesSeen).toBe(2);
  expect(flipped.reactionPairsTried).toEqual([...(includeFlood ? [] : ['ice+storm']), 'rock+sun']);
  expect(migrate(JSON.parse(JSON.stringify(flipped)), { play: 2 })).toEqual(flipped);
  expect(migrate(JSON.parse(JSON.stringify(flipped)), { play: 1 }).rulesSeen).toBe(2);
});
it('shows unknown for an undiscovered play reaction and records tried pairs by round rules', () => {
  const tried = new Set(['magma+rock', 'storm+sun', 'ice+storm', 'rock+sun']);
  expect(pairTriedWithoutReaction('rock', 'magma', tried, 1)).toBe(true);
  expect(pairTriedWithoutReaction('rock', 'magma', tried, 2)).toBe(false);
  expect(pairTriedWithoutReaction('storm', 'sun', tried, 2)).toBe(false);
  expect(pairTriedWithoutReaction('ice', 'storm', tried, 2)).toBe(!includeFlood);
  expect(pairTriedWithoutReaction('rock', 'sun', tried, 2)).toBe(true);
  expect(ruleReactionForPair('rock', 'magma', rulesForLevel(63, 'campaign', 63, 1).reactions)).toBeNull();
  expect(ruleReactionForPair('rock', 'magma', rulesForLevel(63, 'campaign', 63, 2).reactions)).toBe('firemount');
  expect(ruleReactionForPair('rock', 'magma', RULESETS[2].reactions)).toBe('firemount');
});
it('sanitizes v9 fields without changing stars or grandfathered achievements', () => {
  const raw = { ...defaultProfile(0), v: 8, wonder: [120, 2, 2, 0, 121, 1.5, '3'], wonderSeen: 'true', rulesSeen: 99, m15Migrated: false };
  const p = migrate(raw, { play: 1 });
  expect(p.wonder).toEqual([2, 120]);
  expect(p.wonderSeen).toBe(false);
  expect(p.rulesSeen).toBe(1);
  expect(p.m15Migrated).toBe(true);
  expect(p.v).toBe(9);
});
