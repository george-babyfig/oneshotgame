import { describe, expect, it } from 'vitest';
import { SPECIES, TRAITS, traitOf, type TraitId } from '../src/core/world';

const EXPECTED: Record<TraitId, string[]> = {
  fireproof: ['newt', 'turtle', 'dragon', 'scorpion', 'camel', 'giraffe', 'elephant', 'sunbird', 'crab', 'flamingo'],
  swimmer: ['fish', 'reeffish', 'kraken', 'octopus', 'duck', 'frog', 'croc'],
  weedproof: ['deer', 'otter', 'parrot', 'dino', 'bunny', 'butterfly', 'unicorn', 'llama', 'bear'],
  frostproof: ['penguin', 'mammoth', 'owl', 'wolf', 'seal', 'whale', 'goat', 'eagle'],
  calm: ['worldtree', 'leviathan'],
};

describe('creature traits', () => {
  it('shows protection rather than fire or frost beside friends', () => {
    expect(TRAITS.fireproof.icon).toBe('🛡️');
    expect(TRAITS.frostproof.icon).toBe('🧣');
  });
  it('covers every creature exactly once with the ROADMAP trait list', () => {
    expect(SPECIES).toHaveLength(36);
    expect(Object.values(EXPECTED).flat()).toHaveLength(36);
    const expected = Object.fromEntries(Object.entries(EXPECTED).flatMap(([trait, ids]) => ids.map((id) => [id, trait])));
    expect(new Set(Object.keys(expected)).size).toBe(36);
    expect(Object.fromEntries(SPECIES.map((species) => [species.id, traitOf(species.id)]))).toEqual(expected);
    expect(Object.keys(TRAITS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('derives the trait from the first home land; legendaries are planet-wide', () => {
    const homeTraits: Record<string, TraitId> = {
      volcano: 'fireproof',
      desert: 'fireproof',
      savanna: 'fireproof',
      springs: 'fireproof',
      ocean: 'swimmer',
      reef: 'swimmer',
      marsh: 'swimmer',
      swamp: 'swimmer',
      forest: 'weedproof',
      jungle: 'weedproof',
      meadow: 'weedproof',
      highland: 'weedproof',
      tundra: 'frostproof',
      taiga: 'frostproof',
      icesheet: 'frostproof',
      mountain: 'frostproof',
    };
    for (const species of SPECIES) {
      expect(traitOf(species.id)).toBe(species.rarity === 'legendary' ? 'calm' : homeTraits[species.home![0]]);
    }
    expect(traitOf('unknown')).toBeNull();
    expect(traitOf('')).toBeNull();
  });
});
