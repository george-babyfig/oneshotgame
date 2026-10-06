import { describe, expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { practiceHelp, pendingIntroAfterWin } from '../src/meta/coach';
import { continueAllowed } from '../src/meta/continues';
import { choosePopup } from '../src/meta/governor';
import { defaultProfile } from '../src/meta/profile';
import { unlocked } from '../src/meta/unlocks';
import { POLICIES, runPlanet } from './sim/harness';

describe('first session gates', () => {
  it('keeps planets 1-3 practice-only and free of paid continues', () => {
    for (const n of [1, 2, 3]) {
      expect(makeLevel(n).nova).toBe(false);
      expect(practiceHelp(n, false, 0, 0)).toBe('throws');
      expect(practiceHelp(n, false, 0, 2)).toBe('star');
      expect(continueAllowed({ mode: 'campaign', planet: n, won: false, failsBefore: 2, used: 0 })).toBe(false);
    }
    expect(runPlanet(1, POLICIES.casual, 16).fail).toBe(0);
  });

  it('opens the first Home view without an automatic card or calendar wall', () => {
    const p = defaultProfile();
    p.level = 3;
    p.tutorial = true;
    p.meta.sessions = 1;
    expect(pendingIntroAfterWin(p)).toBeUndefined();
    expect(unlocked(p, 'star_calendar')).toBe(false);
    expect(p.chapters).toEqual([]);
    expect(choosePopup({ homeSeen: false, shownThisOpen: false, awayMs: Infinity }, ['away', 'intro', 'starter'])).toBeNull();
  });
});
