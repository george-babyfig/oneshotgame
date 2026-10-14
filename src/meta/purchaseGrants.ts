// Exact grants stay on this installation; spending history and cloud profiles are separate.
import { loadKey, saveKeyChecked } from './storage';

const KEY = 'pp.purchase.grants';
export interface PurchaseGrant {
  tx: string;
  key: string;
  gems: number;
}
export async function purchaseGrants(): Promise<PurchaseGrant[]> {
  const raw = await loadKey(KEY);
  if (!raw) return [];
  const records: unknown = JSON.parse(raw);
  if (
    !Array.isArray(records) ||
    records.some((r) => !r || typeof r.tx !== 'string' || typeof r.key !== 'string' || !Number.isSafeInteger(r.gems) || r.gems < 0)
  )
    throw new Error('Invalid purchase grants');
  return records;
}
/** Save before granting or acknowledging, including Ask to Buy and launch reconciliation. */
export async function recordPurchaseGrant(record: PurchaseGrant): Promise<PurchaseGrant> {
  const records = await purchaseGrants();
  const existing = records.find((r) => r.tx === record.tx);
  if (existing) return existing;
  await saveKeyChecked(KEY, JSON.stringify([...records, record]));
  return record;
}
