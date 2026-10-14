import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { helpAtFailCount } from '../src/meta/help';
import {
  CONTINUE_COST,
  CONTINUE_FROM_PLANET,
  CONTINUE_MAX,
  CONTINUE_THROWS,
  clearFails,
  continueAllowed,
  countsAsFail,
  recordFail,
  type PlayMode,
} from '../src/meta/continues';

describe('campaign continues', () => {
  it('has one fixed price, grant, and limit', () => {
    expect([CONTINUE_COST, CONTINUE_THROWS, CONTINUE_MAX, CONTINUE_FROM_PLANET]).toEqual([50, 5, 2, 11]);
  });

  it('appears only on a later campaign planet after a prior counted fail', () => {
    const base = { mode: 'campaign' as PlayMode, planet: 11, won: false, failsBefore: 1, used: 0 };
    expect(continueAllowed(base)).toBe(true);
    expect(continueAllowed({ ...base, planet: 10 })).toBe(false);
    expect(continueAllowed({ ...base, won: true })).toBe(false);
    expect(continueAllowed({ ...base, cleared: true })).toBe(false);
    expect(continueAllowed({ ...base, failsBefore: 0 })).toBe(false);
    expect(continueAllowed({ ...base, used: 1 })).toBe(true);
    expect(continueAllowed({ ...base, used: 2 })).toBe(false);
    for (const mode of ['tutorial', 'voyage', 'daily', 'rush', 'challenge', 'zen', 'remix'] as PlayMode[])
      expect(continueAllowed({ ...base, mode })).toBe(false);
  });

  it('remains secondary to the free second-fail tip', () => {
    expect(helpAtFailCount(2).at(-1)).toBe('tip');
    expect(continueAllowed({ mode: 'campaign', planet: 11, won: false, failsBefore: 1, used: 0 })).toBe(true);
    expect(continueAllowed({ mode: 'campaign', planet: 10, won: false, failsBefore: 1, used: 0 })).toBe(false);
  });

  it('counts only rounds that used at least half their throws', () => {
    expect(countsAsFail(-1, 10)).toBe(false);
    expect(countsAsFail(4, 10)).toBe(false);
    expect(countsAsFail(5, 10)).toBe(true);
    expect(countsAsFail(2, 5)).toBe(false);
    expect(countsAsFail(3, 5)).toBe(true);
    expect(countsAsFail(0, 0)).toBe(false);
  });

  it('keeps fails and paid continues per planet across attempts, then clears both on a win', () => {
    const p = defaultProfile();
    recordFail(p, 11);
    recordFail(p, 11);
    recordFail(p, 12);
    p.continuesUsed[11] = 2;
    p.continuesUsed[12] = 1;
    expect(p.fails).toMatchObject({ 11: 2, 12: 1 });
    expect(continueAllowed({ mode: 'campaign', planet: 11, won: false, failsBefore: p.fails[11], used: p.continuesUsed[11] })).toBe(false);
    clearFails(p, 11);
    expect(p.fails[11]).toBeUndefined();
    expect(p.fails[12]).toBe(1);
    expect(p.continuesUsed[11]).toBeUndefined();
    expect(p.continuesUsed[12]).toBe(1);
  });
});
