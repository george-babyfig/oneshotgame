import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COSMETICS, FREE_SAMPLERS, PRODUCTS, PRODUCT_TEXT_KEYS, ROAD00_GEM_SINGLE_IDS } from '../src/meta/tuning';
import { STAR_ROAD } from '../src/meta/starroad';
import { defaultProfile } from '../src/meta/profile';
import { grantProduct, ownsProduct, refundQuietUntil, restoreProduct, revokeProduct } from '../src/meta/economy';
import { createIap, mockIapControls } from '../src/meta/iap';
import { M12_COSMETICS, owns as ownsLook } from '../src/meta/cosmetics';
import { resetProfileKeepingPurchases } from '../src/ui/flows/settings';
import { drones } from '../src/meta/homeworld';
import { grantRoadPass } from '../src/meta/starroad';

const locales = ['es', 'fr', 'de', 'pt', 'ja'] as const;
const texts = PRODUCT_TEXT_KEYS;
const pressure = {
  es: /mejor valor|popular|bono|limitad[oa]|date prisa|última oportunidad|solo hoy|\+\d+%/i,
  fr: /meilleure valeur|populaire|bonus|limit[ée]|dépêche|dernière chance|seulement aujourd'hui|\+\d+%/i,
  de: /bestes angebot|beliebt|bonus|begrenzt|beeil|letzte chance|nur heute|\+\d+%/i,
  pt: /melhor valor|popular|bônus|limitad[oa]|corra|última chance|só hoje|\+\d+%/i,
  ja: /お得|人気|ボーナス|限定|急い|最後のチャンス|\+\d+%/,
};

describe('store charter', () => {
  it('pins the twelve launch products to the roadmap prices and kinds', () => {
    expect(PRODUCTS.map((p) => [p.id.split('com.pocketplanet.game.')[1], p.kind, p.fallbackPrice])).toEqual([
      ['gems80', 'gem_pack', '$0.99'],
      ['gems500', 'gem_pack', '$4.99'],
      ['gems1200', 'gem_pack', '$9.99'],
      ['gems2800', 'gem_pack', '$19.99'],
      ['piggy', 'piggy_bank', '$1.99'],
      ['startercrew', 'cosmetic_bundle', '$2.99'],
      ['road00', 'road_pass', '$3.99'],
      ['theme.tidepool', 'theme', '$2.99'],
      ['theme.cometcandy', 'theme', '$2.99'],
      ['pack.crystalfrost', 'planet_pack', '$2.99'],
      ['style.nebula', 'style_single', '$1.99'],
      ['style.firefly', 'style_single', '$1.99'],
    ]);
  });
  it('reports the mock store currency with each localized price', async () => {
    const prices = await createIap().prices();
    expect(prices[PRODUCTS[0].id]).toEqual({ display: '$0.99', currency: 'USD', amount: 0.99 });
  });
  it('sells exactly five consumables and gives no gameplay power from one-time products', () => {
    expect(PRODUCTS).toHaveLength(12);
    expect(PRODUCTS.filter((p) => p.consumable).map((p) => p.key)).toEqual(['gems_s', 'gems_m', 'gems_l', 'gems_xl', 'piggy']);
    for (const product of PRODUCTS.filter((p) => !p.consumable)) {
      expect(product.gems).toBe(0);
      const p = defaultProfile();
      const before = { gems: p.gems, dust: p.dust, boosters: { ...p.boosters }, mats: { ...p.mats }, level: p.level };
      grantProduct(p, product.id, `tx-${product.key}`);
      expect({ gems: p.gems, dust: p.dust, boosters: p.boosters, mats: p.mats, level: p.level }).toEqual(before);
    }
    for (const tier of STAR_ROAD) {
      expect(tier.pass.gems).toBeUndefined();
      expect(tier.pass.dust).toBeUndefined();
      expect(tier.pass.boosters).toBeUndefined();
    }
  });

  it('grants each fixed product once, restores looks without currency, and quietly revokes them', () => {
    for (const product of PRODUCTS) {
      const p = defaultProfile();
      const before = p.gems;
      const first = grantProduct(p, product.id, `first-${product.key}`);
      expect(first, product.key).not.toBeNull();
      expect(grantProduct(p, product.id, `first-${product.key}`), product.key).toBeNull();
      expect(p.gems).toBe(before + product.gems);
      if (product.consumable) continue;
      expect(product.cosmeticItemIds.length).toBeGreaterThan(0);
      expect(ownsProduct(p, product.id), product.key).toBe(true);
      if (['theme', 'planet_pack', 'style_single'].includes(product.kind))
        expect(ownsLook(p, product.cosmeticItemIds[0]), product.key).toBe(true);
      expect(grantProduct(p, product.id, `restored-${product.key}`)?.gems).toBe(0);
      expect(p.gems).toBe(before);
      expect(revokeProduct(p, product.id, 1_000)).toBe(true);
      expect(ownsProduct(p, product.id), product.key).toBe(false);
      if (['theme', 'planet_pack', 'style_single'].includes(product.kind))
        expect(ownsLook(p, product.cosmeticItemIds[0]), product.key).toBe(false);
      expect(p.gems).toBe(before);
      expect(restoreProduct(p, product.id)).toBe(true);
      expect(ownsProduct(p, product.id)).toBe(true);
      if (['theme', 'planet_pack', 'style_single'].includes(product.kind))
        expect(ownsLook(p, product.cosmeticItemIds[0]), product.key).toBe(true);
      expect(p.gems).toBe(before);
    }
  });

  it('has fixed samplers for both Themes and the Planet Pack, separate from paid contents', () => {
    expect(Object.keys(FREE_SAMPLERS)).toEqual(['theme_tidepool', 'theme_cometcandy', 'pack_crystalfrost']);
    for (const [key, sampler] of Object.entries(FREE_SAMPLERS)) {
      const product = PRODUCTS.find((item) => item.key === key)!;
      expect(product.cosmeticItemIds).not.toContain(sampler);
    }
  });

  it('maps every new paid item ID to a visual owned by the correct product', () => {
    for (const product of PRODUCTS.filter((item) => ['theme', 'planet_pack', 'style_single'].includes(item.kind))) {
      const visuals = M12_COSMETICS.filter((item) => item.productId === product.id);
      expect(visuals.map((item) => item.id).sort(), product.key).toEqual([...product.cosmeticItemIds].sort());
    }
  });

  it('lists exactly the twelve fixed Cosmic Pass looks granted by Road 0', () => {
    const pass = PRODUCTS.find((item) => item.key === 'pass')!;
    const roadLooks = STAR_ROAD.flatMap((tier) => [tier.pass.skin, tier.pass.item].filter((id): id is string => !!id));
    expect(roadLooks).toHaveLength(12);
    expect([...roadLooks].sort()).toEqual([...pass.cosmeticItemIds].sort());
  });

  it('adds at least 3,000 gems of fixed-price Road 0 singles at 60–300 gems each', () => {
    expect(ROAD00_GEM_SINGLE_IDS).toHaveLength(20);
    const singles = ROAD00_GEM_SINGLE_IDS.map((id) => COSMETICS.find((look) => look.id === id)!);
    expect(singles.every((look) => look.source === 'gems' && look.gems! >= 60 && look.gems! <= 300)).toBe(true);
    expect(singles.reduce((sum, look) => sum + look.gems!, 0)).toBe(5200);
  });

  it('has one USD price and matching StoreKit IDs, prices, types and sharing', () => {
    const file = JSON.parse(readFileSync('ios/App/PocketPlanet.storekit', 'utf8')) as {
      products: {
        productID: string;
        displayPrice: string;
        type: string;
        familyShareable: boolean;
        localizations: { locale: string; displayName: string; description: string }[];
      }[];
    };
    expect(file.products).toHaveLength(PRODUCTS.length);
    for (const product of PRODUCTS) {
      expect(product.fallbackPrice).toMatch(/^\$\d+\.\d{2}$/);
      const entry = file.products.find((item) => item.productID === product.id);
      expect(entry).toBeDefined();
      expect(`$${entry?.displayPrice}`).toBe(product.fallbackPrice);
      expect(entry?.type).toBe(product.consumable ? 'Consumable' : 'NonConsumable');
      expect(entry?.familyShareable).toBe(!product.consumable);
      expect(entry?.localizations.find((item) => item.locale === 'en_US')).toMatchObject({
        displayName: product.title,
        description: product.description,
      });
    }
  });

  for (const lang of locales) {
    it(`${lang} has no pressure wording in translated product text`, () => {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      for (const key of texts) if (dict[key]) expect(dict[key]).not.toMatch(pressure[lang]);
    });
  }

  it('English product text has no pressure wording', () => {
    for (const value of texts)
      expect(value).not.toMatch(/best value|popular|bonus|limited|hurry|last chance|don't miss|ends in|only|\+\d+%/i);
  });

  it('Ask to Buy approval grants once, including a replay', async () => {
    const p = defaultProfile();
    const iap = createIap();
    expect(iap.kind).toBe('mock');
    await iap.init((event) => grantProduct(p, event.productId, event.txId));
    const product = PRODUCTS.find((item) => item.key === 'gems_m')!;
    mockIapControls.pending();
    const pending = await iap.purchase(product);
    expect(pending.pending).toBe(true);
    const before = p.gems;
    mockIapControls.approve();
    expect(p.gems).toBe(before + 500);
    const txId = p.processedTx[0];
    mockIapControls.replay(product.id, txId);
    expect(p.gems).toBe(before + 500);
  });

  it('a refund removes its entitlement and quiets new announcements for seven days', () => {
    const p = defaultProfile();
    const pass = PRODUCTS.find((item) => item.key === 'pass')!;
    grantProduct(p, pass.id, 'pass-tx');
    const at = Date.UTC(2026, 8, 29);
    expect(revokeProduct(p, pass.id, at)).toBe(true);
    expect(p.pass).toBe(false);
    expect(refundQuietUntil(p)).toBe(at + 7 * 86400000);
  });

  it('Reset progress preserves each of the seven looks products and the looks-only Pass', () => {
    for (const product of PRODUCTS.filter((item) => !item.consumable)) {
      const p = defaultProfile();
      grantProduct(p, product.id, `reset-${product.key}`);
      const reset = resetProfileKeepingPurchases(p);
      expect(ownsProduct(reset, product.id), product.key).toBe(true);
      expect(reset.processedTx).toContain(`reset-${product.key}`);
      expect(drones(reset), product.key).toBe(2);
    }
  });

  it('returns the claimed Cosmic atmosphere after revoke, restore and re-buy', () => {
    const pass = PRODUCTS.find((item) => item.key === 'pass')!;
    const p = defaultProfile();
    p.roadPoints = 20;
    grantProduct(p, pass.id, 'pass-first');
    grantRoadPass(p);
    expect(p.skins).toContain('cosmic');
    revokeProduct(p, pass.id, 1_000);
    expect(p.skins).not.toContain('cosmic');
    expect(restoreProduct(p, pass.id)).toBe(true);
    expect(p.skins).toContain('cosmic');
    revokeProduct(p, pass.id, 2_000);
    grantProduct(p, pass.id, 'pass-second');
    expect(p.skins).toContain('cosmic');
  });

  it('a gem-pack or Piggy Bank refund also starts the seven-day quiet period', () => {
    for (const product of PRODUCTS.filter((item) => item.consumable)) {
      const p = defaultProfile();
      expect(revokeProduct(p, product.id, 1_000)).toBe(true);
      expect(refundQuietUntil(p), product.key).toBe(1_000 + 7 * 86400000);
    }
  });

  it('the mock store can report a revocation through the transaction listener', async () => {
    const p = defaultProfile();
    const pass = PRODUCTS.find((item) => item.key === 'pass')!;
    const iap = createIap();
    await iap.init((event) => {
      if (event.revokedAt) revokeProduct(p, event.productId, event.revokedAt);
      else grantProduct(p, event.productId, event.txId);
    });
    mockIapControls.replay(pass.id, 'owned-pass');
    expect(p.pass).toBe(true);
    mockIapControls.revoke(pass.id);
    expect(p.pass).toBe(false);
    expect(refundQuietUntil(p)).toBeGreaterThan(Date.now());
  });
});
