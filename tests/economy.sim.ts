import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { exchangeRates, simulate, type Career } from './sim/economy/career';

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

if (process.env.SIM === '1') {
  it('gates three paired 90-day Lab careers and checks wallet accounting', async () => {
    const start = performance.now();
    const careers: Career[] = [];
    for (const type of ['Regular', 'Engaged', 'Payer'] as const) {
      const career = await simulate(type);
      assertAccounting(career);
      careers.push(career);
    }
    const rates = exchangeRates();
    const report = { days: 90, start: '2026-01-01', careers, exchangeRates: rates };
    writeFileSync(
      new URL('./sim/economy/report.json', import.meta.url),
      JSON.stringify(report, (_key, value) => (value === Infinity ? 'Infinity' : value), 2) + '\n',
    );
    console.log('Player         Level  Dust    Gems  Free gems/day  Max idle/active  Lab  Upgrades  Buildings  Looks  Ledger');
    for (const c of careers) {
      console.log(
        `${c.type.padEnd(14)} ${String(c.days[89].level).padStart(5)} ${String(c.final.dust).padStart(7)} ${String(c.final.gems).padStart(6)} ${String(Math.round(c.freeGemsPerActiveDay)).padStart(13)} ${fmt(c.maxIdleActiveRatio).padStart(16)} ${fmt(c.exhausted.lab).padStart(4)} ${fmt(c.exhausted.upgrades).padStart(9)} ${fmt(c.exhausted.buildings).padStart(10)} ${fmt(c.exhausted.looks).padStart(6)} ${String(c.ledgerBytes).padStart(7)}`,
      );
    }
    const regular = careers.find((x) => x.type === 'Regular')!;
    const engaged = careers.find((x) => x.type === 'Engaged')!;
    const payer = careers.find((x) => x.type === 'Payer')!;
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
    expect(regular.exhausted.lab, 'G1 Regular reaches all Labs 5 within 90 days').not.toBeNull();
    expect(regular.exhausted.lab!, 'G1 Regular all Labs 5 no earlier than day 28').toBeGreaterThanOrEqual(28);
    expect(engaged.exhausted.lab, 'G2 Engaged reaches all Labs 5').not.toBeNull();
    expect(engaged.exhausted.lab!, 'G2 Engaged at least 30% faster').toBeLessThanOrEqual(0.7 * regular.exhausted.lab!);
    expect(essenceBlockedAfter60, 'G3 no single-Essence starvation after day 60').toEqual([]);
    expect(payer.exhausted.lab, 'G4 Payer reaches all Labs 5').not.toBeNull();
    expect(payer.spent.gems_continue ?? 0, 'G4 Payer exercises the legal gem continue path').toBeGreaterThan(0);
    expect(payer.exhausted.lab!, 'G4 payer cannot max earlier than Regular').toBeGreaterThanOrEqual(regular.exhausted.lab!);
    const idleMisses = regular.days.filter((x) => x.day <= 60 && x.active && (x.idleActiveRatio ?? 0) > 1.5).map((x) => x.day);
    if (idleMisses.length) console.log(`⚠ Idle/active stardust >1.5 on Regular days ${idleMisses.join(', ')}`);
    if (regular.freeGemsPerActiveDay < 95) console.log(`⚠ Regular free gems/active day ${regular.freeGemsPerActiveDay.toFixed(1)} <95`);
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
      const lateBlocks = regular.days.filter(
        (day) => day.day > 60 && Object.values(day.labBlocks).some((reason) => reason?.startsWith('essence:')),
      );
      console.log(
        `Nightly economy seed: Regular ${regular.exhausted.lab}, Engaged ${engaged.exhausted.lab}, Payer ${payer.exhausted.lab}, late Essence blocks ${lateBlocks.length}`,
      );
      console.log(
        `Nightly W1 replay Essence share ${replayShare(regular).toFixed(1)}%; W2 ${regular.firstLab ?? 'none'} level 2 day ${regular.firstLab ? (regular.labDays[regular.firstLab][2] ?? 'unreached') : 'unreached'}`,
      );
      expect(regular.exhausted.lab).not.toBeNull();
      expect(regular.exhausted.lab!).toBeGreaterThanOrEqual(28);
      expect(engaged.exhausted.lab).not.toBeNull();
      expect(engaged.exhausted.lab!).toBeLessThanOrEqual(0.7 * regular.exhausted.lab!);
      expect(lateBlocks).toEqual([]);
      expect(payer.exhausted.lab).not.toBeNull();
      expect(payer.exhausted.lab!).toBeGreaterThanOrEqual(regular.exhausted.lab!);
    }, 1_200_000);
}
