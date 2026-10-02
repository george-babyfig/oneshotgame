import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { build, collect, homeBadge, ready, startExpedition, tickHome } from '../src/meta/homeworld';
import { pendingDust } from '../src/meta/economy';

describe('clock guards', () => {
  it('does not credit a producer or vault while the clock is behind', () => {
    const p = defaultProfile(0);
    p.level = 5;
    p.home.plots[0] = { type: 'mill', lv: 1, since: 0 };
    p.home.lastTick = 3_600_000;
    expect(ready(p.home, 0, 1_800_000)).toBe(0);
    expect(collect(p, 0, 1_800_000).dust).toBe(0);
    p.lastCollect = 3_600_000;
    expect(pendingDust(p, 1_800_000)).toBe(0);
    expect(tickHome(p, 1_800_000)).toEqual([]);
    expect(p.home.lastTick).toBe(3_600_000);
    expect(build(p, 1, 'mill', 1_800_000)).toBe('busy');
    expect(startExpedition(p, 'bunny', 1, 1_800_000)).toBe(false);
  });
  it('credits forward time once and caps a producer', () => {
    const p = defaultProfile(0);
    p.home.plots[0] = { type: 'mill', lv: 1, since: 0 };
    tickHome(p, 3_600_000);
    expect(collect(p, 0, 3_600_000).dust).toBe(40);
    expect(collect(p, 0, 3_600_000).dust).toBe(0);
    expect(ready(p.home, 0, 100 * 3_600_000)).toBe(240);
  });
  it('badges things ready to act on, not work in progress', () => {
    const p = defaultProfile(0);
    p.level = 5;
    p.home.plots[0] = { type: 'mill', lv: 1, since: 0, done: 10_000 };
    expect(homeBadge(p, 0)).toBe(0);
    expect(homeBadge(p, 10_000)).toBe(1);
  });
});
