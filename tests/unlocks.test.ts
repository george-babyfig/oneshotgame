import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GOALS_FROM } from '../src/core/levels';
import { KINDS, type Kind } from '../src/core/world';
import { buddyEligible, BUDDY_AT } from '../src/meta/buddy';
import { eventActive, EVENT_UNLOCK_LEVEL } from '../src/meta/events';
import { festivalActive, FESTIVAL_UNLOCK_LEVEL } from '../src/meta/festivals';
import { homeUnlocked, HOME_UNLOCK_LEVEL } from '../src/meta/homeworld';
import { letterStrings } from '../src/meta/inbox';
import { momentumActive, MOMENTUM_UNLOCK } from '../src/meta/momentum';
import { defaultProfile } from '../src/meta/profile';
import { unlocked as rankUnlocked } from '../src/meta/rank';
import { UNLOCKS, debutsAt, unlocked } from '../src/meta/unlocks';
import { voyageActive, VOYAGE_UNLOCK_LEVEL } from '../src/meta/voyage';

// M3 must empty this list as it moves today's crowded Home debuts.
const KNOWN_UNTIL_M3 = [1, 5, 8];

describe('unlock ladder', () => {
  it('has one row per feature and keeps known debut collisions honest', () => {
    expect(new Set(UNLOCKS.map((entry) => entry.id)).size).toBe(UNLOCKS.length);
    const crowded = Array.from({ length: 60 }, (_, i) => i + 1).filter(
      (planet) => debutsAt(planet).filter((entry) => entry.intro || entry.letter || entry.button).length > 1,
    );
    expect(crowded).toEqual(KNOWN_UNTIL_M3);
  });

  it('has translations for every intro and letter in all five locales', () => {
    const keys = [...UNLOCKS.flatMap((entry) => (entry.intro ? [entry.intro.title, entry.intro.body] : [])), ...letterStrings()];
    for (const lang of ['de', 'pt', 'es', 'ja', 'fr']) {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      for (const key of keys) {
        expect(dict[key], `${lang}: ${key}`).toBeDefined();
        expect([...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
          [...dict[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
        );
      }
    }
  });

  it('matches the existing level, rank, and achievement gates', () => {
    for (let level = 1; level <= 60; level++) {
      for (const rank of [1, 2, 3, 4, 5, 8]) {
        const p = defaultProfile();
        p.level = level;
        p.rank = rank;
        p.tutorial = level > 1;
        p.stats.wins = level - 1;
        expect(unlocked(p, 'homeworld')).toBe(level >= HOME_UNLOCK_LEVEL);
        expect(homeUnlocked(p)).toBe(level >= HOME_UNLOCK_LEVEL);
        expect(unlocked(p, 'weekly_event')).toBe(level >= EVENT_UNLOCK_LEVEL);
        expect(eventActive(p)).toBe(level >= EVENT_UNLOCK_LEVEL);
        expect(unlocked(p, 'festival')).toBe(level >= FESTIVAL_UNLOCK_LEVEL);
        expect(festivalActive(p)).toBe(level >= FESTIVAL_UNLOCK_LEVEL);
        expect(unlocked(p, 'voyage')).toBe(level >= VOYAGE_UNLOCK_LEVEL);
        expect(voyageActive(p)).toBe(level >= VOYAGE_UNLOCK_LEVEL);
        expect(unlocked(p, 'momentum')).toBe(level >= MOMENTUM_UNLOCK);
        expect(momentumActive(p)).toBe(level >= MOMENTUM_UNLOCK);
        expect(unlocked(p, 'goals')).toBe(level >= GOALS_FROM);
        expect(unlocked(p, 'quest_spot')).toBe(level >= 8);
        expect(unlocked(p, 'quest_voyage')).toBe(level >= 12);
        for (const kind of Object.keys(KINDS) as Kind[]) expect(unlocked(p, kind)).toBe(level >= KINDS[kind].unlock);
        for (const [mode, need] of Object.entries({ daily: 2, rush: 3, zen: 4, challenge: 5 }) as [
          'daily' | 'rush' | 'zen' | 'challenge',
          number,
        ][]) {
          expect(unlocked(p, mode)).toBe(rank >= need);
          expect(rankUnlocked(p, mode)).toBe(rank >= need);
        }
        expect(unlocked(p, 'star_calendar')).toBe(p.tutorial);
        expect(unlocked(p, 'passport_setup')).toBe(p.stats.wins >= 1);
        expect(unlocked(p, 'buddy')).toBe(false);
        p.sightings.bunny = BUDDY_AT;
        expect(unlocked(p, 'buddy')).toBe(true);
        expect(buddyEligible(p)).toContain('bunny');
      }
    }
  });
});
