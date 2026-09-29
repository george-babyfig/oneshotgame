import { WIN_REWARD, GALAXY_RATE, STARTER_BOOSTERS } from './tuning';
import { earn, spend, type SpendSink } from './wallet';
// Pure game-economy rules. Everything here mutates a Profile and returns what
// happened, so the UI can celebrate it and tests can pin it down.
import { BIOMES, SPECIES_BY_ID, type Planet } from '../core/world';
import { DIFFICULTY_DUST, type Difficulty } from '../core/levels';
import { PIGGY_MAX, PIGGY_PER_WIN, PRODUCT_BY_ID, VAULT_HOURS, GEMS_PER_NEW_SPECIES } from './config';
import { type GalaxyPlanet, type Profile } from './profile';
import { questEvent, type QuestEvent } from './progression';
import { collectAll, pendingHomeProduction } from './homeworld';
import { openVisitor } from './visitors';
import { WELCOME_BACK_GEMS } from './tuning';
import { t } from '../i18n';
import { unlocked } from './unlocks';

/** Stardust per hour produced by one galaxy planet. */
export function planetRate(g: Pick<GalaxyPlanet, 'stars' | 'species'>) {
  return GALAXY_RATE.base + g.stars * GALAXY_RATE.perStar + g.species.length * GALAXY_RATE.perSpecies;
}

export function galaxyRate(p: Profile) {
  return p.galaxy.reduce((a, g) => a + planetRate(g), 0);
}

export function vaultHours(p: Profile) {
  return VAULT_HOURS[Math.min(p.upgrades.vault, VAULT_HOURS.length - 1)];
}

/** Keep the last collect time as a high-water mark through clock rollbacks. */
export function fixClock(p: Profile, now = Date.now()) {
  if (p.lastCollect > now) return;
}

export function pendingDust(p: Profile, now = Date.now()) {
  const hours = Math.min(vaultHours(p), Math.max(0, now - p.lastCollect) / 3600000);
  return Math.floor(galaxyRate(p) * hours);
}

/** Time (ms epoch) at which the vault will be full. */
export function vaultFullAt(p: Profile) {
  return p.lastCollect + vaultHours(p) * 3600000;
}

export function collectDust(p: Profile, now = Date.now(), multiplier = 1) {
  const d = pendingDust(p, now) * multiplier;
  if (d <= 0) return 0;
  earn(p, 'dust', d, 'vault');
  p.lastCollect = now;
  track(p, 'collect');
  return d;
}

export function awayCollectables(p: Profile, awayMs: number, now = Date.now()) {
  const vault = pendingDust(p, now);
  const home = pendingHomeProduction(p.home, now);
  const visitors = p.visitors.reduce((sum, gift) => sum + gift.dust, 0);
  const vaultFull = galaxyRate(p) > 0 && now >= vaultFullAt(p);
  const ready = vaultFull || home.dust > 0 || home.gems > 0 || home.boosters > 0 || p.visitors.length > 0;
  return {
    vault,
    home,
    visitors,
    visitorCount: p.visitors.length,
    welcomeGems: awayMs >= 3 * 86400000 ? WELCOME_BACK_GEMS : 0,
    show: p.tutorial && awayMs >= 30 * 60_000 && (awayMs >= 4 * 3600000 || ready),
  };
}

/** The card gives each engine one collection, and one quest tick for the tap. */
export function collectAway(p: Profile, awayMs: number, now = Date.now()) {
  const vault = collectDust(p, now);
  const home = collectAll(p, now);
  let visitors = 0;
  let visitorCount = 0;
  while (p.visitors.length) {
    const gift = openVisitor(p);
    if (!gift) break;
    visitors += gift.dust;
    visitorCount++;
  }
  if (!vault && (home.dust || home.gems || Object.keys(home.boosters).length || visitorCount)) track(p, 'collect');
  const welcomeGems = awayMs >= 3 * 86400000 ? WELCOME_BACK_GEMS : 0;
  if (welcomeGems) earn(p, 'gems', welcomeGems, 'welcome_back');
  return { vault, home, visitors, visitorCount, welcomeGems };
}

/** Three stable, gentle facts for a long absence. */
export function awayRecapLines(p: Profile, awayMs: number, now = Date.now()): [string, string, string] {
  const friend = p.home.residents.find((resident) => resident.species !== p.home.expedition?.species);
  const pending = awayCollectables(p, awayMs, now);
  return [
    t('Collect all: ✨{dust} · 💎{gems} · {boosters} boosters · {keepsakes} keepsakes', {
      dust: (pending.vault + pending.home.dust + pending.visitors).toLocaleString('en-US'),
      gems: (pending.home.gems + pending.welcomeGems).toLocaleString('en-US'),
      boosters: pending.home.boosters,
      keepsakes: new Set(p.visitors.map((gift) => gift.memento).filter((id): id is string => !!id && !p.mementos.includes(id))).size,
    }),
    friend
      ? t('{name} is waiting in your Den', { name: t(SPECIES_BY_ID[friend.species]?.name ?? 'Someone') })
      : t('Your creatures are safe at home'),
    t("You're on planet {n}", { n: p.level }),
  ];
}

export interface LevelOutcome {
  dust: number;
  gems: number;
  firstClear: boolean;
  newStars: number; // stars gained over previous best
  entry: GalaxyPlanet;
  unlockedLevel: boolean;
}

export function planetColors(planet: Planet) {
  const counts = new Map<string, number>();
  for (const s of planet.sectors) if (s.biome !== 'barren') counts.set(BIOMES[s.biome].color, (counts.get(BIOMES[s.biome].color) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([c]) => c);
}

export interface WinInput {
  n: number;
  stars: number;
  score: number;
  planet: Planet;
  name: string;
  hue: number;
  difficulty?: Difficulty;
  /** Meteor-finale stardust for unused throws. */
  bonusDust?: number;
}

/** Record a won campaign level. */
export function applyLevelWin(p: Profile, w: WinInput): LevelOutcome {
  const { n, stars, score, planet } = w;
  const difficulty = w.difficulty ?? 'normal';
  const prev = p.stars[n] ?? 0;
  const firstClear = prev === 0;
  const newStars = Math.max(0, stars - prev);
  const dust =
    (WIN_REWARD.baseDust + stars * WIN_REWARD.dustPerStar + (firstClear ? WIN_REWARD.firstClearDust : 0)) * DIFFICULTY_DUST[difficulty] +
    (w.bonusDust ?? 0);
  const gems =
    (stars === 3 && prev < 3 ? WIN_REWARD.threeStarGems : 0) + (firstClear && difficulty === 'super' ? WIN_REWARD.superFirstClearGems : 0);
  p.stars[n] = Math.max(prev, stars);
  earn(p, 'dust', dust, firstClear ? 'first_clear' : 'level_win');
  earn(p, 'gems', gems, firstClear ? 'first_clear' : 'level_win');
  p.piggy = Math.min(PIGGY_MAX, p.piggy + PIGGY_PER_WIN);
  p.stats.wins++;
  if (difficulty !== 'normal') p.stats.hardWins++;
  p.stats.bestLife = Math.max(p.stats.bestLife, score);
  if (stars === 3 && prev < 3) p.stats.threeStars++;
  const entry: GalaxyPlanet = {
    n,
    name: w.name,
    hue: w.hue,
    stars: p.stars[n],
    species: [...planet.speciesFound],
    life: score,
    colors: planetColors(planet),
  };
  const i = p.galaxy.findIndex((g) => g.n === n);
  if (i >= 0) {
    if (score >= p.galaxy[i].life) p.galaxy[i] = entry;
    else p.galaxy[i].stars = p.stars[n];
  } else {
    if (!p.galaxy.length) p.lastCollect = Date.now();
    p.galaxy.push(entry);
  }
  const unlockedLevel = n === p.level;
  if (unlockedLevel) p.level++;
  track(p, 'win');
  if (newStars) track(p, 'star', newStars);
  if (stars === 3) track(p, 'three');
  return { dust, gems, firstClear, newStars, entry, unlockedLevel };
}

/** First-time Lifebook discovery. Returns false if it was already known. */
export function discoverSpecies(p: Profile, id: string): boolean {
  if (p.seen.includes(id)) return false;
  p.seen.push(id);
  earn(p, 'gems', GEMS_PER_NEW_SPECIES, 'discovery');
  return true;
}

/** Daily login streak. Returns the gift to show, or null if already claimed today. */
/** Apply a completed store transaction exactly once. Returns gems granted or null if ignored. */
export function grantProduct(p: Profile, productId: string, txId: string): { gems: number; title: string } | null {
  const def = PRODUCT_BY_ID[productId];
  if (!def || p.processedTx.includes(txId)) return null;
  p.processedTx = [...p.processedTx.slice(-200), txId];
  let gems = def.gems;
  switch (def.key) {
    case 'piggy':
      gems = p.piggy;
      p.piggy = 0;
      break;
    case 'starter':
      if (p.starter) gems = 0;
      else for (const k of Object.keys(p.boosters) as (keyof Profile['boosters'])[]) p.boosters[k] += STARTER_BOOSTERS;
      p.starter = true;
      if (!p.skins.includes('aurora')) p.skins.push('aurora');
      break;
    case 'pass':
      if (p.pass) gems = 0;
      p.pass = true;
      break;
  }
  earn(p, 'gems', gems, 'iap');
  return { gems, title: def.title };
}

export function spendGems(p: Profile, n: number, sink: SpendSink = 'generic_spend') {
  return spend(p, 'gems', n, sink);
}

export function spendDust(p: Profile, n: number, sink: SpendSink = 'generic_spend') {
  return spend(p, 'dust', n, sink);
}

/** Quest tracking helper (keeps call sites short). */
export function track(p: Profile, ev: QuestEvent, amount = 1) {
  return unlocked(p, 'quests') ? questEvent(p, ev, amount) : [];
}
