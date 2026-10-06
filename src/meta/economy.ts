import { WIN_REWARD, GALAXY_RATE } from './tuning';
import { earn, spend, type SpendSink } from './wallet';
// Pure game-economy rules. Everything here mutates a Profile and returns what
// happened, so the UI can celebrate it and tests can pin it down.
import { BIOMES, SPECIES_BY_ID, type Planet } from '../core/world';
import { DIFFICULTY_DUST, type Difficulty } from '../core/levels';
import { PIGGY_MAX, PIGGY_PER_WIN, PRODUCT_BY_ID, GEMS_PER_NEW_SPECIES } from './config';
import { BOOSTERS, type BoosterId } from './config';
import { today, type GalaxyPlanet, type Profile } from './profile';
import type { HomeworldLevel, WonRoundEvent } from './homeworldTypes';
import { collectAll, pendingHomeProduction } from './homeworld';
import { openVisitor } from './visitors';
import { WELCOME_BACK_GEMS } from './tuning';
import { t } from '../i18n';
import { grantProfileRoadPoints } from './starroad';
import { takeWonContinues } from './continues';

/** Stardust per hour produced by one galaxy planet. */
export function planetRate(g: Pick<GalaxyPlanet, 'stars' | 'species'>) {
  return GALAXY_RATE.base + g.stars * GALAXY_RATE.perStar + g.species.length * GALAXY_RATE.perSpecies;
}

export function galaxyRate(p: Profile) {
  return p.galaxy.reduce((a, g) => a + planetRate(g), 0);
}

// Win fuel is generous enough to fill the Vault; rates keep its collected dust
// secondary to the rewards from playing, even on a quiet Regular day.
export const VAULT_RATES = [10, 15, 20, 25, 30] as const;
export const VAULT_STORAGE_HOURS = [4, 6, 8, 10, 12] as const;
export const VAULT_UPGRADE_COSTS = [1000, 3000, 8000, 20000] as const;
const HOUR = 3_600_000;
const MAX_FUEL = 12 * HOUR;

export function vaultTier(p: Profile): HomeworldLevel {
  return Math.min(5, Math.max(1, Math.floor(p.upgrades.vault) + 1)) as HomeworldLevel;
}

/** The galaxy can grow freely; the Vault's tier limits actual income. */
export function vaultRate(p: Profile): number {
  return Math.min(galaxyRate(p), VAULT_RATES[vaultTier(p) - 1]);
}

export function vaultHours(p: Profile) {
  return VAULT_STORAGE_HOURS[vaultTier(p) - 1];
}

function projectedVault(p: Profile, now: number) {
  const v = p.vault;
  const highWater = Math.max(v.lastTick, p.lastCollect);
  const rate = vaultRate(p);
  const cap = rate * vaultHours(p);
  const elapsed = Math.max(0, now - highWater);
  const remaining = Math.max(0, cap - v.storedDust);
  const used = rate ? Math.min(elapsed, v.bankedProductionMs, (remaining / rate) * HOUR) : 0;
  return {
    storedDust: Math.max(v.storedDust, Math.min(cap, v.storedDust + (used / HOUR) * rate)),
    fuel: v.bankedProductionMs - used,
    tick: Math.max(now, highWater),
  };
}

/** Settle once against a clock high-water mark; a full Vault saves its fuel. */
export function settleVault(p: Profile, now = Date.now()) {
  const next = projectedVault(p, now);
  p.vault.storedDust = next.storedDust;
  p.vault.bankedProductionMs = next.fuel;
  p.vault.lastTick = next.tick;
  p.vault.tier = vaultTier(p);
  p.lastCollect = next.tick;
}

export function fixClock(p: Profile, now = Date.now()) {
  settleVault(p, now);
}

export function pendingDust(p: Profile, now = Date.now()) {
  return Math.floor(projectedVault(p, now).storedDust);
}

/** Time (ms epoch) at which the vault will be full. */
export function vaultFullAt(p: Profile) {
  const rate = vaultRate(p);
  const highWater = Math.max(p.vault.lastTick, p.lastCollect);
  if (!rate) return highWater;
  const needed = (Math.max(0, rate * vaultHours(p) - p.vault.storedDust) / rate) * HOUR;
  return needed > p.vault.bankedProductionMs ? highWater : highWater + needed;
}

export function collectDust(p: Profile, now = Date.now(), multiplier = 1) {
  settleVault(p, now);
  const d = Math.floor(p.vault.storedDust) * multiplier;
  if (d <= 0) return 0;
  earn(p, 'dust', d, 'vault');
  p.vault.storedDust -= Math.floor(p.vault.storedDust);
  return d;
}

export function creditVaultWin(p: Profile, event: WonRoundEvent) {
  if (event.mode !== 'campaign') return;
  settleVault(p, event.at);
  p.vault.bankedProductionMs = Math.min(MAX_FUEL, p.vault.bankedProductionMs + 2 * HOUR);
}

export function buyVaultTier(p: Profile, now = Date.now()): boolean {
  const tier = vaultTier(p);
  if (tier === 5 || !spend(p, 'dust', VAULT_UPGRADE_COSTS[tier - 1], 'upgrade')) return false;
  settleVault(p, now);
  p.upgrades.vault = tier;
  p.vault.tier = vaultTier(p);
  return true;
}

/** Keep paid stock identifiable so a bought helper cannot raise Essence income. */
export function canBuyGemBooster(p: Profile, id: BoosterId): boolean {
  return p.gems >= BOOSTERS[id].gems;
}

export function buyGemBooster(p: Profile, id: BoosterId): boolean {
  if (!canBuyGemBooster(p, id)) return false;
  if (!spend(p, 'gems', BOOSTERS[id].gems, 'booster')) return false;
  p.boosters[id]++;
  p.gemBoosters[id]++;
  return true;
}

export function useStoredBooster(p: Profile, id: BoosterId): boolean | null {
  if (p.boosters[id] <= 0) return null;
  const earned = p.boosters[id] - p.gemBoosters[id];
  p.boosters[id]--;
  if (earned > 0) return false;
  p.gemBoosters[id]--;
  return true;
}

export function awayCollectables(p: Profile, awayMs: number, now = Date.now()) {
  const vault = pendingDust(p, now);
  const home = pendingHomeProduction(p.home, now);
  const visitors = p.visitors.reduce((sum, gift) => sum + gift.dust, 0);
  const vaultFull = vault > 0 && vault >= Math.floor(vaultRate(p) * vaultHours(p));
  const ready = vaultFull || home.dust > 0 || home.gems > 0 || home.boosters > 0 || p.visitors.length > 0;
  return {
    vault,
    home,
    visitors,
    visitorCount: p.visitors.length,
    welcomeGems: welcomeBackGems(p, awayMs, now),
    show: p.tutorial && awayMs >= 30 * 60_000 && (awayMs >= 4 * 3600000 || ready),
  };
}

function welcomeBackGems(p: Profile, awayMs: number, now: number): number {
  // One gift per observed absence, even if the same forward timestamp is replayed.
  return awayMs >= 3 * 86400000 && now >= p.meta.lastSeen && p.meta.lastSeen > (p.meta.lastWelcomeAt ?? 0) ? WELCOME_BACK_GEMS : 0;
}

/** Collect all earnings accumulated while away. */
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
  const welcomeGems = welcomeBackGems(p, awayMs, now);
  if (welcomeGems) {
    earn(p, 'gems', welcomeGems, 'welcome_back');
    p.meta.lastWelcomeAt = now;
  }
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
  /** A continued first clear still opens the planet, with replay-rate Essence. */
  essenceFirstClear: boolean;
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
  day?: string;
  /** Continues in this winning attempt, excluding older failed attempts. */
  continuesUsed?: number;
  /** A gem-bought booster was used in this winning attempt. */
  gemBoosterUsed?: boolean;
}

/** Record a won campaign level. */
export function applyLevelWin(p: Profile, w: WinInput): LevelOutcome {
  const { n, stars, score, planet } = w;
  const difficulty = w.difficulty ?? 'normal';
  const prev = p.stars[n] ?? 0;
  const firstClear = prev === 0;
  const oldCounter = takeWonContinues(p, n);
  const usedContinues = w.continuesUsed ?? oldCounter;
  const essenceFirstClear = firstClear && usedContinues === 0 && !w.gemBoosterUsed;
  const newStars = Math.max(0, stars - prev);
  const dust =
    (WIN_REWARD.baseDust + stars * WIN_REWARD.dustPerStar + (firstClear ? WIN_REWARD.firstClearDust : 0)) * DIFFICULTY_DUST[difficulty] +
    (w.bonusDust ?? 0);
  const gems =
    (stars === 3 && prev < 3 ? WIN_REWARD.threeStarGems : 0) + (firstClear && difficulty === 'super' ? WIN_REWARD.superFirstClearGems : 0);
  p.stars[n] = Math.max(prev, stars);
  if (newStars)
    grantProfileRoadPoints(p, { source: 'campaign', date: w.day ?? today(), earningKey: `planet:${n}:best:${stars}`, delta: newStars });
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
  creditVaultWin(p, { mode: 'campaign', planetKey: `campaign:${n}`, buddySpecies: p.buddy.species, at: Date.now() });
  return { dust, gems, firstClear, essenceFirstClear, newStars, entry, unlockedLevel };
}

/** First-time Lifebook discovery. Returns false if it was already known. */
export function discoverSpecies(p: Profile, id: string): boolean {
  if (p.seen.includes(id)) return false;
  p.seen.push(id);
  earn(p, 'gems', GEMS_PER_NEW_SPECIES, 'discovery');
  return true;
}

type CheckoutMeta = Profile['meta'] & {
  passLooksOnly?: boolean;
  refundQuietUntil?: number;
  revokedProducts?: Record<string, number>;
  productEntitlements?: string[];
};

/** Product IDs, rather than transaction IDs, are the durable look entitlements. */
export function ownsProduct(p: Profile, productId: string): boolean {
  const def = PRODUCT_BY_ID[productId];
  if (!def || def.consumable) return false;
  if (def.key === 'starter') return p.starter;
  if (def.key === 'pass') return p.pass;
  return ((p.meta as CheckoutMeta).productEntitlements ?? []).includes(productId);
}

/** Restore has no receipt and never adds currency. */
export function restoreProduct(p: Profile, productId: string): boolean {
  const def = PRODUCT_BY_ID[productId];
  if (!def || def.consumable) return false;
  const meta = p.meta as CheckoutMeta;
  // Repair older saves that kept the Pass bit but lost its looks-only marker.
  if (def.key === 'pass' && p.pass) meta.passLooksOnly = true;
  if (ownsProduct(p, productId)) return false;
  if (meta.revokedProducts?.[productId]) {
    const { [productId]: _revoked, ...remaining } = meta.revokedProducts;
    meta.revokedProducts = remaining;
  }
  if (def.key === 'starter') {
    p.starter = true;
    if (!p.skins.includes('aurora')) p.skins.push('aurora');
  } else if (def.key === 'pass') {
    p.pass = true;
    meta.passLooksOnly = true;
    if (p.roadRecords?.road00?.claimedPaidTierIds.includes('road00:tier00') && !p.skins.includes('cosmic')) p.skins.push('cosmic');
  } else {
    meta.productEntitlements = [...(meta.productEntitlements ?? []), productId];
  }
  return true;
}

export function refundQuietUntil(p: Profile): number {
  return (p.meta as CheckoutMeta).refundQuietUntil ?? 0;
}

export function noteRefund(p: Profile, at: number): void {
  const meta = p.meta as CheckoutMeta;
  meta.refundQuietUntil = Math.max(meta.refundQuietUntil ?? 0, at + 7 * 86400000);
}

/** A revoked entitlement loses its looks; previously spent rewards stay put. */
export function revokeProduct(p: Profile, productId: string, at = Date.now()): boolean {
  const def = PRODUCT_BY_ID[productId];
  if (!def) return false;
  const meta = p.meta as CheckoutMeta;
  noteRefund(p, at);
  if (def.consumable) return true; // Refunded currency stays spent; announcements still rest.
  meta.revokedProducts = { ...meta.revokedProducts, [productId]: at };
  meta.productEntitlements = (meta.productEntitlements ?? []).filter((id) => id !== productId);
  if (def.key === 'starter') {
    p.starter = false;
    p.skins = p.skins.filter((id) => id !== 'aurora');
    if (p.skin === 'aurora') p.skin = 'classic';
  }
  if (def.key === 'pass') {
    p.pass = false;
    p.skins = p.skins.filter((id) => id !== 'cosmic');
    if (p.skin === 'cosmic') p.skin = 'classic';
  }
  return true;
}

/** Daily login streak. Returns the gift to show, or null if already claimed today. */
/** Apply a completed store transaction exactly once. Returns gems granted or null if ignored. */
export function grantProduct(p: Profile, productId: string, txId: string, piggyQuote?: number): { gems: number; title: string } | null {
  const def = PRODUCT_BY_ID[productId];
  if (!def || p.processedTx.includes(txId)) return null;
  if (!def.consumable && ownsProduct(p, productId)) {
    p.processedTx.push(txId);
    return { gems: 0, title: def.title };
  }
  p.processedTx.push(txId);
  let gems = def.gems;
  switch (def.key) {
    case 'piggy':
      gems = Math.max(0, piggyQuote ?? p.pendingPiggy?.amount ?? p.piggy);
      p.piggy = Math.max(0, p.piggy - gems);
      p.pendingPiggy = null;
      break;
    case 'starter':
      restoreProduct(p, productId);
      break;
    case 'pass':
      restoreProduct(p, productId);
      break;
    default:
      if (!def.consumable) restoreProduct(p, productId);
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
