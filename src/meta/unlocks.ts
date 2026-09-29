// Today's unlock points. M3 moves the crowded introductions onto the target ladder.
import { GOALS_FROM } from '../core/levels';
import { KINDS, type Kind } from '../core/world';
import type { Profile } from './profile';
import { LORE_AT } from './lore';

export const HOME_UNLOCK_LEVEL = 5;
export const MOMENTUM_UNLOCK = 17;
export const EVENT_UNLOCK_LEVEL = 20;
export const FESTIVAL_UNLOCK_LEVEL = 34;
export const VOYAGE_UNLOCK_LEVEL = 20;
export const BUDDY_AT = LORE_AT;
const LEGACY_QUEST_IDS = new Set(['throw25', 'win3', 'star6', 'creature8', 'three1', 'booster1', 'collect2', 'land20', 'spot6', 'voyage1']);

export type UnlockId =
  | Kind
  | 'swap'
  | 'goals'
  | 'supernova'
  | 'hard'
  | 'super_hard'
  | 'guardian'
  | 'homeworld'
  | 'weekly_event'
  | 'festival'
  | 'voyage'
  | 'star_road'
  | 'quests'
  | 'quest_spot'
  | 'quest_voyage'
  | 'star_calendar'
  | 'star_atlas'
  | 'lifebook'
  | 'sticker_album'
  | 'buddy'
  | 'momentum'
  | 'daily'
  | 'rush'
  | 'zen'
  | 'challenge'
  | 'passport'
  | 'passport_setup'
  | 'workshop'
  | 'object_lab'
  | 'upgrades'
  | 'inbox';

export interface Unlock {
  id: UnlockId;
  /** Campaign p.level; 0 means an achievement gate. */
  planet: number;
  placement: 'round' | 'home' | 'homeworld' | 'missions' | 'modes' | 'collection';
  intro?: { title: string; body: string };
  letter?: string;
  /** A newly visible entry point, even when there is no card. */
  button?: boolean;
}

const objectRows: Unlock[] = (Object.values(KINDS) as (typeof KINDS)[Kind][]).map((kind) => ({
  id: kind.id,
  planet: kind.unlock,
  placement: 'round',
  ...(kind.unlock > 2 ? { intro: { title: kind.name, body: kind.desc } } : {}),
}));

export const UNLOCKS: readonly Unlock[] = [
  ...objectRows,
  { id: 'swap', planet: 2, placement: 'round' },
  { id: 'goals', planet: GOALS_FROM, placement: 'round' },
  { id: 'supernova', planet: 9, placement: 'round' },
  { id: 'hard', planet: 15, placement: 'round' },
  { id: 'super_hard', planet: 19, placement: 'round' },
  { id: 'guardian', planet: 10, placement: 'round' },
  {
    id: 'homeworld',
    planet: HOME_UNLOCK_LEVEL,
    placement: 'home',
    button: true,
    letter: 'homeworld',
    intro: {
      title: 'A planet of your own',
      body: 'Build a home. Welcome a friend.',
    },
  },
  { id: 'weekly_event', planet: EVENT_UNLOCK_LEVEL, placement: 'home' },
  {
    id: 'festival',
    planet: FESTIVAL_UNLOCK_LEVEL,
    placement: 'home',
    button: true,
    letter: 'fest-{YYYY-MM}',
    intro: {
      title: 'Festival time!',
      body: 'Spot dressed-up friends and collect a festival sticker.',
    },
  },
  {
    id: 'voyage',
    planet: VOYAGE_UNLOCK_LEVEL,
    placement: 'home',
    button: true,
    letter: 'voyage-intro',
    intro: {
      title: 'Set sail on the Weekly Voyage',
      body: 'Explore seven planets, one by one.',
    },
  },
  { id: 'star_road', planet: 12, placement: 'home' },
  { id: 'quests', planet: 12, placement: 'home', button: true },
  { id: 'quest_spot', planet: FESTIVAL_UNLOCK_LEVEL, placement: 'missions' },
  { id: 'quest_voyage', planet: VOYAGE_UNLOCK_LEVEL, placement: 'missions' },
  { id: 'star_calendar', planet: 21, placement: 'home', button: true },
  { id: 'star_atlas', planet: 23, placement: 'homeworld', button: true },
  { id: 'lifebook', planet: 3, placement: 'home', button: true },
  { id: 'sticker_album', planet: 13, placement: 'collection', button: true },
  {
    id: 'buddy',
    planet: 0,
    placement: 'homeworld',
    letter: 'buddy-intro',
    intro: {
      title: 'Can I come along?',
      body: 'Pick a buddy to cheer for you.',
    },
  },
  { id: 'momentum', planet: MOMENTUM_UNLOCK, placement: 'round' },
  { id: 'daily', planet: 27, placement: 'modes' },
  { id: 'zen', planet: 30, placement: 'modes' },
  { id: 'rush', planet: 38, placement: 'modes' },
  { id: 'challenge', planet: 40, placement: 'modes' },
  { id: 'passport', planet: 16, placement: 'home', button: true },
  { id: 'passport_setup', planet: 0, placement: 'home' },
  { id: 'workshop', planet: 18, placement: 'collection', button: true },
  { id: 'object_lab', planet: HOME_UNLOCK_LEVEL, placement: 'collection' },
  { id: 'upgrades', planet: 14, placement: 'home', button: true },
  { id: 'inbox', planet: 1, placement: 'home', button: true, letter: 'welcome' },
];

export function unlocked(p: Profile, id: UnlockId): boolean {
  const row = UNLOCKS.find((entry) => entry.id === id);
  if (!row) return false;
  if (id === 'workshop') return p.chapters.length >= 1;
  if (p.legacyUnlocks.includes(id)) return true;
  // Existing saves keep modes earned through the retired rank ladder.
  const oldModeRank: Partial<Record<UnlockId, number>> = { daily: 2, rush: 3, zen: 4, challenge: 5 };
  if (oldModeRank[id] && p.rank >= oldModeRank[id]!) return true;
  if (id === 'star_road' && (p.pass || p.road.length > 0 || p.roadPass.length > 0)) return true;
  if (
    id === 'quests' &&
    (p.quests.list.some((q) => LEGACY_QUEST_IDS.has(q.id) && (q.progress > 0 || q.claimed)) ||
      (p.quests.bonusClaimed && p.quests.list.length === 3 && p.quests.list.every((q) => LEGACY_QUEST_IDS.has(q.id))))
  )
    return true;
  if (id === 'quest_spot' && (p.festival.spotted > 0 || p.quests.list.some((q) => q.id.startsWith('spot') && q.progress > 0))) return true;
  if (id === 'quest_voyage' && (p.voyage.cleared > 0 || p.voyageDone > 0)) return true;
  if (id === 'voyage' && (p.voyage.cleared > 0 || p.voyageDone > 0)) return true;
  if (id === 'festival' && (p.festival.spotted > 0 || p.festival.claimed.length > 0)) return true;
  if (id === 'weekly_event' && (p.event.tokens > 0 || p.event.claimed.length > 0)) return true;
  if (id === 'star_calendar' && !!p.daily.last) return true;
  if (id === 'momentum' && p.momentum.streak > 0) return true;
  if (id === 'homeworld' && (p.home.intro || p.home.plots.some(Boolean) || p.home.residents.length > 0)) return true;
  if (id === 'star_atlas' && (p.bundles.length > 0 || p.constellations.length > 0)) return true;
  if (id === 'sticker_album' && (p.album.fest.length > 0 || p.album.pagesClaimed.length > 0)) return true;
  if (id === 'passport' && p.passport.set) return true;
  if (id === 'object_lab' && Object.values(p.lab).some((level) => level > 1)) return true;
  if (id === 'upgrades' && Object.values(p.upgrades).some((level) => level > 0)) return true;
  if (id === 'buddy' && p.buddy.species) return true;
  if (id === 'buddy') return p.level >= 18 && Object.values(p.sightings).some((count) => count >= BUDDY_AT);
  if (id === 'passport_setup') return p.stats.wins >= 1;
  if (id === 'star_calendar') return p.level >= row.planet;
  return p.level >= row.planet;
}

export function debutsAt(planet: number): Unlock[] {
  return UNLOCKS.filter((entry) => entry.planet === planet && planet > 0);
}
