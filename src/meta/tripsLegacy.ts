// Frozen at 1.0 commit 2a61ed15. Never import mutable tuning: this is a promise already made.
import { SPECIES_BY_ID } from '../core/world';
import type { LegacyTripLoot } from './m13types';

export function legacyExpeditionLoot(hours: number, bayLevel: number, species: string): LegacyTripLoot {
  const rarity = SPECIES_BY_ID[species]?.rarity;
  const bonus = rarity === 'legendary' ? 1.5 : rarity === 'rare' ? 1.25 : 1;
  return {
    dust: Math.round(hours * 5 * (1 + bayLevel * 0.1) * bonus),
    gems: hours >= 8 ? 6 : hours >= 4 ? 2 : 0,
    boosters: hours >= 8 ? { shower: 1, spark: 1, scope: 1 } : hours >= 4 ? { spark: 1 } : {},
  };
}
