import type { WishOrigin } from './m13types';
// Creature Wishes are stored in the old quest slot so existing saves migrate without a new profile field.
import { SPECIES_BY_ID, type BiomeId, type Planet } from '../core/world';
import { rngFrom } from '../core/levels';
import { t } from '../i18n';
import { today, type Profile, type QuestState } from './profile';
import { QUESTS, QUEST_BONUS, WISH_REWARD } from './tuning';
import { earn } from './wallet';
import { unlocked } from './unlocks';
import { addFriendship } from './homeworld';
import { grantProfileRoadPoints, previewProfileRoadPoints } from './starroad';
import { grantWishSampler } from './cosmetics';
import { checkMail } from './inbox';
import { homeLandFor } from './friends';
import { M13_STRINGS } from './m13strings';
import { REACTIONS, type ReactionId } from '../core/round';

export type WishMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix';
type Feat = 'land' | 'neighbor' | 'creature' | 'fusion' | 'combo' | 'superFusion';
interface Template {
  id: string;
  text: string;
  feat: Feat;
  copy?: (vars: Record<string, string | number>) => string;
  land?: BiomeId;
  near?: BiomeId;
  reaction?: ReactionId;
  minLevel: number;
  goal: number;
}
export interface WishCard extends QuestState {
  from?: WishOrigin;
  species: string;
  template: string;
  goal: number;
  born: string;
}
interface WishState {
  day: string;
  list: WishCard[];
  bonusClaimed: boolean;
  swapDay?: string;
  serial?: number;
}

// Each sentence is an English translation key. Land and creature names are translated separately.
export const WISH_TEMPLATES: Template[] = [
  { id: 'ocean1', text: '{creature} wishes for two Ocean places', feat: 'land', land: 'ocean', minLevel: 1, goal: 2 },
  { id: 'ocean2', text: '{creature} wishes for three Ocean places', feat: 'land', land: 'ocean', minLevel: 1, goal: 3 },
  { id: 'ocean3', text: '{creature} wishes for a little Ocean shore', feat: 'land', land: 'ocean', minLevel: 1, goal: 1 },
  { id: 'mountain1', text: '{creature} wishes for two Mountains', feat: 'land', land: 'mountain', minLevel: 1, goal: 2 },
  { id: 'mountain2', text: '{creature} wishes for three Mountains', feat: 'land', land: 'mountain', minLevel: 1, goal: 3 },
  { id: 'mountain3', text: '{creature} wishes for a Mountain to explore', feat: 'land', land: 'mountain', minLevel: 1, goal: 1 },
  { id: 'meadow1', text: '{creature} wishes for two Meadows', feat: 'land', land: 'meadow', minLevel: 2, goal: 2 },
  { id: 'meadow2', text: '{creature} wishes for three Meadows', feat: 'land', land: 'meadow', minLevel: 2, goal: 3 },
  { id: 'meadow3', text: '{creature} wishes for a Meadow full of life', feat: 'land', land: 'meadow', minLevel: 2, goal: 1 },
  { id: 'forest1', text: '{creature} wishes for two Forests', feat: 'land', land: 'forest', minLevel: 2, goal: 2 },
  { id: 'forest2', text: '{creature} wishes for three Forests', feat: 'land', land: 'forest', minLevel: 2, goal: 3 },
  { id: 'forest3', text: '{creature} wishes for a Forest to visit', feat: 'land', land: 'forest', minLevel: 2, goal: 1 },
  { id: 'reef1', text: '{creature} wishes for two Reefs', feat: 'land', land: 'reef', minLevel: 2, goal: 2 },
  { id: 'reef2', text: '{creature} wishes for a Reef by the sea', feat: 'land', land: 'reef', minLevel: 2, goal: 1 },
  { id: 'highland1', text: '{creature} wishes for two Highlands', feat: 'land', land: 'highland', minLevel: 2, goal: 2 },
  { id: 'highland2', text: '{creature} wishes for a Highland to roam', feat: 'land', land: 'highland', minLevel: 2, goal: 1 },
  { id: 'desert1', text: '{creature} wishes for two Deserts', feat: 'land', land: 'desert', minLevel: 4, goal: 2 },
  { id: 'desert2', text: '{creature} wishes for a warm Desert', feat: 'land', land: 'desert', minLevel: 4, goal: 1 },
  { id: 'volcano1', text: '{creature} wishes for two Volcanoes', feat: 'land', land: 'volcano', minLevel: 4, goal: 2 },
  { id: 'volcano2', text: '{creature} wishes for a glowing Volcano', feat: 'land', land: 'volcano', minLevel: 4, goal: 1 },
  { id: 'springs1', text: '{creature} wishes for two Hot Springs', feat: 'land', land: 'springs', minLevel: 4, goal: 2 },
  { id: 'springs2', text: '{creature} wishes for a gentle Hot Spring', feat: 'land', land: 'springs', minLevel: 4, goal: 1 },
  { id: 'jungle1', text: '{creature} wishes for two Jungles', feat: 'land', land: 'jungle', minLevel: 4, goal: 2 },
  { id: 'jungle2', text: '{creature} wishes for a green Jungle', feat: 'land', land: 'jungle', minLevel: 4, goal: 1 },
  {
    id: 'oceanforest',
    text: '{creature} wishes for a Forest next to an Ocean',
    feat: 'neighbor',
    land: 'forest',
    near: 'ocean',
    minLevel: 2,
    goal: 1,
  },
  {
    id: 'mountainmeadow',
    text: '{creature} wishes for a Meadow next to a Mountain',
    feat: 'neighbor',
    land: 'meadow',
    near: 'mountain',
    minLevel: 2,
    goal: 1,
  },
  {
    id: 'reefocean',
    text: '{creature} wishes for a Reef next to an Ocean',
    feat: 'neighbor',
    land: 'reef',
    near: 'ocean',
    minLevel: 2,
    goal: 1,
  },
  {
    id: 'mountainforest',
    text: '{creature} wishes for a Forest next to a Mountain',
    feat: 'neighbor',
    land: 'forest',
    near: 'mountain',
    minLevel: 2,
    goal: 1,
  },
  {
    id: 'volcanoocean',
    text: '{creature} wishes for a Volcano next to an Ocean',
    feat: 'neighbor',
    land: 'volcano',
    near: 'ocean',
    minLevel: 4,
    goal: 1,
  },
  {
    id: 'desertmeadow',
    text: '{creature} wishes for a Desert next to a Meadow',
    feat: 'neighbor',
    land: 'desert',
    near: 'meadow',
    minLevel: 4,
    goal: 1,
  },
  { id: 'creature1', text: '{creature} wishes you would welcome a creature on a planet', feat: 'creature', minLevel: 2, goal: 1 },
  { id: 'creature2', text: '{creature} wishes you would welcome five creatures as you play', feat: 'creature', minLevel: 2, goal: 5 },
  {
    id: 'savanna1',
    text: '{creature} wishes for two Savannas',
    copy: M13_STRINGS.twoSavannas,
    feat: 'land',
    land: 'savanna',
    minLevel: 4,
    goal: 2,
  },
  {
    id: 'savanna2',
    text: '{creature} wishes for a sunny Savanna',
    copy: M13_STRINGS.sunnySavanna,
    feat: 'land',
    land: 'savanna',
    minLevel: 4,
    goal: 1,
  },
  {
    id: 'icesheet1',
    text: '{creature} wishes for two Ice Sheets',
    copy: M13_STRINGS.twoIceSheets,
    feat: 'land',
    land: 'icesheet',
    minLevel: 1,
    goal: 2,
  },
  {
    id: 'icesheet2',
    text: '{creature} wishes for a shiny Ice Sheet',
    copy: M13_STRINGS.shinyIceSheet,
    feat: 'land',
    land: 'icesheet',
    minLevel: 1,
    goal: 1,
  },
  {
    id: 'tundra1',
    text: '{creature} wishes for two Tundras',
    copy: M13_STRINGS.twoTundras,
    feat: 'land',
    land: 'tundra',
    minLevel: 1,
    goal: 2,
  },
  {
    id: 'tundra2',
    text: '{creature} wishes for a quiet Tundra',
    copy: M13_STRINGS.quietTundra,
    feat: 'land',
    land: 'tundra',
    minLevel: 1,
    goal: 1,
  },
  {
    id: 'taiga1',
    text: '{creature} wishes for two Taigas',
    copy: M13_STRINGS.twoTaigas,
    feat: 'land',
    land: 'taiga',
    minLevel: 2,
    goal: 2,
  },
  {
    id: 'taiga2',
    text: '{creature} wishes for a snowy Taiga',
    copy: M13_STRINGS.snowyTaiga,
    feat: 'land',
    land: 'taiga',
    minLevel: 2,
    goal: 1,
  },
  {
    id: 'swamp1',
    text: '{creature} wishes for two Swamps',
    copy: M13_STRINGS.twoSwamps,
    feat: 'land',
    land: 'swamp',
    minLevel: 1,
    goal: 2,
  },
  {
    id: 'swamp2',
    text: '{creature} wishes for a misty Swamp',
    copy: M13_STRINGS.mistySwamp,
    feat: 'land',
    land: 'swamp',
    minLevel: 1,
    goal: 1,
  },
  {
    id: 'marsh1',
    text: '{creature} wishes for two Marshes',
    copy: M13_STRINGS.twoMarshes,
    feat: 'land',
    land: 'marsh',
    minLevel: 2,
    goal: 2,
  },
  {
    id: 'marsh2',
    text: '{creature} wishes for a reedy Marsh',
    copy: M13_STRINGS.reedyMarsh,
    feat: 'land',
    land: 'marsh',
    minLevel: 2,
    goal: 1,
  },
  { id: 'steam', text: '{creature} wishes you would make Steam', feat: 'fusion', reaction: 'steam', minLevel: 8, goal: 1 },
  {
    id: 'rainGarden',
    text: '{creature} wishes you would make a Rain Garden',
    feat: 'fusion',
    reaction: 'rainGarden',
    minLevel: 13,
    goal: 1,
  },
  {
    id: 'wildflowers',
    text: '{creature} wishes you would grow Wildflowers',
    feat: 'fusion',
    reaction: 'wildflowers',
    minLevel: 22,
    goal: 1,
  },
  { id: 'glacier', text: '{creature} wishes you would make a Glacier', feat: 'fusion', reaction: 'glacier', minLevel: 25, goal: 1 },
  { id: 'combo2', text: '{creature} wishes for a Combo of 2', feat: 'combo', minLevel: 26, goal: 2 },
  { id: 'combo3', text: '{creature} wishes for a Combo of 3', feat: 'combo', minLevel: 26, goal: 3 },
  { id: 'superSteam', text: '{creature} wishes for a Super Steam', feat: 'superFusion', reaction: 'steam', minLevel: 26, goal: 1 },
];
const BY_ID = Object.fromEntries(WISH_TEMPLATES.map((x) => [x.id, x])) as Record<string, Template>;
const wishState = (p: Profile) => p.quests as unknown as WishState;
const isWish = (q: QuestState): q is WishCard => 'template' in q && 'species' in q;

function payLegacy(p: Profile) {
  if (p.quests.list.some(isWish)) return;
  for (const q of p.quests.list) {
    const def = QUESTS.find((x) => x.id === q.id);
    if (def && !q.claimed && q.progress >= def.goal) {
      q.claimed = true;
      earn(p, 'gems', def.gems, 'quest');
    }
  }
  if (!p.quests.bonusClaimed && p.quests.list.length === 3 && p.quests.list.every((q) => q.claimed)) {
    p.quests.bonusClaimed = true;
    if (QUEST_BONUS.gems) earn(p, 'gems', QUEST_BONUS.gems, 'quest');
    if (QUEST_BONUS.dust) earn(p, 'dust', QUEST_BONUS.dust, 'quest');
    for (const [id, count] of Object.entries(QUEST_BONUS.boosters ?? {})) p.boosters[id as keyof Profile['boosters']] += count ?? 0;
  }
}

/** Missing origins on saved 1.0 cards stay open; existing cards are never rewritten. */
export function wishOrigin(card: WishCard): WishOrigin {
  return card.from ?? 'open';
}

function makeCard(p: Profile, day: string, slot: number, avoid: Set<string>, serial: number, others: WishCard[]): WishCard {
  const rnd = rngFrom(`W-${day}-${slot}-${serial}-${p.level}-${[...p.seen].sort().join(',')}`);
  const available = WISH_TEMPLATES.filter((x) => x.minLevel <= p.level && (!x.reaction || REACTIONS[x.reaction].debut <= p.level));
  const pool = available.filter((x) => !avoid.has(x.id));
  const used = new Set(others.map((q) => q.species));
  const residents = p.home.residents.filter((r) => SPECIES_BY_ID[r.species]);
  const rotation = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const ordered = residents.map((_, i) => residents[(rotation + slot + i) % residents.length]);
  const friend = slot < Math.min(2, residents.length) ? ordered.find((r) => !used.has(r.species)) : undefined;
  let choices = pool.length ? pool : available;
  if (friend) {
    // Both home and near must be reachable with the taught objects (RM §5.1).
    const home = choices.filter((x) => x.land === homeLandFor(friend.species));
    const near = choices.filter((x) => x.land === SPECIES_BY_ID[friend.species].home?.[1]);
    choices = home.length ? home : near.length ? near : choices;
  }
  const template = choices[Math.floor(rnd() * choices.length)] ?? WISH_TEMPLATES[0];
  const seen = p.seen.filter((id) => !!SPECIES_BY_ID[id]).sort();
  const open = seen.filter((id) => !used.has(id) && !residents.some((r) => r.species === id));
  const remaining = seen.filter((id) => !used.has(id));
  const wishers = open.length ? open : remaining.length ? remaining : seen;
  const species = friend?.species ?? wishers[Math.floor(rnd() * wishers.length)];
  return {
    id: `${day}-${slot}-${serial}`,
    from: friend ? 'friend' : 'open',
    template: template.id,
    species,
    goal: template.goal,
    progress: 0,
    claimed: false,
    born: day,
  };
}

/** Keep unfinished cards across dates; replace claimed cards on the next date. */
export function ensureWishes(p: Profile, day: string): WishCard[] {
  if (!unlocked(p, 'quests')) return [];
  if (!p.seen.some((id) => SPECIES_BY_ID[id])) return [];
  const state = wishState(p);
  if (!state.list.every(isWish)) {
    payLegacy(p);
    p.quests = { day: '', list: [], bonusClaimed: false };
  }
  const s = wishState(p);
  // A calendar high-water mark prevents rollback and revisiting a credited date.
  if (s.day && day <= s.day && s.list.length === 3) return s.list;
  const old = s.list.filter(isWish);
  const keep = old.filter((q) => !q.claimed);
  const avoid = new Set(keep.map((q) => q.template));
  let serial = s.serial ?? 0;
  // Preserve positions as well as identities, so replacing the open card cannot become a friend slot.
  const list = old.slice(0, 3).map((q) => (q.claimed ? undefined : q));
  for (let slot = 0; slot < 3; slot++) {
    if (list[slot]) continue;
    const card = makeCard(
      p,
      day,
      slot,
      avoid,
      serial++,
      list.filter((q): q is WishCard => !!q),
    );
    avoid.add(card.template);
    list[slot] = card;
  }
  p.quests = { day, list, bonusClaimed: keep.length ? s.bonusClaimed : false, swapDay: s.swapDay, serial } as Profile['quests'];
  return list as WishCard[];
}

export function wishText(card: WishCard): string {
  const template = BY_ID[card.template];
  if (!template) return '';
  const vars = { creature: t(SPECIES_BY_ID[card.species]?.name ?? '') };
  return template.copy ? template.copy(vars) : t(template.text, vars);
}

export function wishClaimable(p: Profile): number {
  if (!unlocked(p, 'quests')) return 0;
  return wishState(p).list.filter((q) => isWish(q) && !q.claimed && q.progress >= q.goal).length;
}

export function swapWish(p: Profile, id: string, day: string): boolean {
  ensureWishes(p, day);
  const s = wishState(p);
  if (day < s.day || (s.swapDay && day <= s.swapDay)) return false;
  const index = s.list.findIndex((q) => q.id === id && !q.claimed && q.progress === 0);
  if (index < 0) return false;
  const avoid = new Set(s.list.map((q) => q.template));
  s.list[index] = makeCard(
    p,
    day,
    index,
    avoid,
    s.serial ?? 1,
    s.list.filter((_, i) => i !== index),
  );
  s.serial = (s.serial ?? 1) + 1;
  s.swapDay = day;
  return true;
}

export function recordWishRound(p: Profile, mode: WishMode, planet: Planet, day: string, before?: Planet): string[] {
  if (!unlocked(p, 'quests')) return [];
  if (!['campaign', 'voyage', 'zen', 'daily'].includes(mode)) return [];
  const list = ensureWishes(p, day);
  const done: string[] = [];
  for (const card of list) {
    if (card.claimed) continue;
    const def = BY_ID[card.template];
    if (!def) continue;
    if (def.feat === 'fusion' || def.feat === 'combo' || def.feat === 'superFusion') continue;
    const count = (world: Planet) =>
      def.feat === 'creature'
        ? new Set(world.sectors.map((s) => s.species).filter(Boolean)).size
        : def.feat === 'land'
          ? world.sectors.filter((s) => s.biome === def.land).length
          : world.sectors.filter(
              (s, i) =>
                s.biome === def.land &&
                (world.sectors[(i + 1) % world.sectors.length].biome === def.near ||
                  world.sectors[(i + world.sectors.length - 1) % world.sectors.length].biome === def.near),
            ).length;
    const value = Math.max(0, count(planet) - (before ? count(before) : 0));
    const wasDone = card.progress >= card.goal;
    card.progress =
      def.feat === 'land' || (def.feat === 'creature' && def.goal > 2)
        ? Math.min(card.goal, card.progress + value)
        : Math.max(card.progress, Math.min(card.goal, value));
    if (!wasDone && card.progress >= card.goal) done.push(card.id);
  }
  return done;
}

const wishMode = (mode: WishMode) => ['campaign', 'voyage', 'zen', 'daily'].includes(mode);

export function recordWishReaction(p: Profile, id: ReactionId, mode: WishMode = 'campaign'): string[] {
  if (!wishMode(mode) || !unlocked(p, 'quests')) return [];
  const done: string[] = [];
  for (const card of wishState(p).list) {
    if (!isWish(card) || card.claimed || card.progress >= card.goal) continue;
    const def = BY_ID[card.template];
    if (def?.feat !== 'fusion' || def.reaction !== id) continue;
    card.progress = card.goal;
    done.push(card.id);
  }
  return done;
}

export function recordWishCombo(
  p: Profile,
  links: number,
  reaction?: ReactionId,
  superFusion = false,
  mode: WishMode = 'campaign',
): string[] {
  if (!wishMode(mode) || !unlocked(p, 'quests')) return [];
  const done: string[] = [];
  for (const card of wishState(p).list) {
    if (!isWish(card) || card.claimed || card.progress >= card.goal) continue;
    const def = BY_ID[card.template];
    if (!def) continue;
    if ((def.feat === 'combo' && links >= def.goal) || (def.feat === 'superFusion' && superFusion && def.reaction === reaction)) {
      card.progress = card.goal;
      done.push(card.id);
    }
  }
  return done;
}

/** The same grant path powers the preview, including daily room and finished Roads. */
export function wishRoadPoints(p: Profile, card: WishCard, day = today()): number {
  if (card.claimed) return 0;
  return previewProfileRoadPoints(p, { source: 'wish', date: day, earningKey: card.id, delta: WISH_REWARD.roadPoints });
}

/** Claiming the third card pays the completion bonus exactly once. */
export function claimWish(p: Profile, id: string, day?: string): boolean {
  if (!unlocked(p, 'quests')) return false;
  const s = wishState(p);
  const card = s.list.find((q) => q.id === id);
  if (!card || card.claimed || card.progress < card.goal) return false;
  card.claimed = true;
  earn(p, 'gems', WISH_REWARD.gems, 'wish');
  earn(p, 'dust', WISH_REWARD.dust, 'wish');
  grantProfileRoadPoints(p, { source: 'wish', date: day ?? today(), earningKey: card.id, delta: WISH_REWARD.roadPoints });
  // Each named sampler is earned from a Wish, with no paid entitlement.
  for (const id of ['sampler_tidepool', 'sampler_cometcandy', 'sampler_crystalfrost'] as const) {
    if (grantWishSampler(p, id)) break;
  }
  const resident = p.home.residents.find((r) => r.species === card.species);
  if (resident) {
    addFriendship(p, resident, 2);
    checkMail(p);
  }
  if (!s.bonusClaimed && s.list.length === 3 && s.list.every((q) => q.claimed)) {
    s.bonusClaimed = true;
    earn(p, 'gems', WISH_REWARD.allThreeGems, 'wish');
  }
  return true;
}

/** Display only: no dealing, progress or reward changes when the canvas reads these. */
export function wishBubbles(p: Profile): { species: string; land: BiomeId }[] {
  if (!unlocked(p, 'quests')) return [];
  const shown = new Set<string>();
  return wishState(p).list.flatMap((card) => {
    if (!isWish(card) || card.claimed || shown.has(card.species) || !p.home.residents.some((r) => r.species === card.species)) return [];
    const def = BY_ID[card.template];
    if (!def) return [];
    const land = def.land ?? homeLandFor(card.species);
    if (!land) return [];
    shown.add(card.species);
    return [{ species: card.species, land }];
  });
}
