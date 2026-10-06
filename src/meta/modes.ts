import { DAILY_REWARD, RUSH_REWARD, CHALLENGE_REWARD } from './tuning';
import { earn } from './wallet';
// Level builders and scoring for the extra modes: Daily Planet, Meteor Rush,
// Zen Garden and Challenge a Friend. All seeded, so no server is needed.
import {
  budgetFor,
  goalsMet,
  greedyScore,
  makeLevel,
  pressureOf,
  rngFrom,
  skyWall,
  solve0,
  solve2,
  starsFor,
  type LevelDef,
} from '../core/levels';
import { rulesForLevel } from '../core/round';
import { TROUBLES, type TroubleId } from '../core/troubles';
import { BIOMES, clonePlanet, lifeScore, settle, type Planet } from '../core/world';
import { dayGap, type Profile } from './profile';
import { t } from '../i18n';
import { addRoadPoints } from './roadpoints';
import { RULES_VERSION } from '../core/rules-version';

export const DAILY_EPOCH = '2026-01-01';
export const RUSH_SECONDS = 60;
export const RUSH_BEST_GEMS = RUSH_REWARD.bestGems;

export function dailyNumber(day: string) {
  return dayGap(DAILY_EPOCH, day) + 1;
}

export function dailyLevel(day: string, taught = 16): LevelDef {
  const L = makeLevel(16, `DAY-${day}`, { rules: rulesForLevel(Math.min(16, taught)) });
  const available = (Object.keys(TROUBLES) as TroubleId[]).filter((id) => TROUBLES[id].debut <= taught);
  if (L.troubles.length && available.length) {
    const first = Math.floor(rngFrom(`DAY-${day}-weather`)() * available.length);
    for (let offset = 0; offset < available.length; offset++) {
      const id = available[(first + offset) % available.length];
      const candidate = { ...L, troubles: L.troubles.map((trouble) => ({ ...trouble, id })) };
      if (dailyPreflight(candidate)) return candidate;
    }
  }
  return L;
}

export function dailyPreflight(level: LevelDef): boolean {
  if (pressureOf(level) > budgetFor(level) || skyWall(level)) return false;
  for (const solve of [solve0, solve2]) {
    const planet = solve(level);
    if (!goalsMet(planet, level.goals) || starsFor(lifeScore(planet), level.stars) < 1) return false;
  }
  return true;
}

/** The card announces only a day whose seeded Trouble passes the same floor used by calendar pre-flight. */
export function dailyWeatherReport(day: string, taught = 16): string | null {
  const level = dailyLevel(day, taught);
  const trouble = level.troubles[0];
  if (!trouble || !dailyPreflight(level)) return null;
  return TROUBLES[trouble.id].name;
}

/** Meteor Rush: same generator, but star targets assume ~22 throws in 60 seconds. */
export function rushLevel(seed: string, taught = 14): LevelDef {
  const L = makeLevel(14, `RUSH-${seed}`, { rules: rulesForLevel(Math.min(14, taught)) });
  const best = greedyScore(L.start, L.queue.concat(L.queue, L.queue), 22);
  const base = lifeScore(L.start);
  const t = (f: number) => Math.max(base + 5, Math.round((base + (best - base) * f) / 5) * 5);
  const stars: [number, number, number] = [t(0.35), t(0.55), t(0.75)];
  if (stars[1] <= stars[0]) stars[1] = stars[0] + 5;
  if (stars[2] <= stars[1]) stars[2] = stars[1] + 5;
  return { ...L, stars, name: 'Beat the clock!', queue: L.queue.concat(L.queue, L.queue, L.queue) };
}

export function zenLevel(saved: Planet | null, taught = 20): LevelDef {
  const L = makeLevel(20, 'ZEN', { rules: rulesForLevel(Math.min(20, taught)) });
  const start = saved ? clonePlanet(saved) : L.start;
  settle(start);
  return { ...L, start, name: 'Your garden', twist: 'none', size: 1, spin: 0.25, queue: L.queue.concat(L.queue, L.queue, L.queue) };
}

// ------------------------------------------------------------------ challenge codes
const LEGACY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ALPHABET = '23456789BCDFGHJKMNPQRSTVWXYZ'; // new seeds avoid vowels

export function newChallengeSeed(rnd = Math.random) {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return s;
}

/** Code = seed + the sender's score, with a check letter so typos are caught. */
export function encodeChallenge(seed: string, score: number) {
  const body = `${RULES_VERSION}${seed}${score.toString(36).toUpperCase()}`;
  return `${RULES_VERSION}-${seed}-${score.toString(36).toUpperCase()}${checkChar(body)}`;
}

function checkChar(body: string) {
  let h = 7;
  for (const c of body) h = (h * 31 + c.charCodeAt(0)) % LEGACY_ALPHABET.length;
  return LEGACY_ALPHABET[h];
}

export function decodeChallenge(code: string): { seed: string; score: number } | null {
  const m = code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .match(/^([0-9]+)-([2-9A-HJKMNP-Z]{5})-([0-9A-Z]+)([2-9A-HJKMNP-Z])$/);
  if (!m) return null;
  const [, version, seed, sc, chk] = m;
  if (Number(version) !== RULES_VERSION || checkChar(`${version}${seed}${sc}`) !== chk) return null;
  const score = parseInt(sc, 36);
  if (!Number.isFinite(score) || score < 0 || score > 100000) return null;
  return { seed, score };
}

export function challengeLevel(seed: string, taught = 14): LevelDef {
  const L = makeLevel(14, `CH-${seed}`, { rules: rulesForLevel(Math.min(14, taught)) });
  return { ...L, name: `Code ${seed}` };
}

// ------------------------------------------------------------------ sharing
/** Spoiler-free emoji strip of the finished planet (Wordle-style). */
export function planetStrip(p: Planet, cells = 8) {
  const out: string[] = [];
  const step = p.sectors.length / cells;
  for (let k = 0; k < cells; k++) {
    const s = p.sectors[Math.floor(k * step)];
    out.push(BIOMES[s.biome].deco || '⬛');
  }
  return out.join('');
}

export function dailyShareText(day: string, stars: number, score: number, planet: Planet) {
  return `Comet Garden #${dailyNumber(day)} ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}\n${planetStrip(planet)}\n🌱 ${t('{n} life', { n: score })}`;
}

export function challengeShareText(code: string, score: number, planet: Planet) {
  return `${t('☄️ I grew {n} life in Comet Garden!', { n: score })}\n${planetStrip(planet)}\n${t('Can you beat me? Open Comet Garden → Modes → Challenge and enter code {code}', { code })}`;
}

// ------------------------------------------------------------------ rewards
export function dailyReward(stars: number) {
  return { gems: DAILY_REWARD.baseGems + stars * DAILY_REWARD.gemsPerStar };
}

export function rushReward(score: number) {
  return { dust: Math.round(score * RUSH_REWARD.dustPerScore) };
}

/** Record a Daily Planet result; returns gems earned (first finish of the day only). */
export function recordDaily(p: Profile, day: string, score: number, stars: number): number {
  const first = p.dailyPlanet.day !== day || !p.dailyPlanet.rewarded;
  if (p.dailyPlanet.day !== day) p.dailyPlanet = { day, best: 0, stars: 0, rewarded: false };
  const newStars = Math.max(0, stars - p.dailyPlanet.stars);
  p.dailyPlanet.best = Math.max(p.dailyPlanet.best, score);
  p.dailyPlanet.stars = Math.max(p.dailyPlanet.stars, stars);
  addRoadPoints(p, newStars, day);
  if (!first) return 0;
  p.dailyPlanet.rewarded = true;
  p.stats.dailies++;
  const g = dailyReward(stars).gems;
  earn(p, 'gems', g, 'daily');
  return g;
}

export function recordRush(p: Profile, score: number): { dust: number; best: boolean } {
  const best = score > p.stats.rushBest;
  p.stats.rushBest = Math.max(p.stats.rushBest, score);
  p.stats.rushPlays++;
  const dust = rushReward(score).dust;
  earn(p, 'dust', dust, 'rush');
  if (best) earn(p, 'gems', RUSH_BEST_GEMS, 'rush');
  return { dust, best };
}

export function recordChallenge(p: Profile, code: string, score: number, stars: number, vs: number): { won: boolean; gems: number } {
  const played = p.challengeLog.some((c) => c.code === code);
  p.challengeLog = [...p.challengeLog.filter((c) => c.code !== code), { code, score, stars, vs }].slice(-30);
  p.stats.challenges++;
  const won = score > vs;
  const gems = won && !played && vs > 0 ? CHALLENGE_REWARD.winGems : 0;
  earn(p, 'gems', gems, 'challenge');
  earn(p, 'dust', CHALLENGE_REWARD.dust, 'challenge');
  return { won, gems };
}

export function rushSeed(now = Date.now()) {
  const r = rngFrom(`R${now}`);
  return newChallengeSeed(r);
}
