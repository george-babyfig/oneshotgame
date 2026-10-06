import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { build, collect, homeBadge, ready, startExpedition, tickHome } from '../src/meta/homeworld';
import { creditVaultWin, pendingDust } from '../src/meta/economy';

describe('clock guards', () => {
  it('does not collect a greenhouse or Vault while the clock is behind', () => {
    const p = defaultProfile(0);
    p.level = 5;
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    p.home.plots[0] = { type: 'greenhouse', lv: 1, since: 0, greenhouse: { choice: 'scope', winsTowardNext: 0, stored: 1 } };
    p.home.lastTick = 3_600_000;
    expect(ready(p.home, 0, 1_800_000)).toBe(0);
    expect(collect(p, 0, 1_800_000).boosters).toEqual({});
    p.lastCollect = 3_600_000;
    p.vault.lastTick = 3_600_000;
    p.vault.bankedProductionMs = 2 * 3_600_000;
    expect(pendingDust(p, 5_400_000)).toBeGreaterThan(0);
    expect(pendingDust(p, 1_800_000)).toBe(0);
    expect(tickHome(p, 1_800_000)).toEqual([]);
    expect(p.home.lastTick).toBe(3_600_000);
    expect(build(p, 1, 'greenhouse', 1_800_000)).toBe('busy');
    expect(startExpedition(p, 'bunny', 1, 1_800_000)).toBe(false);
  });
  it('credits fuelled Vault time once; a Greenhouse only fills through wins', () => {
    const p = defaultProfile(0);
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    p.home.plots[0] = { type: 'greenhouse', lv: 1, since: 0, greenhouse: { choice: 'scope', winsTowardNext: 0, stored: 0 } };
    creditVaultWin(p, { mode: 'campaign', planetKey: 'campaign:1', buddySpecies: null, at: 0 });
    tickHome(p, 3_600_000);
    expect(pendingDust(p, 3_600_000)).toBeGreaterThan(0);
    expect(ready(p.home, 0, 100 * 3_600_000)).toBe(0);
    expect(collect(p, 0, 3_600_000).boosters).toEqual({});
  });
  it('badges things ready to act on, not work in progress', () => {
    const p = defaultProfile(0);
    p.level = 5;
    p.home.plots[0] = { type: 'greenhouse', lv: 1, since: 0, done: 10_000 };
    expect(homeBadge(p, 0)).toBe(0);
    expect(homeBadge(p, 10_000)).toBe(1);
  });
});
