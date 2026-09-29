import { describe, expect, it } from 'vitest';
import { COACH_EVENTS, introWordCount, pendingIntroAfterWin, practiceHelp, roundIntro } from '../src/meta/coach';
import { addIntroLetter, letterOf } from '../src/meta/inbox';
import { defaultProfile } from '../src/meta/profile';
import { UNLOCKS } from '../src/meta/unlocks';

describe('Coach intros', () => {
  it('keeps every English intro card within twelve words', () => {
    for (const row of UNLOCKS.filter((entry) => entry.intro)) {
      expect(introWordCount(row), row.id).toBeLessThanOrEqual(12);
    }
  });

  it('finds an intro at its round debut', () => {
    for (const row of UNLOCKS.filter((entry) => entry.placement === 'round' && entry.intro)) {
      expect(roundIntro(row.planet, row.id)?.id).toBe(row.id);
    }
  });

  it('keeps one readable letter for each shown intro', () => {
    const row = UNLOCKS.find((entry) => entry.intro);
    expect(row).toBeDefined();
    const profile = defaultProfile();
    expect(addIntroLetter(profile, row!.id, 123)).toBe(true);
    expect(addIntroLetter(profile, row!.id, 456)).toBe(false);
    expect(profile.mail).toHaveLength(1);
    expect(letterOf(profile.mail[0])?.body).toBe(row!.intro?.body);
  });

  it('waits until the unlocking win and keeps a Home card pending', () => {
    const profile = defaultProfile();
    profile.mailSeen.push('coach-magma');
    profile.level = 5;
    expect(pendingIntroAfterWin(profile)).toBeUndefined();
    profile.level = 6;
    expect(pendingIntroAfterWin(profile)?.id).toBe('homeworld');
    expect(addIntroLetter(profile, 'homeworld')).toBe(true);
    expect(pendingIntroAfterWin(profile)).toBeUndefined();
  });

  it('waits for the Workshop before offering a Buddy intro', () => {
    const profile = defaultProfile();
    profile.mailSeen.push('coach-homeworld', 'coach-festival', 'coach-voyage');
    profile.sightings.bunny = 5;
    profile.level = 17;
    expect(pendingIntroAfterWin(profile)?.id).not.toBe('buddy');
    profile.level = 18;
    expect(pendingIntroAfterWin(profile)?.id).toBe('buddy');
  });

  it('gives event tips without a throw-count trigger', () => {
    expect(Object.keys(COACH_EVENTS).sort()).toEqual(['creature', 'goal', 'nova', 'wander']);
    expect(Object.values(COACH_EVENTS).every(Boolean)).toBe(true);
  });

  it('gives two sets of three practice throws, then a star', () => {
    expect(practiceHelp(1, false, 0, 0)).toBe('throws');
    expect(practiceHelp(2, false, 0, 1)).toBe('throws');
    expect(practiceHelp(3, false, 0, 2)).toBe('star');
    expect(practiceHelp(34, true, 0, 2)).toBe('throws');
    expect(practiceHelp(34, true, 0, 20)).toBe('throws');
    expect(practiceHelp(2, false, 0, 0, false)).toBe('none');
    expect(practiceHelp(4, false, 0, 0)).toBe('none');
    expect(practiceHelp(1, false, 1, 0)).toBe('none');
  });
});
