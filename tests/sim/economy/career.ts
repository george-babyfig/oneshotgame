import { makeLevel, rngFrom, starsFor, type LevelDef } from '../../../src/core/levels';
import { KINDS, type Kind } from '../../../src/core/world';
import { modifiersFor } from '../../../src/core/modifiers';
import { BOOSTERS, SKINS } from '../../../src/meta/config';
import { COSMETICS, STARDUST_COSMETICS, buyCosmetic, owns } from '../../../src/meta/cosmetics';
import { CONSTELLATIONS, essenceDropsFor, addDrops, unlockedConstellation, type Mat } from '../../../src/meta/constellations';
import { stamp } from '../../../src/meta/calendar';
import {
  applyLevelWin,
  buyGemBooster,
  buyVaultTier,
  collectDust,
  discoverSpecies,
  grantProduct,
  useStoredBooster,
} from '../../../src/meta/economy';
import { addTokens, claimEventTier, ensureEvent, eventActive, eventReady, isoWeek, tokensForLand } from '../../../src/meta/events';
import { claimFestival, ensureFestival, festivalActive, festivalReady, spotFestival } from '../../../src/meta/festivals';
import { habitatsReady, claimHabitat } from '../../../src/meta/habitats';
import {
  BUILDING_TYPES,
  BUILDINGS,
  PAINTS,
  applyPaint,
  build,
  canExpand,
  collectAll,
  expand,
  homeUnlocked,
  invite,
  expeditionOptions,
  finishExpedition,
  startExpedition,
  tickBuilds,
  upgrade,
  wearAcc,
  recordHomeworldWin,
} from '../../../src/meta/homeworld';
import { LAB_MAX } from '../../../src/core/labperks';
import {
  LAB_ESSENCE,
  activeForms,
  buildLab,
  canLevelLab,
  labLevel,
  labLevels,
  labPlot,
  levelLab,
  recordLabEvents,
  suggestedFirstLab,
} from '../../../src/meta/labs';
import { firstHourFriend, firstHourLab, firstHourStep } from '../../../src/meta/firsthour';
import { clearLedger, ledger, ledgerSummary, serializedSize } from '../../../src/meta/ledger';
import { dailyLevel, recordDaily } from '../../../src/meta/modes';
import { momentumRoundPerk, momentumWin, momentumLoss } from '../../../src/meta/momentum';
import { defaultProfile, today, type Profile } from '../../../src/meta/profile';
import { applyReward, claimRoad, chestsReady, openChest, roadReady } from '../../../src/meta/progression';
import { claimWish, ensureWishes, recordWishRound, swapWish } from '../../../src/meta/wishes';
import { unlocked } from '../../../src/meta/unlocks';
import { ALBUM_PAGES, claimMilestones, claimPage, pageDone } from '../../../src/meta/stickers';
import { BOSS_REWARD, DYES, HOME_LEVEL_REQUIREMENTS, RESIDENT_ACCS } from '../../../src/meta/tuning';
import { addVisitors, openVisitor } from '../../../src/meta/visitors';
import { clearStop, ensureVoyage, voyageActive, voyageLevel, VOYAGE_LEN } from '../../../src/meta/voyage';
import { spend, type Currency } from '../../../src/meta/wallet';
import { POLICIES, playLevel, type Loadout } from '../harness';
import { buddyShieldFor, suggestedBuddy } from '../../../src/meta/buddy';
import { continueAllowed, recordFail, clearFails, CONTINUE_COST } from '../../../src/meta/continues';
import { vi } from 'vitest';

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1, 12);
const CURRENCIES: Currency[] = ['dust', 'gems', 'stone', 'dew', 'leaf', 'ember', 'frost'];
const IDLE = new Set(['vault', 'homeworld_producer', 'visitor', 'expedition']);
const PAID_LOOKS = COSMETICS.filter((x) => x.source === 'gems');
const purchasableLooks =
  PAID_LOOKS.length +
  STARDUST_COSMETICS.length +
  SKINS.filter((x) => x.gems > 0).length +
  PAINTS.filter((x) => x.gems).length +
  RESIDENT_ACCS.filter((x) => x.gems).length;

export type PlayerType = 'Waiting-room' | 'Regular' | 'Engaged' | 'Weekender' | 'Lapsed' | 'Collector' | 'Payer';
export const PLAYER_TYPES: PlayerType[] = ['Waiting-room', 'Regular', 'Engaged', 'Weekender', 'Lapsed', 'Collector', 'Payer'];
export interface DayRow {
  day: number;
  active: boolean;
  visits: number;
  attempts: number;
  wins: number;
  level: number;
  balance: Record<Currency, number>;
  earned: Record<string, number>;
  spent: Record<string, number>;
  idleDust: number;
  activeDust: number;
  freeGems: number;
  idleActiveRatio: number | null;
  labBlocks: Partial<Record<Kind, string>>;
  homeLevel: number;
}
export interface Career {
  type: PlayerType;
  start: Record<Currency, number>;
  final: Record<Currency, number>;
  earned: Record<string, number>;
  spent: Record<string, number>;
  days: DayRow[];
  exhausted: { lab: number | null; upgrades: number | null; buildings: number | null; looks: number | null };
  maxIdleActiveRatio: number;
  freeGemsPerActiveDay: number;
  activeDays: number;
  ledgerBytes: number;
  ledgerEconomy: Record<string, number>;
  walletCalls: Record<string, number>;
  labDays: Record<Kind, Partial<Record<2 | 3 | 4 | 5, number>>>;
  firstLab: Kind | null;
  replayEssenceWhileLeveling: number;
  firstEssenceWhileLeveling: number;
  replayDropsWhileLeveling: number;
  homeLevelDays: Partial<Record<2 | 3 | 4 | 5, number>>;
  freeBoosters: number;
  greenhouseBoosters: number;
  boosterSources: { greenhouse: number; trip: number; rewards: number; momentum: number };
  reachableSinks: Record<Currency, boolean>;
}

const balances = (p: Profile): Record<Currency, number> =>
  Object.fromEntries(CURRENCIES.map((c) => [c, c === 'dust' || c === 'gems' ? p[c] : (p.mats[c] ?? 0)])) as Record<Currency, number>;

function reachableSinks(p: Profile): Record<Currency, boolean> {
  const matSink = (mat: Mat) =>
    CONSTELLATIONS.some(
      (c, i) => unlockedConstellation(p, i) && c.bundles.some((b) => !p.bundles.includes(b.id) && (b.need[mat] ?? 0) > 0),
    ) || DYES.some((d) => !p.dyes.includes(d.id) && (d.cost?.[mat] ?? 0) > 0);
  return {
    dust: STARDUST_COSMETICS.some((x) => !owns(p, x.id)),
    gems: COSMETICS.some((x) => x.source === 'gems' && !owns(p, x.id)),
    stone: matSink('stone') || p.home.level < 5,
    dew: matSink('dew') || p.home.level < 5,
    leaf: matSink('leaf') || p.home.level < 5,
    ember: matSink('ember') || p.home.level < 5,
    frost: matSink('frost') || p.home.level < 5,
  };
}

const totals = (economy: Record<string, number>, prefix: string) =>
  Object.fromEntries(
    Object.entries(economy)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );

function attemptsFor(type: PlayerType, day: number): number {
  if (type === 'Waiting-room') return 3;
  if (type === 'Engaged') return 13;
  if (type === 'Weekender') return new Date(START + (day - 1) * DAY).getUTCDay() % 6 === 0 ? 15 : 0;
  if (type === 'Lapsed' && day >= 15 && day <= 24) return 0;
  return 6;
}

function round(level: LevelDef, seed: string, loadout?: Loadout) {
  return playLevel(level, POLICIES.decent, rngFrom(seed), undefined, undefined, 0, loadout);
}

function claimReady(p: Profile, date: Date) {
  const before = Object.values(p.boosters).reduce((sum, count) => sum + count, 0);
  for (const chapter of chestsReady(p)) openChest(p, chapter);
  for (const tier of roadReady(p)) claimRoad(p, tier);
  for (const q of p.quests.list) claimWish(p, q.id, today(date));
  if (festivalActive(p)) for (const tier of festivalReady(p, date)) claimFestival(p, tier, date);
  if (eventActive(p)) for (const tier of eventReady(p)) claimEventTier(p, tier);
  for (const habitat of habitatsReady(p)) claimHabitat(p, habitat.id);
  claimMilestones(p);
  for (const page of ALBUM_PAGES) if (pageDone(p, page.id)) claimPage(p, page.id);
  return Object.values(p.boosters).reduce((sum, count) => sum + count, 0) - before;
}

function buyLooks(p: Profile, type: PlayerType, day: number) {
  if (type !== 'Collector') {
    // A regular child samples both look shops while preserving visible Level and Lab goals.
    if (day >= 50 && p.home.level >= 5 && p.dust >= 5_000) {
      const dustLook = STARDUST_COSMETICS[0];
      if (dustLook && !owns(p, dustLook.id)) buyCosmetic(p, dustLook.id);
    }
    if (type !== 'Payer' && day >= 20 && p.gems >= 500) {
      const gemLook = PAID_LOOKS[0];
      if (gemLook && !owns(p, gemLook.id)) buyCosmetic(p, gemLook.id);
    }
    return;
  }
  for (const x of STARDUST_COSMETICS) if (!owns(p, x.id)) buyCosmetic(p, x.id);
  for (const x of PAID_LOOKS) if (!owns(p, x.id)) buyCosmetic(p, x.id);
  for (const skin of SKINS) {
    if (!skin.gems || p.skins.includes(skin.id) || p.gems < skin.gems) continue;
    if (spend(p, 'gems', skin.gems, 'atmosphere')) p.skins.push(skin.id);
  }
  for (const paint of PAINTS) if (paint.gems && !p.home.paints.includes(paint.id)) applyPaint(p, paint.id);
  const resident = p.home.residents[0];
  if (resident)
    for (const acc of RESIDENT_ACCS)
      if (acc.gems && !p.home.accs.includes(acc.id)) {
        wearAcc(p, resident.species, acc.id);
      }
}

function spendPolicy(p: Profile, type: PlayerType, day: number, now: number) {
  if (type === 'Collector') buyLooks(p, type, day);
  const labBlocks: Partial<Record<Kind, string>> = {};
  if (homeUnlocked(p)) {
    while (canExpand(p) === 'ok') expand(p);
    if (firstHourStep(p) === 'lab') {
      const choice = suggestedFirstLab(p);
      const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
      if (plot >= 0) firstHourLab(p, choice, plot, now);
    }
    tickBuilds(p.home, now + 31_000);
    if (firstHourStep(p) === 'friend' && p.seen.length) firstHourFriend(p, now + 31_000);
    // Let the first taught trick be affordable before buying more plots.
    levelLab(p, suggestedFirstLab(p));
    for (const kind of Object.keys(KINDS) as Kind[]) {
      if (labPlot(p, kind) < 0) {
        const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
        if (plot < 0) labBlocks[kind] = 'noplot';
        else {
          const result = buildLab(p, plot, kind, now + 31_000);
          if (result !== 'ok')
            labBlocks[kind] = result === 'busy' || result === 'drones' ? 'drone' : result === 'locked' ? 'untaught' : result;
        }
      }
    }
    tickBuilds(p.home, now + 62_000);
  }
  for (const kind of Object.keys(KINDS) as Kind[]) {
    while (levelLab(p, kind) === 'ok') {}
    if (labLevel(p, kind) < LAB_MAX) {
      const check = canLevelLab(p, kind);
      labBlocks[kind] =
        check === 'essence'
          ? `essence:${LAB_ESSENCE[kind]}`
          : check === 'nobuilding'
            ? (labBlocks[kind] ?? 'noplot')
            : check === 'locked'
              ? 'untaught'
              : check;
    }
  }
  // A Level 4 player with Chapter 8 open saves for the visible Level 5 payment.
  const savingForHome = p.home.level === 4 && p.level >= 81;
  // At these rates tiers 4/5 cannot repay 8k/20k within this career; Regular saves for visible goals.
  if (!savingForHome) while (p.upgrades.vault < 2 && buyVaultTier(p, now)) {}
  // A visible look gets one turn before optional building upgrades after core growth is paid.
  buyLooks(p, type, day);
  const savingForFirstLook = day >= 50 && p.home.level >= 5 && !!STARDUST_COSMETICS[0] && !owns(p, STARDUST_COSMETICS[0].id);
  if (homeUnlocked(p) && !savingForHome && !savingForFirstLook) {
    for (const type of BUILDING_TYPES) {
      if (type === 'lab') continue;
      if (p.home.plots.some((b) => b?.type === type)) continue;
      const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
      if (plot >= 0) build(p, plot, type, now + 62_000);
    }
    for (const type of BUILDING_TYPES) {
      if (type === 'lab') continue;
      while (p.home.plots.filter((b) => b?.type === type).length < BUILDINGS[type].max) {
        const missing = BUILDING_TYPES.filter(
          (id) => id !== 'lab' && !p.home.plots.some((b) => b?.type === id) && BUILDINGS[id].ring <= p.home.level,
        ).length;
        const empty = p.home.plots.filter((b, i) => !b && !p.home.debris.includes(i)).length;
        if (empty <= missing) break;
        const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
        if (plot < 0 || build(p, plot, type, now + 62_000) !== 'ok') break;
      }
    }
    for (let plot = 0; plot < p.home.plots.length; plot++) while (upgrade(p, plot, now + 62_000) === 'ok') {}
    if (p.seen.length && !p.home.residents.length) invite(p, p.seen[0]);
  }
  return labBlocks;
}

function visit(
  p: Profile,
  type: PlayerType,
  day: number,
  visitNo: number,
  budget: number,
  levels: Map<number, LevelDef>,
  voyageLevels: Map<string, LevelDef>,
  bestDrops: Partial<Record<Mat, { n: number; amount: number }>>,
  masterSeed: string,
) {
  const now = START + (day - 1) * DAY + visitNo * 4 * 3_600_000;
  vi.setSystemTime(now);
  const date = new Date(now);
  const dayKey = date.toISOString().slice(0, 10);
  if (p.meta.lastSeen < now) addVisitors(p, now);
  while (openVisitor(p)) {}
  p.meta.lastSeen = now;
  tickBuilds(p.home, now);
  const trip = finishExpedition(p, now);
  collectDust(p, now);
  const greenhouse = collectAll(p, now);
  const greenhouseBoosters = Object.values(greenhouse.boosters).reduce((sum, count) => sum + (count ?? 0), 0);
  const tripBoosters = trip ? Object.values(trip.boosters).reduce((n, count) => n + (count ?? 0), 0) : 0;
  const boosterSources = { greenhouse: greenhouseBoosters, trip: tripBoosters, rewards: 0, momentum: 0 };
  let freeBoosters = greenhouseBoosters + tripBoosters;
  stamp(p, dayKey);
  const wishes = ensureWishes(p, dayKey);
  // A child can swap a card that has stayed out of reach across several visits.
  const stuck = wishes.find((q) => !q.claimed && q.progress === 0 && Date.parse(dayKey) - Date.parse(q.born) >= 3 * DAY);
  if (stuck) swapWish(p, stuck.id, dayKey);
  if (festivalActive(p)) ensureFestival(p, date);
  if (eventActive(p)) ensureEvent(p, isoWeek(date));
  if (voyageActive(p)) ensureVoyage(p, isoWeek(date));
  const firstRewards = claimReady(p, date);
  freeBoosters += firstRewards;
  boosterSources.rewards += firstRewards;
  let wins = 0;
  let replayEssenceWhileLeveling = 0;
  let firstEssenceWhileLeveling = 0;
  let replayDropsWhileLeveling = 0;
  for (let i = 0; i < budget; i++) {
    const shortKind = (Object.keys(KINDS) as Kind[]).find((kind) => canLevelLab(p, kind) === 'essence');
    const replay = shortKind ? bestDrops[LAB_ESSENCE[shortKind]]?.n : undefined;
    const nextHome = p.home.level < 5 ? HOME_LEVEL_REQUIREMENTS[(p.home.level + 1) as 2 | 3 | 4 | 5] : null;
    const shortHomeMat =
      nextHome && p.level > nextHome.chapter * 10
        ? (Object.entries(nextHome.essence) as [Mat, number][]).find(([mat, need]) => (p.mats[mat] ?? 0) < need)?.[0]
        : undefined;
    const n = p.level > 120 ? (replay ?? (shortHomeMat ? bestDrops[shortHomeMat]?.n : undefined) ?? 120) : p.level;
    let level = levels.get(n);
    if (!level) levels.set(n, (level = makeLevel(n, 'PP')));
    let shower = false;
    let gemBoosterUsed = false;
    if (day % 3 === 0 && i === 0) {
      if (!p.boosters.shower && spend(p, 'dust', BOOSTERS.shower.dust, 'booster')) p.boosters.shower++;
      if (p.boosters.shower) {
        p.boosters.shower--;
        shower = true;
        ledger.count('boosters_used');
      }
    }
    const firstCampaignClear = n === p.level && !p.stars[n];
    const availablePerk = momentumRoundPerk(p);
    const perk = firstCampaignClear ? availablePerk : { ...availablePerk, scope: false };
    let spark = perk.spark;
    let scope = perk.scope;
    if (n === p.level && (p.fails[n] ?? 0) > 0 && level.difficulty !== 'normal') {
      for (const id of ['shower', 'spark', 'scope'] as const) {
        if ((id === 'shower' && shower) || (id === 'spark' && spark) || (id === 'scope' && scope)) continue;
        let paid = useStoredBooster(p, id);
        if (paid === null && type === 'Payer' && buyGemBooster(p, id)) paid = useStoredBooster(p, id);
        if (paid === null) continue;
        gemBoosterUsed ||= paid;
        ledger.count('boosters_used');
        if (id === 'shower') shower = true;
        if (id === 'spark') spark = true;
        if (id === 'scope') scope = true;
      }
    }
    const momentumBoosters = Number(perk.spark) + Number(perk.scope);
    freeBoosters += momentumBoosters;
    boosterSources.momentum += momentumBoosters;
    const canPayContinue =
      type === 'Payer' &&
      // The §7.5 payer persona spends on difficult campaign planets.
      level.difficulty !== 'normal' &&
      continueAllowed({
        mode: 'campaign',
        planet: n,
        won: false,
        cleared: !!p.stars[n],
        failsBefore: p.fails[n] ?? 0,
        used: p.continuesUsed[n] ?? 0,
      });
    const continues = canPayContinue ? Math.min(2 - (p.continuesUsed[n] ?? 0), Math.floor(p.gems / CONTINUE_COST)) : 0;
    const buddySpecies = suggestedBuddy(p, level.troubles);
    const result = round(level, `career-${masterSeed === 'default' ? '' : `${masterSeed}-`}${day}-${visitNo}-${i}-${n}`, {
      mods: modifiersFor('campaign', {
        lab: labLevels(p),
        forms: activeForms(p),
        splash: 0,
        extraThrows: shower ? 3 : 0,
        momentum: p.momentum.streak,
        boosters: { shower, spark, scope },
        buddy: buddySpecies ? { species: buddySpecies, acc: '' } : null,
        buddyShield: buddyShieldFor(p, 'campaign', n, buddySpecies),
      }),
      extraThrows: (shower ? 3 : 0) + perk.throws,
      lifeSpark: spark,
      continues,
    });
    if (result.continuesUsed) {
      spend(p, 'gems', CONTINUE_COST * result.continuesUsed, 'continue');
      p.continuesUsed[n] = (p.continuesUsed[n] ?? 0) + result.continuesUsed;
    }
    for (const step of result.labSteps) recordLabEvents(p, step, 'campaign');
    for (let turn = 0; turn < result.totalThrows; turn++) {
      const kind = level.queue[turn % level.queue.length];
      p.flings[kind] = (p.flings[kind] ?? 0) + 1;
    }
    ledger.count('round_started');
    p.stats.plays++;
    p.stats.throws += result.totalThrows;
    if (eventActive(p)) addTokens(p, tokensForLand(ensureEvent(p, isoWeek(date)), result.regions, result.arrivals.length));
    if (!result.stars) {
      ledger.count('round_failed');
      momentumLoss(p, dayKey);
      if (p.level === n) recordFail(p, n);
      continue;
    }
    wins++;
    ledger.count('round_won');
    momentumWin(p, firstCampaignClear, perk.scope);
    if (p.level === n) clearFails(p, n);
    const out = applyLevelWin(p, {
      n,
      stars: result.stars,
      score: result.score,
      planet: result.planet,
      name: level.name,
      hue: level.hue,
      difficulty: level.difficulty,
      // The live results flow pays for throws left after the winning star.
      bonusDust: 0, // The sim never taps Finish early; live rewards only an actual Finish tap.
      continuesUsed: result.continuesUsed,
      gemBoosterUsed,
      day: dayKey,
    });
    recordHomeworldWin(p, { mode: 'campaign', planetKey: `campaign:${n}`, buddySpecies, at: now + i });
    recordWishRound(p, 'campaign', result.planet, dayKey, level.start);
    // A gem continue may finish a new planet, but its Essence uses the replay
    // rate so purchasing throws never increases Lab or Homeworld currency.
    const essenceFirstClear = out.essenceFirstClear;
    const drops = essenceDropsFor(result.planet, result.stars, essenceFirstClear);
    if ((Object.keys(KINDS) as Kind[]).some((kind) => labLevel(p, kind) < LAB_MAX)) {
      const amount = Object.values(drops).reduce((sum, value) => sum + (value ?? 0), 0);
      if (essenceFirstClear) firstEssenceWhileLeveling += amount;
      else {
        replayEssenceWhileLeveling += amount;
        replayDropsWhileLeveling++;
      }
    }
    addDrops(p, drops, essenceFirstClear ? 'material_drop_first_clear' : 'material_drop_replay');
    for (const [mat, amount] of Object.entries(drops) as [Mat, number][])
      if (!bestDrops[mat] || amount > bestDrops[mat]!.amount) bestDrops[mat] = { n, amount };
    for (const species of result.arrivals) {
      discoverSpecies(p, species);
      if (festivalActive(p)) {
        spotFestival(p, date);
      }
    }
    if (eventActive(p)) {
      const event = ensureEvent(p, isoWeek(date));
      if (event.stars) addTokens(p, out.newStars * 4);
    }
    if (n % 10 === 0 && out.firstClear && !p.bosses.includes(n)) {
      p.bosses.push(n);
      applyReward(p, BOSS_REWARD, 'boss');
    }
    const rewards = claimReady(p, date);
    freeBoosters += rewards;
    boosterSources.rewards += rewards;
  }
  if (visitNo === 0 && unlocked(p, 'daily')) {
    const daily = dailyLevel(dayKey);
    const result = round(daily, `daily-${type}-${day}`);
    ledger.count('round_started');
    ledger.count('round_won');
    recordDaily(p, dayKey, result.score, starsFor(result.score, daily.stars));
    recordWishRound(p, 'daily', result.planet, dayKey, daily.start);
  }
  if (voyageActive(p) && budget > 0 && p.voyage.cleared < VOYAGE_LEN) {
    const stop = p.voyage.cleared;
    const key = `${p.voyage.week}-${p.voyage.base}-${stop}`;
    let level = voyageLevels.get(key);
    if (!level) voyageLevels.set(key, (level = voyageLevel(p.voyage.week, p.voyage.base, stop)));
    const result = round(level, `voyage-${type}-${day}-${stop}`, {
      mods: modifiersFor('voyage', { lab: labLevels(p), forms: activeForms(p) }),
      extraThrows: 0,
      lifeSpark: false,
    });
    for (const step of result.labSteps) recordLabEvents(p, step, 'voyage');
    ledger.count('round_started');
    if (result.stars) {
      clearStop(p, stop, result.stars, dayKey);
      recordHomeworldWin(p, { mode: 'voyage', planetKey: `voyage:${key}`, buddySpecies: null, at: now });
      recordWishRound(p, 'voyage', result.planet, dayKey, level.start);
      ledger.count('round_won');
    } else ledger.count('round_failed');
  }
  const lastRewards = claimReady(p, date);
  freeBoosters += lastRewards;
  boosterSources.rewards += lastRewards;
  const labBlocks = spendPolicy(p, type, day, now);
  const nextVisitHours = visitNo < 2 ? 4 : 16;
  const hours = expeditionOptions(p.home)
    .filter((option) => option <= nextVisitHours)
    .at(-1);
  // Paired Regular/Payer players remember one short trip each active day.
  if (hours && p.home.residents[0] && (!['Regular', 'Payer'].includes(type) || visitNo === 0))
    startExpedition(p, p.home.residents[0].species, hours, now);
  return {
    wins,
    labBlocks,
    replayEssenceWhileLeveling,
    firstEssenceWhileLeveling,
    replayDropsWhileLeveling,
    freeBoosters,
    greenhouseBoosters,
    boosterSources,
  };
}

export async function simulate(type: PlayerType, masterSeed = 'default'): Promise<Career> {
  await clearLedger();
  vi.useFakeTimers();
  vi.setSystemTime(START);
  const p = defaultProfile(START);
  const start = balances(p);
  const walletCalls: Record<string, number> = {};
  const originalAdd = ledger.add;
  const spy = vi.spyOn(ledger, 'add').mockImplementation(function (kpi, amount, now) {
    if (kpi.startsWith('earn_') || kpi.startsWith('spend_')) walletCalls[kpi] = (walletCalls[kpi] ?? 0) + amount;
    return originalAdd.call(ledger, kpi, amount, now);
  });
  const days: DayRow[] = [];
  const levels = new Map<number, LevelDef>();
  const voyageLevels = new Map<string, LevelDef>();
  const bestDrops: Partial<Record<Mat, { n: number; amount: number }>> = {};
  const exhausted = { lab: null, upgrades: null, buildings: null, looks: null } as Career['exhausted'];
  const labDays = Object.fromEntries((Object.keys(KINDS) as Kind[]).map((kind) => [kind, {}])) as Career['labDays'];
  const homeLevelDays: Career['homeLevelDays'] = {};
  let replayEssenceWhileLeveling = 0;
  let firstEssenceWhileLeveling = 0;
  let replayDropsWhileLeveling = 0;
  let freeBoosters = 0;
  let greenhouseBoosters = 0;
  const boosterSources = { greenhouse: 0, trip: 0, rewards: 0, momentum: 0 };
  let day60Sinks: Career['reachableSinks'] | null = null;
  try {
    for (let day = 1; day <= 90; day++) {
      const budget = attemptsFor(type, day);
      const visits = budget ? (type === 'Weekender' ? 1 : 3) : 0;
      let wins = 0;
      let labBlocks: DayRow['labBlocks'] = {};
      const before = { ...ledgerSummary(START + (day - 1) * DAY).economy };
      vi.setSystemTime(START + (day - 1) * DAY);
      if (type === 'Payer' && day === 1) {
        grantProduct(p, 'com.pocketplanet.game.startercrew', 'sim-starter-crew');
        grantProduct(p, 'com.pocketplanet.game.road00', 'sim-cosmic-road');
      }
      if (type === 'Payer' && day % 7 === 1) grantProduct(p, 'com.pocketplanet.game.gems500', `sim-gems-${day}`);
      for (let v = 0; v < visits; v++) {
        const visitResult = visit(p, type, day, v, budget / visits, levels, voyageLevels, bestDrops, masterSeed);
        wins += visitResult.wins;
        replayEssenceWhileLeveling += visitResult.replayEssenceWhileLeveling;
        firstEssenceWhileLeveling += visitResult.firstEssenceWhileLeveling;
        replayDropsWhileLeveling += visitResult.replayDropsWhileLeveling;
        freeBoosters += visitResult.freeBoosters;
        greenhouseBoosters += visitResult.greenhouseBoosters;
        for (const key of Object.keys(boosterSources) as (keyof typeof boosterSources)[])
          boosterSources[key] += visitResult.boosterSources[key];
        labBlocks = visitResult.labBlocks;
      }
      const now = START + (day - 1) * DAY + (visits ? (visits - 1) * 4 * 3_600_000 : 0);
      vi.setSystemTime(now);
      const economy = ledgerSummary(now).economy;
      const delta = Object.fromEntries(Object.entries(economy).map(([k, value]) => [k, value - (before[k] ?? 0)]));
      const earned = totals(delta, 'earn_');
      const spent = totals(delta, 'spend_');
      const idleDust = Object.entries(earned)
        .filter(([k]) => k.startsWith('dust_') && IDLE.has(k.slice(5)))
        .reduce((n, [, v]) => n + v, 0);
      const activeDust = Object.entries(earned)
        .filter(([k]) => k.startsWith('dust_') && !IDLE.has(k.slice(5)))
        .reduce((n, [, v]) => n + v, 0);
      const freeGems = Object.entries(earned)
        .filter(([k]) => k.startsWith('gems_') && k !== 'gems_iap')
        .reduce((n, [, v]) => n + v, 0);
      days.push({
        day,
        active: !!budget,
        visits,
        attempts: budget,
        wins,
        level: p.level,
        balance: balances(p),
        earned,
        spent,
        idleDust,
        activeDust,
        freeGems,
        idleActiveRatio: activeDust ? idleDust / activeDust : idleDust ? Infinity : null,
        labBlocks,
        homeLevel: p.home.level,
      });
      if (day === 60) day60Sinks = reachableSinks(p);
      for (const level of [2, 3, 4, 5] as const)
        if (p.home.level >= level && homeLevelDays[level] === undefined) homeLevelDays[level] = day;
      for (const kind of Object.keys(KINDS) as Kind[])
        for (const level of [2, 3, 4, 5] as const)
          if (labLevel(p, kind) >= level && labDays[kind][level] === undefined) labDays[kind][level] = day;
      if (exhausted.lab === null && (Object.keys(KINDS) as Kind[]).every((k) => labLevel(p, k) === LAB_MAX)) exhausted.lab = day;
      if (exhausted.upgrades === null && p.upgrades.vault === 4) exhausted.upgrades = day;
      if (
        exhausted.buildings === null &&
        BUILDING_TYPES.filter((id) => id !== 'lab').every((id) => p.home.plots.some((b) => b?.type === id))
      )
        exhausted.buildings = day;
      if (
        exhausted.looks === null &&
        PAID_LOOKS.every((x) => owns(p, x.id)) &&
        SKINS.filter((x) => x.gems).every((x) => p.skins.includes(x.id)) &&
        PAINTS.filter((x) => x.gems).every((x) => p.home.paints.includes(x.id)) &&
        RESIDENT_ACCS.filter((x) => x.gems).every((x) => p.home.accs.includes(x.id))
      )
        exhausted.looks = day;
    }
    const summary = ledgerSummary(START + 89 * DAY);
    const active = days.filter((x) => x.active);
    const career: Career = {
      type,
      start,
      final: balances(p),
      earned: totals(summary.economy, 'earn_'),
      spent: totals(summary.economy, 'spend_'),
      days,
      exhausted,
      maxIdleActiveRatio: Math.max(...days.filter((x) => x.active).map((x) => x.idleActiveRatio ?? 0)),
      freeGemsPerActiveDay: active.reduce((n, x) => n + x.freeGems, 0) / active.length,
      activeDays: active.length,
      ledgerBytes: serializedSize(),
      ledgerEconomy: { ...summary.economy },
      walletCalls,
      labDays,
      firstLab: p.home.plots.find((building) => building?.type === 'lab')?.kind ?? null,
      replayEssenceWhileLeveling,
      firstEssenceWhileLeveling,
      replayDropsWhileLeveling,
      homeLevelDays,
      freeBoosters,
      greenhouseBoosters,
      boosterSources,
      reachableSinks: day60Sinks ?? reachableSinks(p),
    };
    for (const currency of CURRENCIES) {
      const total = (rows: Record<string, number>) =>
        Object.entries(rows)
          .filter(([key]) => key.startsWith(`${currency}_`))
          .reduce((sum, [, amount]) => sum + amount, 0);
      if (total(career.earned) - total(career.spent) !== career.final[currency] - career.start[currency])
        throw new Error(`${type}: ${currency} wallet does not reconcile`);
    }
    if (
      Object.entries(career.ledgerEconomy).some(([key, value]) => career.walletCalls[key] !== value) ||
      Object.entries(career.walletCalls).some(([key, value]) => career.ledgerEconomy[key] !== value)
    )
      throw new Error(`${type}: ledger does not reconcile`);
    return career;
  } finally {
    spy.mockRestore();
    vi.useRealTimers();
  }
}

export function exchangeRates() {
  const comparable = Object.entries(BOOSTERS).map(([id, b]) => ({
    channel: `booster:${id}`,
    gems: b.gems,
    dust: b.dust,
    dustPerGem: b.dust / b.gems,
  }));
  const median = [...comparable.map((x) => x.dustPerGem)].sort((a, b) => a - b)[1];
  return {
    median,
    channels: [
      ...comparable.map((x) => ({ ...x, flag: x.dustPerGem > 2 * median })),
      ...PAID_LOOKS.map((x) => ({ channel: `look:${x.id}`, gems: x.gems ?? 0, dust: null, dustPerGem: null, flag: false })),
      ...STARDUST_COSMETICS.map((x) => ({ channel: `look:${x.id}`, gems: null, dust: x.dust ?? 0, dustPerGem: null, flag: false })),
      ...SKINS.filter((x) => x.gems).map((x) => ({
        channel: `atmosphere:${x.id}`,
        gems: x.gems,
        dust: null,
        dustPerGem: null,
        flag: false,
      })),
      ...PAINTS.filter((x) => x.gems).map((x) => ({
        channel: `paint:${x.id}`,
        gems: x.gems ?? 0,
        dust: null,
        dustPerGem: null,
        flag: false,
      })),
      ...RESIDENT_ACCS.filter((x) => x.gems).map((x) => ({
        channel: `accessory:${x.id}`,
        gems: x.gems ?? 0,
        dust: null,
        dustPerGem: null,
        flag: false,
      })),
      { channel: 'continue', gems: 50, dust: null, dustPerGem: null, flag: false },
      { channel: 'stardust-for-gems', gems: 0, dust: null, dustPerGem: null, flag: false },
    ],
    note: `${purchasableLooks} previewable looks; no current stardust-for-gems channel or dust alternative for gem-only sinks.`,
  };
}
