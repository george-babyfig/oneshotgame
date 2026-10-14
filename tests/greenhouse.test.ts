import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import {
  build,
  chooseGreenhouse,
  collect,
  isFull,
  migrateGreenhouses,
  ready,
  recordGreenhouseWin,
  tickBuilds,
  upgrade,
} from '../src/meta/homeworld';
import type { WonRoundEvent } from '../src/meta/homeworldTypes';

const now = Date.UTC(2026, 8, 1, 12);
const event = (mode: WonRoundEvent['mode'], n: number): WonRoundEvent => ({
  mode,
  planetKey: String(n),
  buddySpecies: null,
  at: now + 3600e3,
});
function player() {
  const p = defaultProfile(now);
  p.dust = 100_000;
  p.home.level = 3;
  p.home.plots.push(...Array(4).fill(null));
  build(p, 0, 'greenhouse', now);
  build(p, 1, 'greenhouse', now);
  tickBuilds(p.home, now + 30_000);
  return p;
}

describe('Greenhouse wins', () => {
  it('maps legacy accrued stock and refunds paid levels above three once', () => {
    const p = defaultProfile(now);
    p.home.plots[0] = { type: 'greenhouse', lv: 5, since: now - 6 * 3600e3 };
    const dust = p.dust;
    expect(migrateGreenhouses(p, now)).toBe(8400 + 18_000);
    expect(p.dust).toBe(dust + 26_400);
    expect(p.home.plots[0]).toMatchObject({ lv: 3, greenhouse: { choice: 'shower', stored: 2, winsTowardNext: 0 } });
    expect(migrateGreenhouses(p, now)).toBe(0);
  });
  it('accrues from a build completed while closed and removes a capped upgrade timer', () => {
    const p = defaultProfile(now);
    p.home.plots[0] = { type: 'greenhouse', lv: 2, since: now - 10 * 3600e3, done: now - 9 * 3600e3 };
    p.home.plots[1] = { type: 'greenhouse', lv: 4, since: now - 3600e3, done: now + 3600e3 };
    migrateGreenhouses(p, now);
    expect(p.home.plots[0]?.greenhouse?.stored).toBe(1);
    expect(p.home.plots[1]).toMatchObject({ lv: 3, since: now });
    expect(p.home.plots[1]?.done).toBeUndefined();
  });
  it('grows the chosen booster every six eligible wins, never from time or other modes', () => {
    const p = player();
    expect(chooseGreenhouse(p, 0, 'scope')).toBe(true);
    expect(ready(p.home, 0, now + 100 * 3600e3)).toBe(0);
    for (const mode of ['daily', 'rush', 'challenge', 'remix', 'practice'] as const) recordGreenhouseWin(p, event(mode, 1));
    expect(p.home.plots[0]?.greenhouse?.winsTowardNext).toBe(0);
    for (let n = 0; n < 5; n++) recordGreenhouseWin(p, event('campaign', n));
    expect(ready(p.home, 0, now + 3600e3)).toBe(0);
    expect(recordGreenhouseWin(p, event('voyage', 6))).toBe(2);
    expect(ready(p.home, 0, now + 3600e3)).toBe(1);
    expect(collect(p, 0, now + 3600e3).boosters).toEqual({ scope: 1 });
    expect(p.boosters.scope).toBeGreaterThan(0);
  });

  it('retains progress on choice change, pauses at cap and gives at most two per round', () => {
    const p = player();
    for (let n = 0; n < 3; n++) recordGreenhouseWin(p, event('zen', n));
    chooseGreenhouse(p, 0, 'spark');
    expect(p.home.plots[0]?.greenhouse?.winsTowardNext).toBe(3);
    for (let n = 3; n < 6; n++) recordGreenhouseWin(p, event('zen', n));
    expect(isFull(p.home, 0, now + 3600e3)).toBe(true);
    for (let n = 0; n < 12; n++) expect(recordGreenhouseWin(p, event('campaign', n))).toBe(0);
    expect(p.home.plots[0]?.greenhouse).toMatchObject({ choice: 'spark', stored: 1, winsTowardNext: 0 });
    collect(p, 0, now + 3600e3);
    expect(upgrade(p, 0, now + 3600e3)).toBe('ok');
    tickBuilds(p.home, now + 2 * 3600e3);
    for (let n = 0; n < 12; n++) recordGreenhouseWin(p, event('campaign', n));
    expect(p.home.plots[0]?.greenhouse?.stored).toBe(2);
  });

  it('keeps each crop as itself when the choice changes before collection', () => {
    const p = player();
    expect(upgrade(p, 0, now + 3600e3)).toBe('ok');
    tickBuilds(p.home, now + 2 * 3600e3);
    const grown = (n: number) => ({ ...event('campaign', n), at: now + 3 * 3600e3 });
    for (let n = 0; n < 6; n++) recordGreenhouseWin(p, grown(n));
    chooseGreenhouse(p, 0, 'scope');
    for (let n = 6; n < 12; n++) recordGreenhouseWin(p, grown(n));
    expect(p.home.plots[0]?.greenhouse?.storedByType).toEqual({ shower: 1, spark: 0, scope: 1 });
    expect(collect(p, 0, now + 2 * 3600e3).boosters).toEqual({ shower: 1, scope: 1 });
    expect(p.home.plots[0]?.greenhouse?.storedByType).toEqual({ shower: 0, spark: 0, scope: 0 });
  });

  it('never grows a third legacy house in one round', () => {
    const p = player();
    p.home.plots[2] = {
      type: 'greenhouse',
      lv: 1,
      since: now,
      greenhouse: { choice: 'scope', winsTowardNext: 5, stored: 0 },
    };
    for (const b of p.home.plots.slice(0, 2)) if (b?.greenhouse) b.greenhouse.winsTowardNext = 5;
    expect(recordGreenhouseWin(p, event('campaign', 1))).toBe(2);
    expect(p.home.plots[2]?.greenhouse?.stored).toBe(0);
  });
});
