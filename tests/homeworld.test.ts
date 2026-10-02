import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import {
  BUILD_TIME,
  DEBRIS_EVERY,
  RING_PLOTS,
  WIN_SPEEDUP,
  build,
  busyDrones,
  canExpand,
  canUpgrade,
  collect,
  denCapacity,
  expand,
  finishExpedition,
  fulfil,
  invite,
  isFull,
  moveBuilding,
  ready,
  requestOf,
  speedUpBuilds,
  startExpedition,
  tickBuilds,
  tickDebris,
  upgrade,
  clearDebris,
} from '../src/meta/homeworld';

const H = 3600e3;
const T0 = Date.UTC(2026, 8, 1, 12);

function rich() {
  const p = defaultProfile(T0);
  p.dust = 1e6;
  p.gems = 1000;
  p.level = 45; // four chapters done
  return p;
}

describe('homeworld', () => {
  it('builds with a drone and finishes on time', () => {
    const p = rich();
    expect(build(p, 0, 'mill', T0)).toBe('ok');
    expect(p.dust).toBe(1e6 - 150);
    expect(busyDrones(p.home, T0)).toBe(1);
    expect(tickBuilds(p.home, T0 + BUILD_TIME[1] - 1)).toEqual([]);
    expect(tickBuilds(p.home, T0 + BUILD_TIME[1])).toEqual([0]);
    expect(busyDrones(p.home, T0 + BUILD_TIME[1])).toBe(0);
  });

  it('limits drones (2 free, 3 with the pass) but never for decorations', () => {
    const p = rich();
    build(p, 0, 'mill', T0);
    build(p, 1, 'mill', T0);
    expect(build(p, 2, 'mill', T0)).toBe('drones');
    expect(build(p, 2, 'lantern', T0)).toBe('ok');
    p.pass = true;
    expect(build(p, 3, 'mill', T0)).toBe('ok');
  });

  it('gates buildings and upgrades by ring', () => {
    const p = rich();
    expect(build(p, 0, 'grove', T0)).toBe('ring');
    build(p, 0, 'mill', T0);
    tickBuilds(p.home, T0 + H);
    expect(canUpgrade(p, 0, T0 + H)).toBe('ring'); // lv2 needs ring 2
    expect(expand(p)).toBe('ok');
    expect(p.home.plots.length).toBe(RING_PLOTS[2]);
    expect(upgrade(p, 0, T0 + H)).toBe('ok');
    expect(p.home.plots[0]!.lv).toBe(2);
  });

  it('ring expansion needs finished chapters', () => {
    const p = rich();
    p.level = 5;
    expect(canExpand(p)).toBe('chapter');
    p.level = 11;
    expect(canExpand(p)).toBe('ok');
  });

  it('produces up to a cap and keeps partial progress', () => {
    const p = rich();
    build(p, 0, 'mill', T0);
    const start = T0 + BUILD_TIME[1];
    tickBuilds(p.home, start);
    expect(ready(p.home, 0, start + 0.5 * H)).toBe(20);
    const c = collect(p, 0, start + 0.5 * H + 30e3); // 20.33 units
    expect(c.dust).toBe(20);
    // the leftover third of a unit is kept
    expect(ready(p.home, 0, start + 0.5 * H + 30e3 + 60e3)).toBe(1);
    // capped at 6 hours of production
    expect(ready(p.home, 0, start + 100 * H)).toBe(40 * 6);
    expect(isFull(p.home, 0, start + 100 * H)).toBe(true);
  });

  it('a campaign win speeds builds up; no gem skips exist', () => {
    const p = rich();
    build(p, 0, 'mill', T0);
    tickBuilds(p.home, T0 + H);
    expand(p);
    upgrade(p, 0, T0 + H);
    const done = p.home.plots[0]!.done!;
    expect(speedUpBuilds(p.home, WIN_SPEEDUP, T0 + H)).toBe(1);
    expect(p.home.plots[0]!.done).toBe(Math.max(T0 + H, done - WIN_SPEEDUP));
  });

  it('moves buildings to empty plots', () => {
    const p = rich();
    build(p, 0, 'lantern', T0);
    expect(moveBuilding(p.home, 0, 3)).toBe(true);
    expect(p.home.plots[3]?.type).toBe('lantern');
    expect(moveBuilding(p.home, 3, 3)).toBe(false);
  });

  it('residents move into dens and grant friendship', () => {
    const p = rich();
    p.seen = ['otter', 'fox', 'deer'];
    expect(invite(p, 'otter')).toBe(false); // no den yet
    build(p, 0, 'den', T0);
    expect(denCapacity(p.home, T0)).toBe(0); // still under construction
    tickBuilds(p.home, T0 + H);
    expect(denCapacity(p.home, T0 + H)).toBe(2);
    expect(invite(p, 'otter')).toBe(true);
    expect(invite(p, 'unicorn')).toBe(false); // not discovered
    const r = p.home.residents[0];
    let now = T0 + H;
    let done = 0;
    for (let i = 0; i < 40 && done < 3; i++, now += 6 * H) {
      const req = requestOf(r, now, p.home.ring)!;
      if (req.kind === 'decor' && !p.home.plots.some((b) => b?.type === req.decor)) build(p, 1 + i, req.decor!, now);
      if (fulfil(p, 'otter', now).result === 'ok') done++;
      expect(requestOf(r, now, p.home.ring)).toBeNull();
    }
    expect(r.fp).toBeGreaterThanOrEqual(3);
  });

  it('expeditions return with loot and friendship', () => {
    const p = rich();
    p.seen = ['otter'];
    expand(p);
    build(p, 0, 'den', T0);
    build(p, 1, 'tower', T0);
    tickBuilds(p.home, T0 + H);
    invite(p, 'otter');
    expect(startExpedition(p, 'otter', 4, T0 + H)).toBe(false); // tower lv1: 1h only
    expect(startExpedition(p, 'otter', 1, T0 + H)).toBe(true);
    expect(finishExpedition(p, T0 + H + 30 * 60e3)).toBeNull();
    const dust = p.dust;
    const got = finishExpedition(p, T0 + 2 * H)!;
    expect(got.dust).toBeGreaterThan(0);
    expect(p.dust).toBe(dust + got.dust);
    expect(p.home.residents[0].fp).toBeGreaterThan(0);
  });

  it('meteor debris falls on empty plots only, capped', () => {
    const p = rich();
    ['lantern', 'lantern', 'lantern', 'fountain', 'fountain'].forEach((d, i) => build(p, i, d as 'lantern', T0));
    tickDebris(p.home, T0 + 20 * DEBRIS_EVERY);
    expect(p.home.debris.length).toBe(1); // only plot 5 was free
    expect(p.home.debris[0]).toBe(5);
    expect(clearDebris(p, 5)).toBeGreaterThan(0);
    expect(p.home.debris).toEqual([]);
  });
});

describe('resident dress-up and outfit presets', async () => {
  const H = await import('../src/meta/homeworld');
  const C = await import('../src/meta/cosmetics');
  it('accessories unlock with friendship or are bought once with gems', () => {
    const p = defaultProfile();
    p.seen = ['otter'];
    p.home.residents = [{ species: 'otter', fp: 0, lastReq: -1, rewarded: 1 }];
    expect(H.wearAcc(p, 'otter', 'bow')).toBe('locked');
    p.home.residents[0].fp = 3;
    expect(H.wearAcc(p, 'otter', 'bow')).toBe('ok');
    p.gems = 30;
    expect(H.wearAcc(p, 'otter', 'shades')).toBe('gems');
    p.gems = 100;
    expect(H.wearAcc(p, 'otter', 'shades')).toBe('ok');
    expect(p.gems).toBe(60);
    expect(H.wearAcc(p, 'otter', 'shades')).toBe('ok');
    expect(p.gems).toBe(60); // bought once
  });
  it('saves and loads outfits, falling back for items no longer owned', () => {
    const p = defaultProfile();
    p.wardrobe = ['hat_sprout'];
    C.equip(p, 'hat_sprout');
    C.savePreset(p, 1);
    C.equip(p, 'hat_antenna');
    expect(C.loadPreset(p, 1)).toBe(true);
    expect(C.currentLook(p).hat).toBe('hat_sprout');
    p.wardrobe = [];
    C.loadPreset(p, 1);
    expect(C.currentLook(p).hat).toBe(C.DEFAULT_LOOK.hat);
    expect(C.loadPreset(p, 2)).toBe(false);
  });
});

describe('homeworld exploit fixes', async () => {
  const Hw = await import('../src/meta/homeworld');
  it('saying goodbye and re-inviting does not reset friendship or requests', () => {
    const p = rich();
    p.seen = ['bunny'];
    Hw.build(p, 0, 'den', T0);
    Hw.tickBuilds(p.home, T0 + H);
    Hw.invite(p, 'bunny');
    const r = p.home.residents[0];
    r.fp = 4;
    r.rewarded = 2;
    r.lastReq = Hw.period(T0 + H);
    Hw.sendHome(p, 'bunny');
    Hw.invite(p, 'bunny');
    expect(p.home.residents[0]).toMatchObject({ fp: 4, rewarded: 2, lastReq: Hw.period(T0 + H) });
    expect(Hw.requestOf(p.home.residents[0], T0 + H)).toBeNull();
  });
  it('win speed-ups only shorten builds still running, never into the past', () => {
    const p = rich();
    Hw.build(p, 0, 'mill', T0); // done at T0 + 30s
    expect(Hw.speedUpBuilds(p.home, Hw.WIN_SPEEDUP, T0 + H)).toBe(0);
    Hw.tickBuilds(p.home, T0 + H);
    expect(p.home.plots[0]!.since).toBe(T0 + BUILD_TIME[1]);
  });
  it('upgrading keeps the previous level working until done', () => {
    const p = rich();
    p.level = 45;
    Hw.expand(p);
    Hw.build(p, 0, 'den', T0);
    Hw.tickBuilds(p.home, T0 + H);
    expect(Hw.denCapacity(p.home, T0 + H)).toBe(2);
    Hw.upgrade(p, 0, T0 + H);
    expect(Hw.denCapacity(p.home, T0 + H + 1)).toBe(2);
    Hw.tickBuilds(p.home, T0 + 3 * H);
    expect(Hw.denCapacity(p.home, T0 + 3 * H)).toBe(3);
  });
  it('a level-1 greenhouse produces within its cap', () => {
    const p = rich();
    p.level = 45;
    Hw.expand(p);
    Hw.build(p, 0, 'greenhouse', T0);
    Hw.tickBuilds(p.home, T0 + H);
    expect(Hw.ready(p.home, 0, T0 + 100 * H)).toBeGreaterThan(0);
  });
  it('friendship from expeditions pays each level once', () => {
    const p = rich();
    const r = { species: 'otter', fp: 0, lastReq: -1, rewarded: 1 };
    const g = p.gems;
    Hw.addFriendship(p, r, 9); // level 1 -> 3
    expect(p.gems).toBe(g + 10 + 15);
  });
});
