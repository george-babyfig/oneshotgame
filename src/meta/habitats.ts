import { HABITATS } from './tuning';
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

export { HABITATS } from './tuning';

export function habitatProgress(p: Profile, h: Habitat) {
  return h.species.filter((s) => p.seen.includes(s)).length;
}

/** Completion is a discovery fact; claiming the separate reward is optional. */
export function completedHabitatCount(p: Profile): number {
  return HABITATS.filter((h) => habitatProgress(p, h) === h.species.length).length;
}

/** Claim a completed habitat once. */
export function claimHabitat(p: Profile, id: string) {
  const h = HABITATS.find((x) => x.id === id);
  if (!h || p.habitats.includes(id) || habitatProgress(p, h) < h.species.length) return null;
  p.habitats.push(id);
  applyReward(p, h.reward, 'habitat');
  return h.reward;
}

export function habitatsReady(p: Profile): Habitat[] {
  return HABITATS.filter((h) => !p.habitats.includes(h.id) && habitatProgress(p, h) === h.species.length);
}
