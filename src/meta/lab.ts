// Object Lab: level up each flingable object (1-5) with stardust. Every level
// adds a visible perk. Lab levels apply to the campaign and Zen Garden; the
// competitive modes (Daily Planet, Meteor Rush, Challenge) use base stats so
// scores stay fair between players.
import type { Kind } from '../core/world';
import { KINDS } from '../core/world';
import type { Profile } from './profile';
import { t } from '../i18n';

export const LAB_MAX = 5;
/** Stardust to reach each level (index = target level). */
export const LAB_COST = [0, 0, 400, 1200, 3000, 7000];

export interface LabPerk {
  lv: number;
  name: string;
  desc: string;
}

export function perks(): LabPerk[] {
  return [
    { lv: 2, name: t('Bloom'), desc: t('+2 life for every region it transforms') },
    { lv: 3, name: t('Charge'), desc: t('Fills the Supernova meter 50% faster') },
    { lv: 4, name: t('Magnet'), desc: t('+6 life for every creature it brings') },
    { lv: 5, name: t('Starfall'), desc: t('+3 life on every landing') },
  ];
}

export function labLevel(p: Profile, kind: Kind) {
  return Math.max(1, Math.min(LAB_MAX, p.lab?.[kind] ?? 1));
}

export function labLevels(p: Profile): Record<Kind, number> {
  return Object.fromEntries((Object.keys(KINDS) as Kind[]).map((k) => [k, labLevel(p, k)])) as Record<Kind, number>;
}

export type LabCheck = 'ok' | 'max' | 'locked' | 'dust';

export function canLab(p: Profile, kind: Kind): LabCheck {
  const lv = labLevel(p, kind);
  if (lv >= LAB_MAX) return 'max';
  if (p.level < KINDS[kind].unlock) return 'locked';
  return p.dust >= LAB_COST[lv + 1] ? 'ok' : 'dust';
}

export function upgradeLab(p: Profile, kind: Kind): LabCheck {
  const c = canLab(p, kind);
  if (c !== 'ok') return c;
  const lv = labLevel(p, kind);
  p.dust -= LAB_COST[lv + 1];
  p.lab = { ...p.lab, [kind]: lv + 1 };
  return 'ok';
}

// Supernova charge lives with the level rules (the solver uses it too).
export { NOVA_CHARGE } from '../core/levels';
