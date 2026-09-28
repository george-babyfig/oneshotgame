import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/core/world';
import { defaultProfile } from '../src/meta/profile';
import { addVisitors, openVisitor, rollVisitors } from '../src/meta/visitors';

describe('visitors', () => {
  const now = 10 * 60 * 60 * 1000;
  function profile() {
    const p = defaultProfile(0);
    p.seen = SPECIES.slice(0, 4).map((s) => s.id);
    p.galaxy = [{ n: 1, name: 'A', hue: 0, stars: 1, species: [], life: 1, colors: [] }];
    return p;
  }
  it('rotates fairly with fixed dust and no gems', () => {
    const p = profile();
    const a = rollVisitors(p, now);
    expect(rollVisitors(p, now)).toEqual(a);
    expect(a.map((v) => v.species)).toEqual(Array.from({ length: a.length }, (_, i) => p.seen[i % p.seen.length]));
    for (const v of a) {
      const rarity = SPECIES.find((s) => s.id === v.species)?.rarity ?? 'common';
      expect(v.dust).toBe({ common: 20, uncommon: 30, rare: 50, legendary: 80 }[rarity]);
      expect(v.gems).toBe(0);
    }
  });
  it('gives each species its memento on the third visit only', () => {
    const p = profile();
    p.seen = [p.seen[0]];
    p.meta.lastSeen = 0;
    addVisitors(p, now);
    expect(p.visitors.map((v) => v.memento)).toEqual([null, null, p.seen[0], ...p.visitors.slice(3).map(() => null)]);
    p.visitors[0].gems = 99; // An old saved gift cannot pay gems.
    const gems = p.gems;
    while (openVisitor(p)) {}
    expect(p.gems).toBe(gems);
    expect(p.mementos).toEqual([p.seen[0]]);
    p.meta.lastSeen = 0;
    addVisitors(p, now);
    expect(p.visitors.every((v) => v.memento === null)).toBe(true);
  });

  it('returns an unclaimed memento after a dropped gift and keeps pending mementos while trimming', () => {
    const p = profile();
    const species = p.seen[0];
    p.seen = [species];
    p.visits[species] = 2;
    p.visitors = Array.from({ length: 12 }, (_, i) => ({ species, dust: 20, gems: 0, memento: i === 0 ? species : null }));
    addVisitors(p, now);
    expect(p.visitors).toHaveLength(12);
    expect(p.visitors[0].memento).toBe(species);
    p.visitors = p.visitors.filter((gift) => !gift.memento);
    p.meta.lastSeen = 0;
    addVisitors(p, now);
    expect(p.visitors.some((gift) => gift.memento === species)).toBe(true);
  });
});
