import { makeLevel, rngFrom, starsFor, type LevelDef } from '../../../src/core/levels';
import { KINDS, type Kind } from '../../../src/core/world';
import { modifiersFor } from '../../../src/core/modifiers';
import { BOOSTERS, SKINS, UPGRADES, type UpgradeId } from '../../../src/meta/config';
import { COSMETICS, buyCosmetic, owns } from '../../../src/meta/cosmetics';
import { essenceDropsFor, addDrops, type Mat } from '../../../src/meta/constellations';
import { stamp } from '../../../src/meta/calendar';
import { applyLevelWin, collectDust, discoverSpecies, grantProduct } from '../../../src/meta/economy';
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
  speedUpBuilds,
  tickBuilds,
  upgrade,
  wearAcc,
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
import { momentumWin, momentumLoss } from '../../../src/meta/momentum';
import { defaultProfile, today, type Profile } from '../../../src/meta/profile';
import { applyReward, claimRoad, chestsReady, openChest, roadReady } from '../../../src/meta/progression';
import { claimWish, ensureWishes, recordWishRound, swapWish } from '../../../src/meta/wishes';
import { unlocked } from '../../../src/meta/unlocks';
import { ALBUM_PAGES, claimMilestones, claimPage, pageDone } from '../../../src/meta/stickers';
import { BOSS_REWARD, RESIDENT_ACCS } from '../../../src/meta/tuning';
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
const IDLE = new Set(['vault', 'homeworld_producer', 'visitor']);
const PAID_LOOKS = COSMETICS.filter((x) => x.source === 'gems');
const purchasableLooks =
  PAID_LOOKS.length +
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
}

const balances = (p: Profile): Record<Currency, number> =>
  Object.fromEntries(CURRENCIES.map((c) => [c, c === 'dust' || c === 'gems' ? p[c] : (p.mats[c] ?? 0)])) as Record<Currency, number>;

const totals = (economy: Record<string, number>, prefix: string) =>
  Object.fromEntries(
    Object.entries(economy)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );

function attemptsFor(type: PlayerType, day: number): number {
  if (type === 'Waiting-room') return 3;
  if (type === 'Engaged') return 12;
  if (type === 'Weekender') return new Date(START + (day - 1) * DAY).getUTCDay() % 6 === 0 ? 15 : 0;
  if (type === 'Lapsed' && day >= 15 && day <= 24) return 0;
  return 6;
}

function round(level: LevelDef, seed: string, loadout?: Loadout) {
  return playLevel(level, POLICIES.decent, rngFrom(seed), undefined, undefined, 0, loadout);
}

function claimReady(p: Profile, date: Date) {
  for (const chapter of chestsReady(p)) openChest(p, chapter);
  for (const tier of roadReady(p)) claimRoad(p, tier);
  for (const q of p.quests.list) claimWish(p, q.id, today(date));
  if (festivalActive(p)) for (const tier of festivalReady(p, date)) claimFestival(p, tier, date);
  if (eventActive(p)) for (const tier of eventReady(p)) claimEventTier(p, tier);
  for (const habitat of habitatsReady(p)) claimHabitat(p, habitat.id);
  claimMilestones(p);
  for (const page of ALBUM_PAGES) if (pageDone(p, page.id)) claimPage(p, page.id);
}

function buyLooks(p: Profile) {
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
  if (type === 'Collector') buyLooks(p);
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
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    const costs = UPGRADES[id].costs;
    while (p.upgrades[id] < costs.length && spend(p, 'dust', costs[p.upgrades[id]], 'upgrade')) p.upgrades[id]++;
  }
  if (homeUnlocked(p)) {
    for (const type of BUILDING_TYPES) {
      if (type === 'lab' || type === 'mill' || type === 'grove' || type === 'observatory') continue;
      if (p.home.plots.some((b) => b?.type === type)) continue;
      const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
      if (plot >= 0) build(p, plot, type, now + 62_000);
    }
    for (const type of BUILDING_TYPES) {
      if (type === 'lab' || type === 'mill' || type === 'grove' || type === 'observatory') continue;
      while (p.home.plots.filter((b) => b?.type === type).length < BUILDINGS[type].max) {
        const missing = BUILDING_TYPES.filter(
          (id) =>
            id !== 'lab' &&
            id !== 'mill' &&
            id !== 'grove' &&
            id !== 'observatory' &&
            !p.home.plots.some((b) => b?.type === id) &&
            BUILDINGS[id].ring <= p.home.ring,
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
  buyLooks(p);
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
  collectDust(p, now);
  collectAll(p, now);
  stamp(p, dayKey);
  const wishes = ensureWishes(p, dayKey);
  // A child can swap a card that has stayed out of reach across several visits.
  const stuck = wishes.find((q) => !q.claimed && q.progress === 0 && Date.parse(dayKey) - Date.parse(q.born) >= 3 * DAY);
  if (stuck) swapWish(p, stuck.id, dayKey);
  if (festivalActive(p)) ensureFestival(p, date);
  if (eventActive(p)) ensureEvent(p, isoWeek(date));
  if (voyageActive(p)) ensureVoyage(p, isoWeek(date));
  claimReady(p, date);
  let wins = 0;
  let replayEssenceWhileLeveling = 0;
  let firstEssenceWhileLeveling = 0;
  let replayDropsWhileLeveling = 0;
  for (let i = 0; i < budget; i++) {
    const shortKind = (Object.keys(KINDS) as Kind[]).find((kind) => canLevelLab(p, kind) === 'essence');
    const replay = shortKind ? bestDrops[LAB_ESSENCE[shortKind]]?.n : undefined;
    const n = p.level > 120 ? (replay ?? 120) : p.level;
    let level = levels.get(n);
    if (!level) levels.set(n, (level = makeLevel(n, 'PP')));
    let shower = false;
    if (day % 3 === 0 && i === 0) {
      if (!p.boosters.shower && spend(p, 'dust', BOOSTERS.shower.dust, 'booster')) p.boosters.shower++;
      if (p.boosters.shower) {
        p.boosters.shower--;
        shower = true;
        ledger.count('boosters_used');
      }
    }
    const canPayContinue =
      type === 'Payer' &&
      continueAllowed({
        mode: 'campaign',
        planet: n,
        won: false,
        cleared: !!p.stars[n],
        failsBefore: p.fails[n] ?? 0,
        used: 0,
      });
    const continues = canPayContinue ? Math.min(2, Math.floor(p.gems / CONTINUE_COST)) : 0;
    const buddySpecies = suggestedBuddy(p, level.troubles);
    const result = round(level, `career-${masterSeed === 'default' ? '' : `${masterSeed}-`}${day}-${visitNo}-${i}-${n}`, {
      mods: modifiersFor('campaign', {
        lab: labLevels(p),
        forms: activeForms(p),
        splash: p.upgrades.splash,
        extraThrows: p.upgrades.throws,
        momentum: p.momentum.streak,
        boosters: { shower, spark: false, scope: false },
        buddy: buddySpecies ? { species: buddySpecies, acc: '' } : null,
        buddyShield: buddyShieldFor(p, 'campaign', n, buddySpecies),
      }),
      extraThrows: p.upgrades.throws + (shower ? 3 : 0),
      lifeSpark: false,
      continues,
    });
    if (result.continuesUsed) spend(p, 'gems', CONTINUE_COST * result.continuesUsed, 'continue');
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
    momentumWin(p);
    if (p.level === n) clearFails(p, n);
    const out = applyLevelWin(p, {
      n,
      stars: result.stars,
      score: result.score,
      planet: result.planet,
      name: level.name,
      hue: level.hue,
      difficulty: level.difficulty,
      day: dayKey,
    });
    recordWishRound(p, 'campaign', result.planet, dayKey, level.start);
    const drops = essenceDropsFor(result.planet, result.stars, out.firstClear);
    if ((Object.keys(KINDS) as Kind[]).some((kind) => labLevel(p, kind) < LAB_MAX)) {
      const amount = Object.values(drops).reduce((sum, value) => sum + (value ?? 0), 0);
      if (out.firstClear) firstEssenceWhileLeveling += amount;
      else {
        replayEssenceWhileLeveling += amount;
        replayDropsWhileLeveling++;
      }
    }
    addDrops(p, drops, out.firstClear ? 'material_drop_first_clear' : 'material_drop_replay');
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
    if (homeUnlocked(p)) speedUpBuilds(p.home, undefined, now);
    claimReady(p, date);
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
      recordWishRound(p, 'voyage', result.planet, dayKey, level.start);
      ledger.count('round_won');
    } else ledger.count('round_failed');
  }
  claimReady(p, date);
  const labBlocks = spendPolicy(p, type, day, now);
  return { wins, labBlocks, replayEssenceWhileLeveling, firstEssenceWhileLeveling, replayDropsWhileLeveling };
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
  let replayEssenceWhileLeveling = 0;
  let firstEssenceWhileLeveling = 0;
  let replayDropsWhileLeveling = 0;
  try {
    for (let day = 1; day <= 90; day++) {
      const budget = attemptsFor(type, day);
      const visits = budget ? (type === 'Waiting-room' ? 3 : 1) : 0;
      let wins = 0;
      let labBlocks: DayRow['labBlocks'] = {};
      const before = { ...ledgerSummary(START + (day - 1) * DAY).economy };
      for (let v = 0; v < visits; v++) {
        const visitResult = visit(p, type, day, v, budget / visits, levels, voyageLevels, bestDrops, masterSeed);
        wins += visitResult.wins;
        replayEssenceWhileLeveling += visitResult.replayEssenceWhileLeveling;
        firstEssenceWhileLeveling += visitResult.firstEssenceWhileLeveling;
        replayDropsWhileLeveling += visitResult.replayDropsWhileLeveling;
        labBlocks = visitResult.labBlocks;
      }
      if (type === 'Payer' && day === 1) {
        grantProduct(p, 'com.pocketplanet.game.startercrew', 'sim-starter-crew');
        grantProduct(p, 'com.pocketplanet.game.road00', 'sim-cosmic-road');
      }
      if (type === 'Payer' && day % 7 === 1) grantProduct(p, 'com.pocketplanet.game.gems500', `sim-gems-${day}`);
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
      });
      for (const kind of Object.keys(KINDS) as Kind[])
        for (const level of [2, 3, 4, 5] as const)
          if (labLevel(p, kind) >= level && labDays[kind][level] === undefined) labDays[kind][level] = day;
      if (exhausted.lab === null && (Object.keys(KINDS) as Kind[]).every((k) => labLevel(p, k) === LAB_MAX)) exhausted.lab = day;
      if (exhausted.upgrades === null && (Object.keys(UPGRADES) as UpgradeId[]).every((id) => p.upgrades[id] === UPGRADES[id].costs.length))
        exhausted.upgrades = day;
      if (
        exhausted.buildings === null &&
        BUILDING_TYPES.filter((id) => id !== 'lab' && id !== 'mill' && id !== 'grove' && id !== 'observatory').every((id) =>
          p.home.plots.some((b) => b?.type === id),
        )
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
