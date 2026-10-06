import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../src/meta/tuning';

const compliance = readFileSync('store/compliance.md', 'utf8');
const storekit = JSON.parse(readFileSync('ios/App/PocketPlanet.storekit', 'utf8')) as {
  products: { productID: string; type: string; displayPrice: string; familyShareable: boolean }[];
};

type Row = { id: string; type: string; name: string; price: string; family: string };
function productRows(markdown: string): Row[] {
  const table = markdown.split('## In-app purchases')[1]?.split('## Notes for App Review')[0] ?? '';
  return table
    .split('\n')
    .filter((line) => line.startsWith('| com.pocketplanet.game.'))
    .map((line) => {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      expect(cells).toHaveLength(6);
      return { id: cells[0], type: cells[1], name: cells[2], price: cells[4], family: cells[5] };
    });
}

describe('store product sheet', () => {
  it('matches every code and StoreKit product ID, type, price and Family Sharing flag', () => {
    const rows = productRows(compliance);
    expect(rows).toHaveLength(PRODUCTS.length);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(new Set(storekit.products.map((product) => product.productID)).size).toBe(storekit.products.length);
    expect(storekit.products).toHaveLength(PRODUCTS.length);
    for (const product of PRODUCTS) {
      const row = rows.find((candidate) => candidate.id === product.id);
      const sk = storekit.products.find((candidate) => candidate.productID === product.id);
      expect(row, product.id).toBeDefined();
      expect(sk, product.id).toBeDefined();
      expect(row?.type).toBe(product.consumable ? 'Consumable' : 'Non-consumable');
      expect(row?.price).toBe(product.fallbackPrice);
      expect(row?.name).toBe(product.title);
      expect(sk?.type).toBe(product.consumable ? 'Consumable' : 'NonConsumable');
      expect(`$${sk?.displayPrice}`).toBe(product.fallbackPrice);
      expect(row?.family).toBe(sk?.familyShareable ? 'On' : 'Off');
    }
  });

  it('keeps the hosted and docs privacy policy identical', () => {
    expect(readFileSync('site/privacy.html', 'utf8')).toBe(readFileSync('docs/privacy.html', 'utf8'));
  });
});
