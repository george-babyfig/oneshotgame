import { Capacitor, registerPlugin } from '@capacitor/core';
import { PRODUCTS, PRODUCT_BY_ID, type ProductDef } from './config';

export interface PurchaseOutcome {
  ok: boolean;
  cancelled?: boolean;
  pending?: boolean;
  error?: string;
  txId?: string;
  productId?: string;
}

export type IapEvent = {
  productId: string;
  txId: string;
  originalTxId?: string;
  revokedAt?: number;
  purchasedAt?: number;
  ownershipType?: string;
};
export type StorePrice = { display: string; currency: string; amount: number };

type JournalRecord = {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  revocationDate: number | null;
  ownershipType: string;
};
interface PurchaseJournalBridge {
  drain(): Promise<{ records: JournalRecord[] }>;
  ack(options: { ids: string[] }): Promise<void>;
  addListener(event: 'queued', callback: () => void): Promise<unknown>;
  prices(options: { ids: string[] }): Promise<{ prices: (StorePrice & { id: string })[] }>;
  purchase(options: { id: string }): Promise<PurchaseOutcome>;
  restore(): Promise<{ ids: string[] }>;
  owned(): Promise<{ ids: string[] }>;
  transactions(): Promise<{ records: JournalRecord[] }>;
}
const journal = registerPlugin<PurchaseJournalBridge>('PurchaseJournal');
const fromJournal = (record: JournalRecord): IapEvent => ({
  productId: record.productId,
  txId: record.transactionId,
  originalTxId: record.originalTransactionId,
  purchasedAt: record.purchaseDate,
  revokedAt: record.revocationDate ?? undefined,
  ownershipType: record.ownershipType,
});

/** A missing entitlement is not proof of revocation, particularly offline. */
export const shouldRevoke = (event: IapEvent) => event.revokedAt !== undefined;

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
  drain(): Promise<IapEvent[]>;
  ack(ids: string[]): Promise<void>;
}

// StoreKit 2 via the app-local native journal (no auto-finishing third-party listener).
const nativeIap: Iap = {
  kind: 'native',
  async init(onTx) {
    // A native UserDefaults journal retains updates even when no web listener exists.
    await journal.addListener('queued', () => {
      void journal
        .drain()
        .then(({ records }) => records.forEach((record) => onTx(fromJournal(record))))
        .catch(() => {});
    });
  },
  async prices() {
    try {
      const { prices } = await journal.prices({ ids: PRODUCTS.map((p) => p.id) });
      return Object.fromEntries(prices.map(({ id, ...price }) => [id, price]));
    } catch {
      return {};
    }
  },
  async purchase(p) {
    try {
      return await journal.purchase({ id: p.id });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/pending|ask to buy|deferred/i.test(msg)) return { ok: false, pending: true };
      if (/cancel/i.test(msg)) return { ok: false, cancelled: true };
      return { ok: false, error: msg };
    }
  },
  async restore() {
    try {
      return (await journal.restore()).ids;
    } catch {
      return this.owned();
    }
  },
  async owned() {
    const { ids } = await journal.owned();
    return ids.filter((id) => PRODUCT_BY_ID[id] && !PRODUCT_BY_ID[id].consumable);
  },
  async transactions() {
    return (await journal.transactions()).records.map(fromJournal);
  },
  async finish(txId) {
    await journal.ack({ ids: [txId] });
  },
  async drain() {
    return (await journal.drain()).records.map(fromJournal);
  },
  async ack(ids) {
    await journal.ack({ ids });
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
  async drain() {
    return [];
  },
  async ack() {},
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
  async drain() {
    return [];
  },
  async ack() {},
};

export function createIap(): Iap {
  if (Capacitor.isNativePlatform()) return nativeIap;
  if (import.meta.env.DEV || import.meta.env.VITE_MOCK_IAP === '1') return mockIap;
  return noIap;
}
