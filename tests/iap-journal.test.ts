import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/ui/app';
import { defaultProfile, type Profile } from '../src/meta/profile';
import { PRODUCTS } from '../src/meta/tuning';
import type { Iap, IapEvent } from '../src/meta/iap';
import { purchaseHistory } from '../src/meta/ledger';

const files = new Map<string, string>();
const storage = {
  getItem: (key: string) => files.get(key) ?? null,
  setItem: (key: string, value: string) => void files.set(key, value),
  removeItem: (key: string) => void files.delete(key),
};

function harness(records: IapEvent[], owned: string[] = []) {
  const app = new App({} as HTMLElement);
  app.p = defaultProfile();
  vi.spyOn(app, 'refresh').mockImplementation(() => {});
  const acked: string[] = [];
  const iap = {
    kind: 'native',
    owned: async () => owned,
    drain: async () => records,
    transactions: async () => [],
    ack: async (ids: string[]) => {
      acked.push(...ids);
      records.splice(0, records.length, ...records.filter((event) => !ids.includes(event.txId)));
    },
  } as unknown as Iap;
  app.iap = iap;
  const reconcile = () => (app as unknown as { reconcilePurchases(): Promise<void> }).reconcilePurchases();
  return { app, acked, reconcile, iap };
}

beforeEach(() => {
  files.clear();
  vi.stubGlobal('localStorage', storage);
});

describe('native journal replay', () => {
  for (const key of ['gems_m', 'starter'] as const) {
    it(`${key}: duplicate record and crash before ack grant once`, async () => {
      const product = PRODUCTS.find((item) => item.key === key)!;
      const tx: IapEvent = { productId: product.id, txId: `journal-${key}`, purchasedAt: Date.now(), ownershipType: 'purchased' };
      const records = [tx, tx];
      const { app, acked, reconcile, iap } = harness(records);
      const initial = app.p.gems;
      let first = true;
      iap.ack = async (ids) => {
        if (first) {
          first = false;
          throw new Error('killed before ack');
        }
        acked.push(...ids);
        records.splice(0, records.length);
      };
      await expect(reconcile()).rejects.toThrow('killed before ack');
      const saved = JSON.parse(files.get('pp.profile')!) as Profile;
      expect(saved.processedTx).toContain(tx.txId);
      expect(saved.gems).toBe(initial + product.gems);

      // Cold launch replays the journal against the saved processedTx guard.
      const again = harness(records);
      again.app.p = saved;
      await again.reconcile();
      expect(again.app.p.gems).toBe(initial + product.gems);
      expect(again.app.p.processedTx.filter((id) => id === tx.txId)).toHaveLength(1);
      expect(records).toHaveLength(0);
      expect(again.acked).toContain(tx.txId);
    });
  }

  for (const ownershipType of ['familyShared', 'purchased']) {
    it(`${ownershipType} background grant has no device spending record or receipt`, async () => {
      const product = PRODUCTS.find((item) => item.key === 'theme_tidepool')!;
      const tx: IapEvent = { productId: product.id, txId: `remote-${ownershipType}`, purchasedAt: Date.now(), ownershipType };
      const before = purchaseHistory().length;
      const { app, reconcile } = harness([tx], [product.id]);
      await reconcile();
      expect((app.p.meta as { productEntitlements?: string[] }).productEntitlements).toContain(product.id);
      expect(purchaseHistory()).toHaveLength(before);
      expect((app as unknown as { lastReceipt?: unknown }).lastReceipt).toBeNull();
    });
  }

  for (const [key, skin] of [
    ['starter', 'aurora'],
    ['pass', 'cosmic'],
  ] as const) {
    it(`${key}: revoked older purchase cannot unequip a valid look`, async () => {
      const product = PRODUCTS.find((item) => item.key === key)!;
      const revoked: IapEvent = { productId: product.id, txId: 'old', purchasedAt: 1_000, revokedAt: 2_000 };
      const { app, reconcile, iap } = harness([revoked], [product.id]);
      if (key === 'starter') app.p.starter = true;
      else app.p.pass = true;
      app.p.skin = skin;
      app.p.skins.push(skin);
      iap.transactions = async () => [revoked, { productId: product.id, txId: 'new', purchasedAt: 3_000 }];
      await reconcile();
      expect(app.p.skin).toBe(skin);
      expect(app.p.skins).toContain(skin);
    });
  }
});
