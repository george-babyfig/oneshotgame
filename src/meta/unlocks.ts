// Today's unlock points. M3 moves the crowded introductions onto the target ladder.
import { GOALS_FROM } from '../core/levels';
import { KINDS, type Kind } from '../core/world';
import type { Profile } from './profile';
import { LORE_AT } from './lore';

export const HOME_UNLOCK_LEVEL = 5;
export const MOMENTUM_UNLOCK = 6;
export const EVENT_UNLOCK_LEVEL = 8;
export const FESTIVAL_UNLOCK_LEVEL = 8;
export const VOYAGE_UNLOCK_LEVEL = 12;
export const BUDDY_AT = LORE_AT;

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
  /** Campaign p.level; 0 means an achievement or Explorer Rank gate. */
  planet: number;
  placement: 'round' | 'home' | 'homeworld' | 'missions' | 'modes' | 'collection';
  intro?: { title: string; body: string };
  letter?: string;
  /** A newly visible entry point, even when there is no card. */
  button?: boolean;
  rank?: number;
}

const objectRows: Unlock[] = (Object.values(KINDS) as (typeof KINDS)[Kind][]).map((kind) => ({
  id: kind.id,
  planet: kind.unlock,
  placement: 'round',
  ...(kind.unlock > 2 ? { intro: { title: kind.name, body: kind.desc } } : {}),
}));

export const UNLOCKS: readonly Unlock[] = [
  ...objectRows,
  { id: 'swap', planet: 1, placement: 'round' },
  { id: 'goals', planet: GOALS_FROM, placement: 'round' },
  { id: 'supernova', planet: 3, placement: 'round' },
  { id: 'hard', planet: 5, placement: 'round' },
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
      body: 'We found you a quiet little world. Build a Stardust Mill and a Critter Den — it will grow with every chapter you finish.',
    },
  },
  { id: 'weekly_event', planet: EVENT_UNLOCK_LEVEL, placement: 'home', button: true },
  {
    id: 'festival',
    planet: FESTIVAL_UNLOCK_LEVEL,
    placement: 'home',
    button: true,
    letter: 'fest-{YYYY-MM}',
    intro: {
      title: '{e} has begun!',
      body: 'All month long, every creature on your planets wears a festival costume. Spot them to earn a sticker and a keepsake your residents can wear.',
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
      body: 'Every Monday a new route of seven planets opens. Clear them one by one, and watch out for the Comet Guardian at the end!',
    },
  },
  { id: 'star_road', planet: 1, placement: 'home', button: true },
  { id: 'quests', planet: 1, placement: 'home', button: true },
  { id: 'quest_spot', planet: EVENT_UNLOCK_LEVEL, placement: 'missions' },
  { id: 'quest_voyage', planet: VOYAGE_UNLOCK_LEVEL, placement: 'missions' },
  { id: 'star_calendar', planet: 1, placement: 'home', button: true },
  { id: 'star_atlas', planet: HOME_UNLOCK_LEVEL, placement: 'homeworld', button: true },
  { id: 'lifebook', planet: 1, placement: 'home', button: true },
  { id: 'sticker_album', planet: 1, placement: 'collection', button: true },
  {
    id: 'buddy',
    planet: 0,
    placement: 'homeworld',
    letter: 'buddy-intro',
    intro: {
      title: 'Can I come along?',
      body: 'I have seen you on so many planets. Could I be your buddy? Pick me in the Workshop and I will cheer for every throw.',
    },
  },
  { id: 'momentum', planet: MOMENTUM_UNLOCK, placement: 'round' },
  { id: 'daily', planet: 0, placement: 'modes', rank: 2 },
  { id: 'rush', planet: 0, placement: 'modes', rank: 3 },
  { id: 'zen', planet: 0, placement: 'modes', rank: 4 },
  { id: 'challenge', planet: 0, placement: 'modes', rank: 5 },
  { id: 'passport', planet: 1, placement: 'home', button: true },
  { id: 'passport_setup', planet: 0, placement: 'home' },
  { id: 'workshop', planet: 1, placement: 'collection', button: true },
  { id: 'object_lab', planet: 1, placement: 'collection', button: true },
  { id: 'upgrades', planet: 1, placement: 'home', button: true },
  { id: 'inbox', planet: 1, placement: 'home', button: true, letter: 'welcome' },
];

export function unlocked(p: Profile, id: UnlockId): boolean {
  const row = UNLOCKS.find((entry) => entry.id === id);
  if (!row) return false;
  if (id === 'buddy') return Object.values(p.sightings).some((count) => count >= BUDDY_AT);
  if (id === 'passport_setup') return p.stats.wins >= 1;
  if (id === 'star_calendar') return p.tutorial;
  if (row.rank !== undefined) return p.rank >= row.rank;
  return p.level >= row.planet;
}

export function debutsAt(planet: number): Unlock[] {
  return UNLOCKS.filter((entry) => entry.planet === planet && planet > 0);
}
