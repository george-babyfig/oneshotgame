import { ROAD01 } from '../src/meta/content/road01';
import { ROAD_CATALOG, grantProfileRoadPoints } from '../src/meta/starroad';
import { defaultProfile } from '../src/meta/profile';
import { ROAD_LANDMARKS } from '../src/meta/roadLandmarks';
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

// Decision 61 amendment (A0), Road 0 after Package A: 0.8 stays the printed target. Until Road 1 (decision 86),
// a seed whose measured 1.1 coverage is below it is held at its recorded floor, so further drift still fails.
// Delete the entry if the owner adds the recommended 300-gem Road 0 single.
const ROAD0_SINK_TARGET = 0.8;
const ROAD0_SINK_FLOOR: Readonly<Record<string, number>> = { default: 0.77 };
const roadSinkFloor = (seed: string) => ROAD0_SINK_FLOOR[seed] ?? ROAD0_SINK_TARGET;

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
  // Decision 65 amendment (d): A5's sim Watch samples 8-hour match trips to frost-rich planets (≥6 frost sectors).
  const sends = career.days.flatMap((row) => row.tripSendLog);
  const matches8 = sends.filter((send) => send.hours === 8 && send.match && send.baseFrost >= 6);
  const mean8MatchFrost = matches8.length ? matches8.reduce((sum, send) => sum + (send.mats.frost ?? 0), 0) / matches8.length : null;
  // Decision 65 amendment: the campaign-complete day is the first day the level reaches 121.
  const campaignDay = career.days.find((row) => row.level >= 121)?.day ?? null;
  const campaignEnd = Math.min(campaignDay ?? 60, 60);
  const campaignWindows = windows.filter((row) => row.to <= campaignEnd);
  const afterWindows = windows.filter((row) => row.to > campaignEnd);
  const afterCampaign = campaignDay !== null && campaignDay < 60 ? window(campaignDay + 1, 60) : null;
  // Decision 61 amendment 2: printed only — does the first row carry Next Up's colour whenever one is offered?
  const a1Sends = sends.filter((send) => send.day >= bay3 && send.day <= bay3 + 6 && send.neededOffered);
  const allSends = sends.filter((send) => send.day <= 60 && send.neededOffered);
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
  const worstOf = (rows: typeof windows, key: 'all' | 'frost' | 'ember') =>
    [...rows].sort((a, b) => (key === 'all' ? b.allRatio - a.allRatio : b.perColour[key].ratio - a.perColour[key].ratio))[0];
  const worst = (key: 'all' | 'frost' | 'ember') => worstOf(windows, key);
  const over = (rows: typeof windows) =>
    rows.filter((row) => row.allRatio > 0.5 || row.perColour.frost.ratio > 0.5 || row.perColour.ember.ratio > 0.5).length;
  return {
    bay3Baseline: bay3,
    bay3Current: career.bayLevelDays[3],
    a1: window(bay3, bay3 + 6),
    a2Week: window(8, 14),
    a2Cumulative: window(1, 14),
    windows,
    windowsWithTrips: windows.filter((row) => row.trips > 0).length,
    worst: { all: worst('all'), frost: worst('frost'), ember: worst('ember') },
    campaignDay,
    campaignWindows,
    campaignWorst: campaignWindows.length
      ? { all: worstOf(campaignWindows, 'all'), frost: worstOf(campaignWindows, 'frost'), ember: worstOf(campaignWindows, 'ember') }
      : null,
    afterCampaign,
    afterWindowsOver: over(afterWindows),
    afterWindows: afterWindows.length,
    windowsOver35: windows.filter((row) => row.allRatio > 0.35).length,
    a1Carries: { carried: a1Sends.filter((send) => send.carriesNeeded).length, sends: a1Sends.length },
    allCarries: { carried: allSends.filter((send) => send.carriesNeeded).length, sends: allSends.length },
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
    const cw = m.campaignWorst;
    const ac = m.afterCampaign;
    console.log(
      `M13 ${seed} ${career.type}: A3 campaign-complete day ${m.campaignDay ?? 'not reached'}; ${m.campaignWindows.length} campaign windows, worst all ${cw ? cw.all.allRatio.toFixed(3) : 'n/a'}, frost ${cw ? cw.frost.perColour.frost.ratio.toFixed(3) : 'n/a'}, ember ${cw ? cw.ember.perColour.ember.ratio.toFixed(3) : 'n/a'}; after campaign days ${ac ? `${ac.from}–${ac.to}` : 'n/a'} all ${ac ? ac.allRatio.toFixed(3) : 'n/a'}, frost ${ac ? ac.perColour.frost.ratio.toFixed(3) : 'n/a'} (${ac?.perColour.frost.trip ?? 0}/${ac?.perColour.frost.rounds ?? 0}), ember ${ac ? ac.perColour.ember.ratio.toFixed(3) : 'n/a'} (${ac?.perColour.ember.trip ?? 0}/${ac?.perColour.ember.rounds ?? 0})`,
    );
    console.log(
      `M13 ${seed} ${career.type}: Watch A3 any 7-day window worst all ${m.worst.all.allRatio.toFixed(3)} days ${m.worst.all.from}–${m.worst.all.to}; frost ${m.worst.frost.perColour.frost.ratio.toFixed(3)} days ${m.worst.frost.from}–${m.worst.frost.to}; ember ${m.worst.ember.perColour.ember.ratio.toFixed(3)} days ${m.worst.ember.from}–${m.worst.ember.to}; after-campaign windows over 0.5: ${m.afterWindowsOver}/${m.afterWindows}; windows over 0.35: ${m.windowsOver35}/54; A1 floor Watch ${m.a1.perColour.frost.share >= 0.25 ? 'green' : 'red'}; first row carries Next Up's colour ${m.a1Carries.carried}/${m.a1Carries.sends} (days ${m.bay3Baseline}–${m.bay3Baseline + 6}), ${m.allCarries.carried}/${m.allCarries.sends} (days 1–60)`,
    );
    console.log(
      `M13 ${seed} ${career.type}: A3a ${m.sentDays}/${m.activeTripDays} active days (${(100 * m.coverage).toFixed(3)}%); A5 8-hour-match frost mean ${m.mean8MatchFrost} (${m.matches8} trips); A8 friendship ${m.tripFriendship}/${m.friendship} (${(100 * m.friendshipShare).toFixed(3)}%), gems ${m.tripGems}/${m.freeGems} (${(100 * m.gemShare).toFixed(3)}%), ${m.windowsWithTrips} windows; A9 surplus ${JSON.stringify(m.surplus)}`,
    );
    expect.soft(m.windowsWithTrips, `A3 ${seed} ${career.type} has trip windows`).toBeGreaterThan(0);
    // Decision 65 amendment: every 7-day window ending on or before the campaign-complete day, then the
    // after-campaign stretch to day 60 as one total. Later 7-day windows are printed Watches.
    for (const row of [...m.campaignWindows, ...(m.afterCampaign ? [m.afterCampaign] : [])]) {
      expect.soft(row.allRatio, `A3 ${seed} ${career.type} all Essences days ${row.from}–${row.to}`).toBeLessThanOrEqual(0.5);
      for (const mat of ['frost', 'ember'] as const)
        expect.soft(row.perColour[mat].ratio, `A3 ${seed} ${career.type} ${mat} days ${row.from}–${row.to}`).toBeLessThanOrEqual(0.5);
    }
    if (career.type === 'Regular') {
      expect.soft(m.a1.trips, `A1 ${seed} window has trips`).toBeGreaterThan(0);
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
    const roadCoverage = roadNewGemSinks / roadFreeGemSupply;
    console.log(
      `Road 0 new gem sinks/free supply: ${roadNewGemSinks}/${roadFreeGemSupply} = ${roadCoverage.toFixed(3)} (target ${ROAD0_SINK_TARGET}${roadCoverage < ROAD0_SINK_TARGET ? `; inherited exception, floor ${roadSinkFloor(masterSeed)} (decision 61 amendment)` : ''})`,
    );
    expect
      .soft(roadCoverage, `new Road gem sinks cover ≥${roadSinkFloor(masterSeed)}× free supply`)
      .toBeGreaterThanOrEqual(roadSinkFloor(masterSeed));
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
      expect.soft(nightSinks / nightFree56).toBeGreaterThanOrEqual(roadSinkFloor('night2'));
      expect.soft(regular.freeBoosters / wins).toBeLessThanOrEqual(0.5);
      expect.soft(regular.greenhouseBoosters / wins).toBeLessThanOrEqual(1 / 3);
      for (const currency of CURRENCIES) expect(regular.reachableSinks[currency]).toBe(true);
      expect.soft(regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.dust_cosmetic ?? 0), 0)).toBeGreaterThan(0);
      expect.soft(regular.days.slice(0, 60).reduce((n, day) => n + (day.spent.gems_cosmetic ?? 0), 0)).toBeGreaterThan(0);
      expect.soft(replayShare(regular)).toBeLessThanOrEqual(30);
    }, 1_200_000);
}

if (process.env.SIM === '1') {
  it('M14 gates Road 1 cohorts, sink supply and Landmark pacing', async () => {
    // Scenario only: no owner launch date has been supplied (decision 81).
    const opensOn = '2026-02-26';
    const catalog = [ROAD_CATALOG[0], { ...ROAD01.road, opensOn }];
    expect(catalog[1].tiers).toHaveLength(20);
    const rows = [];
    for (const seed of process.env.SIM_NIGHTLY === '1' ? ['default', 'night2'] : ['default']) {
      const install = await simulate('Regular', seed, { roadCatalog: catalog, startDay: opensOn, days: 90 });
      const cohort = await simulate('Regular', seed, { roadCatalog: catalog, startDay: '2026-01-01', days: 120 });
      for (const career of [install, cohort]) assertAccounting(career);
      const finish = (career: Career) => career.days.find((day) => (day.roadRecords.road01 ?? 0) >= 200)?.day ?? null;
      const installFinish = finish(install);
      const cohortFinish = finish(cohort);
      const cohortFromOpen = cohortFinish === null ? null : cohortFinish - 56;
      const newInstall = install.days.slice(0, 57).reduce((sum, day) => sum + day.freeGems, 0);
      const launchCohort = cohort.days.slice(56, 112).reduce((sum, day) => sum + day.freeGems, 0);
      const singles = ROAD01.singles.reduce((sum, look) => sum + (look.gems ?? 0), 0);
      const supply = Math.max(newInstall, launchCohort);
      const pace = [install, cohort].flatMap((career, careerIndex) =>
        ROAD_LANDMARKS.flatMap((site) =>
          [1, 2, 3, 4].map((stage) => {
            const opened =
              stage === 1 ? career.roadLandmarkOpenDays[site.id] : career.roadLandmarkStageDays[site.id][(stage - 1) as 1 | 2 | 3];
            const finished = career.roadLandmarkStageDays[site.id][stage as 1 | 2 | 3 | 4];
            const activeDays =
              opened === undefined || finished === undefined
                ? null
                : career.days.filter((day) => day.active && (stage === 1 ? day.day >= opened : day.day > opened) && day.day <= finished)
                    .length;
            return { cohort: careerIndex === 0 ? 'install' : 'launch', stage, opened, finished, activeDays };
          }),
        ),
      );
      const row = {
        seed,
        opensOn,
        installFinish,
        cohortFinish,
        cohortFromOpen,
        newInstall,
        launchCohort,
        supply,
        singles,
        coverage: singles / supply,
        pace,
      };
      rows.push(row);
      console.log(`M14 B3/B5/B11 ${JSON.stringify(row)}`);
      for (const [name, day] of [
        ['install', installFinish],
        ['cohort', cohortFromOpen],
      ] as const) {
        expect.soft(day, `B3 ${seed} ${name} completes`).not.toBeNull();
        expect.soft(day!, `B3 ${seed} ${name} ≥42 days`).toBeGreaterThanOrEqual(42);
        expect.soft(day!, `B3 ${seed} ${name} ≤56 days`).toBeLessThanOrEqual(56);
      }
      expect.soft(singles, 'B5 singles ≥3000').toBeGreaterThanOrEqual(3000);
      if (process.env.SIM_NIGHTLY === '1') expect.soft(singles / supply, `B5 ${seed} hard coverage`).toBeGreaterThanOrEqual(0.8);
      else console.log(`B5 PR soft Watch target ≥.85: ${(singles / supply).toFixed(3)}`);
      for (const stage of pace) {
        expect.soft(stage.activeDays, `B11 ${seed} ${stage.cohort} stage ${stage.stage} completes`).not.toBeNull();
        if (stage.activeDays !== null) {
          expect.soft(stage.activeDays, `B11 ${seed} ${stage.cohort} stage ${stage.stage} ≥1 day`).toBeGreaterThanOrEqual(1);
          expect.soft(stage.activeDays, `B11 ${seed} ${stage.cohort} stage ${stage.stage} target ≤3 days`).toBeLessThanOrEqual(3);
          expect.soft(stage.activeDays, `B11 ${seed} ${stage.cohort} stage ${stage.stage} hard ≤5 days`).toBeLessThanOrEqual(5);
        }
      }
      // Road 1's actual reward lane must retain the inherited economy bands.
      expect
        .soft(cohort.days.slice(0, 90).reduce((n, day) => n + day.freeGems, 0) / 90, `M14 ${seed} inherited 90-day free gems/day`)
        .toBeGreaterThanOrEqual(95);
      const wins = cohort.days.reduce((n, day) => n + day.wins, 0);
      expect.soft(cohort.freeBoosters / wins, `M14 ${seed} booster band`).toBeLessThanOrEqual(0.5);
    }
    // The slow-player Watch is a precise Road-input persona, not a changed flight bot.
    const slow = defaultProfile(Date.parse('2026-01-01T12:00:00Z'));
    const slowDays: { day: number; road00: number; road01: number }[] = [];
    for (let day = 1; day <= 220; day++) {
      const date = new Date(Date.UTC(2026, 0, day, 12)).toISOString().slice(0, 10);
      for (const source of ['campaign', 'wish'] as const)
        grantProfileRoadPoints(slow, { source, date, earningKey: `slow:${day}:${source}`, delta: 1 }, catalog);
      slowDays.push({ day, road00: slow.roadRecords.road00?.points ?? 0, road01: slow.roadRecords.road01?.points ?? 0 });
    }
    const slowFinish = Object.fromEntries(
      (['road00', 'road01'] as const).map((id) => [id, slowDays.find((day) => day[id] >= 200)?.day ?? null]),
    );
    console.log(
      `M14 B4 slow player finish days ${JSON.stringify(slowFinish)}; Road 1 from opening ${slowFinish.road01 === null ? 'unreached' : slowFinish.road01 - 56}`,
    );
    for (let i = 56; i < slowDays.length; i++)
      if (slowDays[i - 1].road00 < 200)
        expect.soft(slowDays[i].road00, `B4 Road 0 no stall day ${i + 1}`).toBeGreaterThan(slowDays[i - 1].road00);
    const reportPath = new URL('./sim/economy/report.json', import.meta.url);
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    report.m14 = { ...report.m14, scenario: true, opensOn, rows, slowFinish, slowDays: slowDays.slice(0, 120) };
    writeFileSync(reportPath, JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n');
    const larger = Math.max(...rows.map((row) => row.supply));
    writeFileSync(
      new URL('../docs/handoff/m14-d-supply.md', import.meta.url),
      `# M14 D free gem supply\n\n${rows.map((row) => `- ${row.seed}: new install days 0–56 **${row.newInstall}**; launch cohort days 57–112 **${row.launchCohort}**; C singles **${row.singles}**, coverage **${row.coverage.toFixed(4)}**.`).join('\n')}\n\nLargest window: **${larger} gems**. Hard minimum **${Math.ceil(larger * 0.8)}**; target minimum **${Math.ceil(larger * 0.85)}**.\n\nPost-C M14 scenario measurement through real reward and settlement APIs. Catalogue Road 1 opens 2026-02-26; new install starts then, launch cohort starts 2026-01-01 and runs 120 days. These are test dates, not a player-visible launch commitment. New-install offsets 0–56 are inclusive: career rows 1–57, with row 1 played on opensOn. The cohort window is career rows 57–112 (56 active days).\n\nInitial inherited-tree reference: default 6700/4035; night2 6268/4442; target 5695.\n`,
    );
  }, 600_000);
}

if (process.env.SIM === '1') {
  it('M14 each Road Landmark alternative independently fits the Regular effort band', async () => {
    const opensOn = '2026-02-26';
    const catalog = [ROAD_CATALOG[0], { ...ROAD01.road, opensOn }];
    const witnesses = [];
    for (const seed of process.env.SIM_NIGHTLY === '1' ? ['default', 'night2'] : ['default'])
      for (const lane of [0, 1] as const) {
        const career = await simulate('Regular', seed, { roadCatalog: catalog, startDay: '2026-01-01', days: 75, roadLandmarkLane: lane });
        const opened = career.roadLandmarkOpenDays.rl_road01;
        const finishes = career.roadLandmarkStageDays.rl_road01;
        const days = [1, 2, 3].map((stage) => {
          const before = stage === 1 ? opened : finishes[(stage - 1) as 1 | 2];
          const after = finishes[stage as 1 | 2 | 3];
          return before === undefined || after === undefined
            ? null
            : career.days.filter((day) => day.active && (stage === 1 ? day.day >= before : day.day > before) && day.day <= after).length;
        });
        witnesses.push({ seed, lane, days, finishes });
        console.log(`M14 B11 independent route ${JSON.stringify(witnesses.at(-1))}`);
        for (const daysTaken of days) {
          expect.soft(daysTaken, `${seed} lane ${lane} completes`).not.toBeNull();
          if (daysTaken !== null) {
            expect.soft(daysTaken, `${seed} lane ${lane} ≥1 day`).toBeGreaterThanOrEqual(1);
            expect.soft(daysTaken, `${seed} lane ${lane} ≤3 days`).toBeLessThanOrEqual(3);
          }
        }
      }
    const path = new URL('./sim/economy/report.json', import.meta.url);
    const report = JSON.parse(readFileSync(path, 'utf8'));
    report.m14 = { ...report.m14, routeWitnesses: witnesses };
    writeFileSync(path, JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n');
  }, 600_000);
}

if (process.env.SIM === '1') {
  it('M14 Road 1 Pass and purchases preserve the no-purchase growth twin', async () => {
    const opensOn = '2026-02-26';
    const catalog = [ROAD_CATALOG[0], { ...ROAD01.road, opensOn }];
    const pairs = [];
    for (const seed of process.env.SIM_NIGHTLY === '1' ? ['default', 'night2'] : ['default']) {
      const paid = await simulate('Payer', seed, { roadCatalog: catalog, startDay: opensOn, days: 90 });
      const twin = await simulate('Payer', seed, { roadCatalog: catalog, startDay: opensOn, days: 90, purchases: false });
      assertAccounting(paid);
      assertAccounting(twin);
      expect(paid.profile.roadPassEntitlements).toContain('road01');
      expect(twin.profile.roadPassEntitlements).not.toContain('road01');
      const milestones = (career: Career) => ({
        home5: career.homeLevelDays[5],
        labs5: career.exhausted.lab,
        beacon: career.landmarkStageDays.keepers_beacon[4],
        roadLandmark: career.roadLandmarkStageDays.rl_road01,
        road: career.days.find((day) => (day.roadRecords.road01 ?? 0) >= 200)?.day,
      });
      const pair = { seed, paid: milestones(paid), twin: milestones(twin) };
      pairs.push(pair);
      console.log(`M14 purchases twin ${JSON.stringify(pair)}`);
      expect.soft(pair.paid, `M14 ${seed} purchases never speed growth`).toEqual(pair.twin);
    }
    const path = new URL('./sim/economy/report.json', import.meta.url);
    const report = JSON.parse(readFileSync(path, 'utf8'));
    report.m14 = { ...report.m14, purchaseTwins: pairs };
    writeFileSync(path, JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n');
  }, 600_000);
}
