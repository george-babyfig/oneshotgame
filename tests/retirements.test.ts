import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { currentTitle, titlesOwned } from '../src/meta/passport';
import { drones } from '../src/meta/homeworld';
import { buyVaultTier, vaultTier } from '../src/meta/economy';
import { resetProfileKeepingPurchases } from '../src/ui/flows/settings';
import { HOME_LEVEL_REQUIREMENTS, HOMEWORLD_MAX_LEVEL } from '../src/meta/tuning';

const reload = (p: unknown) => migrate(JSON.parse(JSON.stringify(p)) as Record<string, unknown>);

describe('retirement compatibility', () => {
  it('loads old unread fields, drops them from future saves, and keeps real Vault progress', () => {
    const fresh = defaultProfile(0);
    fresh.dust = 50_000;
    const p = reload({
      ...fresh,
      mastery: { l_pad: 5000 },
      meta: { ...fresh.meta, starterOffered: true },
      upgrades: { vault: 2, scope: 3, throws: 3, splash: 1 },
      vault: { ...fresh.vault, tier: 5, storedDust: 41, bankedProductionMs: 9000 },
      home: {
        ...fresh.home,
        debris: [0],
        lastDebris: 9000,
        residents: [{ species: 'bunny', fp: 8, rewarded: 3, lastReq: 123 }],
        friends: { otter: { fp: 25, rewarded: 5, lastReq: 456 } },
      },
    });
    expect(p).not.toHaveProperty('mastery');
    expect(p.meta).not.toHaveProperty('starterOffered');
    expect(p.upgrades).toEqual({ vault: 2 });
    expect(p.vault).toEqual({ ...fresh.vault, storedDust: 41, bankedProductionMs: 9000 });
    expect(vaultTier(p)).toBe(3); // The old mirror never controlled capacity.
    expect(p.home).not.toHaveProperty('debris');
    expect(p.home).not.toHaveProperty('lastDebris');
    expect(p.home.residents[0]).toEqual({ species: 'bunny', fp: 8, rewarded: 3 });
    expect(p.home.friends.otter).toEqual({ fp: 25, rewarded: 5 });
    expect(reload(p)).toEqual(p);
    expect(buyVaultTier(p, 0)).toBe(true);
    expect(vaultTier(reload(p))).toBe(4);
    expect(p.vault).not.toHaveProperty('tier');
  });

  it('retains typed purchase state through load and Reset progress, including an absent legacy marker', () => {
    const old = defaultProfile(0);
    old.pass = true;
    expect(drones(reload(old))).toBe(3);
    const meta = {
      productEntitlements: ['com.pocketplanet.game.theme.tidepool'],
      revokedProducts: { 'com.pocketplanet.game.style.nebula': 100 },
      passLooksOnly: true,
      refundQuietUntil: 9000,
    };
    const p = reload({ ...old, meta: { ...old.meta, ...meta } });
    expect(p.meta).toMatchObject(meta);
    expect(drones(p)).toBe(2);
    expect(reload(resetProfileKeepingPurchases(p)).meta).toMatchObject(meta);
    const invalid = reload({ ...old, meta: { ...old.meta, productEntitlements: 5, revokedProducts: [], refundQuietUntil: 'bad' } });
    expect(invalid.meta.productEntitlements).toEqual([]);
    expect(invalid.meta.revokedProducts).toEqual({});
    expect(invalid.meta.refundQuietUntil).toBe(0);
  });

  it('clamps Homeworld load to the maximum in the requirements table', () => {
    expect(HOMEWORLD_MAX_LEVEL).toBe(Math.max(...Object.keys(HOME_LEVEL_REQUIREMENTS).map(Number)));
    const p = defaultProfile(0);
    expect(reload({ ...p, home: { ...p.home, level: 99 } }).home.level).toBe(HOMEWORLD_MAX_LEVEL);
    expect(reload({ ...p, home: { ...p.home, level: -1 } }).home.level).toBe(1);
  });

  it('gives new players no Explorer Rank title and exposes only earned titles on legacy saves', () => {
    const p = defaultProfile(0);
    expect(currentTitle(p)).toBeUndefined();
    expect(titlesOwned(p)).toEqual([]);
    p.rank = 8;
    p.passport.title = 'rank:Stargazer';
    const owned = titlesOwned(p);
    expect(owned.some((title) => title.id.startsWith('rank:'))).toBe(false);
    expect(owned.filter((title) => title.text === 'Sky Sculptor')).toHaveLength(1);
    expect(owned.filter((title) => title.text === 'Cosmic Architect')).toHaveLength(1);
    expect(currentTitle(reload(p))?.text).not.toBe('Stargazer');
  });
});
