// Momentum: a win streak that gives free head-starts (Royal Match / Candy Crush style),
// with one free "shield" per day so a single slip doesn't wipe it out.
import type { Profile } from './profile';
import { t, tp } from '../i18n';

export const MOMENTUM_UNLOCK = 6;
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
  return p.level >= MOMENTUM_UNLOCK;
}

export function momentumWin(p: Profile) {
  if (!momentumActive(p)) return;
  p.momentum.streak = Math.min(MOMENTUM_MAX, p.momentum.streak + 1);
  p.stats.bestStreak = Math.max(p.stats.bestStreak, p.momentum.streak);
}

/** A lost level. Returns 'shield' if the daily shield saved the streak, 'lost' if it broke, or null if there was none. */
export function momentumLoss(p: Profile, day: string): 'shield' | 'lost' | null {
  if (!momentumActive(p) || p.momentum.streak === 0) return null;
  if (p.momentum.shieldDay !== day) {
    p.momentum.shieldDay = day;
    return 'shield';
  }
  p.momentum.streak = 0;
  return 'lost';
}
