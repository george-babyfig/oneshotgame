// Everything you are likely to tweak before shipping lives here.
import { t, tp } from '../i18n';

export const GAME_NAME = 'Pocket Planet';
export const VERSION = '1.0.0';

/** Gems for "+5 throws" when you run out; rises each time within a level. */
export const CONTINUE_COSTS = [40, 70, 110];
export const CONTINUE_THROWS = 5;

export const DAILY_GEMS = [10, 15, 20, 25, 30, 40, 60];
export const PIGGY_PER_WIN = 4;
export const PIGGY_MAX = 250;
export const GEMS_PER_NEW_SPECIES = 3;

export interface ProductDef {
  key: string;
  /** Must match the Product ID you create in App Store Connect. */
  id: string;
  title: string;
  gems: number;
  consumable: boolean;
  fallbackPrice: string;
  tag?: string;
}

export const PRODUCTS: ProductDef[] = [
  { key: 'gems_s', id: 'com.pocketplanet.game.gems80', title: 'Handful of Gems', gems: 80, consumable: true, fallbackPrice: '$0.99' },
  {
    key: 'gems_m',
    id: 'com.pocketplanet.game.gems500',
    title: 'Pouch of Gems',
    gems: 500,
    consumable: true,
    fallbackPrice: '$4.99',
    tag: '+25%',
  },
  {
    key: 'gems_l',
    id: 'com.pocketplanet.game.gems1200',
    title: 'Chest of Gems',
    gems: 1200,
    consumable: true,
    fallbackPrice: '$9.99',
    tag: 'Popular',
  },
  {
    key: 'gems_xl',
    id: 'com.pocketplanet.game.gems2800',
    title: 'Galaxy of Gems',
    gems: 2800,
    consumable: true,
    fallbackPrice: '$19.99',
    tag: 'Best value',
  },
  { key: 'piggy', id: 'com.pocketplanet.game.piggy', title: 'Gem Piggy Bank', gems: 0, consumable: true, fallbackPrice: '$1.99' },
  { key: 'starter', id: 'com.pocketplanet.game.starter', title: 'Starter Pack', gems: 300, consumable: false, fallbackPrice: '$2.99' },
  { key: 'pass', id: 'com.pocketplanet.game.cosmicpass', title: 'Cosmic Pass', gems: 0, consumable: false, fallbackPrice: '$4.99' },
];

export const PRODUCT_BY_KEY: Record<string, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.key, p]));
export const PRODUCT_BY_ID: Record<string, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Boosters: bought with stardust (soft) or gems (premium), used before a level.
export type BoosterId = 'shower' | 'spark' | 'scope';
export const BOOSTERS: Record<BoosterId, { name: string; emoji: string; desc: string; dust: number; gems: number }> = {
  shower: { name: 'Comet Shower', emoji: '🌠', desc: '+3 throws this level', dust: 180, gems: 25 },
  spark: { name: 'Life Spark', emoji: '✨', desc: 'Start with three meadows already growing', dust: 150, gems: 20 },
  scope: { name: 'Star Scope', emoji: '🔭', desc: 'Full-length aim guide this level', dust: 120, gems: 15 },
};

// Permanent upgrades bought with stardust.
export type UpgradeId = 'scope' | 'throws' | 'splash' | 'vault';
export const UPGRADES: Record<UpgradeId, { name: string; emoji: string; desc: (lv: number) => string; costs: number[] }> = {
  scope: {
    name: 'Aim Guide',
    emoji: '🎯',
    desc: (lv) => t('Aim line length: {x}', { x: t(['short', 'medium', 'long', 'full'][lv]) }),
    costs: [250, 700, 1600],
  },
  throws: {
    name: 'Extra Throws',
    emoji: '🪨',
    desc: (lv) => tp(lv, '+{n} throw every level', '+{n} throws every level'),
    costs: [400, 1200, 3000],
  },
  splash: {
    name: 'Wide Impact',
    emoji: '💥',
    desc: (lv) => (lv ? t('Impacts spread one region further') : t('Normal impact size')),
    costs: [5000],
  },
  vault: {
    name: 'Stardust Vault',
    emoji: '🏦',
    desc: (lv) => t('Galaxy stores up to {n}h of stardust', { n: [4, 8, 12, 24][lv] }),
    costs: [300, 900, 2500],
  },
};
export const VAULT_HOURS = [4, 8, 12, 24];

// Atmosphere skins (cosmetic glow around every planet).
export interface SkinDef {
  id: string;
  name: string;
  glow: string;
  gems: number;
  starter?: boolean;
  road?: boolean;
  pass?: boolean;
}
export const SKINS: SkinDef[] = [
  { id: 'classic', name: 'Sky Blue', glow: '#6ec8ff', gems: 0 },
  { id: 'violet', name: 'Nebula', glow: '#b58cff', gems: 150 },
  { id: 'ember', name: 'Ember', glow: '#ff8a4a', gems: 150 },
  { id: 'teal', name: 'Lagoon', glow: '#4ef0d0', gems: 150 },
  { id: 'rose', name: 'Rose Dawn', glow: '#ff8fc8', gems: 0, road: true },
  { id: 'lime', name: 'Lime Haze', glow: '#b8ff6e', gems: 0, road: true },
  { id: 'gold', name: 'Solar Gold', glow: '#ffd24a', gems: 0, road: true },
  { id: 'aurora', name: 'Aurora', glow: 'aurora', gems: 0, starter: true },
  { id: 'cosmic', name: 'Cosmic', glow: 'cosmic', gems: 0, pass: true, road: true },
];
