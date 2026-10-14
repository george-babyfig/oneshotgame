import { COSMETICS } from '../src/meta/cosmetics';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { exchangeRates, landmarkSummary, simulate, type Career } from './sim/economy/career';
import { LANDMARKS, ROAD00_GEM_SINGLE_IDS } from '../src/meta/tuning';

const CURRENCIES = ['dust', 'gems', 'stone', 'dew', 'leaf', 'ember', 'frost'] as const;
const fmt = (n: number | null) => (n === null ? '—' : Number.isFinite(n) ? String(Math.round(n)) : '∞');
const replayShare = (career: Career) => {
  const replay = career.replayEssenceWhileLeveling;
  const first = career.firstEssenceWhileLeveling;
  return (100 * replay) / Math.max(1, replay + first);
};

function assertAccounting(career: Career) {
  for (const currency of CURRENCIES) {
    const sum = (rows: Record<string, number>) =>
      Object.entries(rows)
        .filter(([key]) => key.startsWith(`${currency}_`))
        .reduce((n, [, value]) => n + value, 0);
    expect(sum(career.earned) - sum(career.spent), `${career.type} ${currency} wallet reconciliation`).toBe(
      career.final[currency] - career.start[currency],
    );
  }
  expect(career.ledgerEconomy, `${career.type} ledger per-source totals`).toEqual(career.walletCalls);
  if (career.type === 'Engaged') expect(career.ledgerBytes).toBeLessThanOrEqual(16 * 1024);
}

function landmarkPace(career: Career) {
  return LANDMARKS.flatMap((site) =>
    ([1, 2, 3] as const).map((stage) => {
      const opened = stage === 1 ? career.landmarkOpenDays[site.id] : career.landmarkStageDays[site.id][(stage - 1) as 1 | 2];
      const finished = career.landmarkStageDays[site.id][stage];
      const activeDays =
        opened === undefined || finished === undefined
          ? null
          : // The site may open late in a visit; count the following active days.
            career.days.filter((row) => row.active && row.day > opened && row.day <= finished).length;
      return { site: site.id, stage, opened, finished, activeDays };
    }),
  );
}

const ESSENCES = ['stone', 'dew', 'leaf', 'ember', 'frost'] as const;
function tripMetrics(career: Career) {
  const window = (from: number, to: number) => {
    const days = career.days.filter((row) => row.day >= from && row.day <= to);
    const trips = days.reduce((sum, row) => sum + row.tripReturns.length, 0);
    const perColour = Object.fromEntries(
      ESSENCES.map((mat) => {
        const trip = days.reduce((sum, row) => sum + (row.earned[`${mat}_expedition`] ?? 0), 0);
        const rounds = days.reduce(
          (sum, row) =>
            sum +
            Object.entries(row.earned)
              .filter(([key]) => key.startsWith(`${mat}_material_drop`))
              .reduce((n, [, value]) => n + value, 0),
          0,
        );
        const total = days.reduce(
          (sum, row) =>
            sum +
            Object.entries(row.earned)
              .filter(([key]) => key.startsWith(`${mat}_`))
              .reduce((n, [, value]) => n + value, 0),
          0,
        );
        return [mat, { trip, rounds, total, ratio: rounds ? trip / rounds : trip ? Infinity : 0, share: total ? trip / total : 0 }];
      }),
    ) as Record<(typeof ESSENCES)[number], { trip: number; rounds: number; total: number; ratio: number; share: number }>;
    const trip = Object.values(perColour).reduce((sum, row) => sum + row.trip, 0);
    const rounds = Object.values(perColour).reduce((sum, row) => sum + row.rounds, 0);
    return { from, to, trips, perColour, allRatio: rounds ? trip / rounds : trip ? Infinity : 0 };
  };
  // A0's measured window stays fixed; changes to the 1.1 career cannot move its goalposts.
  const bay3 = 16;
  const windows = Array.from({ length: 54 }, (_, i) => window(i + 1, i + 7));
  const active = career.days.filter((row) => row.active && row.day >= (career.bayLevelDays[2] ?? Infinity) && row.day <= 60);
  const sentDays = active.filter((row) => row.tripSends > 0).length;
  const days60 = career.days.slice(0, 60);
  const tripFriendship = days60.reduce((sum, row) => sum + row.tripFriendship, 0);
  const friendship = days60.reduce((sum, row) => sum + row.friendship, 0);
  const tripGems = days60.reduce((sum, row) => sum + (row.earned.gems_expedition ?? 0), 0);
  const freeGems = days60.reduce((sum, row) => sum + row.freeGems, 0);
  const matches8 = career.days.flatMap((row) => row.tripReturns).filter((trip) => trip.hours === 8 && trip.match);
  const mean8MatchFrost = matches8.length ? matches8.reduce((sum, trip) => sum + (trip.yield?.mats.frost ?? 0), 0) / matches8.length : null;
  const surplus = Object.fromEntries(
    (['frost', 'ember'] as const).map((mat) => {
      const lastSink =
        career.days.filter((row) => Object.entries(row.spent).some(([key, value]) => key.startsWith(`${mat}_`) && value > 0)).at(-1)?.day ??
        0;
      return [
        mat,
        {
          day60: career.days[59]?.balance[mat],
          day90: career.days[89]?.balance[mat],
          lastSink,
          tripsAfterLastSink: career.days
            .filter((row) => row.day > lastSink)
            .reduce((sum, row) => sum + (row.earned[`${mat}_expedition`] ?? 0), 0),
        },
      ];
    }),
  );
  const worst = (key: 'all' | 'frost' | 'ember') =>
    [...windows].sort((a, b) => (key === 'all' ? b.allRatio - a.allRatio : b.perColour[key].ratio - a.perColour[key].ratio))[0];
  return {
    bay3Baseline: bay3,
    bay3Current: career.bayLevelDays[3],
    a1: window(bay3, bay3 + 6),
    a2Week: window(8, 14),
    a2Cumulative: window(1, 14),
    windows,
    windowsWithTrips: windows.filter((row) => row.trips > 0).length,
    worst: { all: worst('all'), frost: worst('frost'), ember: worst('ember') },
    bay2Day: career.bayLevelDays[2],
    sentDays,
    activeTripDays: active.length,
    coverage: active.length ? sentDays / active.length : 0,
    tripFriendship,
    friendship,
    friendshipShare: friendship ? tripFriendship / friendship : 0,
    tripGems,
    freeGems,
    gemShare: freeGems ? tripGems / freeGems : 0,
    mean8MatchFrost,
    matches8: matches8.length,
    surplus,
  };
}
function gateTrips(regular: Career, engaged: Career, seed: string) {
  console.log(`A0 ${seed}: untouched-1.0 Bay 3 day 16; inherited red gates preserved in docs/handoff/m13-step0.md`);
  for (const career of [regular, engaged]) {
    const m = tripMetrics(career);
    console.log(
      `M13 ${seed} ${career.type}: A1 ${(100 * m.a1.perColour.frost.share).toFixed(3)}% (${m.a1.perColour.frost.trip}/${m.a1.perColour.frost.total}, ${m.a1.trips} trips); A2 days 8–14 ${(100 * m.a2Week.perColour.frost.share).toFixed(3)}%, days 1–14 ${(100 * m.a2Cumulative.perColour.frost.share).toFixed(3)}%; A3 ${m.windowsWithTrips}/54 windows with trips`,
    );
    console.log(
      `M13 ${seed} ${career.type}: A3 worst all ${m.worst.all.allRatio.toFixed(6)} days ${m.worst.all.from}–${m.worst.all.to}; frost ${m.worst.frost.perColour.frost.ratio.toFixed(6)} days ${m.worst.frost.from}–${m.worst.frost.to}; ember ${m.worst.ember.perColour.ember.ratio.toFixed(6)} days ${m.worst.ember.from}–${m.worst.ember.to}; all-colour 0.35 Watch ${m.worst.all.allRatio <= 0.35 ? 'green' : 'red'}`,
    );
    console.log(
      `M13 ${seed} ${career.type}: A3a ${m.sentDays}/${m.activeTripDays} active days (${(100 * m.coverage).toFixed(3)}%); A5 8-hour-match frost mean ${m.mean8MatchFrost} (${m.matches8} trips); A8 friendship ${m.tripFriendship}/${m.friendship} (${(100 * m.friendshipShare).toFixed(3)}%), gems ${m.tripGems}/${m.freeGems} (${(100 * m.gemShare).toFixed(3)}%), ${m.windowsWithTrips} windows; A9 surplus ${JSON.stringify(m.surplus)}`,
    );
    expect.soft(m.windowsWithTrips, `A3 ${seed} ${career.type} has trip windows`).toBeGreaterThan(0);
    for (const row of m.windows) {
      expect.soft(row.allRatio, `A3 ${seed} ${career.type} all Essences days ${row.from}–${row.to}`).toBeLessThanOrEqual(0.5);
      for (const mat of ['frost', 'ember'] as const)
        expect.soft(row.perColour[mat].ratio, `A3 ${seed} ${career.type} ${mat} days ${row.from}–${row.to}`).toBeLessThanOrEqual(0.5);
    }
    if (career.type === 'Regular') {
      expect.soft(m.a1.trips, `A1 ${seed} window has trips`).toBeGreaterThan(0);
      expect.soft(m.a1.perColour.frost.share, `A1 ${seed} trip frost share ≥25%`).toBeGreaterThanOrEqual(0.25);
      expect.soft(m.a1.perColour.frost.share, `A1 ${seed} trip frost share ≤33%`).toBeLessThanOrEqual(0.33);
      expect.soft(m.coverage, `A3a ${seed} trips on ≥80% active days`).toBeGreaterThanOrEqual(0.8);
      expect.soft(m.windowsWithTrips, `A8 ${seed} friendship Watch has trip windows`).toBeGreaterThan(0);
      // Watches are printed, never silently promoted to hard assertions.
    }
  }
}
function reportMetrics(careers: Career[]) {
  return Object.fromEntries(careers.map((career) => [career.type, tripMetrics(career)]));
}

if (process.env.SIM === '1') {
  it('gates three paired 90-day Lab careers and checks wallet accounting', async () => {
    const masterSeed = process.env.ECONOMY_SEED ?? 'default';
    const start = performance.now();
    const careers: Career[] = [];
    for (const type of ['Regular', 'Engaged', 'Payer'] as const) {
      const career = await simulate(type, masterSeed);
      assertAccounting(career);
      careers.push(career);
    }
    const rates = exchangeRates();
    const report = {
      days: 90,
      start: '2026-01-01',
      seed: masterSeed,
      unpaid: null as Career | null,
      baseline: { commit: '2a61ed15', bay3Day: 16, window: [16, 22], a0Exceptions: ['boosters ≤0.5/win', 'Road sinks ≥0.8× supply'] },
      careers,
      m13: reportMetrics(careers),
      exchangeRates: rates,
    };
    writeFileSync(
      new URL('./sim/economy/report.json', import.meta.url),
      JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n',
    );
    console.log('Player         Level  Dust    Gems  Free gems/day  Max idle/active  Lab  Home5  Upgrades  Buildings  Looks  Ledger');
    for (const c of careers) {
      console.log(
        `${c.type.padEnd(14)} ${String(c.days[89].level).padStart(5)} ${String(c.final.dust).padStart(7)} ${String(c.final.gems).padStart(6)} ${String(Math.round(c.freeGemsPerActiveDay)).padStart(13)} ${fmt(c.maxIdleActiveRatio).padStart(16)} ${fmt(c.exhausted.lab).padStart(4)} ${fmt(c.homeLevelDays[5] ?? null).padStart(6)} ${fmt(c.exhausted.upgrades).padStart(9)} ${fmt(c.exhausted.buildings).padStart(10)} ${fmt(c.exhausted.looks).padStart(6)} ${String(c.ledgerBytes).padStart(7)}`,
      );
      console.log(`${c.type} Landmarks: ${landmarkSummary(c)}; colour stranding ${c.colourStrandingDays.length} days`);
    }
    const regular = careers.find((x) => x.type === 'Regular')!;
    const engaged = careers.find((x) => x.type === 'Engaged')!;
    const payer = careers.find((x) => x.type === 'Payer')!;
    gateTrips(regular, engaged, masterSeed);
    const pace = landmarkPace(regular);
    for (const site of LANDMARKS)
      site.stages.forEach((stage, index) =>
        stage.routes.forEach((route, lane) => {
          expect
            .soft(
              regular.landmarkRouteCapacity[site.id]?.[index]?.[lane] ?? 0,
              `${site.id} stage ${index + 1} route ${lane + 1} has enough Regular opportunities on its own`,
            )
            .toBeGreaterThanOrEqual(route.target);
          expect
            .soft(
              regular.landmarkRouteWitness[site.id]?.[index]?.[lane] ?? false,
              `${site.id} stage ${index + 1} route ${lane + 1} completes on the Regular opening save`,
            )
            .toBe(true);
        }),
      );
    console.log(`Landmark feat pace: ${JSON.stringify(pace)}`);
    for (const row of pace) {
      expect.soft(row.activeDays, `${row.site} stage ${row.stage} reached within five active days`).not.toBeNull();
      if (row.activeDays !== null) expect.soft(row.activeDays, `${row.site} stage ${row.stage} ≤5 active days`).toBeLessThanOrEqual(5);
      if (row.activeDays !== null) expect.soft(row.activeDays, `${row.site} stage ${row.stage} ≤3 active days`).toBeLessThanOrEqual(3);
    }
    console.log(`Landmark Beacon day-35 Watch: ${regular.landmarkStageDays.keepers_beacon[4] ?? 'unreached'}`);
    expect.soft(regular.landmarkStageDays.keepers_beacon[4] ?? 0, 'Beacon finish no earlier than day 35').toBeGreaterThanOrEqual(35);
    console.log(`Landmark colour-stranding Watch: ${JSON.stringify(regular.colourStrandingDays)}`);
    console.log(
      `W1 replay Essence share while leveling ${replayShare(regular).toFixed(1)}% (${regular.replayDropsWhileLeveling} replay drops)`,
    );
    expect(regular.replayDropsWhileLeveling, 'replay-half exercised while leveling Labs').toBeGreaterThan(0);
    console.log(
      `W2 suggested first Lab ${regular.firstLab ?? 'none'} level 2 day: ${regular.firstLab ? (regular.labDays[regular.firstLab][2] ?? 'unreached') : 'unreached'}`,
    );
    console.log(`Lab level days: ${JSON.stringify(Object.fromEntries(careers.map((career) => [career.type, career.labDays])))}`);
    const essenceBlockedAfter60 = regular.days
      .filter((day) => day.day > 60 && Object.values(day.labBlocks).some((reason) => reason?.startsWith('essence:')))
      .map((day) => day.day);
    console.log(
      `G1 Regular all 5: ${fmt(regular.exhausted.lab)}; G2 Engaged all 5: ${fmt(engaged.exhausted.lab)}; G3 Essence-blocked after day 60: ${essenceBlockedAfter60.join(',') || 'none'}; G4 Payer all 5: ${fmt(payer.exhausted.lab)} (💎${payer.spent.gems_continue ?? 0} on legal continues)`,
    );
    expect.soft(regular.exhausted.lab, 'G1 Regular reaches all Labs 5 within 90 days').not.toBeNull();
    expect.soft(regular.exhausted.lab!, 'G1 Regular all Labs 5 no earlier than day 28').toBeGreaterThanOrEqual(28);
    expect.soft(engaged.exhausted.lab, 'G2 Engaged reaches all Labs 5').not.toBeNull();
    expect.soft(engaged.exhausted.lab!, 'G2 Engaged at least 30% faster').toBeLessThanOrEqual(0.7 * regular.exhausted.lab!);
    expect.soft(essenceBlockedAfter60, 'G3 no single-Essence starvation after day 60').toEqual([]);
    expect.soft(payer.exhausted.lab, 'G4 Payer reaches all Labs 5').not.toBeNull();
    // Whether the Payer meets a Hard loss worth a continue depends on the seed; the nightly second seed gates the path.
    console.log(`Watch G4 continue path: Payer spent 💎${payer.spent.gems_continue ?? 0} on legal continues (seed ${masterSeed})`);
    // Decision 55: G4's money check is Payer vs the same persona without purchases (below); vs Regular is a Watch.
    console.log(`Watch G4 spending style: Payer all Labs 5 day ${fmt(payer.exhausted.lab)} vs Regular ${fmt(regular.exhausted.lab)}`);
    expect.soft(regular.homeLevelDays[5] ?? 0, 'Homeworld Level 5 no earlier than Regular day 28').toBeGreaterThanOrEqual(28);
    // Money never buys growth: the Payer is gated against the same persona with no purchases. Spending gems on
    // boosters is open to every child (Regular holds thousands of free gems), so Payer vs Regular is a Watch.
    const unpaid = await simulate('Payer', masterSeed, { purchases: false });
    assertAccounting(unpaid);
    report.unpaid = unpaid;
    writeFileSync(
      new URL('./sim/economy/report.json', import.meta.url),
      JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n',
    );
    const beacon = (career: Career) => career.landmarkStageDays.keepers_beacon[4] ?? Infinity;
    expect.soft(payer.homeLevelDays[5] ?? Infinity, 'purchases cannot buy Level 5 earlier').toBe(unpaid.homeLevelDays[5] ?? Infinity);
    expect.soft(payer.exhausted.lab ?? Infinity, 'purchases cannot max Labs earlier').toBe(unpaid.exhausted.lab ?? Infinity);
    expect.soft(beacon(payer), 'purchases cannot finish the Beacon earlier').toBe(beacon(unpaid));
    console.log(
      `Purchases control: Payer Level 5 day ${payer.homeLevelDays[5]}, Labs ${payer.exhausted.lab}, Beacon ${beacon(payer)}; same persona without purchases ${unpaid.homeLevelDays[5]}, ${unpaid.exhausted.lab}, ${beacon(unpaid)}; gems spent on boosters ${payer.spent.gems_booster ?? 0} vs ${unpaid.spent.gems_booster ?? 0}`,
    );
    console.log(
      `Watch spending style: Payer Level 5 day ${payer.homeLevelDays[5]} vs Regular ${regular.homeLevelDays[5]} (Regular ends with ${regular.final.gems} unspent free gems)`,
    );
    console.log(
      `Homeworld Level 5: Regular day ${regular.homeLevelDays[5] ?? 'unreached'}, Engaged day ${engaged.homeLevelDays[5] ?? 'unreached'}, Payer day ${payer.homeLevelDays[5] ?? 'unreached'}; day-60 Watch ${regular.homeLevelDays[5] && regular.homeLevelDays[5]! <= 60 ? 'green' : 'miss — apply decision 22 frost fallback'}`,
    );
    const idleMisses = regular.days.filter((x) => x.day <= 60 && x.active && (x.idleActiveRatio ?? 0) > 1.5).map((x) => x.day);
    console.log(
      `Idle ≤1.5× active: ${idleMisses.length ? `FAIL days ${idleMisses.join(', ')}` : 'PASS'}; max ${Math.max(...regular.days.slice(0, 60).map((x) => x.idleActiveRatio ?? 0)).toFixed(2)}×`,
    );
    console.log(
      `Regular daily idle/active days 1–60: ${regular.days
        .slice(0, 60)
        .map((x) => `${x.day}:${(x.idleActiveRatio ?? 0).toFixed(2)}`)
        .join(' ')}`,
    );
    expect.soft(idleMisses, 'Regular active days 1–60 idle ≤1.5× active').toEqual([]);
    console.log(`Free gems ≥95 per active day: ${regular.freeGemsPerActiveDay.toFixed(1)}`);
    expect.soft(regular.freeGemsPerActiveDay, 'Regular free gems ≥95 per active day').toBeGreaterThanOrEqual(95);
    const roadFinishDay = regular.days.find((row) => row.roadPoints >= 200)?.day;
    console.log(`Regular Cosmic Road free lane finish day: ${roadFinishDay ?? 'unreached'}`);
    expect.soft(roadFinishDay, 'Regular finishes the free Road lane in 6–8 weeks').toBeGreaterThanOrEqual(42);
    expect.soft(roadFinishDay, 'Regular finishes the free Road lane in 6–8 weeks').toBeLessThanOrEqual(56);
    const roadFreeGemSupply = regular.days.slice(0, 56).reduce((sum, row) => sum + row.freeGems, 0);
    const roadNewGemSinks = ROAD00_GEM_SINGLE_IDS.reduce((sum, id) => sum + (COSMETICS.find((look) => look.id === id)?.gems ?? 0), 0);
    console.log(
      `Road 0 new gem sinks/free supply: ${roadNewGemSinks}/${roadFreeGemSupply} = ${(roadNewGemSinks / roadFreeGemSupply).toFixed(3)}`,
    );
    expect.soft(roadNewGemSinks / roadFreeGemSupply, 'new Road gem sinks cover ≥0.8× free supply').toBeGreaterThanOrEqual(0.8);
    const wins = regular.days.reduce((sum, row) => sum + row.wins, 0);
    console.log(
      `Free boosters per campaign win: ${(regular.freeBoosters / wins).toFixed(3)}; Greenhouses ${(regular.greenhouseBoosters / wins).toFixed(3)} (${wins} wins)`,
    );
    expect.soft(regular.freeBoosters / wins, 'free boosters ≤0.5 per planet win').toBeLessThanOrEqual(0.5);
    expect.soft(regular.greenhouseBoosters / wins, 'Greenhouses ≤1/3 per planet win').toBeLessThanOrEqual(1 / 3);
    console.log(`Day 60 reachable sinks: ${JSON.stringify(regular.reachableSinks)}`);
    console.log(
      `Day 60 balances: ${JSON.stringify(regular.days[59].balance)}; free booster sources ${JSON.stringify(regular.boosterSources)}`,
    );
    expect
      .soft(
        regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.dust_cosmetic ?? 0), 0),
        'Regular buys a stardust look by day 60 with retired Event dust restored in Voyage',
      )
      .toBeGreaterThan(0);
    expect
      .soft(
        regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.gems_cosmetic ?? 0), 0),
        'Regular buys a gem look by day 60',
      )
      .toBeGreaterThan(0);
    for (const currency of CURRENCIES) expect.soft(regular.reachableSinks[currency], `${currency} has a day-60 sink`).toBe(true);
    expect.soft(replayShare(regular), 'replay Essence share ≤30%').toBeLessThanOrEqual(30);
    if (regular.exhausted.upgrades !== null && regular.exhausted.upgrades < 28)
      console.log(`⚠ Regular upgrades maxed on day ${regular.exhausted.upgrades}, before day 28`);
    for (const channel of rates.channels)
      if (channel.flag) console.log(`⚠ ${channel.channel}: ${channel.dustPerGem} stardust/gem >2× median ${rates.median}`);
    console.log(`Exchange rates: ${JSON.stringify(rates)}`);
    console.log(`Economy sim: ${((performance.now() - start) / 1000).toFixed(1)}s`);
  }, 1_200_000);

  if (process.env.SIM_NIGHTLY === '1')
    it('gates a second paired economy seed', async () => {
      const regular = await simulate('Regular', 'night2');
      const engaged = await simulate('Engaged', 'night2');
      const payer = await simulate('Payer', 'night2');
      const unpaid = await simulate('Payer', 'night2', { purchases: false });
      for (const career of [regular, engaged, payer, unpaid]) assertAccounting(career);
      const lateBlocks = regular.days.filter(
        (day) => day.day > 60 && Object.values(day.labBlocks).some((reason) => reason?.startsWith('essence:')),
      );
      console.log(
        `Nightly economy seed: Regular ${regular.exhausted.lab}, Engaged ${engaged.exhausted.lab}, Payer ${payer.exhausted.lab}, late Essence blocks ${lateBlocks.length}`,
      );
      const reportPath = new URL('./sim/economy/report.json', import.meta.url);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      report.secondSeed = { seed: 'night2', careers: [regular, engaged, payer], unpaid, m13: reportMetrics([regular, engaged, payer]) };
      writeFileSync(reportPath, JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n');
      gateTrips(regular, engaged, 'night2');
      const pace = landmarkPace(regular);
      console.log(`Nightly Landmark feat pace: ${JSON.stringify(pace)}`);
      for (const row of pace) {
        expect.soft(row.activeDays, `night2 ${row.site} stage ${row.stage} reached`).not.toBeNull();
        expect.soft(row.activeDays!, `night2 ${row.site} stage ${row.stage} within five active days`).toBeLessThanOrEqual(5);
        expect.soft(row.activeDays!, `night2 ${row.site} stage ${row.stage} within three active days`).toBeLessThanOrEqual(3);
      }
      expect.soft(regular.landmarkStageDays.keepers_beacon[4] ?? 0, 'night2 Beacon finish day').toBeGreaterThanOrEqual(35);
      console.log(
        `Nightly Homeworld Level 5: Regular ${regular.homeLevelDays[5]}, Engaged ${engaged.homeLevelDays[5]}, Payer ${payer.homeLevelDays[5]}`,
      );
      console.log(
        `Nightly Regular daily idle/active days 1–60: ${regular.days
          .slice(0, 60)
          .map((x) => `${x.day}:${(x.idleActiveRatio ?? 0).toFixed(2)}`)
          .join(' ')}`,
      );
      console.log(
        `Nightly idle max ${Math.max(...regular.days.slice(0, 60).map((x) => x.idleActiveRatio ?? 0)).toFixed(2)}×; free gems/day ${regular.freeGemsPerActiveDay.toFixed(1)}`,
      );
      const wins = regular.days.reduce((sum, day) => sum + day.wins, 0);
      console.log(
        `Nightly free boosters/win ${(regular.freeBoosters / wins).toFixed(3)}; Greenhouses ${(regular.greenhouseBoosters / wins).toFixed(3)}; sources ${JSON.stringify(regular.boosterSources)}; day-60 sinks ${JSON.stringify(regular.reachableSinks)}`,
      );
      console.log(
        `Nightly W1 replay Essence share ${replayShare(regular).toFixed(1)}%; W2 ${regular.firstLab ?? 'none'} level 2 day ${regular.firstLab ? (regular.labDays[regular.firstLab][2] ?? 'unreached') : 'unreached'}`,
      );
      expect.soft(regular.exhausted.lab).not.toBeNull();
      expect.soft(regular.exhausted.lab!).toBeGreaterThanOrEqual(28);
      expect.soft(engaged.exhausted.lab).not.toBeNull();
      expect.soft(engaged.exhausted.lab!).toBeLessThanOrEqual(0.7 * regular.exhausted.lab!);
      expect.soft(lateBlocks).toEqual([]);
      expect.soft(payer.exhausted.lab).not.toBeNull();
      expect.soft(payer.spent.gems_continue ?? 0, 'night2 G4 Payer exercises the legal gem continue path').toBeGreaterThan(0);
      // Decision 55: purchases never move a milestone earlier than the same player without them.
      expect.soft(payer.exhausted.lab!, 'night2 purchases cannot max Labs earlier').toBe(unpaid.exhausted.lab ?? Infinity);
      expect
        .soft(payer.homeLevelDays[5] ?? Infinity, 'night2 purchases cannot buy Level 5 earlier')
        .toBe(unpaid.homeLevelDays[5] ?? Infinity);
      const beacon = (career: Career) => career.landmarkStageDays.keepers_beacon[4] ?? Infinity;
      expect.soft(beacon(payer), 'night2 purchases cannot finish the Beacon earlier').toBe(beacon(unpaid));
      console.log(
        `Nightly Watch spending style: Payer Labs ${payer.exhausted.lab} / Level 5 ${payer.homeLevelDays[5]} vs Regular ${regular.exhausted.lab} / ${regular.homeLevelDays[5]}; unpaid twin ${unpaid.exhausted.lab} / ${unpaid.homeLevelDays[5]}`,
      );
      expect.soft(regular.homeLevelDays[5]).toBeGreaterThanOrEqual(28);
      expect.soft(regular.days.filter((x) => x.day <= 60 && x.active && (x.idleActiveRatio ?? 0) > 1.5)).toEqual([]);
      expect.soft(regular.freeGemsPerActiveDay).toBeGreaterThanOrEqual(95);
      const nightRoadFinish = regular.days.find((row) => row.roadPoints >= 200)?.day;
      const nightFree56 = regular.days.slice(0, 56).reduce((sum, row) => sum + row.freeGems, 0);
      const nightSinks = ROAD00_GEM_SINGLE_IDS.reduce((sum, id) => sum + (COSMETICS.find((look) => look.id === id)?.gems ?? 0), 0);
      const nightLookDay = regular.days.find((row) => (row.spent.dust_cosmetic ?? 0) > 0)?.day;
      const nightDust60 = regular.days.slice(0, 60).reduce(
        (sum, row) =>
          sum +
          Object.entries(row.earned)
            .filter(([key]) => key.startsWith('dust_'))
            .reduce((n, [, value]) => n + value, 0),
        0,
      );
      console.log(
        `Nightly Road/economy: first dust look day ${nightLookDay}, finish day ${nightRoadFinish}, 60-day dust ${nightDust60}, sinks/free ${nightSinks}/${nightFree56} = ${(nightSinks / nightFree56).toFixed(3)}`,
      );
      expect.soft(nightRoadFinish).toBeGreaterThanOrEqual(42);
      expect.soft(nightRoadFinish).toBeLessThanOrEqual(56);
      expect.soft(nightSinks / nightFree56).toBeGreaterThanOrEqual(0.8);
      expect.soft(regular.freeBoosters / wins).toBeLessThanOrEqual(0.5);
      expect.soft(regular.greenhouseBoosters / wins).toBeLessThanOrEqual(1 / 3);
      for (const currency of CURRENCIES) expect(regular.reachableSinks[currency]).toBe(true);
      expect.soft(regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.dust_cosmetic ?? 0), 0)).toBeGreaterThan(0);
      expect.soft(regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.gems_cosmetic ?? 0), 0)).toBeGreaterThan(0);
      expect.soft(replayShare(regular)).toBeLessThanOrEqual(30);
    }, 1_200_000);
}
