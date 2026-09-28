import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PLAYER_TYPES, exchangeRates, simulate, type Career } from './sim/economy/career';

const CURRENCIES = ['dust', 'gems', 'stone', 'dew', 'leaf', 'ember', 'frost'] as const;
const fmt = (n: number | null) => (n === null ? '—' : Number.isFinite(n) ? String(Math.round(n)) : '∞');

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
  it('runs seven 90-day careers and checks wallet and ledger gates', async () => {
    const start = performance.now();
    const careers: Career[] = [];
    for (const type of PLAYER_TYPES) {
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
    const idleMisses = regular.days.filter((x) => x.day <= 60 && x.active && (x.idleActiveRatio ?? 0) > 1.5).map((x) => x.day);
    if (idleMisses.length) console.log(`⚠ Idle/active stardust >1.5 on Regular days ${idleMisses.join(', ')}`);
    if (regular.freeGemsPerActiveDay < 95) console.log(`⚠ Regular free gems/active day ${regular.freeGemsPerActiveDay.toFixed(1)} <95`);
    if (regular.exhausted.lab !== null && regular.exhausted.lab < 28)
      console.log(`⚠ Regular Lab maxed on day ${regular.exhausted.lab}, before day 28`);
    if (regular.exhausted.upgrades !== null && regular.exhausted.upgrades < 28)
      console.log(`⚠ Regular upgrades maxed on day ${regular.exhausted.upgrades}, before day 28`);
    for (const channel of rates.channels)
      if (channel.flag) console.log(`⚠ ${channel.channel}: ${channel.dustPerGem} stardust/gem >2× median ${rates.median}`);
    console.log(`Exchange rates: ${JSON.stringify(rates)}`);
    console.log(`Economy sim: ${((performance.now() - start) / 1000).toFixed(1)}s`);
  });
}
