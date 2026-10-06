import { describe, expect, it, vi } from 'vitest';
import { clearLedger, ledger, ledgerSummary, serializedSize } from '../src/meta/ledger';
import type { LedgerKpi } from '../src/meta/ledger';
import { defaultProfile } from '../src/meta/profile';
import { earn, spend } from '../src/meta/wallet';

const day = 86400000;
const start = Date.UTC(2026, 0, 1);

describe('private ledger', () => {
  it('aggregates daily totals, histograms, and first discovery', async () => {
    await clearLedger(true);
    ledger.count('round_started', 2, start);
    ledger.count('round_won', 1, start);
    ledger.add('round_seconds', 75, start);
    ledger.add('round_seconds', 95, start);
    ledger.discover('star_road', 12);
    ledger.discover('star_road', 20);
    const s = ledgerSummary(start);
    expect([s.rounds, s.wins, s.minutes, s.medianSeconds]).toEqual([2, 1, 3, 75]);
    expect(s.discovery.star_road).toBe(12);
    expect(s.days).toHaveLength(1);
  });

  it('rolls daily and weekly buckets by age', async () => {
    await clearLedger(true);
    for (let i = 0; i < 90; i++) ledger.count('round_started', 1, start + i * day);
    const s = ledgerSummary(start + 89 * day);
    expect(s.days).toHaveLength(30);
    expect(s.weeks).toHaveLength(8);
    expect(s.rounds).toBe(30);
    expect(s.activeDays7).toBe(7);
  });

  it('stays within 16 KB over a 90-day engaged career', async () => {
    await clearLedger(true);
    for (let i = 0; i < 90; i++) {
      const now = start + i * day;
      for (let round = 0; round < 12; round++) {
        ledger.count('round_started', 1, now);
        ledger.count('round_won', 1, now);
        ledger.add('round_seconds', 80, now);
        ledger.add('earn_dust_level_win', 100, now);
        ledger.add('earn_gems_first_clear', 2, now);
        ledger.add('spend_dust_lab', 30, now);
      }
    }
    expect(serializedSize()).toBeLessThanOrEqual(16 * 1024);
  });

  it('keeps the latest 30 days and every lifetime economy total under a full 90-day load', async () => {
    await clearLedger(true);
    const kpis: LedgerKpi[] = [
      'round_started',
      'round_won',
      'round_failed',
      'round_failed_score',
      'round_failed_goal',
      'round_restarted',
      'round_seconds',
      'continues_bought',
      'boosters_used',
      'help_used',
      'homeworld_action',
      'gate_shown',
      'gate_passed',
      'gate_failed',
      'purchase_ok',
      'purchase_cancelled',
      'purchase_pending',
      'purchase_failed',
      'contents_sheet',
      'app_open',
      'offer_shop',
    ];
    const currencies = ['gems', 'dust', 'stone', 'dew', 'leaf', 'ember', 'frost'];
    const sources = [
      'level_win',
      'first_clear',
      'quest',
      'calendar',
      'visitor',
      'vault',
      'homeworld_producer',
      'expedition',
      'chest',
      'star_road',
      'festival',
      'voyage',
      'event',
      'achievement',
      'discovery',
      'iap',
      'welcome_back',
      'buddy',
      'boss',
      'debris',
      'material_drop',
      'material_drop_first_clear',
      'material_drop_replay',
      'daily',
      'rush',
      'challenge',
      'constellation',
      'rank',
      'habitat',
      'album',
      'inbox',
      'generic_reward',
    ];
    const sinks = [
      'continue',
      'booster',
      'upgrade',
      'lab',
      'build',
      'cosmetic',
      'atmosphere',
      'bundle',
      'dye',
      'ring',
      'friendship',
      'accessory',
      'generic_spend',
    ];
    for (let i = 0; i < 90; i++) {
      const now = start + i * day;
      for (const kpi of kpis) ledger.count(kpi, 1, now);
      for (const currency of currencies) {
        for (const source of sources) ledger.add(`earn_${currency}_${source}`, 2, now);
        for (const sink of sinks) ledger.add(`spend_${currency}_${sink}`, 3, now);
      }
    }
    const summary = ledgerSummary(start + 89 * day);
    expect(serializedSize()).toBeLessThanOrEqual(16 * 1024);
    expect(summary.days.map((bucket) => bucket.day)).toEqual(Array.from({ length: 30 }, (_, i) => Math.floor(start / day) + 60 + i));
    for (const currency of currencies) {
      for (const source of sources) expect(summary.economy[`earn_${currency}_${source}`]).toBe(180);
      for (const sink of sinks) expect(summary.economy[`spend_${currency}_${sink}`]).toBe(270);
    }
  });

  it('starts fresh when a stored ledger has an unknown version or invalid nested data', async () => {
    for (const raw of [
      JSON.stringify({ v: 99, k: [], d: [], w: [], s: [], e: [], f: {} }),
      JSON.stringify({ v: 1, k: ['round_started'], d: [[1, ['bad'], Array(12).fill(0)]], w: [], s: [], e: [], f: {} }),
      JSON.stringify({ v: 1, k: [], d: [], w: [], s: [], e: [[0, 0, 4, 1]], f: {} }),
    ]) {
      vi.resetModules();
      vi.stubGlobal('localStorage', { getItem: () => raw, setItem: () => {} });
      const module = await import('../src/meta/ledger');
      await module.loadLedger();
      expect(module.ledgerSummary(start).days).toEqual([]);
      expect(module.ledgerSummary(start).economy).toEqual({});
    }
    vi.unstubAllGlobals();
  });

  it('reloads compact totals without inventing round time', async () => {
    let saved: string | null = null;
    vi.stubGlobal('localStorage', {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    });
    vi.resetModules();
    const first = await import('../src/meta/ledger');
    await first.clearLedger();
    first.ledger.count('round_started', 2, start);
    first.ledger.add('earn_gems_level_win', 7, start);
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.resetModules();
    const second = await import('../src/meta/ledger');
    await second.loadLedger();
    const summary = second.ledgerSummary(start);
    expect(summary.rounds).toBe(2);
    expect(summary.medianSeconds).toBe(0);
    expect(summary.economy.earn_gems_level_win).toBe(7);
    vi.unstubAllGlobals();
  });

  it('evicts old daily buckets before weekly buckets when extra counters fill the cap', async () => {
    await clearLedger(true);
    for (let i = 0; i < 30; i++) {
      const now = start + i * day;
      ledger.add('earn_gems_level_win', 1, now);
      for (let j = 0; j < 200; j++) ledger.count(`offer_context_${j}`, 1, now);
    }
    const summary = ledgerSummary(start + 29 * day);
    expect(summary.days.length).toBeLessThan(30);
    expect(summary.days.at(-1)?.day).toBe(Math.floor(start / day) + 29);
    expect(summary.weeks.length).toBeGreaterThan(0);
    expect(summary.economy.earn_gems_level_win).toBe(30);
    expect(serializedSize()).toBeLessThanOrEqual(16 * 1024);
  });

  it('recovers from a damaged in-memory bucket without throwing', async () => {
    await clearLedger(true);
    ledger.count('round_started', 1, start);
    const summary = ledgerSummary(start);
    (summary.days[0] as unknown as { totals: null }).totals = null;
    expect(() => ledger.count('round_started', 1, start)).not.toThrow();
    expect(ledgerSummary(start).days).toEqual([]);
  });

  it('lets wallet credits and debits finish if ledger recording throws', async () => {
    await clearLedger(true);
    const p = defaultProfile(start);
    const before = p.gems;
    const broken = vi.spyOn(ledger, 'add').mockImplementation(() => {
      throw new Error('ledger unavailable');
    });
    try {
      expect(() => earn(p, 'gems', 10, 'level_win')).not.toThrow();
      expect(() => spend(p, 'gems', 4, 'cosmetic')).not.toThrow();
      expect(p.gems).toBe(before + 6);
    } finally {
      broken.mockRestore();
    }
  });
});
