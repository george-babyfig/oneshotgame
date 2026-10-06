import { BIOMES, SPECIES, SPECIES_BY_ID, traitOf, type BiomeId, type TraitId } from '../core/world';
import type { HomeState, Resident, BuildingType } from './homeworld';
import type { Season } from './seasons';
import type { WeatherKind } from './weather';

export type RoutineBlock = 'dawn' | 'morning' | 'day' | 'evening' | 'night';
export type FriendActivity =
  | 'stir'
  | 'head_home'
  | 'walk_home'
  | 'sleep'
  | 'night_wander'
  | 'sunbathe'
  | 'splash'
  | 'tend_flowers'
  | 'climb'
  | 'float'
  | 'warm_lantern'
  | 'fountain_bubbles'
  | 'flower_picnic'
  | 'stargaze'
  | 'landmark_rest'
  | 'puddle_dance'
  | 'snow_play'
  | 'huddle'
  | 'leaf_play'
  | 'petal_play'
  | 'signature';

export interface FriendRoutine {
  block: RoutineBlock;
  awake: boolean;
  activity: FriendActivity;
  favourite: BuildingType | 'landmark';
  /** Sheets and tap reactions work even during sleep. */
  respondsToTap: true;
  tapPose: 'happy' | 'sleepy_wave';
  signatureId?: string;
}

export const NIGHT_FRIENDS = ['owl', 'wolf', 'fish'] as const;
export const FAVOURITE_DECORATION: Record<TraitId, BuildingType | 'landmark'> = {
  fireproof: 'lantern',
  swimmer: 'fountain',
  weedproof: 'flowers',
  frostproof: 'statue',
  calm: 'landmark',
};

export function routineBlock(date: Date): RoutineBlock {
  const hour = date.getHours();
  if (hour >= 21 || hour < 4) return 'night';
  if (hour < 7) return 'dawn';
  if (hour < 10) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
}

/** A complete routine is read from the injected local clock; no state is advanced. */
export function routineFor(friend: Resident | string, date: Date, weather: WeatherKind, season: Season): FriendRoutine {
  const species = typeof friend === 'string' ? friend : friend.species;
  const fp = typeof friend === 'string' ? 0 : friend.fp;
  const trait = traitOf(species) ?? 'calm';
  const favourite = FAVOURITE_DECORATION[trait];
  const block = routineBlock(date);
  const nocturnal = NIGHT_FRIENDS.some((id) => id === species);
  const awake = block === 'night' ? nocturnal : block === 'dawn' ? !nocturnal : true;
  let activity: FriendActivity;
  if (!awake) activity = block === 'dawn' ? 'head_home' : 'sleep';
  else if (block === 'dawn') activity = 'stir';
  else if (block === 'morning') activity = 'walk_home';
  else if (block === 'night') activity = weather === 'starry' ? 'stargaze' : 'night_wander';
  else if (block === 'evening')
    activity = {
      fireproof: 'warm_lantern',
      swimmer: 'fountain_bubbles',
      weedproof: 'flower_picnic',
      frostproof: 'stargaze',
      calm: 'landmark_rest',
    }[trait] as FriendActivity;
  else if (weather === 'drizzle' && (trait === 'swimmer' || species === 'frog')) activity = 'puddle_dance';
  else if (weather === 'snow' && trait === 'frostproof') activity = 'snow_play';
  else if (weather === 'snow' && trait === 'fireproof') activity = 'huddle';
  else if (season === 'spring' && trait === 'weedproof') activity = 'petal_play';
  else if (season === 'autumn' && trait === 'weedproof') activity = 'leaf_play';
  else
    activity = {
      fireproof: 'sunbathe',
      swimmer: 'splash',
      weedproof: 'tend_flowers',
      frostproof: 'climb',
      calm: 'float',
    }[trait] as FriendActivity;
  const signatureId = fp >= 8 && SPECIES_BY_ID[species] ? `signature:${species}` : undefined;
  if (signatureId && block === 'day' && date.getMinutes() % 3 === 0 && date.getSeconds() < 4) activity = 'signature';
  return { block, awake, activity, favourite, respondsToTap: true, tapPose: awake ? 'happy' : 'sleepy_wave', signatureId };
}

export const KEEPSAKE_IDS = SPECIES.map((s) => `keepsake:${s.id}`);
export function keepsakeFor(friend: Resident | string): string | null {
  const species = typeof friend === 'string' ? friend : friend.species;
  const fp = typeof friend === 'string' ? 0 : friend.fp;
  return fp >= 25 && SPECIES_BY_ID[species] ? `keepsake:${species}` : null;
}

/** A friend lives on its first recipe land, or beside its derived Den bed. */
export function homeSpotFor(
  friend: Resident,
  home: HomeState,
  gaps: (BiomeId | null)[],
): { kind: 'gap'; index: number } | { kind: 'den'; index: number } | { kind: 'sea' } {
  const species = SPECIES_BY_ID[friend.species];
  if (friend.species === 'leviathan') return { kind: 'sea' };
  const land =
    friend.species === 'worldtree'
      ? gaps.filter((id): id is BiomeId => !!id).sort((a, b) => BIOMES[b].value - BIOMES[a].value)[0]
      : species?.home?.[0];
  const gap = gaps.findIndex((id) => id === land);
  if (gap >= 0) return { kind: 'gap', index: gap };
  const dens = home.plots.flatMap((b, index) => (b?.type === 'den' ? [{ index, capacity: b.lv + 1 }] : []));
  let place = Math.max(
    0,
    home.residents.findIndex((r) => r.species === friend.species),
  );
  for (const den of dens) {
    if (place < den.capacity) return { kind: 'den', index: den.index };
    place -= den.capacity;
  }
  return { kind: 'den', index: dens[0]?.index ?? -1 };
}

export type PairReaction = 'high_five' | 'chase' | 'share_snack';
export interface FriendPair {
  a: string;
  b: string;
  reaction: PairReaction;
}

export type HomeReactionEvent =
  | { kind: 'three_stars' | 'friend_moved_in' | 'landmark_stage' | 'landmark_finished' | 'home_level' | 'photo' }
  | { kind: 'lab_level'; trait: TraitId }
  | { kind: 'land_planted'; biome: BiomeId }
  | { kind: 'decoration_placed'; decoration: BuildingType };

export interface FriendReaction {
  species: string;
  pose: 'happy' | 'wave' | 'signature';
}

/** A Homeworld event changes poses only; it cannot earn or spend anything. */
export function reactionsFor(home: HomeState, event: HomeReactionEvent, date: Date): FriendReaction[] {
  const residents = [...home.residents].sort((a, b) => a.species.localeCompare(b.species));
  const minute = Math.floor(date.getTime() / 60_000);
  return residents.flatMap((friend) => {
    if (event.kind === 'lab_level' && traitOf(friend.species) !== event.trait) return [];
    if (event.kind === 'land_planted' && SPECIES_BY_ID[friend.species]?.home?.[0] !== event.biome) return [];
    if (event.kind === 'decoration_placed' && FAVOURITE_DECORATION[traitOf(friend.species) ?? 'calm'] !== event.decoration) return [];
    const pose =
      event.kind === 'friend_moved_in' || event.kind === 'photo' ? 'wave' : friend.fp >= 8 && minute % 3 === 0 ? 'signature' : 'happy';
    return [{ species: friend.species, pose }];
  });
}

/** IDs and the local minute alone decide pair animation, so screenshots repeat. */
export function friendPairs(friends: readonly Resident[], date: Date, gaps: (BiomeId | null)[], home: HomeState): FriendPair[] {
  if (routineBlock(date) !== 'day') return [];
  const minute = Math.floor(date.getTime() / 60_000);
  const ordered = [...friends].sort((a, b) => a.species.localeCompare(b.species));
  const pairs: FriendPair[] = [];
  const used = new Set<string>();
  for (let i = 0; i < ordered.length; i++)
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i],
        b = ordered[j];
      if (used.has(a.species) || used.has(b.species)) continue;
      const one = homeSpotFor(a, home, gaps),
        two = homeSpotFor(b, home, gaps);
      if (
        one.kind !== 'gap' ||
        two.kind !== 'gap' ||
        Math.min(Math.abs(one.index - two.index), gaps.length - Math.abs(one.index - two.index)) > 1
      )
        continue;
      const hash = [...`${minute}:${a.species}:${b.species}`].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
      if (hash % 5 !== 0) continue;
      pairs.push({ a: a.species, b: b.species, reaction: (['high_five', 'chase', 'share_snack'] as const)[hash % 3] });
      used.add(a.species);
      used.add(b.species);
    }
  return pairs;
}
