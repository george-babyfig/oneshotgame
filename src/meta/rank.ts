// Legacy title data remains for existing Passport saves. Progress no longer earns ranks.
import type { Profile } from './profile';
import type { Reward } from './progression';
import { t } from '../i18n';
import { unlocked as featureUnlocked } from './unlocks';

export const RANK_TITLES = [
  'Stargazer',
  'Pebble Tosser',
  'Cloud Shaper',
  'World Gardener',
  'Sky Sculptor',
  'Planet Keeper',
  'Star Warden',
  'Cosmic Architect',
];
export const RANK_UNLOCKS: Record<number, string> = {};
export function rankTitle(rank: number) {
  return t(RANK_TITLES[Math.min(Math.max(rank, 1), RANK_TITLES.length) - 1]);
}
export function rankReady(_p: Profile): boolean {
  return false;
}
export function rankReward(_rank: number): Reward {
  return {};
}
export function unlocked(p: Profile, feature: 'daily' | 'rush' | 'zen' | 'challenge') {
  return featureUnlocked(p, feature);
}
