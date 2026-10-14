import { stylesAccess } from '../src/meta/stylesAccess';
import { isoWeek } from '../src/meta/events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaultProfile, migrate, today, type Profile } from '../src/meta/profile';
import { ROAD01 } from '../src/meta/content/road01';
import {
  anyRoadReady,
  claimRoad,
  currentRoad,
  grantProfileRoadPoints,
  grantRoadPass,
  newRoadState,
  observeRoadDay,
  pastRoads,
  playableRoads,
  productOpen,
  roadCap,
  roadCloseOn,
  roadForProduct,
  roadHasPass,
  roadReady,
  ROAD_CATALOG,
  FREE_ROAD_GEMS,
  PASS_GEMS,
  type RoadDefinition,
} from '../src/meta/starroad';
import {
  COSMETIC_BY_ID,
  STARDUST_COSMETICS,
  STYLES_RELEASE,
  availableStylesRelease,
  markStylesReleaseSeen,
  cosmeticOpen,
  currentLook,
  grantWishSampler,
  owns,
  roadTierOf,
  stylesNewDot,
  visibleCosmetics,
} from '../src/meta/cosmetics';
import { grantProduct, ownsProduct, restoreProduct, revokeProduct } from '../src/meta/economy';
import { productOpeningText } from '../src/ui/flows/contents';
import { PRODUCTS } from '../src/meta/tuning';
import { checkMail, letterOf } from '../src/meta/inbox';
import { ROAD_LANDMARKS } from '../src/meta/roadLandmarks';
import { hasSticker, visibleStickers, ownedStickers } from '../src/meta/stickers';
import { unlocked } from '../src/meta/unlocks';
import { BANNERS, visibleBanners, currentBanner } from '../src/meta/passport';

// A scenario, not an approved live opening date (decision 81).
const OPEN = '2026-12-28';
const BEFORE = '2026-12-27';
const installedOpening = ROAD01.road.opensOn;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${OPEN}T12:00:00Z`));
  ROAD01.road.opensOn = OPEN;
});
afterEach(() => {
  ROAD01.road.opensOn = installedOpening;
  vi.useRealTimers();
});
function roadZero(p: Profile) {
  const r = p.roadRecords.road00;
  return structuredClone({
    record: {
      points: r.points,
      claimedFreeTierIds: r.claimedFreeTierIds,
      claimedPaidTierIds: r.claimedPaidTierIds,
      legacyGrantIds: r.legacyGrantIds,
      lastCreditedDay: r.lastCreditedDay,
      earnedOnLastCreditedDay: r.earnedOnLastCreditedDay,
    },
    roadPoints: p.roadPoints,
    road: p.road,
    roadPass: p.roadPass,
    pass: p.pass,
    entitlements: p.roadPassEntitlements,
    skins: p.skins,
  });
}
const pass = () => ROAD01.products.find((p) => p.kind === 'road_pass')!;

describe('B8 per-Road entitlements', () => {
  it.each(ROAD_CATALOG)('$id grant, replay, refund and restore own only that Road', (road) => {
    const product = PRODUCTS.find((p) => roadForProduct(p.id) === road.id)!;
    expect(product).toBeDefined();
    const p = defaultProfile(0);
    for (const def of ROAD_CATALOG) {
      p.roadRecords[def.id] = newRoadState();
      p.roadRecords[def.id].points = 200;
    }
    p.roadPoints = 200;
    const other = ROAD_CATALOG.find((def) => def.id !== road.id)!;
    const unchanged = structuredClone(p.roadRecords[other.id]);
    const wallet = [p.gems, p.dust, structuredClone(p.boosters)];
    expect(grantProduct(p, product.id, 'one')?.gems).toBe(0);
    expect(ownsProduct(p, product.id)).toBe(true);
    expect(roadHasPass(p, road.id)).toBe(true);
    expect(p.roadRecords[road.id].claimedPaidTierIds).toEqual(road.tiers.map((t) => t.id));
    expect(p.roadRecords[other.id]).toEqual(unchanged);
    expect(roadHasPass(p, other.id)).toBe(false);
    const items = road.tiers.flatMap((t) => (t.pass.item ? [t.pass.item] : []));
    for (const item of items) expect(owns(p, item), item).toBe(true);
    const skin = road.tiers.find((t) => t.pass.skin)!.pass.skin!;
    p.skin = skin;
    expect(p.skins).toContain(skin);
    expect(grantProduct(p, product.id, 'one')).toBeNull();
    const claims = [...p.roadRecords[road.id].claimedPaidTierIds];
    expect(revokeProduct(p, product.id, Date.now())).toBe(true);
    expect(p.roadPassEntitlements).not.toContain(road.id);
    expect(ownsProduct(p, product.id)).toBe(false);
    expect(p.skin).toBe('classic');
    expect(p.skins).not.toContain(skin);
    for (const item of items) expect(owns(p, item), item).toBe(false);
    expect(p.roadRecords[road.id].claimedPaidTierIds).toEqual(claims);
    expect(p.roadRecords[other.id]).toEqual(unchanged);
    expect(restoreProduct(p, product.id)).toBe(true);
    expect(restoreProduct(p, product.id)).toBe(false);
    expect(grantRoadPass(p, road.id)).toEqual([]);
    expect(p.skins).toContain(skin);
    for (const item of items) expect(owns(p, item), item).toBe(true);
    expect([p.gems, p.dust, p.boosters]).toEqual(wallet);
    expect(p.roadRecords[other.id]).toEqual(unchanged);
  });

  it('ignores Road 0 claims, the legacy Pass bit, wardrobe and product IDs for Road 1 looks', () => {
    const p = defaultProfile(0);
    p.pass = true;
    p.roadPass = Array.from({ length: 20 }, (_, i) => i);
    p.road = [...p.roadPass];
    p.wardrobe = ROAD01.looks.map((item) => item.id);
    p.meta.productEntitlements = [pass().id];
    for (const item of ROAD01.looks.filter((x) => x.source === 'pass' || x.source === 'road')) {
      expect(owns(p, item.id), item.id).toBe(false);
      expect(roadTierOf(item.id)?.road).toBe('road01');
    }
    expect(ownsProduct(p, pass().id)).toBe(false);
    p.roadRecords.road01 = newRoadState();
    p.roadRecords.road01.points = 200;
    claimRoad(p, 3, 'road01');
    expect(owns(p, ROAD01.road.tiers[3].reward.item!)).toBe(true);
    expect(owns(p, ROAD01.road.tiers[3].pass.item!)).toBe(false);
    expect(grantProduct(p, pass().id, 'road1')).not.toBeNull();
    expect(owns(p, ROAD01.road.tiers[3].pass.item!)).toBe(true);
  });

  it('purchase before opening records entitlement but neither claims nor reveals a paid step', () => {
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    const p = defaultProfile(0);
    const zero = roadZero(p);
    p.roadRecords.road01 = { ...newRoadState(), points: 20 };
    grantProduct(p, pass().id, 'early');
    expect(roadZero(p).record).toEqual(zero.record);
    expect(p.pass).toBe(false);
    expect(stylesAccess(p)).toBe(true);
    expect(p.roadPass).toEqual(zero.roadPass);
    expect(p.skins).toEqual(zero.skins);
    expect(roadHasPass(p, 'road01')).toBe(true);
    expect(p.roadRecords.road01.claimedPaidTierIds).toEqual([]);
    expect(roadReady(p, 'road01')).toEqual([]);
    expect(claimRoad(p, 0, 'road01')).toEqual([]);
    observeRoadDay(p, OPEN);
    expect(grantRoadPass(p, 'road01')).toHaveLength(2);
    expect(p.roadRecords.road01.claimedPaidTierIds).toEqual(ROAD01.road.tiers.slice(0, 2).map((t) => t.id));
  });

  it('maps only Pass products and reports per-Road totals and claims', () => {
    for (const product of PRODUCTS)
      expect(roadForProduct(product.id)).toBe(product.kind === 'road_pass' ? (product.roadId ?? 'road00') : undefined);
    expect(roadForProduct('unknown')).toBeUndefined();
    for (const road of ROAD_CATALOG) {
      expect(FREE_ROAD_GEMS[road.id]).toBe(150);
      expect(PASS_GEMS[road.id]).toBe(0);
    }
    const p = defaultProfile(0);
    p.roadRecords.road01 = { ...newRoadState(), points: 10 };
    expect(roadReady(p)).toEqual([]);
    expect(anyRoadReady(p)).toBe(true);
    claimRoad(p, 0, 'road01');
    expect(anyRoadReady(p)).toBe(false);
    p.roadRecords.road01.points = 200;
    claimRoad(p, 19, 'road01');
    expect(hasSticker(p, 'road01')).toBe(true);
  });
});

describe('B9 Road 0 release goldens', () => {
  it.each([
    'tests/fixtures/saves/j-release-1.0.v6.json',
    'tests/fixtures/saves/k-release-1.1.v7.json',
    'tests/fixtures/road/road0-unfinished-at-road1.v7.json',
  ])('%s preserves every B9 field and reachable reward at opensOn minus one', (file) => {
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    ROAD01.road.opensOn = undefined;
    const baseline = migrate(raw);
    const fields = roadZero(baseline);
    const rewards = roadReady(baseline).map((i) => ROAD_CATALOG[0].tiers[i]);
    ROAD01.road.opensOn = OPEN;
    const p = migrate(raw);
    observeRoadDay(p, BEFORE);
    expect(roadZero(p)).toEqual(fields);
    expect(roadReady(p).map((i) => ROAD_CATALOG[0].tiers[i])).toEqual(rewards);
    expect(playableRoads(p).map((road) => road.id)).toEqual(['road00']);
    expect(p.roadRecords.road01).toBeUndefined();
    expect(p.roadRecords.road00.plannedEndOn).toBe(BEFORE);
    expect(roadCloseOn('road00')).toBe(BEFORE);
    expect(roadCap(p.roadRecords.road00, '2026-12-13')).toBe(4);
    expect(roadCap(p.roadRecords.road00, '2026-12-14')).toBe(8);
    expect(roadCap(p.roadRecords.road00, BEFORE)).toBe(8);
    expect(roadCap(p.roadRecords.road00, OPEN)).toBe(4);
    expect(p.roadRecords.road00.creditedEarningKeys).toEqual([]);
    expect(p.roadCreditedEarningKeys.length).toBeGreaterThan(0);
  });
});

describe('14.3 shared capped earning evidence', () => {
  it('keeps the newest 600 keys through earning and reload, with no per-Road duplication', () => {
    const p = defaultProfile(0);
    p.roadCreditedEarningKeys = Array.from({ length: 600 }, (_, i) => `daily:old:${i}`);
    p.roadRecords.road00.creditedEarningKeys = ['campaign:legacy'];
    const event = { source: 'wish' as const, date: OPEN, earningKey: 'new', delta: 1 };
    expect(grantProfileRoadPoints(p, event)).toBe(1);
    expect(p.roadCreditedEarningKeys).toHaveLength(600);
    expect(p.roadCreditedEarningKeys.at(-1)).toBe('wish:new');
    expect(p.roadCreditedEarningKeys).not.toContain('daily:old:0');
    for (const state of Object.values(p.roadRecords)) expect(state.creditedEarningKeys).toEqual([]);
    const loaded = migrate(JSON.parse(JSON.stringify(p)));
    expect(loaded.roadCreditedEarningKeys).toEqual(p.roadCreditedEarningKeys);
    expect(grantProfileRoadPoints(loaded, event)).toBe(0);
  });

  it('continues the slow Road 0 at Road 2 v8 scenario with the oldest started Road', () => {
    const fixture = 'tests/fixtures/road/slow-road0-at-road2.v8.json';
    const catalog: RoadDefinition[] = [
      ...ROAD_CATALOG,
      {
        ...ROAD01.road,
        id: 'road02',
        name: 'Third Road',
        opensOn: '2027-02-22',
        tiers: ROAD01.road.tiers.map((tier, i) => ({ ...tier, id: `road02:tier${String(i).padStart(2, '0')}` })),
      },
    ];
    const p = migrate(JSON.parse(readFileSync(fixture, 'utf8')));
    expect(p.roadPoints).toBe(140);
    expect(p.roadRecords.road01.points).toBe(30);
    expect(currentRoad(p, '2027-02-22', catalog).id).toBe('road02');
    grantProfileRoadPoints(p, { source: 'daily', date: '2027-02-22', earningKey: 'third', delta: 3 }, catalog);
    grantProfileRoadPoints(p, { source: 'wish', date: '2027-02-22', earningKey: 'third-wish', delta: 1 }, catalog);
    expect(p.roadPoints).toBe(142);
    expect(p.roadRecords.road01.points).toBe(30);
    expect(p.roadRecords.road02.points).toBe(2);
  });
});

describe('B13 kid and parent availability', () => {
  it('installs every look but keeps Road 1 dormant while the M12 catalogue dot remains available', () => {
    expect(STYLES_RELEASE).toBe('m14');
    const p = defaultProfile(0);
    p.level = 30;
    p.meta.sessions = 2;
    p.wardrobe = ROAD01.samplers.map((x) => x.id);
    for (const x of [...ROAD01.looks, ...ROAD01.singles, ...ROAD01.stardust, ...ROAD01.samplers]) {
      expect(COSMETIC_BY_ID[x.id]).toBeDefined();
      expect(cosmeticOpen(p, x, BEFORE), x.id).toBe(false);
      expect(cosmeticOpen(p, x, OPEN), x.id).toBe(true);
    }
    expect(STARDUST_COSMETICS.slice(-4)).toEqual(ROAD01.stardust);
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    for (const product of ROAD01.products) restoreProduct(p, product.id);
    expect(visibleCosmetics(p).some((x) => !cosmeticOpen(p, x, BEFORE))).toBe(false);
    expect(availableStylesRelease(p, BEFORE)).toBe('m12');
    expect(stylesNewDot(p, BEFORE)).toBe(true);
    expect(markStylesReleaseSeen(p, BEFORE)).toBe(true);
    expect(p.stylesNewSeen).toBe('m12');
    expect(markStylesReleaseSeen(p, BEFORE)).toBe(false);
    expect(stylesNewDot(p, BEFORE)).toBe(false);
    expect(grantWishSampler(p, ROAD01.samplers[0].id, BEFORE)).toBe(false);
    p.wardrobe = [];
    observeRoadDay(p, OPEN);
    expect(availableStylesRelease(p, BEFORE)).toBe('m14');
    expect(stylesNewDot(p, BEFORE)).toBe(true);
    expect(grantWishSampler(p, ROAD01.samplers[0].id, BEFORE)).toBe(true);
    expect(grantWishSampler(p, ROAD01.samplers[0].id, OPEN)).toBe(false);
    expect(markStylesReleaseSeen(p, OPEN)).toBe(true);
    expect(p.stylesNewSeen).toBe(STYLES_RELEASE);
    expect(stylesNewDot(p, OPEN)).toBe(false);
  });

  it('a Styles visit marks the available release even while its dot is suppressed', () => {
    const p = defaultProfile(0);
    p.settings.hidePaidLooks = true;
    p.meta.refundQuietUntil = Date.now() + 7 * 86400000;
    expect(stylesNewDot(p, BEFORE)).toBe(false);
    expect(markStylesReleaseSeen(p, BEFORE)).toBe(true);
    expect(p.stylesNewSeen).toBe('m12');
    expect(markStylesReleaseSeen(p, OPEN)).toBe(true);
    expect(p.stylesNewSeen).toBe('m14');
    expect(stylesNewDot(p, OPEN)).toBe(false);
  });

  it('gates the release announcement by age of play, paid visibility and seven-day refund quiet', () => {
    const p = defaultProfile(0);
    p.level = 5;
    p.meta.sessions = 2;
    expect(stylesNewDot(p, OPEN)).toBe(true);
    p.level = 4;
    expect(stylesNewDot(p, OPEN)).toBe(false);
    p.level = 5;
    p.meta.sessions = 1;
    expect(stylesNewDot(p, OPEN)).toBe(false);
    p.meta.sessions = 2;
    p.settings.hidePaidLooks = true;
    expect(stylesNewDot(p, OPEN)).toBe(false);
    p.settings.hidePaidLooks = false;
    revokeProduct(p, pass().id, Date.now());
    expect(stylesNewDot(p, OPEN)).toBe(false);
    vi.advanceTimersByTime(7 * 86400000);
    expect(stylesNewDot(p, OPEN)).toBe(true);
    p.settings.hidePaidLooks = true;
    expect(visibleCosmetics(p).some((x) => x.source === 'pass' || x.source === 'product')).toBe(false);
  });

  it('lists all three new parent products and labels only the unopened Pass with a plain date', () => {
    expect(ROAD01.products).toHaveLength(3);
    for (const product of ROAD01.products) expect(PRODUCTS).toContain(product);
    expect(productOpeningText(pass(), BEFORE)).toBe('Opens December 28, 2026');
    expect(productOpeningText(pass(), OPEN)).toBeUndefined();
    for (const product of ROAD01.products) {
      expect(productOpen(product, BEFORE)).toBe(false);
      expect(productOpen(product, OPEN)).toBe(true);
      if (product.kind !== 'road_pass') expect(productOpeningText(product, BEFORE)).toBeUndefined();
    }
    ROAD01.road.opensOn = undefined;
    expect(playableRoads(defaultProfile(0), '9999-12-31').map((r) => r.id)).toEqual(['road00']);
    expect(productOpeningText(pass(), BEFORE)).toBeUndefined();
  });

  it('wears a bought Theme or Single at once but never draws other Road 1 looks early (decision 82)', () => {
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    const p = defaultProfile(0);
    p.level = 30;
    p.meta.sessions = 2;
    const bought = ROAD01.looks.find((x) => x.source === 'product' && x.slot === 'trail')!;
    restoreProduct(p, bought.productId!);
    p.look.trail = bought.id;
    expect(owns(p, bought.id)).toBe(true);
    expect(currentLook(p).trail).toBe(bought.id);
    const sampler = ROAD01.samplers[0];
    p.wardrobe = [sampler.id];
    expect(cosmeticOpen(p, sampler, BEFORE)).toBe(false);
    observeRoadDay(p, OPEN);
    expect(cosmeticOpen(p, sampler, OPEN)).toBe(true);
  });

  it("delivers and resolves D's Road Landmark letters through Inbox once", () => {
    const p = defaultProfile(0);
    p.home.landmarks.keepers_beacon.stage = 4;
    checkMail(p);
    const open = p.mail.find((m) => m.kind === 'road_landmark_open');
    expect(open).toBeDefined();
    expect(letterOf(open!)?.body).toContain('Floating Isle');
    checkMail(p);
    expect(p.mail.filter((m) => m.kind === 'road_landmark_open')).toHaveLength(1);
    p.home.roadLandmarks[ROAD_LANDMARKS[0].id]!.stage = 4;
    checkMail(p);
    const finish = p.mail.find((m) => m.kind === 'road_landmark_finish');
    expect(letterOf(finish!)?.title).toContain('complete');
    expect(letterOf(finish!)?.gift).toBeUndefined();
  });
});

describe('B14 local-day high-water availability', () => {
  it.each([
    ['Etc/GMT+12', '2026-12-28T11:59:00Z', BEFORE],
    ['Etc/GMT+12', '2026-12-28T12:00:00Z', OPEN],
    ['Pacific/Kiritimati', '2026-12-27T09:59:00Z', BEFORE],
    ['Pacific/Kiritimati', '2026-12-27T10:00:00Z', OPEN],
  ])('opens at local midnight in %s (%s)', (zone, instant, day) => {
    const oldZone = process.env.TZ;
    try {
      process.env.TZ = zone;
      vi.setSystemTime(new Date(instant));
      expect(today()).toBe(day);
      const p = defaultProfile(0);
      observeRoadDay(p);
      expect(currentRoad(p).id).toBe(day === OPEN ? 'road01' : 'road00');
      expect(p.roadDay).toEqual({ day: '', earned: 0 });
    } finally {
      if (oldZone === undefined) delete process.env.TZ;
      else process.env.TZ = oldZone;
    }
  });

  it('open/resume observations and point events keep Road 1 open across a rollback and reload', () => {
    const p = defaultProfile(0);
    observeRoadDay(p, BEFORE);
    expect(currentRoad(p, BEFORE).id).toBe('road00');
    observeRoadDay(p, OPEN);
    const loaded = migrate(JSON.parse(JSON.stringify(p)));
    expect(loaded.roadSeenDay).toBe(OPEN);
    observeRoadDay(loaded, BEFORE);
    expect(currentRoad(loaded, BEFORE).id).toBe('road01');
    expect(pastRoads(loaded, BEFORE).map((r) => r.id)).toEqual(['road00']);
    grantProfileRoadPoints(loaded, { source: 'wish', date: BEFORE, earningKey: 'rollback', delta: 1 });
    expect(loaded.roadRecords.road01.points).toBe(1);
    expect(loaded.roadSeenDay).toBe(OPEN);
    expect(loaded.roadDay.day).toBe(BEFORE);
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app.match(/observeRoadDay\(this.p\)/g)?.length).toBe(3);
  });

  it('keeps every day of 2026-W53 playable through its January 3 end', () => {
    const p = defaultProfile(0);
    for (let day = 28; day <= 34; day++) {
      const date = new Date(2026, 11, day, 12);
      expect(isoWeek(date)).toBe('2026-W53');
      vi.setSystemTime(date);
      observeRoadDay(p);
      expect(currentRoad(p).id).toBe('road01');
    }
    expect(isoWeek(new Date(2027, 0, 4, 12))).toBe('2027-W01');
  });

  it.each([
    ['America/Chicago', 3, 14],
    ['Europe/Berlin', 3, 28],
    ['Australia/Sydney', 4, 4],
    ['Australia/Sydney', 10, 3],
  ] as const)('keeps one local daily cap through DST in %s on %i/%i', (zone, month, day) => {
    const oldZone = process.env.TZ;
    try {
      process.env.TZ = zone;
      const p = defaultProfile(0);
      p.roadRecords.road00.points = p.roadPoints = 150;
      vi.setSystemTime(new Date(2027, month - 1, day, 0, 30));
      grantProfileRoadPoints(p, { source: 'daily', date: today(), earningKey: 'early', delta: 3 });
      vi.setSystemTime(new Date(2027, month - 1, day, 23, 30));
      expect(grantProfileRoadPoints(p, { source: 'daily', date: today(), earningKey: 'late', delta: 3 })).toBe(1);
      expect(p.roadDay.earned).toBe(4);
      vi.setSystemTime(new Date(2027, month - 1, day + 1, 0, 30));
      expect(grantProfileRoadPoints(p, { source: 'daily', date: today(), earningKey: 'next', delta: 3 })).toBe(3);
      expect(p.roadDay.earned).toBe(3);
      expect(p.roadPoints).toBe(153);
      expect(p.roadRecords.road01.points).toBe(4);
    } finally {
      if (oldZone === undefined) delete process.env.TZ;
      else process.env.TZ = oldZone;
    }
  });

  it.each(['2026-12-31', '2027-01-01', '2027-01-31', '2027-02-01', '2027-03-14', '2027-03-28', '2027-04-04', '2027-10-03'])(
    'shares once at year, month and DST boundary %s',
    (date) => {
      const p = defaultProfile(0);
      p.roadRecords.road00.points = p.roadPoints = 150;
      const event = { source: 'campaign' as const, date, earningKey: date, delta: 3 };
      expect(grantProfileRoadPoints(p, event)).toBe(3);
      expect(p.roadPoints).toBe(151);
      expect(p.roadRecords.road01.points).toBe(2);
      expect(grantProfileRoadPoints(p, { ...event, date: BEFORE })).toBe(0);
      expect(p.roadSeenDay).toBe(date);
      expect(p.roadDay.earned).toBe(3);
    },
  );
});

describe('M14 review regressions', () => {
  it.each([12, 15, 21])('an open per-Road Pass or claim has Road 0 unlock parity at planet %s', (level) => {
    const original = defaultProfile(0);
    original.level = level;
    original.pass = true;
    expect(unlocked(original, 'star_road')).toBe(true);
    for (const ownership of ['pass', 'free-claim', 'paid-claim'] as const) {
      const p = defaultProfile(0);
      p.level = level;
      p.roadRecords.road01 = newRoadState();
      if (ownership === 'pass') p.roadPassEntitlements.push('road01');
      else p.roadRecords.road01[ownership === 'free-claim' ? 'claimedFreeTierIds' : 'claimedPaidTierIds'].push('road01:tier00');
      expect(unlocked(p, 'star_road'), ownership).toBe(unlocked(original, 'star_road'));
      if (ownership === 'pass') expect(unlocked(p, 'passport')).toBe(unlocked(original, 'passport'));
      vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
      expect(unlocked(p, 'star_road'), `${ownership} before opening`).toBe(false);
      if (ownership === 'pass') expect(unlocked(p, 'passport')).toBe(level >= 21);
      vi.setSystemTime(new Date(`${OPEN}T12:00:00Z`));
    }
  });

  it('also accepts Road 0 records and its per-Road entitlement without legacy mirrors', () => {
    for (const ownership of ['pass', 'free-claim', 'paid-claim'] as const) {
      const p = defaultProfile(0);
      p.level = 15;
      if (ownership === 'pass') p.roadPassEntitlements.push('road00');
      else p.roadRecords.road00[ownership === 'free-claim' ? 'claimedFreeTierIds' : 'claimedPaidTierIds'].push('road00:tier00');
      expect(p.pass).toBe(false);
      expect(p.road).toEqual([]);
      expect(p.roadPass).toEqual([]);
      expect(unlocked(p, 'star_road'), ownership).toBe(true);
    }
  });

  it('hides the sticker tile, name and totals while undated and before opening, with a real earn hint after opening', () => {
    const p = defaultProfile(0);
    const stickerId = ROAD01.road.tiers.find((tier) => tier.reward.sticker)!.reward.sticker!;
    p.roadStickers.push(stickerId);
    ROAD01.road.opensOn = undefined;
    const before = visibleStickers(p);
    expect(before.some((s) => s.id === stickerId)).toBe(false);
    expect(ownedStickers(p).some((s) => s.id === stickerId)).toBe(false);
    ROAD01.road.opensOn = OPEN;
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    expect(visibleStickers(p)).toEqual(before);
    vi.setSystemTime(new Date(`${OPEN}T12:00:00Z`));
    expect(visibleStickers(p)).toHaveLength(before.length + 1);
    expect(visibleStickers(p).find((s) => s.id === stickerId)?.hint).toEqual(['Reach the end of {road}', { road: ROAD01.road.name }]);
    expect(ownedStickers(p).some((s) => s.id === stickerId)).toBe(true);
  });

  it('selects and displays each owned Road banner and hides paid ones using their data', () => {
    const p = defaultProfile(0);
    for (const road of ROAD_CATALOG) {
      p.roadRecords[road.id] = { ...newRoadState(), points: 200 };
      grantRoadPass(p, road.id);
      road.tiers.forEach((_, index) => claimRoad(p, index, road.id));
      for (const tier of road.tiers.filter((tier) => tier.pass.item && COSMETIC_BY_ID[tier.pass.item]?.slot === 'banner')) {
        const banner = BANNERS.find((banner) => banner.cosmeticId === tier.pass.item)!;
        expect(banner).toBeDefined();
        expect(visibleBanners(p)).toContain(banner);
        expect(banner.unlocked(p)).toBe(true);
        p.passport.banner = banner.id;
        expect(currentBanner(p)).toBe(banner);
        p.settings.hidePaidLooks = true;
        expect(visibleBanners(p)).not.toContain(banner);
        expect(currentBanner(p).id).toBe(0);
        p.settings.hidePaidLooks = false;
      }
    }
    vi.setSystemTime(new Date(`${BEFORE}T12:00:00Z`));
    expect(visibleBanners(p).some((banner) => banner.cosmeticId === 'moonpetal_banner')).toBe(false);
  });
});
