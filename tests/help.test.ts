import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { countsAsFail, clearFails, recordFail } from '../src/meta/continues';
import {
  emptyRoundLog,
  failureFacts,
  firstTargets,
  giftFromBuddy,
  helpAtFailCount,
  helpFor,
  helpThrowsForAttempt,
  whatHappened,
} from '../src/meta/help';
import { makeLevel } from '../src/core/levels';

describe('campaign help ladder', () => {
  it('climbs at counted fails 1, 2, 3 and 5; the fourth repeats the Buddy gift', () => {
    const p = defaultProfile();
    p.level = 18;
    expect(helpFor(p, 18, 'campaign')).toEqual([]);
    for (let fail = 1; fail <= 5; fail++) {
      recordFail(p, 18);
      expect(helpFor(p, 18, 'campaign')).toEqual(helpAtFailCount(fail));
    }
    expect(helpAtFailCount(1)).toEqual(['whatHappened']);
    expect(helpAtFailCount(2)).toEqual(['whatHappened', 'tip']);
    expect(helpAtFailCount(3)).toEqual(['whatHappened', 'tip', 'buddyThrows']);
    expect(helpAtFailCount(4)).toEqual(helpAtFailCount(3));
    expect(helpAtFailCount(5)).toEqual(['whatHappened', 'tip', 'buddyThrows', 'hintTry']);
  });

  it('stays off in other modes and after a clear', () => {
    const p = defaultProfile();
    p.level = 20;
    p.fails[20] = 5;
    for (const mode of ['daily', 'rush', 'challenge', 'remix', 'voyage', 'zen'] as const) expect(helpFor(p, 20, mode)).toEqual([]);
    p.stars[20] = 1;
    expect(helpFor(p, 20, 'campaign')).toEqual([]);
    delete p.stars[20];
    p.level = 21;
    expect(helpFor(p, 20, 'campaign')).toEqual([]);
  });

  it('gives two Buddy throws only for a qualifying new attempt', () => {
    const p = defaultProfile();
    p.level = 18;
    p.fails[18] = 2;
    expect(helpThrowsForAttempt(p, 18, 'campaign')).toBe(0);
    recordFail(p, 18);
    expect(helpThrowsForAttempt(p, 18, 'campaign')).toBe(2);
    expect(helpThrowsForAttempt(p, 18, 'daily')).toBe(0);
    expect(helpThrowsForAttempt(p, 19, 'campaign')).toBe(0);
    clearFails(p, 18);
    p.stars[18] = 1;
    expect(helpThrowsForAttempt(p, 18, 'campaign')).toBe(0);
  });

  it('does not advance for a restart, quit, or a round below half its throws', () => {
    const p = defaultProfile();
    p.level = 12;
    expect(countsAsFail(-1, 10)).toBe(false);
    expect(countsAsFail(4, 10)).toBe(false);
    expect(helpFor(p, 12, 'campaign')).toEqual([]);
    if (countsAsFail(5, 10)) recordFail(p, 12);
    expect(helpFor(p, 12, 'campaign')).toEqual(['whatHappened']);
  });

  it('pulses three valid sectors chosen from the solver first moves', () => {
    const targets = firstTargets(makeLevel(20));
    expect(targets).toHaveLength(3);
    expect(targets.every((sector) => Number.isInteger(sector) && sector >= 0 && sector < 24)).toBe(true);
  });
});

describe('What happened', () => {
  it('shows facts on every rung and gives a neutral fact when the log is empty', () => {
    expect(helpAtFailCount(5)).toContain('whatHappened');
    expect(failureFacts(emptyRoundLog())).toEqual(['Every planet is different. Try a new plan!']);
    const events = emptyRoundLog();
    events.bonks.push('miss');
    expect(failureFacts(events)).toEqual(['One throw flew past the planet.']);
  });

  it('uses the Keeper gift until the Buddy arrives', () => {
    expect(giftFromBuddy(false)).toBe(false);
    expect(giftFromBuddy(true)).toBe(true);
  });
  it('uses no more than three facts in Trouble, reaction, bonk, wander, goal order', () => {
    const events = emptyRoundLog();
    events.troubles.push({ id: 'vent', kind: 'act', sector: 3 }, { id: 'vent', kind: 'act', sector: 4 });
    events.reactions.push('scorch');
    events.bonks.push('rock');
    events.wandered.push('mossDeer');
    events.missedGoals.push({ type: 'biome', id: 'ocean', count: 2 });
    const facts = whatHappened(events);
    expect(facts).toHaveLength(3);
    expect(facts[0]).toContain('Ember Vent');
    expect(facts[0]).toContain('2');
    expect(facts[1]).toContain('Dry Spell');
    expect(facts[2]).toContain('throw');
    expect(facts.join(' ')).not.toMatch(/failed|so close/i);
  });

  it('keeps a missed goal as a useful fallback', () => {
    const events = emptyRoundLog();
    events.missedGoals.push({ type: 'biome', id: 'ocean', count: 2 });
    expect(whatHappened(events)).toEqual(['The Ocean goal needs more sectors.']);
  });
});
