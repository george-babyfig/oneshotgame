import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate, totalStars, PROFILE_VERSION } from '../src/meta/profile';
import {
  applyLevelWin,
  buyGemBooster,
  useStoredBooster,
  buyVaultTier,
  collectDust,
  creditVaultWin,
  grantProduct,
  pendingDust,
  vaultFullAt,
  vaultRate,
  VAULT_RATES,
} from '../src/meta/economy';
import { CALENDAR_DAYS, stamp } from '../src/meta/calendar';
import { STARDUST_COSMETICS, buyCosmetic, owns } from '../src/meta/cosmetics';
import { chestsReady, claimRoad, openChest, roadReady, STAR_ROAD } from '../src/meta/progression';
import { makeLevel } from '../src/core/levels';
import { clonePlanet } from '../src/core/world';
import { clearFails } from '../src/meta/continues';
import { readFileSync } from 'node:fs';

const win = (p = defaultProfile(0), n = 1, stars = 2) => {
  const L = makeLevel(n);
  return { p, out: applyLevelWin(p, { n, stars, score: 100, planet: clonePlanet(L.start), name: L.name, hue: L.hue }) };
};

describe('economy', () => {
  it('wires this winning attempt and replay-rate Essence through the live results flow', () => {
    const flow = readFileSync('src/ui/flows/results.ts', 'utf8');
    expect(flow).toMatch(/applyLevelWin\(p,\s*\{[^}]*continuesUsed:\s*r\.continuesUsed/s);
    expect(flow).toMatch(/applyLevelWin\(p,\s*\{[^}]*gemBoosterUsed:\s*r\.gemBoosterUsed/s);
    const hud = readFileSync('src/ui/hud.ts', 'utf8');
    expect(hud).toContain('continuesUsed: scene.continuesUsed');
    expect(hud).toContain('gemBoosterUsed: scene.gemBoosterUsed');
    const prelevel = readFileSync('src/ui/flows/prelevel.ts', 'utf8');
    expect(prelevel).toContain('buyGemBooster(p, id)');
    expect(prelevel).toContain('scene.gemBoosterUsed ||= useStoredBooster(p, id) === true');
    expect(flow).toContain('essenceDropsFor(r.planet, r.stars, out.essenceFirstClear)');
    expect(flow).toContain("out.essenceFirstClear ? 'material_drop_first_clear' : 'material_drop_replay'");
  });
  it('first clear pays more and unlocks the next level', () => {
    const { p, out } = win();
    expect(out.firstClear).toBe(true);
    expect(out.dust).toBe(25 + 2 * 15 + 40);
    expect(p.level).toBe(2);
    const again = applyLevelWin(p, { n: 1, stars: 3, score: 150, planet: clonePlanet(makeLevel(1).start), name: 'x', hue: 0 });
    expect(again.firstClear).toBe(false);
    expect(again.gems).toBe(2);
    expect(p.level).toBe(2);
    expect(p.galaxy).toHaveLength(1);
    expect(p.stars[1]).toBe(3);
  });

  it('keeps a continued first clear while marking its Essence for replay rates', () => {
    const p = defaultProfile(0);
    p.level = 11;
    p.fails[11] = 1;
    p.continuesUsed[11] = 1;
    clearFails(p, 11); // the UI clears retry counters before showing results
    const level = makeLevel(11);
    const out = applyLevelWin(p, {
      n: 11,
      stars: 2,
      score: 100,
      planet: clonePlanet(level.start),
      name: level.name,
      hue: level.hue,
      continuesUsed: 1,
    });
    expect(out.firstClear).toBe(true);
    expect(out.essenceFirstClear).toBe(false);
    expect(p.level).toBe(12);
    const clean = makeLevel(12);
    const next = applyLevelWin(p, {
      n: 12,
      stars: 2,
      score: 100,
      planet: clonePlanet(clean.start),
      name: clean.name,
      hue: clean.hue,
    });
    expect(next.essenceFirstClear).toBe(true);
  });

  it('keeps first-clear Essence after a failed continued attempt and a clean win', () => {
    const p = defaultProfile(0);
    p.level = 15;
    p.continuesUsed[15] = 1;
    clearFails(p, 15);
    const level = makeLevel(15);
    const out = applyLevelWin(p, {
      n: 15,
      stars: 2,
      score: 100,
      planet: clonePlanet(level.start),
      name: level.name,
      hue: level.hue,
      continuesUsed: 0,
    });
    expect(out.essenceFirstClear).toBe(true);
    expect(p.continuesUsed[15]).toBeUndefined();
  });

  it('separates earned and gem-bought stock and marks only a paid-helper win for replay Essence', () => {
    const p = defaultProfile(0);
    p.gems = 100;
    expect(buyGemBooster(p, 'scope')).toBe(true);
    expect(p.boosters.scope).toBe(2);
    expect(p.gemBoosters.scope).toBe(1);
    expect(useStoredBooster(p, 'scope')).toBe(false);
    expect(useStoredBooster(p, 'scope')).toBe(true);
    const level = makeLevel(1);
    const out = applyLevelWin(p, {
      n: 1,
      stars: 2,
      score: 100,
      planet: clonePlanet(level.start),
      name: level.name,
      hue: level.hue,
      gemBoosterUsed: true,
    });
    expect(out.firstClear).toBe(true);
    expect(out.essenceFirstClear).toBe(false);
  });

  it('Vault needs campaign wins, caps production and preserves fuel while full', () => {
    const { p } = win();
    p.vault.lastTick = 0;
    p.lastCollect = 0;
    p.vault.bankedProductionMs = 0;
    const rate = vaultRate(p);
    expect(pendingDust(p, 3600000)).toBe(0);
    creditVaultWin(p, { mode: 'campaign', planetKey: 'campaign:1', buddySpecies: null, at: 0 });
    expect(vaultFullAt(p)).toBe(0); // two hours of fuel cannot fill four hours of storage
    expect(pendingDust(p, 3600000)).toBe(rate);
    expect(pendingDust(p, 100 * 3600000)).toBe(rate * 2);
    expect(collectDust(p, 3600000)).toBe(rate);
    expect(pendingDust(p, 3600000)).toBe(0);
    expect(collectDust(p, 3600000)).toBe(0);
    expect(pendingDust(p, 0)).toBe(0);
    expect(collectDust(p, 7200000)).toBe(rate);
    for (let i = 0; i < 8; i++) creditVaultWin(p, { mode: 'campaign', planetKey: `campaign:${i}`, buddySpecies: null, at: 7200000 });
    expect(p.vault.bankedProductionMs).toBe(12 * 3600000);
    expect(vaultFullAt(p)).toBe(7200000 + 4 * 3600000);
    expect(pendingDust(p, 100 * 3600000)).toBe(rate * 4);
    collectDust(p, 100 * 3600000);
    expect(p.vault.bankedProductionMs).toBe(8 * 3600000);
  });

  it('Vault upgrade spends the decided prices and caps a large galaxy', () => {
    const p = defaultProfile(0);
    p.galaxy = Array.from({ length: 30 }, (_, n) => ({ n, name: '', hue: 0, stars: 3, species: ['a'], life: 0, colors: [] }));
    p.dust = 32_000;
    expect(vaultRate(p)).toBe(VAULT_RATES[0]);
    expect(VAULT_RATES.every((rate, i) => i === 0 || rate > VAULT_RATES[i - 1])).toBe(true);
    for (const [i, rate] of VAULT_RATES.slice(1).entries()) {
      expect(buyVaultTier(p, 0)).toBe(true);
      expect(p.vault.tier).toBe(i + 2);
      expect(vaultRate(p)).toBe(rate);
    }
    expect(p.dust).toBe(0);
    expect(buyVaultTier(p, 0)).toBe(false);
  });

  it('offers permanent stardust looks in two rising-price series', () => {
    const p = defaultProfile(0);
    expect(STARDUST_COSMETICS.map((x) => x.dust)).toEqual([5000, 10000, 18000, 25000, 12000, 22000, 35000, 50000]);
    p.dust = 5000;
    expect(buyCosmetic(p, 'suit_sunseed')).toBe(true);
    expect(p.dust).toBe(0);
    expect(owns(p, 'suit_sunseed')).toBe(true);
    expect(buyCosmetic(p, 'suit_sunseed')).toBe(false);
    expect(p.wardrobe).toEqual(['suit_sunseed']);
  });

  it('star calendar stamps once a day and never resets after a gap', () => {
    const p = defaultProfile(0);
    const g = p.gems;
    expect(stamp(p, '2026-01-01')?.gems).toBe(10);
    expect(p.gems).toBe(g + 10);
    expect(stamp(p, '2026-01-01')).toBeNull();
    stamp(p, '2026-01-02');
    stamp(p, '2026-01-09'); // a week away: simply the next stamp
    expect(p.daily.streak).toBe(3);
    expect(owns(p, 'hat_beanie')).toBe(false);
    for (let d = 10; d < 10 + 11; d++) stamp(p, `2026-01-${d}`);
    expect(p.daily.streak).toBe(14);
    expect(owns(p, 'hat_beanie')).toBe(true);
    // second time round, item days pay gems instead
    p.daily.streak = CALENDAR_DAYS + 13;
    expect(stamp(p, '2026-03-01')?.item).toBeUndefined();
  });

  it('grants purchases exactly once', () => {
    const p = defaultProfile(0);
    const g0 = p.gems;
    expect(grantProduct(p, 'com.pocketplanet.game.gems500', 't1')?.gems).toBe(500);
    expect(grantProduct(p, 'com.pocketplanet.game.gems500', 't1')).toBeNull();
    expect(p.gems).toBe(g0 + 500);
    p.piggy = 90;
    expect(grantProduct(p, 'com.pocketplanet.game.piggy', 't2')?.gems).toBe(90);
    expect(p.piggy).toBe(0);
    grantProduct(p, 'com.pocketplanet.game.startercrew', 't3');
    expect(p.starter).toBe(true);
    expect(p.skins).toContain('aurora');
    expect(grantProduct(p, 'com.pocketplanet.game.startercrew', 't4')?.gems).toBe(0);
    grantProduct(p, 'com.pocketplanet.game.road00', 't5');
    expect(p.pass).toBe(true);
  });

  it('keeps the Piggy Bank quote when more gems are saved before approval', () => {
    const p = defaultProfile(0);
    p.piggy = 40;
    p.pendingPiggy = { amount: 40, startedAt: 1 };
    p.piggy = 52;
    const before = p.gems;
    expect(grantProduct(p, 'com.pocketplanet.game.piggy', 'pending-piggy')?.gems).toBe(40);
    expect(p.gems).toBe(before + 40);
    expect(p.piggy).toBe(12);
    expect(p.pendingPiggy).toBeNull();
    expect(grantProduct(p, 'com.pocketplanet.game.piggy', 'pending-piggy')).toBeNull();
  });

  it('records a new transaction id for an already-owned look without paying twice', () => {
    const p = defaultProfile(0);
    grantProduct(p, 'com.pocketplanet.game.startercrew', 'original-starter');
    const before = p.gems;
    expect(grantProduct(p, 'com.pocketplanet.game.startercrew', 'restored-starter')?.gems).toBe(0);
    expect(p.processedTx).toContain('restored-starter');
    expect(p.gems).toBe(before);
  });
});

describe('progression', () => {
  it('star road pays the free lane, and the pass lane retroactively', () => {
    const p = defaultProfile(0);
    p.roadPoints = 4;
    expect(roadReady(p)).toEqual([]);
    p.roadPoints = 12;
    expect(roadReady(p)).toEqual([0, 1]);
    const got = claimRoad(p, 0);
    expect(got).toEqual([STAR_ROAD[0].reward]);
    expect(roadReady(p)).toEqual([1]);
    p.pass = true;
    expect(roadReady(p)).toEqual([0, 1]);
    claimRoad(p, 0);
    expect(p.skins).toContain('cosmic');
    expect(claimRoad(p, 5)).toEqual([]);
  });

  it('chapter chest opens once when the chapter is finished', () => {
    const p = defaultProfile(0);
    p.level = 11;
    expect(chestsReady(p)).toEqual([1]);
    expect(openChest(p, 1)).not.toBeNull();
    expect(openChest(p, 1)).toBeNull();
    expect(chestsReady(p)).toEqual([]);
  });

  it('migrates v1 saves', () => {
    const p = migrate({ gems: 99, level: 5, stars: { 1: 3, 2: 2 }, galaxy: [{ n: 1, name: 'a', hue: 1, stars: 3, species: [], life: 9 }] });
    expect(p.v).toBe(PROFILE_VERSION);
    expect(p.gems).toBe(99);
    expect(p.galaxy[0].colors).toEqual([]);
    expect(p.settings.reduceMotion).toBe(false);
    expect(totalStars(p)).toBe(5);
  });
});
