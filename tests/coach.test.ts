import { describe, expect, it } from 'vitest';
import {
  COACH,
  COACH_EVENTS,
  earlierRoundIntroIds,
  introAlreadySeen,
  introWordCount,
  pendingIntroAfterWin,
  practiceHelp,
  roundIntro,
} from '../src/meta/coach';
import { roundIntroCandidates } from '../src/ui/game';
import { addIntroLetter, letterOf } from '../src/meta/inbox';
import { defaultProfile } from '../src/meta/profile';
import { UNLOCKS } from '../src/meta/unlocks';
import { OBSTACLES } from '../src/core/sky';

describe('Coach intros', () => {
  it('keeps the J1 star tip at throw zero and teaches the lesson later', () => {
    expect(COACH[1][0]).toBe('Fill the bar past a ★ to finish the planet.');
    expect(COACH[3][0]).toBe('Watch the planet: it shows what your throw will do.');
    expect(COACH[1][1]).toBe('Make an Ocean beside a Mountain for three stars.');
  });

  it('defers Traits and Buddy help until their features are visible with Gentle off', () => {
    expect(roundIntroCandidates(16, undefined, true, true, false).map((row) => row.id)).not.toContain('traits_intro');
    expect(roundIntroCandidates(18, undefined, false, true, false).map((row) => row.id)).not.toContain('buddy');
    expect(roundIntroCandidates(18, undefined, true, true, true).map((row) => row.id)).not.toContain('buddy');
    expect(roundIntroCandidates(20, undefined, false, false, false).map((row) => row.id)).not.toContain('traits_intro');
    expect(roundIntroCandidates(21, undefined, false, true, false).map((row) => row.id)).toContain('traits_intro');
    expect(roundIntroCandidates(21, undefined, false, true, true).map((row) => row.id)).toContain('buddy');
  });
  it('offers a skipped Traits intro once on the next Trouble planet', () => {
    const profile = defaultProfile();
    profile.level = 21;
    const saved = earlierRoundIntroIds(21).filter((id) => id !== 'traits_intro');
    for (const id of saved) profile.mailSeen.push(`coach-${id}`);
    const shown = new Set<string>();
    const pending = () => roundIntroCandidates(21, undefined, false, true, false).filter((row) => !introAlreadySeen(row.id, saved, shown));
    expect(pending().map((row) => row.id)).toEqual(['traits_intro']);
    saved.push('traits_intro');
    profile.mailSeen.push('coach-traits_intro');
    expect(pending()).toEqual([]);
    expect(earlierRoundIntroIds(46)).toContain('traits_intro');
    expect(earlierRoundIntroIds(46)).not.toContain('mist');
  });
  it('keeps every English intro card within its word budget', () => {
    for (const row of UNLOCKS.filter((entry) => entry.intro)) {
      if (row.id in OBSTACLES) expect(row.intro!.body.split(/\s+/).length, row.id).toBeLessThanOrEqual(25);
      else expect(introWordCount(row), row.id).toBeLessThanOrEqual(row.id === 'scorch' ? 22 : 12);
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

  it('teaches Buddy help once at planet 18 when a resident can join', () => {
    const profile = defaultProfile();
    profile.mailSeen.push('coach-homeworld', 'coach-festival', 'coach-voyage');
    profile.home.residents.push({ species: 'bunny', fp: 0, lastReq: 0, rewarded: 0 });
    profile.level = 17;
    expect(roundIntro(17)?.id).not.toBe('buddy');
    profile.level = 18;
    expect(roundIntro(18)?.id).toBe('buddy');
    expect(pendingIntroAfterWin(profile)?.id).not.toBe('buddy');
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
