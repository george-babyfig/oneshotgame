import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { momentumLoss, momentumWin, MOMENTUM_UNLOCK } from '../src/meta/momentum';
import { addVisitors, openVisitor, rollVisitors } from '../src/meta/visitors';
import { rankGoals, rankProgress, rankReady } from '../src/meta/rank';
import { HABITATS, habitatsReady } from '../src/meta/habitats';
import {
  challengeLevel,
  dailyLevel,
  decodeChallenge,
  encodeChallenge,
  planetStrip,
  recordChallenge,
  recordDaily,
  rushLevel,
} from '../src/meta/modes';
import { difficultyOf, makeLevel } from '../src/core/levels';
import { SPECIES } from '../src/core/world';

describe('momentum', () => {
  it('builds to 3, is saved once a day by the shield, then breaks', () => {
    const p = defaultProfile(0);
    momentumWin(p);
    expect(p.momentum.streak).toBe(0); // locked before level 6
    p.level = MOMENTUM_UNLOCK;
    for (let i = 0; i < 5; i++) momentumWin(p);
    expect(p.momentum.streak).toBe(3);
    expect(momentumLoss(p, '2026-02-02')).toBe('shield');
    expect(p.momentum.streak).toBe(3);
    expect(momentumLoss(p, '2026-02-02')).toBe('lost');
    expect(p.momentum.streak).toBe(0);
    expect(momentumLoss(p, '2026-02-02')).toBeNull();
  });
});

describe('visitors', () => {
  it('only visit after a while away and pay out once', () => {
    const p = defaultProfile(0);
    p.meta.lastSeen = 0;
    expect(rollVisitors(p, 3600e3)).toEqual([]); // no galaxy yet
    p.galaxy.push({ n: 1, name: 'a', hue: 0, stars: 1, species: [], life: 1, colors: [] });
    p.seen = ['bunny', 'deer'];
    expect(rollVisitors(p, 10 * 60e3)).toEqual([]);
    const n = addVisitors(p, 8 * 3600e3);
    expect(n).toBeGreaterThan(1);
    expect(rollVisitors(p, 8 * 3600e3)).toEqual(p.visitors); // deterministic
    const dust = p.dust;
    while (openVisitor(p));
    expect(p.dust).toBeGreaterThan(dust);
    expect(p.visitors).toEqual([]);
  });
});

describe('rank & habitats', () => {
  it('rank goals are tracked from stats', () => {
    const p = defaultProfile(0);
    expect(rankReady(p)).toBe(false);
    p.stats.wins = 2;
    p.seen = ['bunny', 'deer'];
    p.stats.throws = 20;
    expect(rankReady(p)).toBe(true);
    expect(rankProgress(p).every((x) => x.done)).toBe(true);
    for (let r = 1; r < 30; r++) expect(rankGoals(r)).toHaveLength(3);
  });

  it('habitat sets cover every creature exactly once', () => {
    const all = HABITATS.flatMap((h) => h.species).sort();
    expect(all).toEqual(SPECIES.map((s) => s.id).sort());
    const p = defaultProfile(0);
    p.seen = [...HABITATS[3].species];
    expect(habitatsReady(p).map((h) => h.id)).toEqual([HABITATS[3].id]);
  });
});

describe('modes', () => {
  it('challenge codes round-trip and reject typos', () => {
    const code = encodeChallenge('K7Q2M', 215);
    expect(decodeChallenge(code)).toEqual({ seed: 'K7Q2M', score: 215 });
    expect(decodeChallenge(code.toLowerCase())).toEqual({ seed: 'K7Q2M', score: 215 });
    expect(decodeChallenge(code.slice(0, -1) + (code.endsWith('Z') ? 'Y' : 'Z'))).toBeNull();
    expect(decodeChallenge('hello')).toBeNull();
  });

  it('seeded levels are identical for everyone', () => {
    expect(JSON.stringify(dailyLevel('2026-05-05'))).toBe(JSON.stringify(dailyLevel('2026-05-05')));
    expect(dailyLevel('2026-05-05').seed).not.toBe(dailyLevel('2026-05-06').seed);
    expect(challengeLevel('ABCDE').stars).toEqual(challengeLevel('ABCDE').stars);
    const r = rushLevel('X');
    expect(r.stars[0]).toBeLessThan(r.stars[2]);
    expect(planetStrip(r.start)).toMatch(/.+/);
  });

  it('daily rewards once per day; challenges pay for a win', () => {
    const p = defaultProfile(0);
    const g = p.gems;
    expect(recordDaily(p, '2026-01-10', 100, 2)).toBe(15);
    expect(recordDaily(p, '2026-01-10', 140, 3)).toBe(0);
    expect(p.dailyPlanet.best).toBe(140);
    expect(p.gems).toBe(g + 15);
    expect(recordChallenge(p, 'C1', 200, 2, 150)).toEqual({ won: true, gems: 10 });
    expect(recordChallenge(p, 'C1', 250, 3, 150).gems).toBe(0);
  });

  it('hard planets follow the rhythm and have tougher targets', () => {
    expect(difficultyOf(5)).toBe('hard');
    expect(difficultyOf(9)).toBe('super');
    expect(difficultyOf(19)).toBe('super');
    expect(difficultyOf(7)).toBe('normal');
    expect(difficultyOf(5, 'DAY-x')).toBe('normal');
    expect(makeLevel(10).difficulty).toBe('hard');
  });
});
