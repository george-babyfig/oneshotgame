import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRODUCTS, PRODUCT_TEXT_KEYS } from '../src/meta/tuning';
import { STAR_ROAD } from '../src/meta/starroad';
import { defaultProfile } from '../src/meta/profile';
import { grantProduct, refundQuietUntil, revokeProduct } from '../src/meta/economy';
import { createIap, mockIapControls } from '../src/meta/iap';

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
  it('reports the mock store currency with each localized price', async () => {
    const prices = await createIap().prices();
    expect(prices[PRODUCTS[0].id]).toEqual({ display: '$0.99', currency: 'USD', amount: 0.99 });
  });
  it('sells exactly five consumables and gives no gameplay power from one-time products', () => {
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
