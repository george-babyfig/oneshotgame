import { CHAPTER_REWARD, CHAPTER_RANK_REWARD } from './tuning';
import { STAR_ROAD } from './tuning';
import { earn, type EarnSource } from './wallet';
// Chapters and the Star Road reward track. Legacy quests are kept for save migration.
import type { BoosterId } from './config';
import type { Profile } from './profile';
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

export function chapterReward(n: number, p?: Profile): Reward {
  let rankGems = 0;
  let rankDust = 0;
  for (let rank = (p?.m4RankPaidThrough ?? n - 1) + 1; rank <= Math.min(n, 7); rank++) {
    rankGems += CHAPTER_RANK_REWARD.gems[rank] ?? 0;
    rankDust += CHAPTER_RANK_REWARD.dust[rank] ?? 0;
  }
  return {
    gems: CHAPTER_REWARD.baseGems + n * CHAPTER_REWARD.gemsPerChapter + rankGems,
    dust: CHAPTER_REWARD.dustPerChapter * n + rankDust,
    boosters: { shower: 1, spark: 1, scope: 1 },
  };
}

export function openChest(p: Profile, n: number): Reward | null {
  if (!chestsReady(p).includes(n)) return null;
  const r = chapterReward(n, p);
  p.chapters.push(n);
  p.m4RankPaidThrough = Math.max(p.m4RankPaidThrough, Math.min(n, 7));
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

export function roadReady(p: Profile): number[] {
  const out: number[] = [];
  STAR_ROAD.forEach((t, i) => {
    if (p.roadPoints < t.stars) return;
    if (!p.road.includes(i)) out.push(i);
    else if (p.pass && !p.roadPass.includes(i)) out.push(i);
  });
  return out;
}

/** Claim everything unlocked on tier i (free lane, plus pass lane if owned). */
export function claimRoad(p: Profile, i: number): Reward[] {
  const t = STAR_ROAD[i];
  const got: Reward[] = [];
  if (!t || p.roadPoints < t.stars) return got;
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

// Legacy quest shape supports save migration in wishes.ts.
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
