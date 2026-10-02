import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { guardGrownups } from '../src/ui/screens/grownups';
import { defaultProfile } from '../src/meta/profile';
import { COSMETICS, isPaidLook, visibleCosmetics } from '../src/meta/cosmetics';
import { PRODUCTS } from '../src/meta/tuning';
import { clearLedger, ledger, playTimeThisWeek, purchaseHistory, recordPurchase, spentThisMonth } from '../src/meta/ledger';
import { deviceCurrency, formatCurrency } from '../src/meta/currency';

describe('Grown-ups boundary', () => {
  it('renders only after the gate passes', async () => {
    const show = vi.fn();
    expect(await guardGrownups(async () => false, show)).toBe(false);
    expect(show).not.toHaveBeenCalled();
    expect(await guardGrownups(async () => true, show)).toBe(true);
    expect(show).toHaveBeenCalledOnce();
  });

  it('keeps gem packs and the Piggy Bank in the adult shop module', () => {
    const shop = readFileSync('src/ui/screens/shop.ts', 'utf8');
    const kid = ['styles', 'home', 'missions'].map((name) => readFileSync(`src/ui/screens/${name}.ts`, 'utf8')).join('\n');
    expect(shop).toContain('PRODUCTS.map');
    expect(PRODUCTS.filter((x) => x.consumable && x.gems > 0)).toHaveLength(4);
    expect(PRODUCTS.some((x) => x.key === 'piggy')).toBe(true);
    expect(kid).not.toMatch(/showShop\(|Gem Piggy Bank|Handful of Gems|Pouch of Gems|Chest of Gems|Galaxy of Gems/);
    const english = [...kid.matchAll(/\bt\(['"]([^'"\n]*)/g)].map((m) => m[1]).join('\n');
    expect(english).not.toMatch(/[$€¥]/);
  });

  it('hides paid looks but keeps earned looks', () => {
    const p = defaultProfile();
    const paid = COSMETICS.filter(isPaidLook);
    expect(paid.length).toBeGreaterThan(0);
    expect(visibleCosmetics(p)).toEqual(COSMETICS);
    p.settings.hidePaidLooks = true;
    expect(visibleCosmetics(p).some(isPaidLook)).toBe(false);
    expect(visibleCosmetics(p).some((x) => x.source === 'gems')).toBe(true);
  });

  it('summarizes this week and this month without counting older records', async () => {
    await clearLedger(true);
    const now = Date.UTC(2026, 8, 29);
    ledger.count('round_started', 2, now);
    ledger.add('round_seconds', 125, now);
    recordPurchase({ tx: 'one', key: 'gems_s', cents: 99, at: now });
    recordPurchase({ tx: 'one', key: 'gems_s', cents: 99, at: now });
    recordPurchase({ tx: 'old', key: 'gems_m', cents: 499, at: Date.UTC(2026, 7, 1) });
    expect(playTimeThisWeek(now)).toEqual({ rounds: 2, minutes: 2 });
    expect(spentThisMonth(now)).toBe(99);
  });

  it('formats reminders in the selected currency and keeps currency totals separate', async () => {
    expect(deviceCurrency('fr-FR')).toBe('EUR');
    expect(formatCurrency(500, 'EUR', 'fr-FR')).toBe(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(5));
    await clearLedger(true);
    const now = Date.UTC(2026, 8, 29);
    recordPurchase({ tx: 'eur', key: 'starter', cents: 299, currency: 'EUR', at: now });
    recordPurchase({ tx: 'usd', key: 'gems_s', cents: 99, currency: 'USD', at: now });
    expect(spentThisMonth(now, 'EUR')).toBe(299);
    expect(spentThisMonth(now, 'USD')).toBe(99);
  });

  it('clears play history while keeping purchase history and the monthly total', async () => {
    await clearLedger(true);
    const now = Date.UTC(2026, 8, 29);
    ledger.count('round_started', 2, now);
    recordPurchase({ tx: 'kept-purchase', key: 'gems_s', cents: 99, at: now });
    await clearLedger();
    expect(playTimeThisWeek(now).rounds).toBe(0);
    expect(spentThisMonth(now)).toBe(99);
    expect(purchaseHistory()).toHaveLength(1);
  });
});
