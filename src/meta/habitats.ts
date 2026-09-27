// Lifebook habitat sets: discover every creature in a set for a reward.
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';

export interface Habitat {
  id: string;
  name: string;
  emoji: string;
  species: string[];
  reward: Reward;
}

export const HABITATS: Habitat[] = [
  {
    id: 'greenwoods',
    name: 'Greenwoods',
    emoji: '🌲',
    species: ['bunny', 'deer', 'parrot', 'bear', 'butterfly', 'unicorn', 'worldtree'],
    reward: { gems: 60, dust: 800 },
  },
  {
    id: 'seaside',
    name: 'Seaside',
    emoji: '🌊',
    species: ['fish', 'reeffish', 'otter', 'turtle', 'octopus', 'whale', 'kraken', 'leviathan'],
    reward: { gems: 70, dust: 900 },
  },
  {
    id: 'frost',
    name: 'Frostlands',
    emoji: '❄️',
    species: ['seal', 'penguin', 'owl', 'wolf', 'eagle', 'mammoth'],
    reward: { gems: 50, dust: 700 },
  },
  {
    id: 'sun',
    name: 'Sunlands',
    emoji: '🏜️',
    species: ['scorpion', 'giraffe', 'camel', 'elephant', 'sunbird'],
    reward: { gems: 45, dust: 600 },
  },
  { id: 'peaks', name: 'Peaks & Fire', emoji: '🌋', species: ['goat', 'llama', 'newt', 'dragon', 'dino'], reward: { gems: 45, dust: 600 } },
  { id: 'wetlands', name: 'Wetlands', emoji: '🍃', species: ['crab', 'frog', 'duck', 'flamingo', 'croc'], reward: { gems: 45, dust: 600 } },
];

export function habitatProgress(p: Profile, h: Habitat) {
  return h.species.filter((s) => p.seen.includes(s)).length;
}

/** Claim a completed habitat once. */
export function claimHabitat(p: Profile, id: string) {
  const h = HABITATS.find((x) => x.id === id);
  if (!h || p.habitats.includes(id) || habitatProgress(p, h) < h.species.length) return null;
  p.habitats.push(id);
  applyReward(p, h.reward);
  return h.reward;
}

export function habitatsReady(p: Profile): Habitat[] {
  return HABITATS.filter((h) => !p.habitats.includes(h.id) && habitatProgress(p, h) === h.species.length);
}
