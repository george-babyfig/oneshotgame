import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../src/meta/tuning';
import { allStrings } from './helpers/locales';

const sheet = readFileSync('store/catalogue-sheet.md', 'utf8');
const compliance = readFileSync('store/compliance.md', 'utf8');
const storekit = JSON.parse(readFileSync('ios/App/PocketPlanet.storekit', 'utf8')) as {
  products: {
    productID: string;
    type: string;
    displayPrice: string;
    familyShareable: boolean;
    localizations: { locale: string; displayName: string; description: string }[];
  }[];
};
const locales = ['en_US', 'es_MX', 'fr_FR', 'de_DE', 'pt_BR', 'ja_JP'];

function tableRows(markdown: string, heading: string): string[][] {
  const section = markdown.split(heading)[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .filter((line) => line.startsWith('| com.pocketplanet.game.'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

describe('frozen per-product catalogue', () => {
  it('matches every product ID, types, USD prices and Family Sharing flags', () => {
    const rows = tableRows(sheet, '## Products');
    const complianceRows = tableRows(compliance, '## In-app purchases');
    expect(rows).toHaveLength(PRODUCTS.length);
    expect(complianceRows).toHaveLength(PRODUCTS.length);
    expect(storekit.products).toHaveLength(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    expect(new Set(rows.map((r) => r[0])).size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) {
      const row = rows.find((r) => r[0] === p.id);
      const doc = complianceRows.find((r) => r[0] === p.id);
      const sk = storekit.products.find((s) => s.productID === p.id);
      expect(row, p.id).toBeDefined();
      expect(doc, p.id).toBeDefined();
      expect(sk, p.id).toBeDefined();
      expect(row?.[1]).toBe(p.consumable ? 'Consumable' : 'NonConsumable');
      expect(doc?.[1]).toBe(p.consumable ? 'Consumable' : 'Non-consumable');
      expect(row?.[2]).toBe(p.fallbackPrice);
      expect(doc?.[2]).toBe(p.fallbackPrice);
      expect(row?.[3]).toBe(p.familySharing ? 'On' : 'Off');
      expect(doc?.[3]).toBe(p.familySharing ? 'On' : 'Off');
      expect(row?.[4]).toBe(doc?.[4]);
      expect(row?.[4]).toBe(p.contents.join('; '));
      expect(sk?.type).toBe(p.consumable ? 'Consumable' : 'NonConsumable');
      expect(`$${sk?.displayPrice}`).toBe(p.fallbackPrice);
      expect(sk?.familyShareable).toBe(p.familySharing);
      expect(p.consumable).toBe(!p.familySharing);
    }
  });

  it('has six localized StoreKit records matching the sheet within Apple text limits', () => {
    const rows = tableRows(sheet, '## Localized App Store Connect metadata');
    expect(rows).toHaveLength(PRODUCTS.length * locales.length);
    for (const p of PRODUCTS) {
      const sk = storekit.products.find((s) => s.productID === p.id)!;
      expect(sk.localizations.map((l) => l.locale)).toEqual(locales);
      for (const locale of locales) {
        const row = rows.find((r) => r[0] === p.id && r[1] === locale);
        const item = sk.localizations.find((l) => l.locale === locale)!;
        expect(row, `${p.id} ${locale}`).toBeDefined();
        expect(row?.[2]).toBe(item.displayName);
        expect(row?.[3]).toBe(item.description);
        expect([...item.displayName].length).toBeLessThanOrEqual(30);
        expect([...item.description].length).toBeLessThanOrEqual(45);
      }
      expect(sk.localizations[0]).toMatchObject({ displayName: p.title, description: p.description });
    }
  });

  it('matches every in-app localized product name and description shown in Grown-ups', () => {
    const languages = { es_MX: 'es', fr_FR: 'fr', de_DE: 'de', pt_BR: 'pt', ja_JP: 'ja' } as const;
    for (const product of PRODUCTS) {
      const store = storekit.products.find((item) => item.productID === product.id)!;
      for (const [locale, language] of Object.entries(languages)) {
        const dict = allStrings(language);
        const localized = store.localizations.find((item) => item.locale === locale);
        expect(localized?.displayName, `${product.key} ${locale} name`).toBe(dict[product.title]);
        expect(localized?.description, `${product.key} ${locale} description`).toBe(dict[product.description]);
      }
    }
  });

  for (const product of PRODUCTS) {
    it(`${product.key} has bounded names and descriptions in every runtime dictionary`, () => {
      for (const lang of ['en', 'es', 'fr', 'de', 'pt', 'ja']) {
        const dict = allStrings(lang);
        expect(dict[product.title], `${lang} title`).toBeDefined();
        expect(dict[product.description], `${lang} description`).toBeDefined();
        expect([...dict[product.title]].length).toBeLessThanOrEqual(30);
        expect([...dict[product.description]].length).toBeLessThanOrEqual(45);
      }
    });
  }

  // Real Simulator artifacts are qualified separately once the integrated build is ready.
  for (const product of PRODUCTS) {
    it.runIf(process.env.STORE_REVIEW_IMAGES === '1')(`${product.key} has a full-resolution PNG review capture`, () => {
      const suffix = product.id.slice('com.pocketplanet.game.'.length);
      const file = readFileSync(`store/iap-review/${suffix}.png`);
      expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(file.readUInt32BE(16)).toBeGreaterThanOrEqual(320);
      expect(file.readUInt32BE(20)).toBeGreaterThanOrEqual(568);
    });
  }

  it('keeps the hosted and docs privacy policy identical', () => {
    expect(readFileSync('site/privacy.html', 'utf8')).toBe(readFileSync('docs/privacy.html', 'utf8'));
  });
});
