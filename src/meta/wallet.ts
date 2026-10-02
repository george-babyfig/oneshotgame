// The only place that changes balances; every change has a named ledger entry.
import type { Profile } from './profile';
import { ledger } from './ledger';

export type Material = 'stone' | 'dew' | 'leaf' | 'ember' | 'frost';
export type Currency = 'gems' | 'dust' | Material;
export type EarnSource =
  | 'level_win'
  | 'first_clear'
  | 'quest'
  | 'wish'
  | 'calendar'
  | 'visitor'
  | 'vault'
  | 'homeworld_producer'
  | 'expedition'
  | 'chest'
  | 'star_road'
  | 'festival'
  | 'voyage'
  | 'event'
  | 'achievement'
  | 'discovery'
  | 'iap'
  | 'welcome_back'
  | 'buddy'
  | 'boss'
  | 'debris'
  | 'material_drop'
  | 'material_drop_first_clear'
  | 'material_drop_replay'
  | 'daily'
  | 'rush'
  | 'challenge'
  | 'constellation'
  | 'rank'
  | 'habitat'
  | 'album'
  | 'inbox'
  | 'generic_reward';
export type SpendSink =
  | 'continue'
  | 'booster'
  | 'upgrade'
  | 'lab'
  | 'build'
  | 'cosmetic'
  | 'atmosphere'
  | 'bundle'
  | 'dye'
  | 'ring'
  | 'friendship'
  | 'accessory'
  | 'generic_spend';
const material = (c: Currency): c is Material => c !== 'gems' && c !== 'dust';
export function balance(p: Profile, currency: Currency): number {
  return material(currency) ? (p.mats[currency] ?? 0) : p[currency];
}
export function earn(p: Profile, currency: Currency, amount: number, source: EarnSource): void {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid wallet credit');
  if (!amount) return;
  if (material(currency)) p.mats = { ...p.mats, [currency]: balance(p, currency) + amount };
  else p[currency] += amount;
  try {
    ledger.add(`earn_${currency}_${source}`, amount);
  } catch {
    // Balance changes must survive a ledger failure.
  }
}
export function spend(p: Profile, currency: Currency, amount: number, sink: SpendSink): boolean {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid wallet debit');
  if (balance(p, currency) < amount) return false;
  if (!amount) return true;
  if (material(currency)) p.mats = { ...p.mats, [currency]: balance(p, currency) - amount };
  else p[currency] -= amount;
  try {
    ledger.add(`spend_${currency}_${sink}`, amount);
  } catch {
    // Balance changes must survive a ledger failure.
  }
  return true;
}
