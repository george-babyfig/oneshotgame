// Canonical prices, rewards and costs. Review changes against the tuning snapshot.
// DIFFICULTY_DUST stays in core/levels.ts so core never imports meta.
import { version } from '../../package.json';
import { t } from '../i18n';
import { unlocked } from './unlocks';

export const GAME_NAME = 'Comet Garden';
// One version source: package.json (the iOS release script writes it to MARKETING_VERSION too).
// A named import so the bundle carries only the version, not the whole package.json.
export const VERSION: string = version;

export const PIGGY_PER_WIN = 4;
export const PIGGY_MAX = 250;
export const GEMS_PER_NEW_SPECIES = 3;

import type { ProductDef } from './m12types';
export type { ProductDef } from './m12types';

export const PRODUCTS: ProductDef[] = [
  {
    key: 'gems_s',
    kind: 'gem_pack',
    familySharing: false,
    cosmeticItemIds: [],
    id: 'com.pocketplanet.game.gems80',
    title: 'Handful of Gems',
    description: '80 gems',
    contents: ['80 gems'],
    emoji: '💎',
    gems: 80,
    consumable: true,
    fallbackPrice: '$0.99',
  },
  {
    key: 'gems_m',
    kind: 'gem_pack',
    familySharing: false,
    cosmeticItemIds: [],
    id: 'com.pocketplanet.game.gems500',
    title: 'Pouch of Gems',
    description: '500 gems',
    contents: ['500 gems'],
    emoji: '💎',
    gems: 500,
    consumable: true,
    fallbackPrice: '$4.99',
  },
  {
    key: 'gems_l',
    kind: 'gem_pack',
    familySharing: false,
    cosmeticItemIds: [],
    id: 'com.pocketplanet.game.gems1200',
    title: 'Chest of Gems',
    description: '1,200 gems',
    contents: ['1,200 gems'],
    emoji: '💎',
    gems: 1200,
    consumable: true,
    fallbackPrice: '$9.99',
  },
  {
    key: 'gems_xl',
    kind: 'gem_pack',
    familySharing: false,
    cosmeticItemIds: [],
    id: 'com.pocketplanet.game.gems2800',
    title: 'Galaxy of Gems',
    description: '2,800 gems',
    contents: ['2,800 gems'],
    emoji: '💎',
    gems: 2800,
    consumable: true,
    fallbackPrice: '$19.99',
  },
  {
    key: 'piggy',
    kind: 'piggy_bank',
    familySharing: false,
    cosmeticItemIds: [],
    id: 'com.pocketplanet.game.piggy',
    title: 'Gem Piggy Bank',
    description: 'The gems saved so far, up to 250',
    contents: ['The gems saved so far, up to 250'],
    emoji: '🐷',
    gems: 0,
    consumable: true,
    fallbackPrice: '$1.99',
  },
  {
    key: 'starter',
    kind: 'cosmetic_bundle',
    familySharing: true,
    cosmeticItemIds: ['aurora', 'suit_aurora', 'tr_aurora_crew', 'banner_aurora', 'hat_aurora', 'l_aurora', 'paint_aurora'],
    id: 'com.pocketplanet.game.startercrew',
    title: 'Starter Crew',
    description: 'Seven Aurora looks for Keeper and Homeworld',
    contents: [
      'Aurora atmosphere',
      'Aurora Explorer suit',
      'Aurora trail',
      'Aurora Passport banner',
      'Aurora hat',
      'Aurora launcher look',
      'Aurora Homeworld paint',
    ],
    emoji: '🌈',
    gems: 0,
    consumable: false,
    fallbackPrice: '$2.99',
  },
  {
    key: 'pass',
    kind: 'road_pass',
    familySharing: true,
    cosmeticItemIds: [
      'cosmic',
      'l_orbit',
      'hat_halo',
      'tr_cosmic',
      'suit_star',
      'paint_gilded_ground',
      'paint_liquid_gold_sea',
      'frame_starfield',
      'banner_gilded',
      'title_star_captain',
      'em_star_captain',
      'burst_cosmic',
    ],
    id: 'com.pocketplanet.game.road00',
    title: 'Cosmic Pass: Cosmic Road',
    description: '12 looks along the Cosmic Road paid lane',
    contents: [
      'Cosmic atmosphere',
      'Golden Orbit launcher look',
      'Halo Ring hat',
      'Comet Tail trail',
      'Star Captain suit',
      'Gilded Homeworld ground paint',
      'Liquid Gold Homeworld sea paint',
      'Starfield photo frame',
      'Gilded Passport banner',
      'Star Captain title',
      'Star Captain pose',
      'Cosmic burst',
    ],
    emoji: '🌌',
    gems: 0,
    consumable: false,
    fallbackPrice: '$3.99',
  },
  {
    key: 'theme_tidepool',
    kind: 'theme',
    familySharing: true,
    cosmeticItemIds: [
      'tidepool_lab_1',
      'tidepool_lab_2',
      'tidepool_lab_3',
      'tidepool_lab_4',
      'tidepool_lab_5',
      'tidepool_lab_6',
      'tidepool_den',
      'tidepool_greenhouse',
      'tidepool_launch_bay',
      'tidepool_ground',
      'tidepool_sea',
      'tidepool_decor_1',
      'tidepool_decor_2',
      'tidepool_decor_3',
      'tidepool_friend_1',
      'tidepool_friend_2',
    ],
    id: 'com.pocketplanet.game.theme.tidepool',
    title: 'Homeworld Theme: Tidepool',
    description: 'Homeworld paints, building skins and outfits',
    contents: [
      'Six Tidepool Lab skins',
      'Tidepool Den skin',
      'Tidepool Greenhouse skin',
      'Tidepool Launch Bay skin',
      'Tidepool ground paint',
      'Tidepool sea paint',
      'Three Tidepool decoration skins',
      'Two Tidepool friend outfits',
    ],
    emoji: '🌊',
    gems: 0,
    consumable: false,
    fallbackPrice: '$2.99',
  },
  {
    key: 'theme_cometcandy',
    kind: 'theme',
    familySharing: true,
    cosmeticItemIds: [
      'cometcandy_lab_1',
      'cometcandy_lab_2',
      'cometcandy_lab_3',
      'cometcandy_lab_4',
      'cometcandy_lab_5',
      'cometcandy_lab_6',
      'cometcandy_den',
      'cometcandy_greenhouse',
      'cometcandy_launch_bay',
      'cometcandy_ground',
      'cometcandy_sea',
      'cometcandy_decor_1',
      'cometcandy_decor_2',
      'cometcandy_decor_3',
      'cometcandy_friend_1',
      'cometcandy_friend_2',
    ],
    id: 'com.pocketplanet.game.theme.cometcandy',
    title: 'Homeworld Theme: Comet Candy',
    description: 'Homeworld paints, building skins and outfits',
    contents: [
      'Six Comet Candy Lab skins',
      'Comet Candy Den skin',
      'Comet Candy Greenhouse skin',
      'Comet Candy Launch Bay skin',
      'Comet Candy ground paint',
      'Comet Candy sea paint',
      'Three Comet Candy decoration skins',
      'Two Comet Candy friend outfits',
    ],
    emoji: '🍬',
    gems: 0,
    consumable: false,
    fallbackPrice: '$2.99',
  },
  {
    key: 'pack_crystalfrost',
    kind: 'planet_pack',
    familySharing: true,
    cosmeticItemIds: [
      'suit_crystalfrost',
      'hat_crystalfrost',
      'crystalfrost_trail_1',
      'crystalfrost_trail_2',
      'crystalfrost_trail_3',
      'crystalfrost_trail_4',
      'crystalfrost_trail_5',
      'crystalfrost_trail_6',
      'crystalfrost_burst_1',
      'crystalfrost_burst_2',
      'crystalfrost_burst_3',
      'crystalfrost_burst_4',
      'crystalfrost_burst_5',
      'crystalfrost_burst_6',
      'fusion_crystalfrost',
    ],
    id: 'com.pocketplanet.game.pack.crystalfrost',
    title: 'Planet Pack: Crystal Frost',
    description: 'Keeper set, six trails and bursts, Fusion',
    contents: [
      'Crystal Frost Keeper suit',
      'Crystal Frost Keeper hat',
      'Six Crystal Frost object trails',
      'Six Crystal Frost object bursts',
      'Crystal Frost Fusion style',
    ],
    emoji: '❄️',
    gems: 0,
    consumable: false,
    fallbackPrice: '$2.99',
  },
  {
    key: 'style_nebula',
    kind: 'style_single',
    familySharing: true,
    cosmeticItemIds: ['supernova_nebula', 'tr_nebula'],
    id: 'com.pocketplanet.game.style.nebula',
    title: 'Style Single: Nebula Swirl',
    description: 'Nebula Supernova style and matching trail',
    contents: ['Nebula Swirl Supernova style', 'Nebula Swirl trail'],
    emoji: '🌀',
    gems: 0,
    consumable: false,
    fallbackPrice: '$1.99',
  },
  {
    key: 'style_firefly',
    kind: 'style_single',
    familySharing: true,
    cosmeticItemIds: ['supernova_firefly', 'tr_firefly'],
    id: 'com.pocketplanet.game.style.firefly',
    title: 'Style Single: Firefly Sparks',
    description: 'Firefly Sparks Supernova and matching trail',
    contents: ['Firefly Sparks Supernova style', 'Firefly Sparks trail'],
    emoji: '✨',
    gems: 0,
    consumable: false,
    fallbackPrice: '$1.99',
  },
];

// Samplers are earned from a Wish and are separate from paid entitlements.
export const FREE_SAMPLERS = {
  theme_tidepool: 'sampler_tidepool',
  theme_cometcandy: 'sampler_cometcandy',
  pack_crystalfrost: 'sampler_crystalfrost',
} as const;

export const PRODUCT_BY_KEY: Record<string, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.key, p]));
export const PRODUCT_BY_ID: Record<string, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const PRODUCT_TEXT_KEYS = PRODUCTS.flatMap((p) => [p.title, p.description, ...p.contents]);

// Boosters: bought with stardust (soft) or gems (premium), used before a level.
export type BoosterId = 'shower' | 'spark' | 'scope';
export const BOOSTERS: Record<BoosterId, { name: string; emoji: string; desc: string; dust: number; gems: number }> = {
  shower: { name: 'Comet Shower', emoji: '🌠', desc: '+3 throws this level', dust: 180, gems: 25 },
  spark: { name: 'Life Spark', emoji: '✨', desc: 'Start with three meadows already growing', dust: 150, gems: 20 },
  scope: { name: 'Star Scope', emoji: '🔭', desc: 'See the next 5 objects and a longer aim line this round', dust: 120, gems: 15 },
};

// Legacy upgrade ids stay in saves until the one-time refund migration runs.
export type UpgradeId = 'scope' | 'throws' | 'splash' | 'vault';
export const UPGRADES: Record<'vault', { name: string; emoji: string; desc: (lv: number) => string; costs: number[] }> = {
  vault: {
    name: 'Stardust Vault',
    emoji: '🏦',
    desc: () => t('Wins keep the Vault working. One campaign win adds two hours.'),
    costs: [1000, 3000, 8000, 20000],
  },
};

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

// Round and mode rewards.
export const WIN_REWARD = { baseDust: 25, dustPerStar: 15, firstClearDust: 40, threeStarGems: 2, superFirstClearGems: 5 };
export const DAILY_REWARD = { baseGems: 5, gemsPerStar: 5 };
export const RUSH_REWARD = { dustPerScore: 0.6, bestGems: 5 };
export const CHALLENGE_REWARD = { winGems: 10, dust: 50 };
export const CONTINUE_COST = 50;
// The final step asks for more campaign Essence and less saved stardust.
export const LAB_COST = [0, 0, 400, 1200, 3000, 4500];
export const LAB_ESSENCE_COST = [0, 0, 10, 25, 50, 180];
export const LAB_BUILD_COST = 300;
export const LAB_FEATS = { fusion: 10, guard: 5 };
export const FIRST_HOUR_REWARD = { dust: 100 };
export const WELCOME_BACK_GEMS = 30;

import type { Reward, QuestDef } from './progression';
import type { BuildingType, BuildingDef } from './homeworld';
import type { FestivalTier } from './festivals';
import type { EventTier } from './events';
import type { Constellation } from './constellations';
import type { Dye } from './dyes';

export const QUESTS: QuestDef[] = [
  { id: 'throw25', event: 'throw', goal: 25, gems: 8, emoji: '🪨', text: (g) => t('Fling {n} objects', { n: g }) },
  { id: 'win3', event: 'win', goal: 3, gems: 12, emoji: '🪐', text: (g) => t('Complete {n} planets', { n: g }) },
  { id: 'star6', event: 'star', goal: 6, gems: 15, emoji: '⭐', text: (g) => t('Earn {n} stars', { n: g }) },
  { id: 'creature8', event: 'creature', goal: 8, gems: 10, emoji: '🦊', text: (g) => t('Bring {n} creatures to life', { n: g }) },
  { id: 'three1', event: 'three', goal: 1, gems: 15, emoji: '🌟', text: () => t('Get 3 stars on any planet') },
  { id: 'booster1', event: 'booster', goal: 1, gems: 6, emoji: '🌠', text: () => t('Use a booster') },
  { id: 'collect2', event: 'collect', goal: 2, gems: 8, emoji: '✨', text: (g) => t('Collect stardust {n} times', { n: g }) },
  { id: 'land20', event: 'land', goal: 20, gems: 10, emoji: '🌍', text: (g) => t('Transform {n} regions', { n: g }) },
  {
    id: 'voyage1',
    event: 'voyage',
    goal: 1,
    gems: 10,
    emoji: '🚀',
    text: () => t('Clear a Weekly Voyage stop'),
    need: (p) => unlocked(p, 'quest_voyage'),
  },
  {
    id: 'spot6',
    event: 'spot',
    goal: 6,
    gems: 8,
    emoji: '🎪',
    text: (g) => t('Spot {n} costumed critters', { n: g }),
    need: (p) => unlocked(p, 'quest_spot'),
  },
];

export const QUEST_BONUS: Reward = { gems: 20, boosters: { shower: 1 } };

export const CALENDAR: Reward[] = [
  { gems: 10 },
  { dust: 200 },
  { gems: 15 },
  { boosters: { shower: 1 } },
  { gems: 20 },
  { dust: 400 },
  { gems: 50, boosters: { spark: 1 } },
  { gems: 15 },
  { dust: 300 },
  { boosters: { scope: 1 } },
  { gems: 20 },
  { dust: 500 },
  { gems: 25 },
  { item: 'hat_beanie', gems: 20 },
  { gems: 20 },
  { dust: 600 },
  { boosters: { spark: 2 } },
  { gems: 25 },
  { dust: 700 },
  { gems: 30 },
  { gems: 40, boosters: { shower: 1, spark: 1, scope: 1 } },
  { gems: 25 },
  { dust: 800 },
  { boosters: { shower: 2 } },
  { gems: 30 },
  { dust: 1000 },
  { gems: 35 },
  { item: 'suit_night', gems: 60 },
];

export const VOYAGE_REWARDS: Reward[] = [
  { dust: 150 },
  { dust: 200 },
  { gems: 5 },
  { dust: 300, boosters: { spark: 1 } },
  { gems: 10 },
  { dust: 400, boosters: { shower: 1 } },
  { gems: 30, dust: 600 },
];

export const FESTIVAL_TIERS: FestivalTier[] = [
  { spot: 10, reward: { dust: 250 }, sticker: true },
  { spot: 25, reward: { gems: 15 } },
  { spot: 45, reward: { gems: 20, dust: 500 }, acc: true },
];

export const EVENT_TIERS: EventTier[] = [
  { tokens: 10, reward: { gems: 10 } },
  { tokens: 25, reward: { dust: 300 } },
  { tokens: 45, reward: { boosters: { shower: 1, spark: 1 } } },
  { tokens: 70, reward: { gems: 25 } },
  { tokens: 100, reward: { dust: 900, boosters: { scope: 2 } } },
  { tokens: 140, reward: { gems: 50 } },
];

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  lab: { type: 'lab', name: 'Lab', desc: 'Your shots learn tricks', ring: 1, cost: LAB_BUILD_COST, max: 6 },
  // Legacy save types have no build path or player-facing copy.
  mill: { type: 'mill', name: '', desc: '', ring: 1, cost: 0, max: 0 },
  den: { type: 'den', name: 'Critter Den', desc: 'A home for creatures from your Lifebook', ring: 1, cost: 250, max: 2 },
  greenhouse: { type: 'greenhouse', name: 'Greenhouse', desc: 'Grows boosters for your levels', ring: 2, cost: 600, max: 2 },
  launch_bay: { type: 'launch_bay', name: 'Launch Bay', desc: 'Choose, tune and try your launchers', ring: 2, cost: 800, max: 1 },
  grove: { type: 'grove', name: '', desc: '', ring: 3, cost: 0, max: 0 },
  observatory: {
    type: 'observatory',
    name: '',
    desc: '',
    ring: 3,
    cost: 0,
    max: 0,
  },
  fountain: {
    type: 'fountain',
    name: 'Star Fountain',
    desc: 'Decoration for your Homeworld',
    ring: 1,
    cost: 300,
    decor: true,
    charm: 2,
    max: 2,
  },
  lantern: {
    type: 'lantern',
    name: 'Moon Lantern',
    desc: 'Decoration for your Homeworld',
    ring: 1,
    cost: 200,
    decor: true,
    charm: 1,
    max: 3,
  },
  flowers: {
    type: 'flowers',
    name: 'Comet Flowers',
    desc: 'Decoration for your Homeworld',
    ring: 2,
    cost: 400,
    decor: true,
    charm: 2,
    max: 3,
  },
  statue: {
    type: 'statue',
    name: 'Keeper Statue',
    desc: 'Decoration for your Homeworld',
    ring: 1,
    cost: 5000,
    gems: 0,
    decor: true,
    charm: 4,
    max: 1,
  },
};

export const BUILD_TIME = [0, 30e3, 5 * 60e3, 30 * 60e3, 2 * 3600e3, 4 * 3600e3];

export const RING_COST = [0, 0, 1500, 5000, 12000, 30000];
export const HOME_LEVEL_REQUIREMENTS: Record<
  1 | 2 | 3 | 4 | 5,
  {
    chapter: number;
    dust: number;
    essence: Partial<Record<'stone' | 'dew' | 'leaf' | 'ember' | 'frost', number>>;
  }
> = {
  1: { chapter: 0, dust: 0, essence: {} },
  2: { chapter: 1, dust: 1500, essence: { leaf: 20, dew: 20 } },
  3: { chapter: 3, dust: 5000, essence: { stone: 40, ember: 30 } },
  4: { chapter: 5, dust: 12000, essence: { frost: 40, dew: 40, leaf: 40 } },
  5: { chapter: 8, dust: 30000, essence: { stone: 60, dew: 60, leaf: 60, ember: 60, frost: 60 } },
};

export const DYES: Dye[] = [
  { id: 'snow', name: 'Snow', color: '#f4f6ff' },
  { id: 'sky', name: 'Sky', color: '#6ec8ff' },
  { id: 'mint', name: 'Mint', color: '#5ef2b0' },
  { id: 'night', name: 'Night', color: '#2a2a5e' },
  { id: 'coral', name: 'Coral', color: '#ff7a8a', cost: { dew: 4 } },
  { id: 'sunflower', name: 'Sunflower', color: '#ffd24a', cost: { leaf: 4 } },
  { id: 'lilac', name: 'Lilac', color: '#b58cff', cost: { frost: 3 } },
  { id: 'forest', name: 'Forest', color: '#3f9e5a', cost: { leaf: 6 } },
  { id: 'lava', name: 'Lava', color: '#e0552f', cost: { ember: 5 } },
  { id: 'ocean', name: 'Deep Ocean', color: '#1f5a9e', cost: { dew: 6 } },
  { id: 'peach', name: 'Peach', color: '#ffb48a', cost: { ember: 3, leaf: 3 } },
  { id: 'glacier', name: 'Glacier', color: '#bfeaff', cost: { frost: 6 } },
  { id: 'slate', name: 'Slate', color: '#6a7088', cost: { stone: 6 } },
  { id: 'bubblegum', name: 'Bubblegum', color: '#ff8fd0', cost: { dew: 4, leaf: 4 } },
  { id: 'gold', name: 'Gold Leaf', color: '#e8b33a', cost: { stone: 8, ember: 6 } },
  { id: 'aurora', name: 'Aurora', color: 'aurora', cost: { frost: 8, dew: 8 } },
];

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'otter',
    name: 'The Little Otter',
    stars: [
      [0.2, 0.6],
      [0.4, 0.45],
      [0.6, 0.5],
      [0.8, 0.35],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    bundles: [
      { id: 'otter-1', need: { dew: 6 } },
      { id: 'otter-2', need: { leaf: 5, dew: 3 } },
      { id: 'otter-3', need: { stone: 4, dew: 4 } },
    ],
    reward: { gems: 40, item: 'suit_tide' },
  },
  {
    id: 'mill',
    name: 'The Windmill',
    stars: [
      [0.5, 0.5],
      [0.3, 0.25],
      [0.75, 0.3],
      [0.7, 0.75],
      [0.25, 0.7],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    bundles: [
      { id: 'mill-1', need: { stone: 8 } },
      { id: 'mill-2', need: { leaf: 8 } },
      { id: 'mill-3', need: { stone: 5, ember: 4 } },
      { id: 'mill-4', need: { dew: 6, leaf: 4 } },
    ],
    reward: { gems: 50, item: 'tr_aurora' },
  },
  {
    id: 'ember',
    name: 'The Ember Fox',
    stars: [
      [0.15, 0.7],
      [0.35, 0.55],
      [0.5, 0.3],
      [0.65, 0.55],
      [0.85, 0.4],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    bundles: [
      { id: 'ember-1', need: { ember: 6 } },
      { id: 'ember-2', need: { ember: 6, stone: 6 } },
      { id: 'ember-3', need: { ember: 8, leaf: 5 } },
    ],
    reward: { gems: 50, item: 'suit_ember' },
  },
  {
    id: 'frost',
    name: 'The Snow Whale',
    stars: [
      [0.15, 0.5],
      [0.4, 0.4],
      [0.65, 0.45],
      [0.85, 0.3],
      [0.85, 0.6],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
    bundles: [
      { id: 'frost-1', need: { frost: 6 } },
      { id: 'frost-2', need: { frost: 6, dew: 6 } },
      { id: 'frost-3', need: { frost: 10, stone: 4 } },
    ],
    reward: { gems: 60, item: 'hat_snow' },
  },
  {
    id: 'tree',
    name: 'The World Tree',
    stars: [
      [0.5, 0.85],
      [0.5, 0.55],
      [0.3, 0.35],
      [0.7, 0.35],
      [0.5, 0.15],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
    bundles: [
      { id: 'tree-1', need: { leaf: 12 } },
      { id: 'tree-2', need: { leaf: 8, dew: 8 } },
      { id: 'tree-3', need: { leaf: 10, stone: 6, frost: 4 } },
      { id: 'tree-4', need: { leaf: 10, ember: 6 } },
    ],
    reward: { gems: 80, item: 'l_tree' },
  },
  {
    id: 'crown',
    name: 'The Keeper’s Crown',
    stars: [
      [0.2, 0.7],
      [0.25, 0.35],
      [0.4, 0.55],
      [0.5, 0.25],
      [0.6, 0.55],
      [0.75, 0.35],
      [0.8, 0.7],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
    bundles: [
      { id: 'crown-1', need: { stone: 12, dew: 12 } },
      { id: 'crown-2', need: { leaf: 12, ember: 10 } },
      { id: 'crown-3', need: { frost: 12, stone: 8 } },
      { id: 'crown-4', need: { stone: 8, dew: 8, leaf: 8, ember: 8, frost: 8 } },
    ],
    reward: { gems: 150, item: 'hat_star' },
  },
  {
    id: 'kite',
    name: "The Keeper's Kite",
    stars: [
      [0.5, 0.1],
      [0.18, 0.42],
      [0.5, 0.65],
      [0.82, 0.42],
      [0.65, 0.82],
      [0.42, 0.9],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [4, 5],
    ],
    bundles: [
      { id: 'kite-1', need: { leaf: 8, dew: 5 } },
      { id: 'kite-2', need: { stone: 8, dew: 5 } },
      { id: 'kite-3', need: { leaf: 8, stone: 8, dew: 8 } },
    ],
    reward: { item: 'tr_kite' },
  },
];

import type { LandmarkId } from './homeworldLife';
import type { BiomeId } from '../core/world';
import type { UnlockId } from './unlocks';

export type LandmarkMetric =
  | 'grown'
  | 'arrivals'
  | 'reaction'
  | 'fusions'
  | 'newStars'
  | 'supernovas'
  | 'settled'
  | 'settledVent'
  | 'settledVine'
  | 'hardWins'
  | 'normalThreeStars'
  | 'threeStars'
  | 'newKinds'
  | 'bestFriends'
  | 'friendLevelThree'
  | 'constellations'
  | 'bundles';
export interface LandmarkRoute {
  label: string;
  metric: LandmarkMetric;
  target: number;
  biomes?: BiomeId[];
  reaction?: 'steam' | 'rainGarden' | 'wildflowers' | 'glacier';
  taught: UnlockId;
}
export interface LandmarkStageDef {
  ask: string;
  routes: readonly LandmarkRoute[];
  reward: { dust?: number; gems?: number };
}
export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  stages: readonly [LandmarkStageDef, LandmarkStageDef, LandmarkStageDef];
  delivery: Partial<Record<'leaf' | 'dew' | 'stone', number>>;
  finish: string;
}

/** Fixed, never-expiring asks. Alternative routes use the same event count where possible. */
export const LANDMARKS: readonly LandmarkDef[] = [
  {
    id: 'sprout_garden',
    name: 'Sprout Garden',
    level: 1,
    stages: [
      {
        ask: 'Grow 12 Meadow or Forest sectors, or 12 Marsh, Jungle, or Savanna sectors',
        routes: [
          { label: 'Meadow or Forest sectors', metric: 'grown', target: 12, biomes: ['meadow', 'forest'], taught: 'homeworld' },
          {
            label: 'Marsh, Jungle, or Savanna sectors',
            metric: 'grown',
            target: 12,
            biomes: ['marsh', 'jungle', 'savanna'],
            taught: 'homeworld',
          },
        ],
        reward: { dust: 100 },
      },
      {
        ask: 'Welcome 8 different creatures or earn 8 new stars',
        routes: [
          { label: 'different creatures', metric: 'arrivals', target: 8, taught: 'homeworld' },
          { label: 'new stars', metric: 'newStars', target: 8, taught: 'homeworld' },
        ],
        reward: { gems: 10 },
      },
      {
        ask: 'Make 3 Wildflowers or 3 Rain Gardens',
        routes: [
          { label: 'Wildflowers', metric: 'reaction', reaction: 'wildflowers', target: 3, taught: 'wildflowers' },
          { label: 'Rain Gardens', metric: 'reaction', reaction: 'rainGarden', target: 3, taught: 'rainGarden' },
        ],
        reward: { dust: 150 },
      },
    ],
    delivery: { leaf: 15 },
    finish: 'Sprout Flowers by your Dens and the Green Thumb title',
  },
  {
    id: 'skyglass',
    name: 'Skyglass',
    level: 2,
    stages: [
      {
        ask: 'Earn 12 new stars or welcome 12 different creatures',
        routes: [
          { label: 'new stars', metric: 'newStars', target: 12, taught: 'homeworld' },
          { label: 'different creatures', metric: 'arrivals', target: 12, taught: 'homeworld' },
        ],
        reward: { dust: 100 },
      },
      {
        ask: 'Fire 6 Supernovas or make 6 Fusions',
        routes: [
          { label: 'Supernovas', metric: 'supernovas', target: 6, taught: 'supernova' },
          { label: 'Fusions', metric: 'fusions', target: 6, taught: 'steam' },
        ],
        reward: { gems: 10 },
      },
      {
        ask: 'Make 4 Steam or any 4 Fusions',
        routes: [
          { label: 'Steam', metric: 'reaction', reaction: 'steam', target: 4, taught: 'steam' },
          { label: 'Fusions', metric: 'fusions', target: 4, taught: 'steam' },
        ],
        reward: { dust: 150 },
      },
    ],
    delivery: { stone: 20, dew: 15 },
    finish: "The Keeper's Kite and the Sky Finder title",
  },
  {
    id: 'sky_bridge',
    name: 'Sky Bridge',
    level: 3,
    stages: [
      {
        ask: 'Grow 15 Mountain or Highland sectors, or 15 Tundra, Taiga, or Ice Sheet sectors',
        routes: [
          { label: 'Mountain or Highland sectors', metric: 'grown', target: 15, biomes: ['mountain', 'highland'], taught: 'homeworld' },
          {
            label: 'Tundra, Taiga, or Ice Sheet sectors',
            metric: 'grown',
            target: 15,
            biomes: ['tundra', 'taiga', 'icesheet'],
            taught: 'homeworld',
          },
        ],
        reward: { dust: 150 },
      },
      {
        ask: 'Make 3 Glaciers or grow 10 cold sectors',
        routes: [
          { label: 'Glaciers', metric: 'reaction', reaction: 'glacier', target: 3, taught: 'glacier' },
          { label: 'Cold sectors', metric: 'grown', target: 10, biomes: ['tundra', 'taiga', 'icesheet'], taught: 'homeworld' },
        ],
        reward: { gems: 15 },
      },
      {
        ask: 'Cool 4 Ember Vents or clear 4 Tanglevines',
        routes: [
          { label: 'Ember Vents', metric: 'settledVent', target: 4, taught: 'vent' },
          { label: 'Tanglevines', metric: 'settledVine', target: 4, taught: 'vine' },
        ],
        reward: { dust: 200 },
      },
    ],
    delivery: { stone: 40, dew: 20 },
    finish: 'The Floating Isle and the Bridge Builder title',
  },
  {
    id: 'comet_pier',
    name: 'Comet Pier',
    level: 4,
    stages: [
      {
        ask: 'Win 3 Hard planets or get 3 stars on 6 Normal planets',
        routes: [
          { label: 'Hard planets', metric: 'hardWins', target: 3, taught: 'hard' },
          { label: 'Normal planets', metric: 'normalThreeStars', target: 6, taught: 'homeworld' },
        ],
        reward: { dust: 200 },
      },
      {
        ask: 'Settle 8 Troubles or make 8 Fusions',
        routes: [
          { label: 'Troubles', metric: 'settled', target: 8, taught: 'vent' },
          { label: 'Fusions', metric: 'fusions', target: 8, taught: 'steam' },
        ],
        reward: { gems: 15 },
      },
      {
        ask: 'Make 10 Fusions or earn 10 new stars',
        routes: [
          { label: 'Fusions', metric: 'fusions', target: 10, taught: 'steam' },
          { label: 'new stars', metric: 'newStars', target: 10, taught: 'homeworld' },
        ],
        reward: { dust: 250 },
      },
    ],
    delivery: { leaf: 40, dew: 30 },
    finish: 'Zip in the Launch Bay and the Harbour Keeper title',
  },
  {
    id: 'keepers_beacon',
    name: "Keeper's Beacon",
    level: 5,
    stages: [
      {
        ask: 'Make 5 Rain Gardens or reach 3 stars on 5 planets',
        routes: [
          { label: 'Rain Gardens', metric: 'reaction', reaction: 'rainGarden', target: 5, taught: 'rainGarden' },
          { label: '3 stars on 5 planets', metric: 'threeStars', target: 5, taught: 'homeworld' },
        ],
        reward: { dust: 250 },
      },
      {
        ask: 'Become best friends with a friend or reach Friendship Level 3 with 4 friends',
        routes: [
          { label: 'best friends', metric: 'bestFriends', target: 1, taught: 'homeworld' },
          { label: 'Friendship Level 3', metric: 'friendLevelThree', target: 4, taught: 'homeworld' },
        ],
        reward: { gems: 20 },
      },
      {
        ask: 'Light 2 constellations or fill 5 Star Atlas bundles',
        routes: [
          { label: 'constellations', metric: 'constellations', target: 2, taught: 'star_atlas' },
          { label: 'Star Atlas bundles', metric: 'bundles', target: 5, taught: 'star_atlas' },
        ],
        reward: { dust: 300 },
      },
    ],
    delivery: { leaf: 50, stone: 50, dew: 50 },
    finish: 'Beacon music, the Golden photo frame and the Keeper of Light title',
  },
];

import type { Cosmetic } from './cosmetics';
import type { Habitat } from './habitats';
import type { AlbumPage } from './stickers';
import type { Paint } from './homeworld';
const c = (x: Cosmetic) => x;

export const COSMETICS: Cosmetic[] = [
  // suits
  c({ id: 'suit_sky', slot: 'suit', name: 'Sky Scout', source: 'free', tier: 'basic', colors: ['#6ec8ff', '#ffffff', '#1d2a5e'] }),
  c({ id: 'suit_mint', slot: 'suit', name: 'Mint Ranger', source: 'free', tier: 'basic', colors: ['#5ef2b0', '#ffffff', '#123f38'] }),
  c({
    id: 'suit_coral',
    slot: 'suit',
    name: 'Coral Cadet',
    source: 'gems',
    gems: 120,
    tier: 'fancy',
    colors: ['#ff7a8a', '#ffe0a8', '#3a1a38'],
  }),
  c({ id: 'suit_sun', slot: 'suit', name: 'Sunbeam', source: 'gems', gems: 120, tier: 'fancy', colors: ['#ffc94a', '#ffffff', '#4a2a10'] }),
  c({
    id: 'suit_grape',
    slot: 'suit',
    name: 'Nebula Navigator',
    source: 'chapter',
    unlock: 2,
    tier: 'fancy',
    colors: ['#9a6bff', '#ffd0ff', '#1a1040'],
  }),
  c({
    id: 'suit_moss',
    slot: 'suit',
    name: 'Forest Warden',
    source: 'habitat',
    unlock: 'greenwoods',
    tier: 'fancy',
    colors: ['#4f9e5a', '#e8d6a0', '#10301a'],
  }),
  c({
    id: 'suit_aurora',
    slot: 'suit',
    name: 'Aurora Explorer',
    source: 'starter',
    tier: 'epic',
    colors: ['aurora', '#ffffff', '#20104a'],
  }),
  c({
    id: 'suit_star',
    slot: 'suit',
    name: 'Star Captain',
    source: 'pass',
    tier: 'epic',
    colors: ['#2a2270', '#ffd24a', '#0a0620'],
    set: 'captain',
  }),
  c({
    id: 'suit_night',
    slot: 'suit',
    name: 'Starlight',
    source: 'calendar',
    unlock: 28,
    tier: 'epic',
    colors: ['#1a2a6e', '#9fe6ff', '#050818'],
  }),
  c({
    id: 'suit_tide',
    slot: 'suit',
    name: 'Tide Diver',
    source: 'constellation',
    unlock: 'otter',
    tier: 'epic',
    colors: ['#2fc6b8', '#e8fffb', '#0a2e3a'],
  }),
  c({
    id: 'suit_ember',
    slot: 'suit',
    name: 'Ember Suit',
    source: 'constellation',
    unlock: 'ember',
    tier: 'epic',
    colors: ['#e0552f', '#ffd07a', '#2a0a10'],
  }),
  // hats
  c({ id: 'hat_none', slot: 'hat', name: 'Bare Helmet', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'hat_antenna', slot: 'hat', name: 'Antenna', source: 'free', tier: 'basic', colors: ['#ff6a7a'] }),
  c({ id: 'hat_sprout', slot: 'hat', name: 'Sprout', source: 'gems', gems: 80, tier: 'basic', colors: ['#5ecf5a'] }),
  c({ id: 'hat_bunny', slot: 'hat', name: 'Bunny Ears', source: 'gems', gems: 100, tier: 'fancy', colors: ['#f3eef7', '#ffb3cf'] }),
  c({ id: 'hat_horns', slot: 'hat', name: 'Dragon Horns', source: 'gems', gems: 150, tier: 'fancy', colors: ['#ffd07a', '#b8303a'] }),
  c({
    id: 'hat_flower',
    slot: 'hat',
    name: 'Flower Crown',
    source: 'habitat',
    unlock: 'seaside',
    tier: 'fancy',
    colors: ['#ff8fc8', '#ffe066'],
  }),
  c({ id: 'hat_wizard', slot: 'hat', name: 'Star Wizard', source: 'chapter', unlock: 4, tier: 'fancy', colors: ['#4a3aa8', '#ffd24a'] }),
  c({ id: 'hat_beanie', slot: 'hat', name: 'Cozy Beanie', source: 'calendar', unlock: 14, tier: 'fancy', colors: ['#ff6a7a', '#ffffff'] }),
  c({
    id: 'hat_snow',
    slot: 'hat',
    name: 'Snowflake Cap',
    source: 'constellation',
    unlock: 'frost',
    tier: 'epic',
    colors: ['#9fe6ff', '#ffffff'],
  }),
  c({
    id: 'hat_star',
    slot: 'hat',
    name: 'Star Crown',
    source: 'constellation',
    unlock: 'crown',
    tier: 'epic',
    colors: ['#ffd24a', '#fff6b0'],
  }),
  c({ id: 'hat_crown', slot: 'hat', name: 'Tiny Crown', source: 'road', tier: 'epic', colors: ['#ffd24a', '#ff4a8a'] }),
  c({ id: 'hat_halo', slot: 'hat', name: 'Halo Ring', source: 'pass', tier: 'epic', colors: ['#ffe58a'], set: 'captain' }),
  // launchers
  c({ id: 'l_pad', slot: 'launcher', name: 'Launch Pad', source: 'free', tier: 'basic', colors: ['#c9c2ff'] }),
  c({ id: 'l_twig', slot: 'launcher', name: 'Twig', source: 'chapter', unlock: 1, tier: 'basic', colors: ['#a0743a', '#e0b050'] }),
  c({ id: 'l_petal', slot: 'launcher', name: 'Petal', source: 'gems', gems: 200, tier: 'fancy', colors: ['#ff8fc8', '#5ecf5a'] }),
  c({ id: 'l_cannon', slot: 'launcher', name: 'Comet Rail', source: 'gems', gems: 250, tier: 'fancy', colors: ['#6e8cff', '#ffd24a'] }),
  c({
    id: 'l_tree',
    slot: 'launcher',
    name: 'World Tree',
    source: 'constellation',
    unlock: 'tree',
    tier: 'epic',
    colors: ['#6a4a2a', '#5ecf6a'],
  }),
  c({ id: 'l_crystal', slot: 'launcher', name: 'Crystal Arc', source: 'road', tier: 'epic', colors: ['#7fdcff', '#d8f6ff'] }),
  c({
    id: 'l_orbit',
    slot: 'launcher',
    name: 'Golden Orbit',
    source: 'pass',
    tier: 'epic',
    colors: ['#ffd24a', '#fff2b8'],
    set: 'captain',
  }),
  // trails
  c({ id: 'tr_dots', slot: 'trail', name: 'Stardust', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'tr_sparkle', slot: 'trail', name: 'Twinkle', source: 'gems', gems: 120, tier: 'fancy', colors: ['#fff6b0'] }),
  c({ id: 'tr_hearts', slot: 'trail', name: 'Hearts', source: 'gems', gems: 120, tier: 'fancy', colors: ['#ff6a9a'] }),
  c({ id: 'tr_bubbles', slot: 'trail', name: 'Bubbles', source: 'chapter', unlock: 3, tier: 'fancy', colors: ['#9fe6ff'] }),
  c({ id: 'tr_embers', slot: 'trail', name: 'Embers', source: 'habitat', unlock: 'sun', tier: 'fancy', colors: ['#ff8a3d', '#ffd24a'] }),
  c({
    id: 'tr_aurora',
    slot: 'trail',
    name: 'Aurora',
    source: 'constellation',
    unlock: 'mill',
    tier: 'epic',
    colors: ['#6ef2c0', '#6ec8ff', '#b58cff'],
  }),
  // The constellation trail remains earnable for existing saves.
  c({ id: 'tr_aurora_crew', slot: 'trail', name: 'Aurora', source: 'starter', tier: 'epic', colors: ['#6ef2c0', '#6ec8ff', '#b58cff'] }),
  c({
    id: 'tr_rainbow',
    slot: 'trail',
    name: 'Rainbow',
    source: 'road',
    tier: 'epic',
    colors: ['#ff6a7a', '#ffc94a', '#5ef2b0', '#6ec8ff', '#b58cff'],
  }),
  c({
    id: 'tr_cosmic',
    slot: 'trail',
    name: 'Comet Tail',
    source: 'pass',
    tier: 'epic',
    colors: ['#7a4dff', '#ff4de1', '#4dc3ff'],
    set: 'captain',
  }),
  // emotes (played when you finish a planet)
  c({ id: 'em_cheer', slot: 'emote', name: 'Hooray', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'em_wave', slot: 'emote', name: 'Big Wave', source: 'free', tier: 'basic', colors: [] }),
  c({ id: 'em_jump', slot: 'emote', name: 'Moon Jump', source: 'chapter', unlock: 5, tier: 'fancy', colors: [] }),
  c({ id: 'em_spin', slot: 'emote', name: 'Twirl', source: 'gems', gems: 100, tier: 'fancy', colors: [] }),
  c({ id: 'em_dance', slot: 'emote', name: 'Wiggle Dance', source: 'habitat', unlock: 'frost', tier: 'fancy', colors: [] }),
  c({ id: 'em_flag', slot: 'emote', name: 'Plant the Flag', source: 'gems', gems: 150, tier: 'fancy', colors: [] }),
  c({ id: 'em_fireworks', slot: 'emote', name: 'Fireworks', source: 'road', tier: 'epic', colors: [] }),
  // Road 0 has 5,200 gems of fixed-price, previewable looks against its free gem supply.
  c({
    id: 'suit_mist',
    slot: 'suit',
    name: 'Mist Walker',
    source: 'gems',
    gems: 180,
    tier: 'fancy',
    colors: ['#8ba7b4', '#dce5de', '#40566a'],
  }),
  c({
    id: 'suit_moonleaf',
    slot: 'suit',
    name: 'Moonleaf Keeper',
    source: 'gems',
    gems: 240,
    tier: 'fancy',
    colors: ['#759d8a', '#d2dcbd', '#354e52'],
  }),
  c({
    id: 'suit_tideglass',
    slot: 'suit',
    name: 'Tideglass Scout',
    source: 'gems',
    gems: 280,
    tier: 'fancy',
    colors: ['#7c9db7', '#d6dbe5', '#455679'],
  }),
  c({
    id: 'suit_wildrose',
    slot: 'suit',
    name: 'Wildrose Explorer',
    source: 'gems',
    gems: 300,
    tier: 'fancy',
    colors: ['#b3869a', '#e1c4c8', '#614961'],
  }),
  c({ id: 'hat_mist', slot: 'hat', name: 'Mist Cap', source: 'gems', gems: 180, tier: 'fancy', colors: ['#8ba7b4'] }),
  c({ id: 'hat_moonleaf', slot: 'hat', name: 'Moonleaf Wreath', source: 'gems', gems: 240, tier: 'fancy', colors: ['#759d8a'] }),
  c({ id: 'hat_tideglass', slot: 'hat', name: 'Tideglass Crown', source: 'gems', gems: 280, tier: 'fancy', colors: ['#7c9db7'] }),
  c({ id: 'hat_wildrose', slot: 'hat', name: 'Wildrose Crown', source: 'gems', gems: 300, tier: 'fancy', colors: ['#b3869a'] }),
  c({ id: 'l_mist', slot: 'launcher', name: 'Mist Launcher Look', source: 'gems', gems: 180, tier: 'fancy', colors: ['#8ba7b4'] }),
  c({ id: 'l_moonleaf', slot: 'launcher', name: 'Moonleaf Launcher Look', source: 'gems', gems: 240, tier: 'fancy', colors: ['#759d8a'] }),
  c({
    id: 'l_tideglass',
    slot: 'launcher',
    name: 'Tideglass Launcher Look',
    source: 'gems',
    gems: 280,
    tier: 'fancy',
    colors: ['#7c9db7'],
  }),
  c({ id: 'l_wildrose', slot: 'launcher', name: 'Wildrose Launcher Look', source: 'gems', gems: 300, tier: 'fancy', colors: ['#b3869a'] }),
  c({ id: 'tr_mist', slot: 'trail', name: 'Mist Trail', source: 'gems', gems: 180, tier: 'fancy', colors: ['#8ba7b4'] }),
  c({ id: 'tr_moonleaf', slot: 'trail', name: 'Moonleaf Trail', source: 'gems', gems: 240, tier: 'fancy', colors: ['#759d8a'] }),
  c({ id: 'tr_tideglass', slot: 'trail', name: 'Tideglass Trail', source: 'gems', gems: 280, tier: 'fancy', colors: ['#7c9db7'] }),
  c({
    id: 'suit_starfog',
    slot: 'suit',
    name: 'Starfog Explorer',
    source: 'gems',
    gems: 300,
    tier: 'fancy',
    colors: ['#506b92', '#d9c4ed', '#283448'],
  }),
  c({ id: 'hat_starfog', slot: 'hat', name: 'Starfog Halo', source: 'gems', gems: 300, tier: 'fancy', colors: ['#b0a6d5', '#799ab8'] }),
  c({
    id: 'l_starfog',
    slot: 'launcher',
    name: 'Starfog Launcher Look',
    source: 'gems',
    gems: 300,
    tier: 'fancy',
    colors: ['#799ab8', '#d9c4ed'],
  }),
  c({ id: 'tr_starfog', slot: 'trail', name: 'Starfog Trail', source: 'gems', gems: 300, tier: 'fancy', colors: ['#799ab8', '#d9c4ed'] }),
  c({ id: 'tr_wildrose', slot: 'trail', name: 'Wildrose Trail', source: 'gems', gems: 300, tier: 'fancy', colors: ['#b3869a'] }),
];

export const ROAD00_GEM_SINGLE_IDS = [
  'suit_mist',
  'suit_moonleaf',
  'suit_tideglass',
  'suit_wildrose',
  'hat_mist',
  'hat_moonleaf',
  'hat_tideglass',
  'hat_wildrose',
  'l_mist',
  'l_moonleaf',
  'l_tideglass',
  'l_wildrose',
  'tr_mist',
  'tr_moonleaf',
  'tr_tideglass',
  'tr_wildrose',
  'suit_starfog',
  'hat_starfog',
  'l_starfog',
  'tr_starfog',
] as const;

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

export const ALBUM_PAGES: AlbumPage[] = [
  { id: 'critter', name: 'Critters', reward: { gems: 100 } },
  { id: 'fest', name: 'Festivals', reward: { gems: 80 } },
  { id: 'voyage', name: 'Voyages', reward: { gems: 60 } },
  { id: 'feat', name: 'Feats', reward: { gems: 60 } },
];

export const MILESTONE_REWARD: Reward = { gems: 10 };

export const RESIDENT_ACCS: { id: string; name: string; friend?: number; gems?: number; fest?: boolean }[] = [
  { id: 'bow', name: 'Bow', friend: 2 },
  { id: 'flower', name: 'Flower', friend: 3 },
  { id: 'scarf', name: 'Scarf', friend: 4 },
  { id: 'crown', name: 'Tiny Crown', friend: 5 },
  { id: 'shades', name: 'Sunglasses', gems: 40 },
  { id: 'party', name: 'Party Hat', gems: 40 },
  // festival keepsakes (see meta/festivals.ts), never sold
  { id: 'heart', name: 'Heart Bopper', fest: true },
  { id: 'leaf', name: 'Sprout', fest: true },
  { id: 'rainhat', name: 'Rain Hat', fest: true },
  { id: 'wreath', name: 'Flower Crown', fest: true },
  { id: 'star', name: 'Star Clip', fest: true },
  { id: 'lantern', name: 'Lantern', fest: true },
  { id: 'acorn', name: 'Acorn Cap', fest: true },
  { id: 'pumpkin', name: 'Pumpkin Hat', fest: true },
  { id: 'knit', name: 'Knit Beanie', fest: true },
  { id: 'pom', name: 'Pom-pom Hat', fest: true },
];

export const PAINTS: Paint[] = [
  { id: 'meadow', name: 'Meadow', channel: 'ground', colors: ['#8ef0a0', '#3fae6a', '#1f6a58'] },
  { id: 'dune', name: 'Dune', channel: 'ground', colors: ['#ffe6a8', '#e0b060', '#9a6a30'] },
  { id: 'snow', name: 'Snowdrift', channel: 'ground', colors: ['#ffffff', '#cfe4ff', '#7a9ac8'] },
  { id: 'candy', name: 'Candy', channel: 'ground', colors: ['#ffd0ea', '#ff8fc8', '#b8467e'], gems: 120 },
  { id: 'ember', name: 'Ember', channel: 'ground', colors: ['#ffb08a', '#d9553a', '#5a1a2a'], gems: 120 },
  { id: 'crystal', name: 'Crystal', channel: 'ground', colors: ['#e6d6ff', '#a07aff', '#4a2a9a'], gems: 150 },
  { id: 'blue', name: 'Ocean Blue', channel: 'sea', colors: ['#9fd6ff', '#46a0e6', '#1f5a9e'] },
  { id: 'teal', name: 'Lagoon', channel: 'sea', colors: ['#a8fff0', '#3fd6c0', '#1a7a7a'] },
  { id: 'rose', name: 'Rose Water', channel: 'sea', colors: ['#ffd0e6', '#ff7ab8', '#9a2a6a'], gems: 60 },
  { id: 'nebula', name: 'Nebula', channel: 'sea', colors: ['#e0c8ff', '#9a6bff', '#3a1a8a'], gems: 60 },
];

export const DEBRIS_DUST = 60;

export const BOSS_REWARD: Reward = { gems: 30, dust: 500 };

export const COST_K = [0, 1, 2.5, 6, 14, 30];

// Formula inputs keep their previous values; changes here are balance changes.
export const CHAPTER_REWARD = { baseGems: 25, gemsPerChapter: 5, dustPerChapter: 200 };
// Seven retired rank payouts are spread over the first seven chapter chests.
export const CHAPTER_RANK_REWARD = { gems: [0, 30, 35, 40, 45, 50, 55, 60], dust: [0, 300, 450, 600, 750, 900, 1050, 1200] };
export const WISH_REWARD = { gems: 12, dust: 50, roadPoints: 1, allThreeGems: 15 };
export const DISCOVERY_DUST = 50;
export const COMBO_STAMP_DUST = 30;
export const CALENDAR_REPEAT_ITEM_GEMS = 40;
export const FINISH_DUST_PER_THROW = 15;
// Three short visits can yield many gifts; each gift stays a small keepsake.
export const VISITOR_DUST = { common: 2, uncommon: 3, rare: 5, legendary: 7 };
export const FRIENDSHIP_REWARD_GEMS_PER_LEVEL = 5;
export const FRIENDSHIP_TREAT = { baseDust: 40, dustPerLevel: 30 };
// M11 career including live trips exceeded idle ≤1.5×; reduce only trip stardust (120 → 5) until M13 redesign.
export const EXPEDITION_REWARD = { dustPerHour: 5, eightHourGems: 6, fourHourGems: 2, eightHourThreshold: 8, fourHourThreshold: 4 };
export const GALAXY_RATE = { base: 6, perStar: 3, perSpecies: 2 };
export const INBOX_GIFTS: Record<string, Reward> = {
  welcome: { gems: 20 },
  homeworld: {},
  chapter: { gems: 15, boosters: { spark: 1 } },
  best: { gems: 25 },
  season: { boosters: { shower: 1 } },
  festival: { dust: 150 },
  voyage: { dust: 200 },
};

export const STARTER_BOOSTERS = 5;
export const MATERIAL_DROP = { regionsPerDrop: 2, threeStarBonus: 1, frostPerRegion: 1 };
export const EXPEDITION_MULTIPLIER = { perTowerLevel: 0.1, legendary: 1.5, rare: 1.25 };

// Homeworld pacing and unlock tables.
export const RING_PLOTS = [0, 6, 8, 10, 12, 14];
export const RING_CHAPTER = [0, 0, 1, 3, 5, 8];
export const WIN_SPEEDUP = 10 * 60e3;
export const FRIEND_LEVELS = [0, 3, 8, 15, 25];
export const REQ_PERIOD = 6 * 3600e3;
export const EXPEDITION_HOURS = [1, 4, 8];
export const DEBRIS_EVERY = 3 * 3600e3;
export const DEBRIS_MAX = 3;
