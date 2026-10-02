import { describe, expect, it } from 'vitest';
import { UNLOCKS, type UnlockId } from '../src/meta/unlocks';

// Top-level meta systems and currencies a child can meet by planet 20.
// Object names and the Field Guide's teaching words are round vocabulary.
const ALWAYS = ['stardust', 'gems', 'stars', 'Star Map', 'boosters', 'Collection', 'Styles'];
const BY_UNLOCK: Partial<Record<UnlockId, string[]>> = {
  homeworld: ['Homeworld', 'friends'],
  object_lab: ['Lab', 'Essences'],
  buddy: ['Buddy'],
  quests: ['Missions', 'Wishes'],
  star_road: ['Star Road'],
  momentum: ['Momentum'],
  voyage: ['Voyage'],
  lifebook: ['Lifebook'],
  sticker_album: ['Sticker Album'],
  passport: ['Passport'],
};

export const nounsByPlanet = (planet: number) =>
  [...new Set([...ALWAYS, ...UNLOCKS.filter((row) => row.planet <= planet).flatMap((row) => BY_UNLOCK[row.id] ?? [])])].sort();

describe('M4 meta noun budget', () => {
  it('has at most 20 distinct nouns by planet 20', () => {
    for (const id of Object.keys(BY_UNLOCK))
      expect(
        UNLOCKS.some((row) => row.id === id),
        id,
      ).toBe(true);
    const nouns = nounsByPlanet(20);
    expect(nouns.length, nouns.join(', ')).toBeLessThanOrEqual(20);
    expect(nouns).toHaveLength(20);
  });
});
