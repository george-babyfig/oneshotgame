import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { BUDDY_AT, buddyAccs, buddyEligible, currentBuddy, setBuddy, setBuddyAcc } from '../src/meta/buddy';
import { QUESTS, ensureQuests, questEvent } from '../src/meta/progression';
import { FESTIVAL_UNLOCK_LEVEL } from '../src/meta/festivals';
import { VOYAGE_UNLOCK_LEVEL } from '../src/meta/voyage';
import { checkMail } from '../src/meta/inbox';
import { pendingAchievements } from '../src/meta/achievements';

describe('buddy', () => {
  it('only befriended creatures and owned accessories can be picked', () => {
    const p = defaultProfile();
    expect(buddyEligible(p)).toEqual([]);
    expect(setBuddy(p, 'bunny')).toBe(false);
    p.sightings.bunny = BUDDY_AT;
    expect(buddyEligible(p)).toEqual([]);
    p.level = 18;
    expect(buddyEligible(p)).toEqual(['bunny']);
    expect(setBuddy(p, 'bunny')).toBe(true);
    expect(setBuddy(p, 'nope')).toBe(false);
    expect(buddyAccs(p)).toEqual(['bow', 'flower']);
    expect(setBuddyAcc(p, 'party')).toBe(false); // not bought
    p.home.accs.push('pumpkin');
    expect(setBuddyAcc(p, 'pumpkin')).toBe(true);
    expect(currentBuddy(p, 'acorn')).toEqual({ species: 'bunny', acc: 'pumpkin' });
    setBuddyAcc(p, null);
    expect(currentBuddy(p, 'acorn')).toEqual({ species: 'bunny', acc: 'acorn' }); // festival costume
    setBuddy(p, null);
    expect(currentBuddy(p)).toBeNull();
  });
});

describe('round 6 tie-ins', () => {
  it('only offers voyage and festival quests once those features unlock', () => {
    const need = (id: string) => QUESTS.find((q) => q.id === id)!.need!;
    const p = defaultProfile();
    p.level = FESTIVAL_UNLOCK_LEVEL - 1;
    expect(need('spot6')(p)).toBe(false);
    p.level = FESTIVAL_UNLOCK_LEVEL;
    expect(need('spot6')(p)).toBe(true);
    p.level = VOYAGE_UNLOCK_LEVEL;
    expect(need('voyage1')(p)).toBe(true);
    p.level = VOYAGE_UNLOCK_LEVEL - 1;
    expect(need('voyage1')(p)).toBe(false);
    // a new player never gets a quest they cannot do
    for (let d = 1; d <= 28; d++) {
      const q = defaultProfile();
      ensureQuests(q, `2026-02-${String(d).padStart(2, '0')}`);
      expect(q.quests.list.some((x) => x.id === 'voyage1' || x.id === 'spot6')).toBe(false);
    }
    p.quests = { day: 'x', list: [{ id: 'voyage1', progress: 0, claimed: false }], bonusClaimed: false };
    expect(questEvent(p, 'voyage')).toEqual(['voyage1']);
  });

  it('sends festival, voyage and buddy letters once', () => {
    const p = defaultProfile();
    p.tutorial = true;
    p.level = FESTIVAL_UNLOCK_LEVEL;
    p.sightings.otter = BUDDY_AT;
    const now = new Date(2026, 9, 3);
    checkMail(p, now);
    const kinds = p.mail.map((m) => m.kind);
    expect(kinds).toContain('festival');
    expect(kinds).toContain('voyage');
    expect(kinds).toContain('buddy');
    expect(p.mail.find((m) => m.kind === 'festival')?.vars?.e).toBe('Costume Parade');
    expect(checkMail(p, now)).toBe(0);
    // next month brings the next festival's letter
    checkMail(p, new Date(2026, 10, 2));
    expect(p.mail.filter((m) => m.kind === 'festival')).toHaveLength(2);
  });

  it('earns the new achievements', () => {
    const p = defaultProfile();
    p.voyageDone = 1;
    p.buddy.species = 'bunny';
    const ids = pendingAchievements(p).map((a) => a.id.split('.').pop());
    expect(ids).toEqual(expect.arrayContaining(['voyage_1', 'buddy_1']));
  });
});
