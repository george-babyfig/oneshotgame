import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { PRODUCTS, PRODUCT_BY_ID, type ProductDef } from './config';

export interface PurchaseOutcome {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
  txId?: string;
  productId?: string;
}

export interface Iap {
  kind: 'native' | 'mock' | 'none';
  init(onTx: (productId: string, txId: string) => void): Promise<void>;
  prices(): Promise<Record<string, string>>;
  purchase(p: ProductDef): Promise<PurchaseOutcome>;
  restore(): Promise<string[]>;
  /** One-time purchases this Apple ID already owns (no sign-in prompt). */
  owned(): Promise<string[]>;
}

// StoreKit 2 via @capgo/native-purchases (no server or third-party account needed).
const nativeIap: Iap = {
  kind: 'native',
  async init(onTx) {
    // Purchases completed outside purchase() (Ask to Buy, interrupted) arrive here; caller dedupes by txId.
    await NativePurchases.addListener('transactionUpdated', (tx: Transaction) => {
      if (tx.productIdentifier && tx.transactionId && !tx.revocationDate) onTx(tx.productIdentifier, tx.transactionId);
    });
  },
  async prices() {
    try {
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: PRODUCTS.map((p) => p.id),
        productType: PURCHASE_TYPE.INAPP,
      });
      return Object.fromEntries(products.map((p) => [p.identifier, p.priceString]));
    } catch {
      return {};
    }
  },
  async purchase(p) {
    try {
      const tx = await NativePurchases.purchaseProduct({
        productIdentifier: p.id,
        productType: PURCHASE_TYPE.INAPP,
        quantity: 1,
        isConsumable: p.consumable,
      });
      return { ok: true, txId: tx.transactionId, productId: tx.productIdentifier || p.id };
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/cancel/i.test(msg)) return { ok: false, cancelled: true };
      return { ok: false, error: msg };
    }
  },
  async restore() {
    try {
      await NativePurchases.restorePurchases();
    } catch {
      /* fall through to what StoreKit already knows */
    }
    return this.owned();
  },
  async owned() {
    try {
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
      return purchases
        .filter((t) => !t.revocationDate && PRODUCT_BY_ID[t.productIdentifier] && !PRODUCT_BY_ID[t.productIdentifier].consumable)
        .map((t) => t.productIdentifier);
    } catch {
      return [];
    }
  },
};

// Simulated store for browser play-testing (dev server or VITE_MOCK_IAP=1 builds).
const mockIap: Iap = {
  kind: 'mock',
  async init() {},
  async prices() {
    return Object.fromEntries(PRODUCTS.map((p) => [p.id, p.fallbackPrice]));
  },
  async purchase(p) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, txId: `mock-${Date.now()}-${Math.random()}`, productId: p.id };
  },
  async restore() {
    return [];
  },
  async owned() {
    return [];
  },
};

const noIap: Iap = {
  kind: 'none',
  async init() {},
  prices: mockIap.prices,
  async purchase() {
    return { ok: false, error: 'Purchases are available in the iOS app.' };
  },
  async restore() {
    return [];
  },
  async owned() {
    return [];
  },
};

export function createIap(): Iap {
  if (Capacitor.isNativePlatform()) return nativeIap;
  if (import.meta.env.DEV || import.meta.env.VITE_MOCK_IAP === '1') return mockIap;
  return noIap;
}
