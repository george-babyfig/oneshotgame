import { makeLevel, type LevelDef } from '../core/levels';
import { rulesForLevel } from '../core/round';
import { t } from '../i18n';
import type { Profile } from './profile';

export const REMIX_RULES = 1;

export interface RemixChapter {
  v: number;
  best: number[];
  /** A zero-star try still earns the outline frame. */
  played?: boolean[];
}

export type RemixFrame = 'none' | 'outline' | 'silver' | 'gold';

export const REMIX_TITLES = [
  { stars: 15, title: 'Twist Tinkerer' },
  { stars: 60, title: 'Sky Reimaginer' },
  { stars: 150, title: 'Comet Gardener' },
] as const;

export function remixLevel(n: number, p?: Profile): LevelDef {
  const taught = p ? Math.max(1, p.level - 1) : n;
  const level = makeLevel(n, 'RX', {
    goals: true,
    boss: n % 10 === 0,
    remix: true,
    rules: rulesForLevel(n, 'remix', taught),
  });
  const classic = makeLevel(n);
  return { ...level, name: classic.name, hue: classic.hue };
}

export function remixUnlocked(p: Profile, chapter: number): boolean {
  return Number.isInteger(chapter) && chapter > 0 && p.level > chapter * 10;
}

function chapterData(p: Profile, chapter: number): RemixChapter | undefined {
  const value: unknown = p.remix?.[chapter];
  if (Array.isArray(value)) return { v: REMIX_RULES, best: value };
  if (!value || typeof value !== 'object') return undefined;
  const data = value as RemixChapter;
  return { v: Number.isInteger(data.v) ? data.v : REMIX_RULES, best: Array.isArray(data.best) ? data.best : [], played: data.played };
}

export function remixStars(p: Profile, chapter: number): number[] {
  const data = chapterData(p, chapter);
  return Array.from({ length: 10 }, (_, slot) => Math.max(0, Math.min(3, Math.floor(Number(data?.best[slot]) || 0))));
}

export function remixFrame(p: Profile, chapter: number): RemixFrame {
  const stars = remixStars(p, chapter);
  if (stars.every((count) => count === 3)) return 'gold';
  if (stars.every((count) => count >= 1)) return 'silver';
  const played = chapterData(p, chapter)?.played;
  return stars.some(Boolean) || played?.some(Boolean) ? 'outline' : 'none';
}

export function remixTotal(p: Profile): number {
  return Object.keys(p.remix ?? {}).reduce((sum, key) => sum + remixStars(p, Number(key)).reduce((a, b) => a + b, 0), 0);
}

export function recordRemix(p: Profile, n: number, stars: number): { improved: boolean; frame: RemixFrame; newTitles: string[] } {
  const chapter = Math.ceil(n / 10);
  if (!Number.isInteger(n) || n < 1 || !remixUnlocked(p, chapter)) return { improved: false, frame: remixFrame(p, chapter), newTitles: [] };
  const beforeFrame = remixFrame(p, chapter);
  const beforeTotal = remixTotal(p);
  const best = remixStars(p, chapter);
  const slot = (n - 1) % 10;
  const prior = best[slot];
  best[slot] = Math.max(prior, Math.max(0, Math.min(3, Math.floor(Number(stars) || 0))));
  const old = chapterData(p, chapter);
  const played = Array.from({ length: 10 }, (_, i) => !!old?.played?.[i] || best[i] > 0 || i === slot);
  p.remix[chapter] = { v: REMIX_RULES, best, played };
  const frame = remixFrame(p, chapter);
  const newTitles: string[] = [];
  if (beforeFrame !== 'silver' && beforeFrame !== 'gold' && (frame === 'silver' || frame === 'gold'))
    newTitles.push(t('Chapter {n} Remixed', { n: chapter }));
  const total = remixTotal(p);
  for (const title of REMIX_TITLES) if (beforeTotal < title.stars && total >= title.stars) newTitles.push(t(title.title));
  return { improved: best[slot] > prior, frame, newTitles };
}
