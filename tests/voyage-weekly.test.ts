import { describe, expect, it } from 'vitest';
import { eventFor, isoWeek } from '../src/meta/events';
import { defaultProfile, migrate } from '../src/meta/profile';
import { VOYAGE_LEN, clearStop, ensureVoyage, stopReward, voyageHemisphere, voyageLevel } from '../src/meta/voyage';

describe('one weekly Voyage headline', () => {
  it('pays about 130 gems and the theme atmosphere once across seven stops', () => {
    const p = defaultProfile(0);
    p.level = 30;
    ensureVoyage(p, '2026-W44');
    const start = p.gems;
    for (let i = 0; i < VOYAGE_LEN; i++) {
      const promised = stopReward(p, i);
      expect(clearStop(p, i, 1).reward).toEqual(promised);
    }
    expect(p.gems - start).toBe(125);
    expect(p.skins).toContain(eventFor('2026-W44', p.settings.hemi).skin);
    expect(clearStop(p, 6, 3).reward).toBeNull();
    expect(p.gems - start).toBe(125);
  });

  it('maps partially earned tokens and cleared stops without paying twice', () => {
    const p = defaultProfile(0);
    p.level = 30;
    p.voyage = { week: '2026-W44', base: 26, cleared: 3, stars: [1, 1, 1] };
    p.event = { week: '2026-W44', tokens: 70, claimed: [0, 1] };
    const start = p.gems;
    ensureVoyage(p, '2026-W44');
    const mapped = p.gems - start;
    expect(mapped).toBeGreaterThan(0);
    ensureVoyage(p, '2026-W44');
    expect(p.gems - start).toBe(mapped);
    for (let i = 3; i < VOYAGE_LEN; i++) clearStop(p, i, 1);
    expect(p.gems - start).toBeLessThanOrEqual(130);
    expect(p.event.tokens).toBe(0);
  });

  it('follows hemisphere and keeps each week deterministic', () => {
    const spring = isoWeek(new Date(2027, 3, 5, 12));
    const north = eventFor(spring, 'north');
    const south = eventFor(spring, 'south');
    expect(north.id).not.toBe(south.id);
    expect(eventFor(spring, 'north')).toEqual(north);
    const a = voyageLevel(spring, 20, 0, 28, 'north');
    const b = voyageLevel(spring, 20, 0, 28, 'south');
    expect(a.name).not.toBe(b.name);
    expect(voyageLevel(spring, 20, 0, 28, 'north')).toEqual(a);
    const p = defaultProfile(0);
    ensureVoyage(p, spring);
    expect(voyageHemisphere(p)).toBe('north');
    p.settings.hemi = 'south';
    ensureVoyage(p, spring);
    expect(voyageHemisphere(p)).toBe('north');
    ensureVoyage(p, '2027-W15');
    expect(voyageHemisphere(p)).toBe('south');
  });

  it('converts an old Event on load even after its week, exactly once', () => {
    const raw = defaultProfile(0);
    raw.event = { week: '2026-W41', tokens: 150, claimed: [] };
    raw.voyage = { week: '2026-W41', base: 26, cleared: 3, stars: [1, 1, 1] };
    const p = migrate(JSON.parse(JSON.stringify(raw)));
    expect(p.gems - raw.gems).toBe(85);
    expect(p.skins).toContain(eventFor('2026-W41').skin);
    expect(p.event.retired).toBe(true);
    const gems = p.gems;
    const dust = p.dust;
    const again = migrate(JSON.parse(JSON.stringify(p)));
    expect(again.gems).toBe(gems);
    expect(again.dust).toBe(dust);
    ensureVoyage(again, '2026-W42');
    expect(again.gems).toBe(gems);
  });

  it('pays the equivalent dust for an owned repeat atmosphere without claiming it is new', () => {
    const p = defaultProfile(0);
    p.level = 30;
    ensureVoyage(p, '2026-W46');
    p.skins.push(eventFor('2026-W46').skin);
    const reward = stopReward(p, 6);
    expect(reward.skin).toBeUndefined();
    expect(reward.dust).toBe(600 + 175 + 1125);
    p.voyage.cleared = 6;
    const before = p.dust;
    clearStop(p, 6, 1);
    expect(p.dust - before).toBe(reward.dust);
  });

  it('keeps the shipped W41-W44 Event themes while future themes change the actual stop', () => {
    expect(['2026-W41', '2026-W42', '2026-W43', '2026-W44'].map((week) => eventFor(week).id)).toEqual([
      'ocean',
      'bloom',
      'critter',
      'frost',
    ]);
    const north = voyageLevel('2026-W50', 24, 1, 28, 'north');
    const south = voyageLevel('2026-W50', 24, 1, 28, 'south');
    expect(north.seed).not.toBe(south.seed);
    expect(north.start).not.toEqual(south.start);
    expect(
      Array.from({ length: VOYAGE_LEN }, (_, i) => i).some(
        (i) =>
          JSON.stringify(voyageLevel('2026-W50', 24, i, 28, 'north').goals) !==
          JSON.stringify(voyageLevel('2026-W50', 24, i, 28, 'south').goals),
      ),
    ).toBe(true);
  });
});
