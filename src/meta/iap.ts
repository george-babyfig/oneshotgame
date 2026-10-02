import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { PRODUCTS, PRODUCT_BY_ID, type ProductDef } from './config';

export interface PurchaseOutcome {
  ok: boolean;
  cancelled?: boolean;
  pending?: boolean;
  error?: string;
  txId?: string;
  productId?: string;
}

export type IapEvent = { productId: string; txId: string; revokedAt?: number; purchasedAt?: number };
export type StorePrice = { display: string; currency: string; amount: number };

export interface Iap {
  kind: 'native' | 'mock' | 'none';
  init(onTx: (event: IapEvent) => void): Promise<void>;
  prices(): Promise<Record<string, StorePrice>>;
  purchase(p: ProductDef): Promise<PurchaseOutcome>;
  restore(): Promise<string[]>;
  /** One-time purchases this Apple ID already owns (no sign-in prompt). */
  owned(): Promise<string[]>;
  transactions(): Promise<IapEvent[]>;
  finish(txId: string): Promise<void>;
}

// StoreKit 2 via @capgo/native-purchases (no server or third-party account needed).
const nativeIap: Iap = {
  kind: 'native',
  async init(onTx) {
    // Purchases completed outside purchase() (Ask to Buy, interrupted) arrive here; caller dedupes by txId.
    await NativePurchases.addListener('transactionUpdated', (tx: Transaction) => {
      if (tx.productIdentifier && tx.transactionId)
        onTx({
          productId: tx.productIdentifier,
          txId: tx.transactionId,
          revokedAt: tx.revocationDate ? Date.parse(tx.revocationDate) || Date.now() : undefined,
          purchasedAt: tx.purchaseDate ? Date.parse(tx.purchaseDate) : undefined,
        });
    });
  },
  async prices() {
    try {
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: PRODUCTS.map((p) => p.id),
        productType: PURCHASE_TYPE.INAPP,
      });
      return Object.fromEntries(products.map((p) => [p.identifier, { display: p.priceString, currency: p.currencyCode, amount: p.price }]));
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
        autoAcknowledgePurchases: false,
      });
      if (!tx.transactionId) return { ok: false, pending: true };
      return { ok: true, txId: tx.transactionId, productId: tx.productIdentifier || p.id };
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/pending|ask to buy|deferred/i.test(msg)) return { ok: false, pending: true };
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
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP, onlyCurrentEntitlements: true });
    return purchases
      .filter((t) => !t.revocationDate && PRODUCT_BY_ID[t.productIdentifier] && !PRODUCT_BY_ID[t.productIdentifier].consumable)
      .map((t) => t.productIdentifier);
  },
  async transactions() {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    return purchases
      .filter((tx) => tx.productIdentifier && tx.transactionId)
      .map((tx) => ({
        productId: tx.productIdentifier,
        txId: tx.transactionId,
        revokedAt: tx.revocationDate ? Date.parse(tx.revocationDate) || Date.now() : undefined,
        purchasedAt: tx.purchaseDate ? Date.parse(tx.purchaseDate) : undefined,
      }));
  },
  async finish(txId) {
    await NativePurchases.acknowledgePurchase({ purchaseToken: txId });
  },
};

// Simulated store for browser play-testing (dev server or VITE_MOCK_IAP=1 builds).
export interface MockIapControls {
  pending(): void;
  approve(): void;
  decline(): void;
  revoke(productId: string): void;
  replay(productId: string, txId: string): void;
}

let mockListener: (event: IapEvent) => void = () => {};
let mockPending = false;
let mockWaiting: { productId: string; txId: string } | null = null;
const mockOwned = new Set<string>();
let mockSequence = 0;

export const mockIapControls: MockIapControls = {
  pending() {
    mockPending = true;
  },
  approve() {
    if (!mockWaiting) return;
    const { productId, txId } = mockWaiting;
    mockWaiting = null;
    if (!PRODUCT_BY_ID[productId]?.consumable) mockOwned.add(productId);
    mockListener({ productId, txId });
  },
  decline() {
    mockWaiting = null;
  },
  revoke(productId) {
    mockOwned.delete(productId);
    mockListener({ productId, txId: `mock-revoke-${++mockSequence}`, revokedAt: Date.now() });
  },
  replay(productId, txId) {
    mockListener({ productId, txId });
  },
};

const mockIap: Iap = {
  kind: 'mock',
  async init(onTx) {
    mockListener = onTx;
    if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __iap: mockIapControls });
  },
  async prices() {
    return Object.fromEntries(
      PRODUCTS.map((p) => [p.id, { display: p.fallbackPrice, currency: 'USD', amount: Number(p.fallbackPrice.slice(1)) }]),
    );
  },
  async purchase(p) {
    const txId = `mock-${++mockSequence}`;
    if (mockPending) {
      mockPending = false;
      mockWaiting = { productId: p.id, txId };
      return { ok: false, pending: true };
    }
    if (!p.consumable) mockOwned.add(p.id);
    return { ok: true, txId, productId: p.id };
  },
  async restore() {
    return [...mockOwned];
  },
  async owned() {
    return [...mockOwned];
  },
  async transactions() {
    return [];
  },
  async finish() {},
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
  async transactions() {
    return [];
  },
  async finish() {},
};

export function createIap(): Iap {
  if (Capacitor.isNativePlatform()) return nativeIap;
  if (import.meta.env.DEV || import.meta.env.VITE_MOCK_IAP === '1') return mockIap;
  return noIap;
}
