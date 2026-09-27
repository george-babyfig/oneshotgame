// Chapters, the Star Road reward track, and daily quests.
import { rngFrom } from '../core/levels';
import type { BoosterId } from './config';
import type { Profile, QuestState } from './profile';
import { t } from '../i18n';

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
}

export function chapterReward(n: number): Reward {
  return { gems: 25 + n * 5, dust: 200 * n, boosters: { shower: 1, spark: 1, scope: 1 } };
}

export function openChest(p: Profile, n: number): Reward | null {
  if (!chestsReady(p).includes(n)) return null;
  p.chapters.push(n);
  const r = chapterReward(n);
  applyReward(p, r);
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

export const STAR_ROAD: RoadTier[] = [
  { stars: 5, reward: { gems: 15 }, pass: { skin: 'cosmic', gems: 30 } },
  { stars: 12, reward: { boosters: { shower: 2 } }, pass: { gems: 40 } },
  { stars: 20, reward: { dust: 400 }, pass: { boosters: { shower: 2, spark: 2, scope: 2 } } },
  { stars: 30, reward: { skin: 'rose', gems: 10 }, pass: { gems: 50 } },
  { stars: 42, reward: { gems: 30 }, pass: { dust: 1500 } },
  { stars: 55, reward: { boosters: { spark: 2, scope: 2 } }, pass: { gems: 60 } },
  { stars: 70, reward: { dust: 1200 }, pass: { boosters: { shower: 3, spark: 3, scope: 3 } } },
  { stars: 85, reward: { skin: 'lime', gems: 20 }, pass: { gems: 80 } },
  { stars: 100, reward: { gems: 50 }, pass: { dust: 4000 } },
  { stars: 120, reward: { boosters: { shower: 3, spark: 3, scope: 3 } }, pass: { gems: 100 } },
  { stars: 140, reward: { dust: 3000 }, pass: { boosters: { shower: 5, spark: 5, scope: 5 } } },
  { stars: 165, reward: { skin: 'gold', gems: 40 }, pass: { gems: 120 } },
  { stars: 190, reward: { gems: 80 }, pass: { dust: 8000 } },
  { stars: 220, reward: { dust: 6000, gems: 50 }, pass: { gems: 150 } },
  { stars: 260, reward: { gems: 120 }, pass: { gems: 250 } },
];

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
    applyReward(p, t.reward);
    got.push(t.reward);
  }
  if (p.pass && !p.roadPass.includes(i)) {
    p.roadPass.push(i);
    applyReward(p, t.pass);
    got.push(t.pass);
  }
  return got;
}

/** Total gem value of the pass lane (used for the sales pitch). */
export const PASS_GEMS = STAR_ROAD.reduce((a, t) => a + (t.pass.gems ?? 0), 0);

// ------------------------------------------------------------------ quests
export type QuestEvent = 'throw' | 'win' | 'star' | 'creature' | 'three' | 'booster' | 'collect' | 'land';

export interface QuestDef {
  id: string;
  event: QuestEvent;
  goal: number;
  gems: number;
  text: (goal: number) => string;
  emoji: string;
}

export const QUESTS: QuestDef[] = [
  { id: 'throw25', event: 'throw', goal: 25, gems: 8, emoji: '🪨', text: (g) => t('Fling {n} objects', { n: g }) },
  { id: 'win3', event: 'win', goal: 3, gems: 12, emoji: '🪐', text: (g) => t('Complete {n} planets', { n: g }) },
  { id: 'star6', event: 'star', goal: 6, gems: 15, emoji: '⭐', text: (g) => t('Earn {n} stars', { n: g }) },
  { id: 'creature8', event: 'creature', goal: 8, gems: 10, emoji: '🦊', text: (g) => t('Bring {n} creatures to life', { n: g }) },
  { id: 'three1', event: 'three', goal: 1, gems: 15, emoji: '🌟', text: () => t('Get 3 stars on any planet') },
  { id: 'booster1', event: 'booster', goal: 1, gems: 6, emoji: '🌠', text: () => t('Use a booster') },
  { id: 'collect2', event: 'collect', goal: 2, gems: 8, emoji: '✨', text: (g) => t('Collect stardust {n} times', { n: g }) },
  { id: 'land20', event: 'land', goal: 20, gems: 10, emoji: '🌍', text: (g) => t('Transform {n} regions', { n: g }) },
];
export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
export const QUEST_BONUS: Reward = { gems: 20, boosters: { shower: 1 } };

/** Make sure today's three quests exist. */
export function ensureQuests(p: Profile, day: string) {
  if (p.quests.day === day && p.quests.list.length) return;
  const rnd = rngFrom(`Q-${day}`);
  const pool = [...QUESTS];
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
  p.gems += def.gems;
  return def.gems;
}

export function claimQuestBonus(p: Profile): Reward | null {
  if (p.quests.bonusClaimed || !p.quests.list.length || !p.quests.list.every((q) => q.claimed)) return null;
  p.quests.bonusClaimed = true;
  applyReward(p, QUEST_BONUS);
  return QUEST_BONUS;
}

export function questsClaimable(p: Profile): number {
  let n = p.quests.list.filter((q) => !q.claimed && q.progress >= (QUEST_BY_ID[q.id]?.goal ?? Infinity)).length;
  if (!p.quests.bonusClaimed && p.quests.list.length && p.quests.list.every((q) => q.claimed)) n++;
  return n;
}

// ------------------------------------------------------------------ rewards
export function applyReward(p: Profile, r: Reward) {
  if (r.gems) p.gems += r.gems;
  if (r.dust) p.dust += r.dust;
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
  return out;
}
