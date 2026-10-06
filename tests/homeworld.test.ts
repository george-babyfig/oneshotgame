import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import {
  BUILD_TIME,
  BUILDING_TYPES,
  build,
  buildCost,
  canExpand,
  canUpgrade,
  collectAll,
  denCapacity,
  drones,
  expand,
  finishExpedition,
  invite,
  retireBuildings,
  startExpedition,
  tickBuilds,
  tickHome,
  upgrade,
  wearAcc,
  sendHome,
  addFriendship,
  speedUpBuilds,
  moveBuilding,
} from '../src/meta/homeworld';
import { HOME_LEVEL_REQUIREMENTS } from '../src/meta/tuning';

const T0 = Date.UTC(2026, 8, 1, 12);
const H = 3600e3;
function rich() {
  const p = defaultProfile(T0);
  p.dust = 1_000_000;
  p.level = 91;
  p.mats = { stone: 1000, dew: 1000, leaf: 1000, ember: 1000, frost: 1000 };
  return p;
}

describe('Homeworld levels', () => {
  it('requires chapters, dust and every Essence before paying atomically', () => {
    const p = rich();
    p.level = 10;
    expect(canExpand(p)).toBe('chapter');
    p.level = 11;
    p.dust = 1499;
    expect(canExpand(p)).toBe('dust');
    p.dust = 1500;
    p.mats.leaf = 19;
    const before = { dust: p.dust, mats: { ...p.mats } };
    expect(canExpand(p)).toBe('essence');
    expect(expand(p)).toBe('essence');
    expect(p.dust).toBe(before.dust);
    expect(p.mats).toEqual(before.mats);
    p.mats.leaf = 20;
    expect(expand(p)).toBe('ok');
    expect(p.home.level).toBe(2);
    expect(p.home.plots).toHaveLength(8);
    expect(p.dust).toBe(0);
    expect(p.mats).toMatchObject({ leaf: 0, dew: 980 });
  });

  it('opens visible plot space and a free third drone at Level 3', () => {
    const p = rich();
    expect(drones(p)).toBe(2);
    p.pass = true;
    expect(drones(p)).toBe(3);
    p.pass = false;
    expect(build(p, 0, 'launch_bay', T0)).toBe('ring');
    expect(expand(p)).toBe('ok');
    expect(build(p, 0, 'launch_bay', T0)).toBe('ok');
    expect(expand(p)).toBe('ok');
    expect(p.home.level).toBe(3);
    expect(p.home.plots).toHaveLength(10);
    expect(drones(p)).toBe(3);
    expect(expand(p)).toBe('ok');
    expect(p.home.plots).toHaveLength(12);
    expect(expand(p)).toBe('ok');
    expect(p.home.plots).toHaveLength(14);
    expect(canExpand(p)).toBe('max');
  });

  it('refuses a third concurrent build at Level 2, permits decoration and opens the drone at Level 3', () => {
    const p = rich();
    expand(p);
    expect(build(p, 0, 'den', T0)).toBe('ok');
    expect(build(p, 1, 'greenhouse', T0)).toBe('ok');
    expect(build(p, 2, 'launch_bay', T0)).toBe('drones');
    expect(build(p, 2, 'fountain', T0)).toBe('ok');
    expand(p);
    expect(build(p, 3, 'launch_bay', T0)).toBe('ok');
  });

  it('charges all four level payments and never charges an old level again', () => {
    const p = rich();
    const beforeDust = p.dust;
    const beforeMats = { ...p.mats };
    for (const level of [2, 3, 4, 5] as const) {
      expect(expand(p)).toBe('ok');
      expect(p.home.level).toBe(level);
      expect(p.home.plots).toHaveLength(4 + level * 2);
    }
    expect(beforeDust - p.dust).toBe(48_500);
    expect(p.mats).toEqual({
      stone: beforeMats.stone! - 100,
      dew: beforeMats.dew! - 120,
      leaf: beforeMats.leaf! - 120,
      ember: beforeMats.ember! - 90,
      frost: beforeMats.frost! - 100,
    });
    expect(expand(p)).toBe('max');
    expect(beforeDust - p.dust).toBe(48_500);
  });

  it('uses the specified costs and protects the old level during upgrades', () => {
    const p = rich();
    expect(HOME_LEVEL_REQUIREMENTS[4].essence.frost).toBe(40);
    expect(HOME_LEVEL_REQUIREMENTS[5].essence.frost).toBe(60);
    expect([1, 2, 3, 4, 5].map((lv) => buildCost('den', lv))).toEqual([250, 630, 1500, 3500, 7500]);
    expect([1, 2, 3].map((lv) => buildCost('greenhouse', lv))).toEqual([600, 1500, 3600]);
    expect([1, 2, 3, 4, 5].map((lv) => buildCost('launch_bay', lv))).toEqual([800, 2000, 4800, 11200, 24000]);
    expect(BUILD_TIME).toEqual([0, 30_000, 300_000, 1_800_000, 7_200_000, 14_400_000]);
    expect(build(p, 0, 'den', T0)).toBe('ok');
    tickBuilds(p.home, T0 + H);
    expect(denCapacity(p.home, T0 + H)).toBe(2);
    expect(canUpgrade(p, 0, T0 + H)).toBe('ring');
    expand(p);
    expect(upgrade(p, 0, T0 + H)).toBe('ok');
    expect(denCapacity(p.home, T0 + H + 1)).toBe(2);
    tickBuilds(p.home, T0 + 2 * H);
    expect(denCapacity(p.home, T0 + 2 * H)).toBe(3);
  });
});

describe('retirements and preservation', () => {
  it('hides retired producers and refunds paid building tiers once, including upgrades in flight', () => {
    const p = rich();
    expect(BUILDING_TYPES).not.toContain('mill');
    expect(BUILDING_TYPES).not.toContain('grove');
    expect(BUILDING_TYPES).not.toContain('observatory');
    expect(build(p, 0, 'mill', T0)).toBe('max');
    p.home.plots[0] = { type: 'mill', lv: 2, since: T0, done: T0 + H };
    p.home.plots[1] = { type: 'grove', lv: 1, since: T0 };
    p.home.plots[2] = { type: 'observatory', lv: 3, since: T0 };
    p.home.debris = [3];
    const expected = 150 + 380 + 2000 + 2500 + 6250 + 15000;
    const before = p.dust;
    expect(retireBuildings(p)).toBe(expected);
    expect(p.dust).toBe(before + expected);
    expect(p.home.plots.slice(0, 3)).toEqual([null, null, null]);
    expect(p.home.debris).toEqual([]);
    expect(retireBuildings(p)).toBe(0);
    tickHome(p, T0 + 3 * H);
    expect(collectAll(p, T0 + 3 * H)).toEqual({ dust: 0, gems: 0, boosters: {} });
  });

  it('keeps the existing Bay expedition and residents', () => {
    const p = rich();
    p.seen = ['otter'];
    expand(p);
    build(p, 0, 'den', T0);
    build(p, 1, 'launch_bay', T0);
    tickBuilds(p.home, T0 + H);
    expect(invite(p, 'otter')).toBe(true);
    expect(startExpedition(p, 'otter', 1, T0 + H)).toBe(true);
    expect(finishExpedition(p, T0 + H + 30 * 60e3)).toBeNull();
    const fp = p.home.residents[0].fp;
    expect(finishExpedition(p, T0 + 2 * H)?.dust).toBeGreaterThan(0);
    expect(p.home.lastTick).toBe(T0 + 2 * H);
    expect(startExpedition(p, 'otter', 1, T0 + H)).toBe(false);
    expect(finishExpedition(p, T0 + 2 * H)).toBeNull();
    expect(p.home.residents[0].fp).toBe(fp);
  });
});

describe('Homeworld exploit guards', () => {
  it('remembers friendship and its paid levels after a creature leaves and returns', () => {
    const p = rich();
    p.seen = ['bunny'];
    build(p, 0, 'den', T0);
    tickBuilds(p.home, T0 + H);
    expect(invite(p, 'bunny')).toBe(true);
    const resident = p.home.residents[0];
    addFriendship(p, resident, 9);
    const earned = p.gems;
    expect(sendHome(p, 'bunny')).toBe(true);
    expect(invite(p, 'bunny')).toBe(true);
    expect(p.home.residents[0]).toMatchObject({ fp: 9, rewarded: resident.rewarded });
    addFriendship(p, p.home.residents[0], 0);
    expect(p.gems).toBe(earned);
  });

  it('never speeds completed builds into the past', () => {
    const p = rich();
    build(p, 0, 'den', T0);
    expect(speedUpBuilds(p.home, 600_000, T0 + H)).toBe(0);
    tickBuilds(p.home, T0 + H);
    expect(p.home.plots[0]?.since).toBe(T0 + BUILD_TIME[1]);
  });

  it('charges a gem accessory only once and moves a building without losing it', () => {
    const p = rich();
    p.seen = ['otter'];
    build(p, 0, 'den', T0);
    tickBuilds(p.home, T0 + H);
    invite(p, 'otter');
    p.gems = 100;
    expect(wearAcc(p, 'otter', 'shades')).toBe('ok');
    expect(p.gems).toBe(60);
    expect(wearAcc(p, 'otter', 'shades')).toBe('ok');
    expect(p.gems).toBe(60);
    expect(moveBuilding(p.home, 0, 1)).toBe(true);
    expect(p.home.plots[1]?.type).toBe('den');
  });
});
