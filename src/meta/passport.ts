// Planet Passport: the player's profile card. Names come from two word lists
// (kid-safe: no free text, nothing to moderate), titles and badges are earned.
import type { Profile } from './profile';
import { totalStars } from './profile';
import { ACHIEVEMENTS } from './achievements';
import { RANK_TITLES } from './rank';
import { recordTitles } from './records';
import { t } from '../i18n';

// Names are proper nouns: they stay the same in every language, like a gamer tag.
export const NAME_A = [
  'Cosmic',
  'Sunny',
  'Misty',
  'Brave',
  'Jolly',
  'Starry',
  'Mossy',
  'Frosty',
  'Cozy',
  'Swift',
  'Gentle',
  'Bright',
  'Dreamy',
  'Breezy',
  'Sparkly',
  'Mighty',
  'Quiet',
  'Curious',
  'Golden',
  'Rosy',
  'Stormy',
  'Happy',
  'Clever',
  'Bouncy',
];
export const NAME_B = [
  'Otter',
  'Comet',
  'Fern',
  'Pebble',
  'Nova',
  'Penguin',
  'Meadow',
  'Owl',
  'Moon',
  'Coral',
  'Wolf',
  'Orbit',
  'Maple',
  'Turtle',
  'Nebula',
  'Bunny',
  'Pixel',
  'Aurora',
  'Walrus',
  'Clover',
  'Dragon',
  'Quasar',
  'Sprout',
  'Whale',
];

export function passportName(p: Profile): string {
  const { first, second } = p.passport;
  if (first < 0 || second < 0) return t('Explorer');
  return `${NAME_A[first % NAME_A.length]} ${NAME_B[second % NAME_B.length]}`;
}

export function randomName(rnd = Math.random): { first: number; second: number } {
  return { first: Math.floor(rnd() * NAME_A.length), second: Math.floor(rnd() * NAME_B.length) };
}

/** A stable, friendly explorer number derived from the install time. */
export function explorerId(p: Profile): string {
  const n = Math.abs(Math.floor(p.meta.installed / 1000)) % 1000000;
  return `#${String(n).padStart(6, '0')}`;
}

// ------------------------------------------------------------------ titles
export interface TitleDef {
  id: string;
  /** English text; shown through t(). */
  text: string;
  gold?: boolean;
}

/** Every title the player can choose: rank titles reached, achievements earned, and the pass title. */
export function titlesOwned(p: Profile): TitleDef[] {
  const out: TitleDef[] = RANK_TITLES.slice(0, Math.min(p.rank, RANK_TITLES.length)).map((x) => ({ id: `rank:${x}`, text: x }));
  for (const a of ACHIEVEMENTS) if (a.done(p)) out.push({ id: `ach:${a.id}`, text: a.title });
  for (const x of recordTitles(p)) out.push({ id: `rec:${x}`, text: x });
  if (p.pass && !p.settings.hidePaidLooks) out.push({ id: 'pass', text: 'Star Captain', gold: true });
  return out;
}

export function currentTitle(p: Profile): TitleDef {
  const owned = titlesOwned(p);
  return owned.find((x) => x.id === p.passport.title) ?? owned[Math.min(p.rank, RANK_TITLES.length) - 1] ?? owned[0];
}

// ------------------------------------------------------------------ banners
export interface BannerDef {
  id: number;
  name: string;
  colors: [string, string];
  unlocked: (p: Profile) => boolean;
  how: string;
}

export const BANNERS: BannerDef[] = [
  { id: 0, name: 'Twilight', colors: ['#3a2a8a', '#171248'], unlocked: () => true, how: '' },
  { id: 1, name: 'Lagoon', colors: ['#1f8f9e', '#123a5e'], unlocked: () => true, how: '' },
  { id: 2, name: 'Sunset', colors: ['#ff8a5a', '#7a2a6e'], unlocked: () => true, how: '' },
  { id: 3, name: 'Meadow', colors: ['#5ecf6a', '#1f5a4a'], unlocked: (p) => p.stats.wins >= 10, how: 'Finish 10 planets' },
  { id: 4, name: 'Ember', colors: ['#ff6a3d', '#4a1030'], unlocked: (p) => p.stats.hardWins >= 5, how: 'Beat 5 Hard planets' },
  {
    id: 5,
    name: 'Nebula',
    colors: ['#b86bff', '#2a1060'],
    unlocked: (p) => p.rank >= 4 || p.chapters.includes(4),
    how: 'Open chapter 4 chest',
  },
  { id: 6, name: 'Aurora', colors: ['#6ef2c0', '#6a4dff'], unlocked: (p) => p.starter, how: 'Starter Crew' },
  { id: 7, name: 'Gilded', colors: ['#ffd24a', '#8a4a10'], unlocked: (p) => p.pass, how: 'Cosmic Pass' },
];

export function currentBanner(p: Profile): BannerDef {
  const b = BANNERS[p.passport.banner];
  return b && b.unlocked(p) && (!p.settings.hidePaidLooks || b.id < 6) ? b : BANNERS[0];
}

export const PORTRAIT_FRAMES = [
  { name: 'Starlight Frame', color: '#c9c2ff', unlock: 0 },
  { name: 'Meadow Frame', color: '#9bdba9', unlock: 2 },
  { name: 'Tide Frame', color: '#8ed6e5', unlock: 4 },
  { name: 'Dawn Frame', color: '#f0bb8f', unlock: 6 },
] as const;

export function ownsPortraitFrame(p: Profile, index: number): boolean {
  const frame = PORTRAIT_FRAMES[index];
  return !!frame && (frame.unlock === 0 || p.chapters.includes(frame.unlock) || p.rank > frame.unlock);
}

export function currentPortraitFrame(p: Profile) {
  return ownsPortraitFrame(p, p.passport.frame) ? PORTRAIT_FRAMES[p.passport.frame] : PORTRAIT_FRAMES[0];
}

// ------------------------------------------------------------------ badges
/** Emoji for each achievement badge (keyed by the achievement's short id). */
const BADGE_EMOJI: Record<string, string> = {
  first_planet: '🪐',
  planets_10: '🌍',
  planets_50: '🌏',
  planets_100: '🌌',
  first_creature: '🐾',
  lifebook_half: '📗',
  lifebook_full: '📚',
  legend: '🐉',
  three_star_10: '🌟',
  chapter_1: '📜',
  chapter_5: '🗺️',
  rank_5: '🎖️',
  rank_8: '🏅',
  momentum_3: '🔥',
  hard_10: '💪',
  rush_300: '☄️',
  daily_7: '📅',
  habitat_1: '🏡',
  habitat_all: '🏘️',
  memento_10: '🎁',
  challenge_win: '🤝',
  zen_100: '🧘',
  voyage_1: '🚀',
  voyage_10: '🧭',
  festival_1: '🎪',
  stickers_30: '📒',
  buddy_1: '🐾',
};
export const BADGE_SLOTS = 3;

export function badgeEmoji(achId: string) {
  return BADGE_EMOJI[achId.split('.').pop() ?? ''] ?? '🏆';
}

export function earnedBadges(p: Profile) {
  return ACHIEVEMENTS.filter((a) => a.done(p));
}

/** Pinned badges that are still earned (defaults to the latest earned ones). */
export function pinnedBadges(p: Profile) {
  const earned = earnedBadges(p);
  const pinned = p.passport.badges.map((id) => earned.find((a) => a.id === id)).filter((a) => !!a);
  // once the player has chosen (even an empty shelf), respect it
  if (p.passport.badgesSet || pinned.length) return pinned.slice(0, BADGE_SLOTS);
  return earned.slice(-BADGE_SLOTS).reverse();
}

export function toggleBadge(p: Profile, id: string): boolean {
  if (!earnedBadges(p).some((a) => a.id === id)) return false;
  if (!p.passport.badgesSet) {
    p.passport.badges = pinnedBadges(p).map((a) => a.id);
    p.passport.badgesSet = true;
  }
  const i = p.passport.badges.indexOf(id);
  if (i >= 0) {
    p.passport.badges.splice(i, 1);
    return true;
  }
  if (!earnedBadges(p).some((a) => a.id === id)) return false;
  if (p.passport.badges.length >= BADGE_SLOTS) p.passport.badges.shift();
  p.passport.badges.push(id);
  return true;
}

// ------------------------------------------------------------------ stats
export function passportStats(p: Profile): { label: string; value: number | string }[] {
  const days = Math.max(1, Math.floor((Date.now() - p.meta.installed) / 86400000) + 1);
  return [
    { label: t('Stars'), value: totalStars(p) },
    { label: t('Planets finished'), value: p.stats.wins },
    { label: t('Three-star planets'), value: p.stats.threeStars },
    { label: t('Creatures found'), value: `${p.seen.length}/36` },
    { label: t('Objects flung'), value: p.stats.throws },
    { label: t('Hard planets beaten'), value: p.stats.hardWins },
    { label: t('Best life score'), value: p.stats.bestLife },
    { label: t('Meteor Rush best'), value: p.stats.rushBest },
    { label: t('Daily Planets'), value: p.stats.dailies },
    { label: t('Best win streak'), value: p.stats.bestStreak },
    { label: t('Mementos'), value: p.mementos.length },
    { label: t('Days exploring'), value: days },
  ];
}
