import { COSMETICS as BASE_COSMETICS } from './tuning';
import { spend } from './wallet';
// The Keeper (your little astronaut), its launcher and its throw trail.
// Every item is earned or bought directly: no random rolls, no duplicates.
// Ownership is derived from progress wherever possible, so unlocks are
// retroactive and never need a save migration.
import type { Profile } from './profile';
import { STAR_ROAD } from './starroad';
import { getLang, t } from '../i18n';
import { HABITATS } from './habitats';
import { dyeColors } from './dyes';
import type { Kind } from '../core/world';
import type { StyleSelection } from './m12types';

export type Slot = 'suit' | 'hat' | 'launcher' | 'trail' | 'emote';
export const SLOTS: Slot[] = ['suit', 'hat', 'launcher', 'trail', 'emote'];

export type Source =
  | 'free'
  | 'earned'
  | 'gems'
  | 'dust'
  | 'road'
  | 'pass'
  | 'chapter'
  | 'habitat'
  | 'starter'
  | 'calendar'
  | 'constellation'
  | 'product'
  | 'wish';
/** Presentation tier only (frame colour); it never affects odds because nothing is random. */
export type Tier = 'basic' | 'fancy' | 'epic';

export interface Cosmetic {
  id: string;
  slot: StyleSlot;
  name: string;
  source: Source;
  tier: Tier;
  gems?: number;
  dust?: number;
  /** Chapter number or habitat id. */
  unlock?: number | string;
  /** Palette: suits [body, trim, visor]; launchers/trails their main colours. */
  colors: string[];
  /** Named set (for the set flourish). */
  set?: string;
  /** Fixed product grant. A product cannot change gameplay or earn a launcher. */
  productId?: string;
  /** Code-drawn decorative marks only; the object's body and badge stay unchanged. */
  motif?: 'ribbon' | 'crystal' | 'wave' | 'candy' | 'firefly' | 'nebula';
}

export type StyleSlot =
  | Slot
  | `shotTrail:${Kind}`
  | `burst:${Kind}`
  | 'supernova'
  | 'fusion'
  | 'ground'
  | 'sea'
  | 'denSkin'
  | 'greenhouseSkin'
  | 'launchBaySkin'
  | `labSkin:${Kind}`
  | `decoration:${'flowers' | 'fountain' | 'lantern'}`
  | 'friendOutfit'
  | 'photoFrame'
  | 'banner'
  | 'title';
export type StyledLook = Look & Partial<Record<StyleSlot, string>>;
export type StyleDraft = StyleSelection<StyleSlot>;
export const OBJECT_KINDS: readonly Kind[] = ['rock', 'ice', 'magma', 'seed', 'storm', 'sun'];
export const STYLE_SLOTS: StyleSlot[] = [
  ...SLOTS,
  ...OBJECT_KINDS.flatMap((kind): StyleSlot[] => [`shotTrail:${kind}`, `burst:${kind}`]),
  'supernova',
  'fusion',
  'ground',
  'sea',
  'denSkin',
  'greenhouseSkin',
  'launchBaySkin',
  ...OBJECT_KINDS.map((kind): StyleSlot => `labSkin:${kind}`),
  'decoration:flowers',
  'decoration:fountain',
  'decoration:lantern',
  'friendOutfit',
];

export const FACE_SHAPES = ['round', 'oval', 'square', 'heart'] as const;
export const FACE_NAMES = ['Round', 'Oval', 'Square', 'Heart'] as const;
export const SKIN_TONES = ['#f8dfc6', '#efd0ae', '#d9aa82', '#c48c64', '#a96e4e', '#85543e', '#633f34', '#432c2b'] as const;
export const HAIR_STYLES = ['none', 'crop', 'fringe', 'curls', 'puffs', 'waves', 'braids', 'spikes'] as const;
export const HAIR_NAMES = ['Bare', 'Crop', 'Fringe', 'Curls', 'Puffs', 'Waves', 'Braids', 'Spikes'] as const;
export const HAIR_COLORS = ['#251c27', '#523224', '#835136', '#b97b42', '#e6b75e', '#a34835', '#eee2cc', '#6f5aa6'] as const;
export const EYE_STYLES = ['round', 'smile', 'wide', 'sleepy', 'spark'] as const;
export const EYE_NAMES = ['Bright', 'Smiley', 'Wide', 'Sleepy', 'Sparkly'] as const;
export const EXPRESSIONS = ['happy', 'focused', 'surprised', 'shrug', 'cheer'] as const;
export const EXPRESSION_NAMES = ['Happy', 'Focused', 'Surprised', 'Shrug', 'Cheer'] as const;
export interface AvatarParts {
  face: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  expression: (typeof EXPRESSIONS)[number];
}
export const DEFAULT_AVATAR: AvatarParts = { face: 0, skin: 3, hair: 0, hairColor: 0, eyes: 0, expression: 'happy' };

/** These are earned by play and never have a price. */
export const SHOWTIME_COSMETICS: Cosmetic[] = [
  {
    id: 'suit_meadow',
    slot: 'suit',
    name: 'Meadow Explorer',
    source: 'chapter',
    unlock: 2,
    tier: 'fancy',
    colors: ['#74c69d', '#e9ffcc', '#214a44'],
  },
  {
    id: 'suit_cloud',
    slot: 'suit',
    name: 'Cloud Jumper',
    source: 'chapter',
    unlock: 5,
    tier: 'fancy',
    colors: ['#b1d8ed', '#fff5e4', '#384a72'],
  },
  {
    id: 'suit_coralreef',
    slot: 'suit',
    name: 'Coral Keeper',
    source: 'habitat',
    unlock: 'seaside',
    tier: 'fancy',
    colors: ['#ef8d85', '#ffe8ba', '#513c70'],
  },
  {
    id: 'suit_nightgarden',
    slot: 'suit',
    name: 'Night Garden',
    source: 'calendar',
    unlock: 21,
    tier: 'fancy',
    colors: ['#586b9d', '#c9edb5', '#252850'],
  },
  { id: 'hat_scarf', slot: 'hat', name: 'Comet Scarf', source: 'chapter', unlock: 3, tier: 'fancy', colors: ['#ff9b83', '#ffe3b1'] },
  { id: 'hat_mooncap', slot: 'hat', name: 'Moon Cap', source: 'chapter', unlock: 6, tier: 'fancy', colors: ['#8b8ccb', '#e9e8ff'] },
  { id: 'hat_reed', slot: 'hat', name: 'Reed Crown', source: 'habitat', unlock: 'wetlands', tier: 'fancy', colors: ['#8dcf8c', '#f4dda2'] },
  {
    id: 'hat_firefly',
    slot: 'hat',
    name: 'Firefly Antenna',
    source: 'calendar',
    unlock: 28,
    tier: 'fancy',
    colors: ['#e8dc89', '#88d7a3'],
  },
  { id: 'l_bloom', slot: 'launcher', name: 'Blossom', source: 'chapter', unlock: 4, tier: 'fancy', colors: ['#79b68e', '#ffc1d2'] },
  {
    id: 'l_moonbeam',
    slot: 'launcher',
    name: 'Moonbeam',
    source: 'habitat',
    unlock: 'frost',
    tier: 'fancy',
    colors: ['#a6adf0', '#fff0b8'],
  },
];
/** Optional permanent sinks; prices rise within each named series. */
export const STARDUST_COSMETICS: Cosmetic[] = [
  {
    id: 'suit_sunseed',
    slot: 'suit',
    name: 'Sunseed Suit',
    source: 'dust',
    tier: 'fancy',
    dust: 5000,
    colors: ['#e4ba62', '#f7e9aa', '#57443c'],
    set: 'Sunseed',
  },
  {
    id: 'hat_sunseed',
    slot: 'hat',
    name: 'Sunseed Crown',
    source: 'dust',
    tier: 'fancy',
    dust: 10000,
    colors: ['#f4d574', '#a1c981'],
    set: 'Sunseed',
  },
  {
    id: 'tr_sunseed',
    slot: 'trail',
    name: 'Sunseed Trail',
    source: 'dust',
    tier: 'epic',
    dust: 18000,
    colors: ['#fff2ad', '#e4b960'],
    set: 'Sunseed',
  },
  {
    id: 'l_sunseed',
    slot: 'launcher',
    name: 'Sunseed Launcher look',
    source: 'dust',
    tier: 'epic',
    dust: 25000,
    colors: ['#f1cd7a'],
    set: 'Sunseed',
  },
  {
    id: 'suit_moonbloom',
    slot: 'suit',
    name: 'Moonbloom Suit',
    source: 'dust',
    tier: 'fancy',
    dust: 12000,
    colors: ['#8e8fc4', '#d9d8ef', '#42466d'],
    set: 'Moonbloom',
  },
  {
    id: 'hat_moonbloom',
    slot: 'hat',
    name: 'Moonbloom Crown',
    source: 'dust',
    tier: 'fancy',
    dust: 22000,
    colors: ['#c0bce8', '#8599c4'],
    set: 'Moonbloom',
  },
  {
    id: 'tr_moonbloom',
    slot: 'trail',
    name: 'Moonbloom Trail',
    source: 'dust',
    tier: 'epic',
    dust: 35000,
    colors: ['#d0d4ff', '#909acb'],
    set: 'Moonbloom',
  },
  {
    id: 'l_moonbloom',
    slot: 'launcher',
    name: 'Moonbloom Launcher look',
    source: 'dust',
    tier: 'epic',
    dust: 50000,
    colors: ['#b3ade2'],
    set: 'Moonbloom',
  },
];
export const M12_STARDUST_COSMETICS: Cosmetic[] = [
  {
    id: 'gardensky_seed_trail',
    slot: 'shotTrail:seed',
    name: 'Garden Sky seed trail',
    source: 'dust',
    tier: 'fancy',
    dust: 5000,
    colors: ['#b5bd72'],
    motif: 'ribbon',
  },
  {
    id: 'gardensky_seed_burst',
    slot: 'burst:seed',
    name: 'Garden Sky seed burst',
    source: 'dust',
    tier: 'fancy',
    dust: 12000,
    colors: ['#b5bd72'],
    motif: 'ribbon',
  },
  {
    id: 'gardensky_fusion',
    slot: 'fusion',
    name: 'Garden Sky Fusion',
    source: 'dust',
    tier: 'fancy',
    dust: 25000,
    colors: ['#a8abd2'],
    motif: 'nebula',
  },
  {
    id: 'gardensky_supernova',
    slot: 'supernova',
    name: 'Garden Sky Supernova',
    source: 'dust',
    tier: 'epic',
    dust: 50000,
    colors: ['#a8abd2'],
    motif: 'nebula',
  },
];
// Look IDs and sources stay stable for saved outfits and paid entitlements.
const LOOK_NAMES: Record<string, string> = {
  l_pad: 'Classic',
  l_twig: 'Twig',
  l_petal: 'Petal',
  l_cannon: 'Comet Rail',
};
const KIND_NAMES: Record<Kind, string> = {
  rock: 'Rock',
  ice: 'Ice Comet',
  magma: 'Magma',
  seed: 'Seed Pod',
  storm: 'Rain Cloud',
  sun: 'Sunburst',
};
const product = (suffix: string) => `com.pocketplanet.game.${suffix}`;
const themed = (theme: 'tidepool' | 'cometcandy', name: string, colors: string[], motif: Cosmetic['motif']): Cosmetic[] => {
  const prefix = theme === 'tidepool' ? 'Tidepool' : 'Comet Candy';
  const id = product(`theme.${theme}`);
  const item = (part: string, slot: StyleSlot, label: string): Cosmetic => ({
    id: `${theme}_${part}`,
    slot,
    name: `${prefix} ${label}`,
    source: 'product',
    productId: id,
    tier: 'fancy',
    colors,
    motif,
  });
  return [
    ...OBJECT_KINDS.map((kind, index) =>
      item(`lab_${index + 1}`, `labSkin:${kind}`, `${kind === 'storm' ? 'Rain' : kind[0].toUpperCase() + kind.slice(1)} Lab`),
    ),
    item('den', 'denSkin', 'Den'),
    item('greenhouse', 'greenhouseSkin', 'Greenhouse'),
    item('launch_bay', 'launchBaySkin', 'Launch Bay'),
    item('ground', 'ground', 'ground paint'),
    item('sea', 'sea', 'sea paint'),
    item('decor_1', 'decoration:flowers', 'flowers'),
    item('decor_2', 'decoration:fountain', 'fountain'),
    item('decor_3', 'decoration:lantern', 'lantern'),
    item('friend_1', 'friendOutfit', 'friend outfit'),
    item('friend_2', 'friendOutfit', 'friend scarf'),
  ];
};

/** One fixed item per catalogue entry; samplers are earned from Wishes. */
export const M12_COSMETICS: Cosmetic[] = [
  { id: 'banner_aurora', slot: 'banner', name: 'Aurora Passport banner', source: 'starter', tier: 'fancy', colors: ['#8fb9b7'] },
  {
    id: 'paint_gilded_ground',
    slot: 'ground',
    name: 'Gilded Homeworld ground paint',
    source: 'pass',
    tier: 'fancy',
    colors: ['#c7b477', '#9d824e', '#584c3b'],
  },
  {
    id: 'paint_liquid_gold_sea',
    slot: 'sea',
    name: 'Liquid Gold Homeworld sea paint',
    source: 'pass',
    tier: 'fancy',
    colors: ['#dac797', '#ad955f', '#695b43'],
  },
  { id: 'frame_starfield', slot: 'photoFrame', name: 'Starfield photo frame', source: 'pass', tier: 'fancy', colors: ['#8191ba'] },
  { id: 'frame_gold', slot: 'photoFrame', name: 'Golden photo frame', source: 'earned', tier: 'fancy', colors: ['#c5a966'] },
  { id: 'banner_gilded', slot: 'banner', name: 'Gilded Passport banner', source: 'pass', tier: 'fancy', colors: ['#c5a966'] },
  { id: 'title_star_captain', slot: 'title', name: 'Star Captain title', source: 'pass', tier: 'fancy', colors: ['#c5a966'] },
  { id: 'em_star_captain', slot: 'emote', name: 'Star Captain pose', source: 'pass', tier: 'fancy', colors: ['#b0a29a'] },
  { id: 'burst_cosmic', slot: 'burst:sun', name: 'Cosmic burst', source: 'pass', tier: 'fancy', colors: ['#a69abb'], motif: 'nebula' },
  { id: 'hat_aurora', slot: 'hat', name: 'Aurora hat', source: 'starter', tier: 'fancy', colors: ['#94cad4', '#ecddac'] },
  { id: 'l_aurora', slot: 'launcher', name: 'Aurora launcher look', source: 'starter', tier: 'fancy', colors: ['#83b8be'] },
  {
    id: 'paint_aurora',
    slot: 'ground',
    name: 'Aurora Homeworld paint',
    source: 'starter',
    tier: 'fancy',
    colors: ['#a4c5b5', '#617d82', '#334f68'],
  },
  ...themed('tidepool', 'Tidepool', ['#86b6aa', '#5c8199', '#33566e'], 'wave'),
  ...themed('cometcandy', 'Comet Candy', ['#cf9eaf', '#a4779b', '#694f87'], 'candy'),
  {
    id: 'sampler_tidepool',
    slot: 'decoration:flowers',
    name: 'Tidepool Shell Flowers',
    source: 'wish',
    tier: 'fancy',
    colors: ['#86b6aa'],
    motif: 'wave',
  },
  {
    id: 'sampler_cometcandy',
    slot: 'decoration:flowers',
    name: 'Comet Candy Sugar Blossoms',
    source: 'wish',
    tier: 'fancy',
    colors: ['#cf9eaf'],
    motif: 'candy',
  },
  {
    id: 'suit_crystalfrost',
    slot: 'suit',
    name: 'Crystal Frost Keeper',
    source: 'product',
    productId: product('pack.crystalfrost'),
    tier: 'fancy',
    colors: ['#93bac9', '#e0e8e9', '#425b70'],
  },
  {
    id: 'hat_crystalfrost',
    slot: 'hat',
    name: 'Crystal Frost crown',
    source: 'product',
    productId: product('pack.crystalfrost'),
    tier: 'fancy',
    colors: ['#adcbd5', '#e0e8e9'],
  },
  {
    id: 'fusion_crystalfrost',
    slot: 'fusion',
    name: 'Crystal Frost Fusion',
    source: 'product',
    productId: product('pack.crystalfrost'),
    tier: 'fancy',
    colors: ['#93bac9'],
    motif: 'crystal',
  },
  ...OBJECT_KINDS.flatMap((kind, index): Cosmetic[] => [
    {
      id: `crystalfrost_trail_${index + 1}`,
      slot: `shotTrail:${kind}`,
      name: `Crystal Frost ${KIND_NAMES[kind]} trail`,
      source: 'product',
      productId: product('pack.crystalfrost'),
      tier: 'fancy',
      colors: ['#93bac9'],
      motif: 'crystal',
    },
    {
      id: `crystalfrost_burst_${index + 1}`,
      slot: `burst:${kind}`,
      name: `Crystal Frost ${KIND_NAMES[kind]} burst`,
      source: 'product',
      productId: product('pack.crystalfrost'),
      tier: 'fancy',
      colors: ['#93bac9'],
      motif: 'crystal',
    },
  ]),
  {
    id: 'sampler_crystalfrost',
    slot: 'shotTrail:rock',
    name: 'Crystal Frost Shard trail',
    source: 'wish',
    tier: 'fancy',
    colors: ['#93bac9'],
    motif: 'crystal',
  },
  {
    id: 'supernova_nebula',
    slot: 'supernova',
    name: 'Nebula Swirl Supernova',
    source: 'product',
    productId: product('style.nebula'),
    tier: 'fancy',
    colors: ['#a290bc'],
    motif: 'nebula',
  },
  {
    id: 'tr_nebula',
    slot: 'trail',
    name: 'Nebula Swirl trail',
    source: 'product',
    productId: product('style.nebula'),
    tier: 'fancy',
    colors: ['#a290bc'],
    motif: 'nebula',
  },
  {
    id: 'supernova_firefly',
    slot: 'supernova',
    name: 'Firefly Sparks Supernova',
    source: 'product',
    productId: product('style.firefly'),
    tier: 'fancy',
    colors: ['#adbe7c'],
    motif: 'firefly',
  },
  {
    id: 'tr_firefly',
    slot: 'trail',
    name: 'Firefly Sparks trail',
    source: 'product',
    productId: product('style.firefly'),
    tier: 'fancy',
    colors: ['#adbe7c'],
    motif: 'firefly',
  },
];
export const COSMETICS: Cosmetic[] = [
  ...BASE_COSMETICS.map((item) => ({ ...item, name: LOOK_NAMES[item.id] ?? item.name })),
  ...SHOWTIME_COSMETICS,
  ...STARDUST_COSMETICS,
  ...M12_STARDUST_COSMETICS,
  ...M12_COSMETICS,
  {
    id: 'tr_kite',
    slot: 'trail',
    name: "The Keeper's Kite",
    source: 'constellation',
    unlock: 'kite',
    tier: 'epic',
    colors: ['#ffe5ad', '#9ac8d6'],
  },
];

export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
export const STYLES_RELEASE = 'm12';

export function isPaidLook(x: Cosmetic): boolean {
  return x.source === 'starter' || x.source === 'pass' || x.source === 'product';
}

export function visibleCosmetics(p: Profile, slot?: StyleSlot): Cosmetic[] {
  return COSMETICS.filter(
    (x) => (!slot || x.slot === slot) && (!p.settings.hidePaidLooks || (!isPaidLook(x) && (x.id !== 'frame_gold' || goldenFrameEarned(p)))),
  );
}

function goldenFrameEarned(p: Profile): boolean {
  return p.home.landmarks.keepers_beacon.stage === 4;
}

export function toggleFavourite(p: Profile, id: string): boolean {
  if (!COSMETIC_BY_ID[id]) return false;
  p.favourites = p.favourites.includes(id) ? p.favourites.filter((x) => x !== id) : [...p.favourites, id];
  return true;
}

/** Items per slot, plus optional suit dye colours. */
export type Look = Record<Slot, string> &
  Partial<Record<Exclude<StyleSlot, Slot>, string>> & {
    dyeMain?: string;
    dyeTrim?: string;
    avatar?: AvatarParts;
    expression?: AvatarParts['expression'];
    dance?: number;
    reduceMotion?: boolean;
  };
export const DEFAULT_LOOK: Record<Slot, string> = {
  suit: 'suit_sky',
  hat: 'hat_antenna',
  launcher: 'l_pad',
  trail: 'tr_dots',
  emote: 'em_cheer',
};

/** Star Road tier index (free or pass lane) that grants an item. */
export function roadTierOf(id: string): { i: number; lane: 'free' | 'pass' } | null {
  for (let i = 0; i < STAR_ROAD.length; i++) {
    if (STAR_ROAD[i].reward.item === id) return { i, lane: 'free' };
    if (STAR_ROAD[i].pass.item === id) return { i, lane: 'pass' };
  }
  return null;
}

export function owns(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x) return false;
  switch (x.source) {
    case 'free':
      return true;
    case 'earned':
      return id === 'frame_gold' && (goldenFrameEarned(p) || (p.pass && p.wardrobe.includes(id)));
    case 'gems':
    case 'dust':
    case 'wish':
      return p.wardrobe.includes(id);
    case 'starter':
      return p.starter;
    case 'product': {
      const meta = p.meta as Profile['meta'] & { productEntitlements?: string[]; revokedProducts?: Record<string, number> };
      return !!x.productId && !meta.revokedProducts?.[x.productId] && !!meta.productEntitlements?.includes(x.productId);
    }
    case 'calendar':
      return p.daily.streak >= (x.unlock as number);
    case 'constellation':
      return p.constellations.includes(x.unlock as string);
    case 'chapter':
      return p.chapters.includes(x.unlock as number) || p.rank > (x.unlock as number);
    case 'habitat':
      return p.habitats.includes(x.unlock as string);
    case 'road':
    case 'pass': {
      // One-time migration preserves the old Pass paints while their Pass is owned.
      if (x.source === 'pass' && p.pass && p.wardrobe.includes(id)) return true;
      const r = roadTierOf(id);
      if (!r) return false;
      return r.lane === 'free' ? p.road.includes(r.i) : p.pass && p.roadPass.includes(r.i);
    }
  }
}

/** The look to actually draw: anything not owned (e.g. after a reset) falls back to the default. */
export function currentLook(p: Profile): StyledLook {
  const out: StyledLook = { ...DEFAULT_LOOK, avatar: p.avatar, reduceMotion: p.settings.reduceMotion };
  for (const s of STYLE_SLOTS) {
    const id = (p.look as Partial<Record<StyleSlot, string>>)?.[s];
    if (
      id &&
      COSMETIC_BY_ID[id]?.slot === s &&
      owns(p, id) &&
      (!p.settings.hidePaidLooks || (!isPaidLook(COSMETIC_BY_ID[id]) && (id !== 'frame_gold' || goldenFrameEarned(p))))
    )
      out[s] = id;
  }
  const d = dyeColors(p);
  if (d.main) out.dyeMain = d.main;
  if (d.trim) out.dyeTrim = d.trim;
  return out;
}

export function equip(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || !owns(p, id)) return false;
  p.look = { ...p.look, [x.slot]: id };
  return true;
}

export function beginStyleDraft(p: Profile): StyleDraft {
  // Only explicit try-ons belong here; a snapshot would overwrite later buys or presets.
  return { slots: {} };
}

const liveDrafts = new WeakMap<Profile, StyleDraft>();
export function setStyleDraft(p: Profile, draft: StyleDraft | null): void {
  if (draft) liveDrafts.set(p, draft);
  else liveDrafts.delete(p);
}

export function activeStyleDraft(p: Profile): StyleDraft | undefined {
  return liveDrafts.get(p);
}

/** Homeworld can draw the temporary selection without modifying the save. */
export function previewLook(p: Profile): StyledLook {
  const draft = liveDrafts.get(p)?.slots;
  if (!draft) return currentLook(p);
  if (p.settings.hidePaidLooks) {
    liveDrafts.delete(p);
    return currentLook(p);
  }
  return { ...currentLook(p), ...draft };
}

export function clearStyleSlot(p: Profile, slot: StyleSlot): void {
  if (SLOTS.includes(slot as Slot)) return;
  const next = { ...p.look } as Partial<Record<StyleSlot, string>>;
  delete next[slot];
  p.look = next as Profile['look'];
  const draft = liveDrafts.get(p);
  if (draft) delete draft.slots[slot];
}

export function tryStyle(draft: StyleDraft, id: string): StyleDraft {
  const item = COSMETIC_BY_ID[id];
  return item ? { slots: { ...draft.slots, [item.slot]: id } } : draft;
}

/** Explicit Done discards unowned selections; no timeout and no purchase path. */
export function finishStyleDraft(p: Profile, draft: StyleDraft): void {
  for (const slot of STYLE_SLOTS) {
    const id = draft.slots[slot];
    if (id && COSMETIC_BY_ID[id]?.slot === slot && owns(p, id)) equip(p, id);
  }
}

/** The Wish reward caller grants a named sampler once, with no paid entitlement. */
export function grantWishSampler(p: Profile, id: 'sampler_tidepool' | 'sampler_cometcandy' | 'sampler_crystalfrost'): boolean {
  if (p.wardrobe.includes(id)) return false;
  p.wardrobe.push(id);
  return true;
}

export function buyCosmetic(p: Profile, id: string): boolean {
  const x = COSMETIC_BY_ID[id];
  if (!x || (x.source !== 'gems' && x.source !== 'dust') || owns(p, id)) return false;
  if (x.source === 'gems' ? !x.gems || !spend(p, 'gems', x.gems, 'cosmetic') : !x.dust || !spend(p, 'dust', x.dust, 'cosmetic'))
    return false;
  p.wardrobe.push(id);
  return true;
}

/** Wearing every piece of a set adds a flourish (a glow in the set's colour). */
export function fullSet(look: Look): string | null {
  // sets are made of wearables; emotes don't count
  const sets = SLOTS.filter((s) => s !== 'emote').map((s) => COSMETIC_BY_ID[look[s]]?.set);
  return sets.every((x) => x && x === sets[0]) ? (sets[0] as string) : null;
}

export function ownedCount(p: Profile) {
  return COSMETICS.filter((x) => !isPaidLook(x) && owns(p, x.id)).length;
}

/** How to get an item, for the locked tile. */
export function sourceText(x: Cosmetic): string {
  switch (x.source) {
    case 'free':
      return t('Free');
    case 'earned':
      return t("Keeper's Beacon");
    case 'gems':
      return `💎${x.gems}`;
    case 'dust':
      return t('✨{n}', { n: x.dust?.toLocaleString(getLang() || undefined) ?? '0' });
    case 'starter':
      return t('Try on');
    case 'chapter':
      return t('Chapter {n} chest', { n: x.unlock as number });
    case 'habitat': {
      const hb = HABITATS.find((x2) => x2.id === x.unlock);
      return hb ? t('{name} set', { name: t(hb.name) }) : t('Habitat set');
    }
    case 'wish':
      return t('Wish');
    case 'product':
      return t('Try on');
    case 'calendar':
      return t('Star Calendar day {n}', { n: x.unlock as number });
    case 'constellation':
      return t('Constellation');
    case 'road': {
      const r = roadTierOf(x.id);
      return r ? t('Cosmic Road {n} points', { n: STAR_ROAD[r.i].stars }) : t('Cosmic Road');
    }
    case 'pass':
      return t('Try on');
  }
}

export const SLOT_NAMES: Record<Slot, string> = { suit: 'Suit', hat: 'Hat', launcher: 'Launcher looks', trail: 'Trail', emote: 'Emote' };

/** Launcher mastery: flings needed for each mastery star. */
export const MASTERY_STEPS = [100, 500, 2000];
export function masteryLevel(flings: number) {
  return MASTERY_STEPS.filter((n) => flings >= n).length;
}

export const PRESETS = 3;

export function savePreset(p: Profile, i: number) {
  if (i < 0 || i >= PRESETS) return;
  const list = [...(p.presets ?? [])];
  while (list.length < PRESETS) list.push(null);
  // presets remember items; dyes stay as they are
  const { dyeMain: _m, dyeTrim: _t, avatar: _a, expression: _e, dance: _d, reduceMotion: _r, ...items } = currentLook(p);
  list[i] = items;
  p.presets = list;
}

/** Wear a saved outfit; items no longer owned fall back to the default look. */
export function loadPreset(p: Profile, i: number): boolean {
  const saved = p.presets?.[i];
  if (!saved) return false;
  p.look = { ...DEFAULT_LOOK, ...saved };
  const allowed = currentLook(p);
  p.look = Object.fromEntries(STYLE_SLOTS.map((slot) => [slot, allowed[slot]]).filter(([, id]) => !!id)) as Record<Slot, string>;
  return true;
}
