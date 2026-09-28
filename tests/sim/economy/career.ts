import { makeLevel, rngFrom, starsEarned, starsFor, type LevelDef } from '../../../src/core/levels';
import {
  KINDS,
  SECTORS,
  clonePlanet,
  impact,
  labBonus,
  lifeScore,
  novaCharge,
  type BiomeId,
  type Kind,
  type Planet,
} from '../../../src/core/world';
import { BOOSTERS, SKINS, UPGRADES, type UpgradeId } from '../../../src/meta/config';
import { COSMETICS, buyCosmetic, owns } from '../../../src/meta/cosmetics';
import { dropsFor, addDrops } from '../../../src/meta/constellations';
import { stamp } from '../../../src/meta/calendar';
import { applyLevelWin, collectDust, discoverSpecies, grantProduct, track } from '../../../src/meta/economy';
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
import { LAB_MAX, labLevel, upgradeLab } from '../../../src/meta/lab';
import { clearLedger, ledger, ledgerSummary, serializedSize } from '../../../src/meta/ledger';
import { dailyLevel, recordDaily } from '../../../src/meta/modes';
import { momentumWin, momentumLoss } from '../../../src/meta/momentum';
import { defaultProfile, totalStars, type Profile } from '../../../src/meta/profile';
import {
  applyReward,
  claimQuest,
  claimQuestBonus,
  claimRoad,
  chestsReady,
  ensureQuests,
  openChest,
  roadReady,
} from '../../../src/meta/progression';
import { rankReady, rankReward } from '../../../src/meta/rank';
import { ALBUM_PAGES, claimMilestones, claimPage, pageDone } from '../../../src/meta/stickers';
import { BOSS_REWARD, RESIDENT_ACCS } from '../../../src/meta/tuning';
import { addVisitors, openVisitor } from '../../../src/meta/visitors';
import { clearStop, ensureVoyage, voyageActive, voyageLevel, VOYAGE_LEN } from '../../../src/meta/voyage';
import { spend, type Currency } from '../../../src/meta/wallet';
import { POLICIES } from '../harness';
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

function round(
  level: LevelDef,
  seed: string,
  lab: number,
  extraThrows = 0,
): { stars: number; score: number; planet: Planet; regions: BiomeId[]; arrivals: string[] } {
  const planet = clonePlanet(level.start);
  const random = rngFrom(seed);
  let charge = 0;
  let bonus = 0;
  const regions: BiomeId[] = [];
  const arrivals = new Set<string>();
  for (let turn = 0; turn < level.throws + extraThrows; turn++) {
    const nova = charge >= 10;
    const aim = POLICIES.decent.chooseAim({ level, planet, turn, nova, labLevel: lab, random });
    // Keep the decent bot's base-impact preview and the actual shot aligned.
    const result = impact(planet, level.queue[turn], ((aim % SECTORS) + SECTORS) % SECTORS, 0, { nova });
    for (const index of result.changed) regions.push(planet.sectors[index].biome);
    for (const species of result.spawned) arrivals.add(species.id);
    bonus += labBonus(lab, result.changed.length, result.spawned.length);
    charge = nova ? 0 : Math.min(10, charge + novaCharge(result.changed.length, result.spawned.length, lab));
  }
  const score = lifeScore(planet) + bonus;
  return { stars: starsEarned(planet, score, level), score, planet, regions, arrivals: [...arrivals] };
}

function claimReady(p: Profile, date: Date) {
  for (const chapter of chestsReady(p)) openChest(p, chapter);
  for (const tier of roadReady(p, totalStars(p))) claimRoad(p, tier, totalStars(p));
  for (const q of p.quests.list) claimQuest(p, q.id);
  claimQuestBonus(p);
  if (festivalActive(p)) for (const tier of festivalReady(p, date)) claimFestival(p, tier, date);
  if (eventActive(p)) for (const tier of eventReady(p)) claimEventTier(p, tier);
  for (const habitat of habitatsReady(p)) claimHabitat(p, habitat.id);
  claimMilestones(p);
  for (const page of ALBUM_PAGES) if (pageDone(p, page.id)) claimPage(p, page.id);
  while (rankReady(p)) {
    p.rank++;
    applyReward(p, rankReward(p.rank), 'rank');
  }
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
  for (const kind of Object.keys(KINDS) as Kind[]) while (upgradeLab(p, kind) === 'ok') {}
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    const costs = UPGRADES[id].costs;
    while (p.upgrades[id] < costs.length && spend(p, 'dust', costs[p.upgrades[id]], 'upgrade')) p.upgrades[id]++;
  }
  if (homeUnlocked(p)) {
    while (canExpand(p) === 'ok') expand(p);
    for (const type of BUILDING_TYPES) {
      if (p.home.plots.some((b) => b?.type === type)) continue;
      const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
      if (plot >= 0) build(p, plot, type, now);
    }
    for (const type of BUILDING_TYPES) {
      while (p.home.plots.filter((b) => b?.type === type).length < BUILDINGS[type].max) {
        const missing = BUILDING_TYPES.filter(
          (id) => !p.home.plots.some((b) => b?.type === id) && BUILDINGS[id].ring <= p.home.ring,
        ).length;
        const empty = p.home.plots.filter((b, i) => !b && !p.home.debris.includes(i)).length;
        if (empty <= missing) break;
        const plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
        if (plot < 0 || build(p, plot, type, now) !== 'ok') break;
      }
    }
    for (let plot = 0; plot < p.home.plots.length; plot++) while (upgrade(p, plot, now) === 'ok') {}
    if (p.seen.length && !p.home.residents.length) invite(p, p.seen[0]);
  }
  buyLooks(p);
}

function visit(
  p: Profile,
  type: PlayerType,
  day: number,
  visitNo: number,
  budget: number,
  levels: Map<number, LevelDef>,
  voyageLevels: Map<string, LevelDef>,
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
  ensureQuests(p, dayKey);
  if (festivalActive(p)) ensureFestival(p, date);
  if (eventActive(p)) ensureEvent(p, isoWeek(date));
  if (voyageActive(p)) ensureVoyage(p, isoWeek(date));
  claimReady(p, date);
  let wins = 0;
  for (let i = 0; i < budget; i++) {
    const n = Math.min(120, p.level);
    let level = levels.get(n);
    if (!level) levels.set(n, (level = makeLevel(n, 'PP')));
    const lab = labLevel(p, level.queue[0]);
    let shower = false;
    if (day % 3 === 0 && i === 0) {
      if (!p.boosters.shower && spend(p, 'dust', BOOSTERS.shower.dust, 'booster')) p.boosters.shower++;
      if (p.boosters.shower) {
        p.boosters.shower--;
        shower = true;
        track(p, 'booster');
        ledger.count('boosters_used');
      }
    }
    const throws = level.throws + p.upgrades.throws + (shower ? 3 : 0);
    const result = round(level, `career-${type}-${day}-${visitNo}-${i}-${n}`, lab, p.upgrades.throws + (shower ? 3 : 0));
    ledger.count('round_started');
    p.stats.plays++;
    p.stats.throws += throws;
    track(p, 'throw', throws);
    track(p, 'land', result.regions.length);
    if (eventActive(p)) addTokens(p, tokensForLand(ensureEvent(p, isoWeek(date)), result.regions, result.arrivals.length));
    if (!result.stars) {
      ledger.count('round_failed');
      momentumLoss(p, dayKey);
      continue;
    }
    wins++;
    ledger.count('round_won');
    momentumWin(p);
    const out = applyLevelWin(p, {
      n,
      stars: result.stars,
      score: result.score,
      planet: result.planet,
      name: level.name,
      hue: level.hue,
      difficulty: level.difficulty,
    });
    addDrops(p, dropsFor(result.planet, result.stars), out.firstClear ? 'material_drop_first_clear' : 'material_drop_replay');
    for (const species of result.arrivals) {
      discoverSpecies(p, species);
      if (festivalActive(p)) {
        spotFestival(p, date);
        track(p, 'spot');
      }
      track(p, 'creature');
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
  if (visitNo === 0 && p.rank >= 2) {
    const daily = dailyLevel(dayKey);
    const result = round(daily, `daily-${type}-${day}`, 1);
    ledger.count('round_started');
    ledger.count('round_won');
    recordDaily(p, dayKey, result.score, starsFor(result.score, daily.stars));
  }
  if (voyageActive(p) && budget > 0 && p.voyage.cleared < VOYAGE_LEN) {
    const stop = p.voyage.cleared;
    const key = `${p.voyage.week}-${p.voyage.base}-${stop}`;
    let level = voyageLevels.get(key);
    if (!level) voyageLevels.set(key, (level = voyageLevel(p.voyage.week, p.voyage.base, stop)));
    const result = round(level, `voyage-${type}-${day}-${stop}`, 1);
    ledger.count('round_started');
    if (result.stars) {
      clearStop(p, stop, result.stars);
      track(p, 'voyage');
      ledger.count('round_won');
    } else ledger.count('round_failed');
  }
  claimReady(p, date);
  spendPolicy(p, type, day, now);
  return wins;
}

export async function simulate(type: PlayerType): Promise<Career> {
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
  const exhausted = { lab: null, upgrades: null, buildings: null, looks: null } as Career['exhausted'];
  try {
    for (let day = 1; day <= 90; day++) {
      const budget = attemptsFor(type, day);
      const visits = budget ? (type === 'Waiting-room' ? 3 : 1) : 0;
      let wins = 0;
      const before = { ...ledgerSummary(START + (day - 1) * DAY).economy };
      for (let v = 0; v < visits; v++) wins += visit(p, type, day, v, budget / visits, levels, voyageLevels);
      if (type === 'Payer' && day === 1) grantProduct(p, 'com.pocketplanet.game.cosmicpass', 'sim-cosmetic-pass');
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
      });
      if (exhausted.lab === null && (Object.keys(KINDS) as Kind[]).every((k) => labLevel(p, k) === LAB_MAX)) exhausted.lab = day;
      if (exhausted.upgrades === null && (Object.keys(UPGRADES) as UpgradeId[]).every((id) => p.upgrades[id] === UPGRADES[id].costs.length))
        exhausted.upgrades = day;
      if (exhausted.buildings === null && BUILDING_TYPES.every((id) => p.home.plots.some((b) => b?.type === id))) exhausted.buildings = day;
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
    return {
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
    };
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
