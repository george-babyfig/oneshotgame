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
  it('builds to 3 and pauses through losses', () => {
    const p = defaultProfile(0);
    momentumWin(p);
    expect(p.momentum.streak).toBe(0); // locked before level 17
    p.level = MOMENTUM_UNLOCK;
    for (let i = 0; i < 5; i++) momentumWin(p);
    expect(p.momentum.streak).toBe(3);
    expect(momentumLoss(p, '2026-02-02')).toBeNull();
    expect(p.momentum.streak).toBe(3);
    expect(momentumLoss(p, '2026-02-02')).toBeNull();
    expect(p.momentum.streak).toBe(3);
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
    expect(p.visitors).toHaveLength(n);
    expect(p.visitors.every((v) => v.gems === 0)).toBe(true);
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
    expect(difficultyOf(5)).toBe('normal');
    expect(difficultyOf(10)).toBe('normal');
    expect(difficultyOf(15)).toBe('hard');
    expect(difficultyOf(9)).toBe('normal'); // no Super Hard in chapter one
    expect(difficultyOf(19)).toBe('super');
    expect(difficultyOf(7)).toBe('normal');
    expect(difficultyOf(5, 'DAY-x')).toBe('normal');
    expect(makeLevel(10).difficulty).toBe('normal');
  });
});

describe('weekly events', async () => {
  const E = await import('../src/meta/events');
  it('rotates by ISO week and pays tiers once', () => {
    expect(E.isoWeek(new Date(2026, 0, 1))).toBe('2026-W01');
    expect(E.isoWeek(new Date(2026, 8, 27))).toBe('2026-W39');
    const ids = new Set(Array.from({ length: 6 }, (_, i) => E.eventFor(`2026-W${10 + i}`).id));
    expect(ids.size).toBe(6);
    const p = defaultProfile(0);
    p.level = E.EVENT_UNLOCK_LEVEL;
    E.ensureEvent(p, '2026-W10');
    E.addTokens(p, 150);
    expect(E.eventReady(p)).toHaveLength(6);
    for (let i = 0; i < 6; i++) expect(E.claimEventTier(p, i)).not.toBeNull();
    expect(E.claimEventTier(p, 0)).toBeNull();
    expect(p.skins).toContain(E.eventFor('2026-W10').skin);
    E.ensureEvent(p, '2026-W11');
    expect(p.event.tokens).toBe(0);
    expect(E.tokensForLand(E.EVENTS[0], ['volcano', 'ocean', 'springs'], 0)).toBe(2);
  });
});

describe('game center', async () => {
  const A = await import('../src/meta/achievements');
  it('fits Apple limits and reports each achievement once', () => {
    const ids = A.ACHIEVEMENTS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(100);
    expect(A.ACHIEVEMENTS.reduce((s, x) => s + x.points, 0)).toBeLessThanOrEqual(1000);
    expect(A.ACHIEVEMENTS.every((x) => x.points <= 100)).toBe(true);
    const p = defaultProfile(0);
    expect(A.pendingAchievements(p)).toEqual([]);
    p.stats.wins = 1;
    p.seen = ['bunny'];
    const got = A.pendingAchievements(p).map((x) => x.id);
    expect(got).toEqual(['com.pocketplanet.game.ach.first_planet', 'com.pocketplanet.game.ach.first_creature']);
    p.gcReported = got;
    expect(A.pendingAchievements(p)).toEqual([]);
  });
});

describe('review fixes', async () => {
  const E = await import('../src/meta/economy');
  const Hb = await import('../src/meta/habitats');
  const P = await import('../src/meta/profile');
  it('star calendar ignores a clock that moved backwards', async () => {
    const C = await import('../src/meta/calendar');
    const p = defaultProfile(0);
    C.stamp(p, '2026-09-28');
    expect(C.canStamp(p, '2026-09-27')).toBe(false);
    expect(C.canStamp(p, '2026-09-29')).toBe(true);
  });
  it('vault cannot gain dust when the clock moves back', () => {
    const p = defaultProfile(0);
    p.lastCollect = 10_000_000;
    E.fixClock(p, 5_000);
    expect(p.lastCollect).toBe(10_000_000);
    expect(E.pendingDust(p, 5_000)).toBe(0);
  });
  it('habitat rewards can only be claimed once, and only when complete', () => {
    const p = defaultProfile(0);
    const h = Hb.HABITATS[0];
    expect(Hb.claimHabitat(p, h.id)).toBeNull();
    p.seen = [...h.species];
    const g = p.gems;
    expect(Hb.claimHabitat(p, h.id)).not.toBeNull();
    expect(Hb.claimHabitat(p, h.id)).toBeNull();
    expect(p.gems).toBe(g + (h.reward.gems ?? 0));
  });
  it('v1 saves backfill wins and 3-star counts', () => {
    const p = P.migrate({ level: 4, stars: { 1: 3, 2: 3, 3: 1 } });
    expect(p.stats.threeStars).toBe(2);
    expect(p.stats.wins).toBe(3);
  });
});

describe('inbox fixes', async () => {
  const I = await import('../src/meta/inbox');
  it('never re-delivers a letter after the inbox is trimmed', () => {
    const p = defaultProfile(0);
    p.tutorial = true;
    I.checkMail(p, new Date(2026, 0, 10));
    expect(p.mail.some((m) => m.id === 'welcome')).toBe(true);
    p.mail = [];
    I.checkMail(p, new Date(2026, 0, 11));
    expect(p.mail.some((m) => m.id === 'welcome')).toBe(false);
  });
  it('one winter letter per winter, across the new year', () => {
    const p = defaultProfile(0);
    p.tutorial = true;
    I.checkMail(p, new Date(2025, 11, 20));
    const n = p.mail.length;
    I.checkMail(p, new Date(2026, 0, 5));
    expect(p.mail.length).toBe(n);
  });
});
