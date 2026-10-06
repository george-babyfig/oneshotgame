// Today's unlock points. M3 moves the crowded introductions onto the target ladder.
import { GOALS_FROM } from '../core/levels';
import { OBSTACLES, type ObstacleId } from '../core/sky';
import { KINDS, type Kind } from '../core/world';
import type { Profile } from './profile';
import { LAB_TEXT } from './labcopy';
import { LAUNCHERS, LAUNCH_ROSTER, type LauncherId } from '../core/launchers';

export const HOME_UNLOCK_LEVEL = 5;
export const MOMENTUM_UNLOCK = 17;
export const FESTIVAL_UNLOCK_LEVEL = 34;
export const VOYAGE_UNLOCK_LEVEL = 20;
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
  | 'traits_intro'
  | 'momentum'
  | 'daily'
  | 'rush'
  | 'zen'
  | 'challenge'
  | 'passport'
  | 'passport_setup'
  | 'workshop'
  | 'object_lab'
  | 'inbox'
  | 'steam'
  | 'rainGarden'
  | 'wildflowers'
  | 'glacier'
  | 'combo'
  | 'scorch'
  | 'vent'
  | 'vine'
  | 'frost'
  | 'launcher_swoop'
  | 'launcher_sparkler'
  | 'launcher_zip'
  | 'launcher_thumper'
  | 'launcher_pinpoint'
  | 'launcher_skipper'
  | 'landmark_signpost'
  | ObstacleId;

export interface Unlock {
  id: UnlockId;
  /** Campaign p.level; 0 means an achievement gate. */
  planet: number;
  placement: 'round' | 'home' | 'homeworld' | 'missions' | 'modes' | 'collection' | 'launcher';
  intro?: { title: string; body: string; icon?: string };
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

export const GUSTY_WIND_TIP = 'Solar Wind has gentle puffs now. Wait for a calm moment.';

const LAUNCHER_INTROS: Readonly<Record<Exclude<LauncherId, 'sling'>, { body: string; icon: string }>> = {
  swoop: { body: 'Swoop bends around moons to reach your planet.', icon: '◌' },
  sparkler: { body: 'Sparkler makes Fusions reach farther and fills Supernova faster.', icon: '✧' },
  zip: { body: 'Zip flies fast and straight through wind and mist.', icon: '⌁' },
  thumper: { body: 'Thumper lands wide and breaks through rocks.', icon: '■' },
  pinpoint: { body: 'Pinpoint lands small. Its long aim line shows where.', icon: '⊙' },
  skipper: { body: 'Skipper bounces once from moons and rocks.', icon: '〽' },
};

export const UNLOCKS: readonly Unlock[] = [
  ...objectRows,
  {
    id: 'traits_intro',
    planet: 16,
    placement: 'round',
    intro: { title: 'Traits', body: 'Friends protect their home lands in different ways.', icon: '⬡' },
  },
  { id: 'swap', planet: 2, placement: 'round' },
  { id: 'goals', planet: GOALS_FROM, placement: 'round' },
  { id: 'supernova', planet: 9, placement: 'round' },
  { id: 'steam', planet: 8, placement: 'round', intro: { title: 'Steam', body: 'Magma finds icy land and makes Steam!', icon: '♨️' } },
  {
    id: 'rainGarden',
    planet: 13,
    placement: 'round',
    intro: { title: 'Rain Garden', body: 'Rain Cloud finds a meadow and grows a Rain Garden!', icon: '🌿' },
  },
  {
    id: 'wildflowers',
    planet: 22,
    placement: 'round',
    intro: { title: 'Wildflowers', body: 'Sunburst finds a meadow and grows Wildflowers!', icon: '🌼' },
  },
  {
    id: 'glacier',
    planet: 25,
    placement: 'round',
    intro: { title: 'Glacier', body: 'Ice Comet finds a mountain and makes a Glacier!', icon: '❄️' },
  },
  { id: 'combo', planet: 26, placement: 'round', intro: { title: 'Combo', body: 'Make Fusions together to grow a Combo!', icon: '✨' } },
  ...LAUNCH_ROSTER.filter((id): id is Exclude<LauncherId, 'sling'> => id !== 'sling').map((id): Unlock => ({
    id: `launcher_${id}`,
    planet: LAUNCHERS[id].debut,
    placement: 'launcher',
    intro: { title: LAUNCHERS[id].name, ...LAUNCHER_INTROS[id] },
  })),
  {
    id: 'vent',
    planet: 14,
    placement: 'round',
    intro: { title: 'Ember Vent', body: 'A vent warms green land. Ice Comet cools it!', icon: '♨️' },
  },
  {
    id: 'vine',
    planet: 28,
    placement: 'round',
    intro: { title: 'Tanglevine', body: 'A vine reaches green land. Magma on the vine clears it.', icon: '🌿' },
  },
  {
    id: 'frost',
    planet: 36,
    placement: 'round',
    intro: { title: 'Frost Creep', body: 'A crystal cools land. Magma melts it!', icon: '❄️' },
  },
  {
    id: 'scorch',
    planet: 32,
    placement: 'round',
    intro: {
      title: 'Dry Spell',
      body: 'Magma or Sunburst on hot, dry land may cause Dry Spell. It hurts the planet. Watch the red outline!',
      icon: '🍂',
    },
  },
  ...(['rocks', 'bubble', 'mist', 'ring', 'tug'] as ObstacleId[]).map((id) => ({
    id,
    planet: OBSTACLES[id].debut,
    placement: 'round' as const,
    intro: { title: OBSTACLES[id].name, body: OBSTACLES[id].intro, icon: OBSTACLES[id].icon },
  })),
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
      body: LAB_TEXT.unlockBody,
    },
  },
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
  {
    id: 'landmark_signpost',
    planet: 29,
    placement: 'homeworld',
    button: true,
    intro: { title: 'A garden signpost', body: 'Finish this planet to start your Homeworld garden.', icon: '🌱' },
  },
  { id: 'lifebook', planet: 3, placement: 'home', button: true },
  { id: 'sticker_album', planet: 13, placement: 'collection' },
  {
    id: 'buddy',
    planet: 18,
    placement: 'round',
    letter: 'buddy-intro',
    intro: {
      title: 'Buddy helps',
      body: 'Choose a Homeworld friend. Its trait helps once each planet.',
      icon: '🤝',
    },
  },
  { id: 'momentum', planet: MOMENTUM_UNLOCK, placement: 'round' },
  { id: 'daily', planet: 27, placement: 'modes' },
  { id: 'zen', planet: 30, placement: 'modes' },
  { id: 'rush', planet: 38, placement: 'modes' },
  { id: 'challenge', planet: 40, placement: 'modes' },
  { id: 'passport', planet: 16, placement: 'home' },
  { id: 'passport_setup', planet: 0, placement: 'home' },
  { id: 'workshop', planet: 18, placement: 'collection' },
  { id: 'object_lab', planet: HOME_UNLOCK_LEVEL, placement: 'collection' },
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
  if (id === 'star_calendar' && !!p.daily.last) return true;
  if (id === 'momentum' && p.momentum.streak > 0) return true;
  if (id === 'homeworld' && (p.home.intro || p.home.plots.some(Boolean) || p.home.residents.length > 0)) return true;
  if (id === 'star_atlas' && (p.bundles.length > 0 || p.constellations.length > 0)) return true;
  if (id === 'sticker_album' && (p.album.fest.length > 0 || p.album.pagesClaimed.length > 0)) return true;
  if (id === 'passport' && p.passport.set) return true;
  if (id === 'object_lab' && Object.values(p.lab).some((level) => level > 1)) return true;
  if (id === 'buddy') return p.level >= 18 && p.home.residents.length > 0;
  if (id === 'passport_setup') return p.stats.wins >= 1;
  if (id === 'star_calendar') return p.level >= row.planet;
  return p.level >= row.planet;
}

export function debutsAt(planet: number): Unlock[] {
  return UNLOCKS.filter((entry) => entry.planet === planet && planet > 0);
}
