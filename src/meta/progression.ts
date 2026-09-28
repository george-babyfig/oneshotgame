import { CHAPTER_REWARD } from './tuning';
import { QUEST_BONUS } from './tuning';
import { QUESTS } from './tuning';
import { STAR_ROAD } from './tuning';
import { earn, type EarnSource } from './wallet';
// Chapters, the Star Road reward track, and daily quests.
import { rngFrom } from '../core/levels';
import type { BoosterId } from './config';
import type { Profile, QuestState } from './profile';
import { t } from '../i18n';
import { COSMETIC_BY_ID } from './cosmetics';

// ------------------------------------------------------------------ chapters
export const LEVELS_PER_CHAPTER = 10;

export const CHAPTER_NAMES = [
  'Dawn Belt',
  'Cinder Reach',
  'Tidewater Drift',
  'Frostveil',
  'Verdant Arc',
  'Storm Crown',
  'Solar Loom',
  'Deep Nebula',
  'Coral Expanse',
  'Aurora Gate',
  'Obsidian Rim',
  'Starfall Garden',
];

export interface Chapter {
  n: number; // 1-based
  name: string;
  first: number;
  last: number;
  hue: number;
}

export function chapterOf(level: number): Chapter {
  const n = Math.floor((level - 1) / LEVELS_PER_CHAPTER) + 1;
  const name =
    t(CHAPTER_NAMES[(n - 1) % CHAPTER_NAMES.length]) + (n > CHAPTER_NAMES.length ? ` ${Math.ceil(n / CHAPTER_NAMES.length)}` : '');
  const first = (n - 1) * LEVELS_PER_CHAPTER + 1;
  return { n, name, first, last: first + LEVELS_PER_CHAPTER - 1, hue: (200 + n * 37) % 360 };
}

export interface Reward {
  gems?: number;
  dust?: number;
  boosters?: Partial<Record<BoosterId, number>>;
  skin?: string;
  /** Keeper cosmetic (ownership is derived from the claimed tier, see cosmetics.ts). */
  item?: string;
}

export function chapterReward(n: number): Reward {
  return {
    gems: CHAPTER_REWARD.baseGems + n * CHAPTER_REWARD.gemsPerChapter,
    dust: CHAPTER_REWARD.dustPerChapter * n,
    boosters: { shower: 1, spark: 1, scope: 1 },
  };
}

export function openChest(p: Profile, n: number): Reward | null {
  if (!chestsReady(p).includes(n)) return null;
  p.chapters.push(n);
  const r = chapterReward(n);
  applyReward(p, r, 'chest');
  return r;
}

/** Finished chapters whose chest is unopened. */
export function chestsReady(p: Profile): number[] {
  const out: number[] = [];
  for (let n = 1; ; n++) {
    const c = chapterOf(n * LEVELS_PER_CHAPTER);
    if (p.level <= c.last) break;
    if (!p.chapters.includes(n)) out.push(n);
  }
  return out;
}

// ------------------------------------------------------------------ Star Road
export interface RoadTier {
  stars: number;
  /** Free lane. */
  reward: Reward;
  /** Cosmic Pass lane. */
  pass: Reward;
}

export { STAR_ROAD } from './tuning';

export function roadReady(p: Profile, stars: number): number[] {
  const out: number[] = [];
  STAR_ROAD.forEach((t, i) => {
    if (stars < t.stars) return;
    if (!p.road.includes(i)) out.push(i);
    else if (p.pass && !p.roadPass.includes(i)) out.push(i);
  });
  return out;
}

/** Claim everything unlocked on tier i (free lane, plus pass lane if owned). */
export function claimRoad(p: Profile, i: number, stars: number): Reward[] {
  const t = STAR_ROAD[i];
  const got: Reward[] = [];
  if (!t || stars < t.stars) return got;
  if (!p.road.includes(i)) {
    p.road.push(i);
    applyReward(p, t.reward, 'star_road');
    got.push(t.reward);
  }
  if (p.pass && !p.roadPass.includes(i)) {
    p.roadPass.push(i);
    applyReward(p, t.pass, 'star_road');
    got.push(t.pass);
  }
  return got;
}

/** Total gem value of the pass lane (used for the sales pitch). */
export const PASS_GEMS = STAR_ROAD.reduce((a, t) => a + (t.pass.gems ?? 0), 0);

// ------------------------------------------------------------------ quests
export type QuestEvent = 'throw' | 'win' | 'star' | 'creature' | 'three' | 'booster' | 'collect' | 'land' | 'voyage' | 'spot';

export interface QuestDef {
  id: string;
  event: QuestEvent;
  goal: number;
  gems: number;
  text: (goal: number) => string;
  emoji: string;
  /** Only offered once the feature it needs is unlocked. */
  need?: (p: Profile) => boolean;
}

export { QUESTS } from './tuning';

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
export { QUEST_BONUS } from './tuning';

/** Make sure today's three quests exist. */
export function ensureQuests(p: Profile, day: string) {
  if (p.quests.day === day && p.quests.list.length) return;
  const rnd = rngFrom(`Q-${day}`);
  const pool = QUESTS.filter((q) => !q.need || q.need(p));
  const list: QuestState[] = [];
  while (list.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    list.push({ id: q.id, progress: 0, claimed: false });
  }
  p.quests = { day, list, bonusClaimed: false };
}

/** Advance quests; returns ids that just became complete. */
export function questEvent(p: Profile, ev: QuestEvent, amount = 1): string[] {
  const done: string[] = [];
  for (const q of p.quests.list) {
    const def = QUEST_BY_ID[q.id];
    if (!def || def.event !== ev || q.progress >= def.goal) continue;
    q.progress = Math.min(def.goal, q.progress + amount);
    if (q.progress >= def.goal) done.push(q.id);
  }
  return done;
}

export function claimQuest(p: Profile, id: string): number {
  const q = p.quests.list.find((x) => x.id === id);
  const def = QUEST_BY_ID[id];
  if (!q || !def || q.claimed || q.progress < def.goal) return 0;
  q.claimed = true;
  earn(p, 'gems', def.gems, 'quest');
  return def.gems;
}

export function claimQuestBonus(p: Profile): Reward | null {
  if (p.quests.bonusClaimed || !p.quests.list.length || !p.quests.list.every((q) => q.claimed)) return null;
  p.quests.bonusClaimed = true;
  applyReward(p, QUEST_BONUS, 'quest');
  return QUEST_BONUS;
}

export function questsClaimable(p: Profile): number {
  let n = p.quests.list.filter((q) => !q.claimed && q.progress >= (QUEST_BY_ID[q.id]?.goal ?? Infinity)).length;
  if (!p.quests.bonusClaimed && p.quests.list.length && p.quests.list.every((q) => q.claimed)) n++;
  return n;
}

// ------------------------------------------------------------------ rewards
export function applyReward(p: Profile, r: Reward, source: EarnSource = 'generic_reward') {
  if (r.gems) earn(p, 'gems', r.gems, source);
  if (r.dust) earn(p, 'dust', r.dust, source);
  for (const [k, v] of Object.entries(r.boosters ?? {})) p.boosters[k as BoosterId] += v ?? 0;
  if (r.skin && !p.skins.includes(r.skin)) p.skins.push(r.skin);
}

export function rewardText(r: Reward): string[] {
  const out: string[] = [];
  if (r.gems) out.push(`💎 ${r.gems}`);
  if (r.dust) out.push(`✨ ${r.dust}`);
  const bEmoji: Record<string, string> = { shower: '🌠', spark: '✨', scope: '🔭' };
  for (const [k, v] of Object.entries(r.boosters ?? {})) if (v) out.push(`${bEmoji[k]} ×${v}`);
  if (r.skin) out.push(t('🌈 New atmosphere'));
  if (r.item) out.push(t('🧑‍🚀 {name}', { name: t(COSMETIC_BY_ID[r.item]?.name ?? '') }));
  return out;
}
