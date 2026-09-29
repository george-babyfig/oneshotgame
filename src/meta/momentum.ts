// Momentum: wins build free head starts; a loss pauses progress.
import type { Profile } from './profile';
import { t, tp } from '../i18n';
import { unlocked } from './unlocks';

export { MOMENTUM_UNLOCK } from './unlocks';
export const MOMENTUM_MAX = 3;

export interface MomentumPerk {
  throws: number;
  spark: boolean;
  scope: boolean;
}

export const MOMENTUM_PERKS: MomentumPerk[] = [
  { throws: 0, spark: false, scope: false },
  { throws: 1, spark: false, scope: false },
  { throws: 1, spark: true, scope: false },
  { throws: 2, spark: true, scope: true },
];

export function momentumPerkText(tier: number): string {
  const k = MOMENTUM_PERKS[tier];
  const parts: string[] = [];
  if (k.throws) parts.push(tp(k.throws, '+{n} throw', '+{n} throws'));
  if (k.spark) parts.push(`✨ ${t('Life Spark')}`);
  if (k.scope) parts.push(`🔭 ${t('Star Scope')}`);
  return parts.join(' · ');
}

export function momentumActive(p: Profile) {
  return unlocked(p, 'momentum');
}

export function momentumWin(p: Profile, firstCampaignClear = true) {
  if (!momentumActive(p) || !firstCampaignClear) return;
  if (p.momentum.paused) p.momentum.paused = false;
  else p.momentum.streak = Math.min(MOMENTUM_MAX, p.momentum.streak + 1);
  p.stats.bestStreak = Math.max(p.stats.bestStreak, p.momentum.streak);
}

/** A lost level pauses Momentum at its current tier. */
export function momentumLoss(p: Profile, _day: string, firstCampaignClear = true): null {
  if (momentumActive(p) && firstCampaignClear) p.momentum.paused = true;
  return null;
}
