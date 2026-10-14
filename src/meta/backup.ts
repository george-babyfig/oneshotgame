// Snapshot backup, never live sync. Decision 73 keeps all identifiers off the profile.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { migrate, PROFILE_VERSION, saveProfileChecked, storageReadOnly, type Profile } from './profile';
import type { BackupKeyMeta, BackupReason, BackupRestoreResult, CloudBackupPlugin, CloudBackupStatus } from './m13types';
import { loadKey, removeKey, saveKeyChecked } from './storage';
import { purchaseHistory } from './ledger';
import { PRODUCTS, PRODUCT_BY_KEY } from './tuning';
import { restoreProduct } from './economy';
import { COSMETICS, isPaidLook, owns } from './cosmetics';

const cloud = registerPlugin<CloudBackupPlugin>('CloudBackup');
const STATE = 'pp.backup.state';
const UNDO = 'pp.profile.pre-restore';
const INTERVAL = 10 * 60_000;
const RAW_LIMIT = 256 * 1024;
interface State {
  on: boolean;
  saveId: string;
  nonce: string;
  seq: number;
  lastAt: number | null;
  sha256: string;
  pointerSeen: boolean;
}
let state: State | null = null;
let localPending: Promise<State> | null = null;
let watchPending: Promise<void> | null = null;
let full = false;
const changes = new Set<() => void>();
let generation = 0;
let listener: Awaited<ReturnType<CloudBackupPlugin['addListener']>> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let context: { current(): Profile; applied(p: Profile): void; beforeRestore?(): Promise<void>; finished?(): void } | null = null;

/** Refresh adult lists on eventual arrival or quota changes; never apply a cloud profile. */
export function onBackupChanged(changed: () => void): () => void {
  changes.add(changed);
  return () => {
    changes.delete(changed);
  };
}
function changed(): void {
  for (const notify of changes) notify();
}

/** Bind after app.init; native checks and all cloud work remain asynchronous. */
export function bindBackupProfile(binding: NonNullable<typeof context>): void {
  context = binding;
}
const available = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('CloudBackup');
const serial = <T>(work: () => Promise<T>): Promise<T> => {
  const job = queue.then(work, work);
  queue = job.catch(() => {});
  return job;
};
function id(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
async function local(): Promise<State> {
  if (state) return state;
  if (!localPending)
    localPending = readLocal().finally(() => {
      localPending = null;
    });
  return localPending;
}
async function readLocal(): Promise<State> {
  const raw = await loadKey(STATE);
  if (raw) {
    const saved = JSON.parse(raw) as State;
    if (validId(saved.saveId) && validId(saved.nonce) && Number.isSafeInteger(saved.seq) && saved.seq >= 0) {
      state = { ...saved, on: saved.on === true, lastAt: Number.isFinite(saved.lastAt) ? saved.lastAt : null };
      return state;
    }
    throw new Error('Invalid backup state'); // Never reuse or replace a damaged device identity.
  }
  const fresh: State = { on: false, saveId: id(), nonce: id(), seq: 0, lastAt: null, sha256: '', pointerSeen: false };
  await persist(fresh);
  return fresh;
}
async function persist(value: State): Promise<void> {
  await saveKeyChecked(STATE, JSON.stringify(value));
  state = value;
}
async function nativeStatus() {
  if (!available()) return { enabled: false, account: false };
  try {
    return await cloud.status();
  } catch {
    return { enabled: false, account: false };
  }
}
async function watch(): Promise<void> {
  if (listener) return;
  if (!watchPending)
    watchPending = attachListener().finally(() => {
      watchPending = null;
    });
  return watchPending;
}
async function attachListener(): Promise<void> {
  listener = await cloud.addListener('changed', (event) => {
    if (event.reason === 'quota') full = true;
    // An account change requires a fresh adult opt-in; don't copy a child's save to a new account.
    if (event.reason === 'account')
      void serial(async () => {
        const s = await local();
        await persist({ ...s, on: false, sha256: '', lastAt: null });
        await listener?.remove();
        listener = null;
        changed();
      }).catch(() => {});
    else changed();
  });
}
export async function backupStatus(): Promise<CloudBackupStatus> {
  const status = await nativeStatus();
  if (!status.enabled || !status.account) return { ...status, on: false, lastAt: null, full: false };
  try {
    const s = await local();
    if (s.on) await watch();
    return { ...status, on: s.on, lastAt: s.lastAt, full };
  } catch {
    return { ...status, on: false, lastAt: null, full: false };
  }
}
async function adult(): Promise<boolean> {
  const { parentalGate } = await import('../ui/flows/gate');
  return parentalGate('grownups');
}
export async function setBackupOn(on: boolean): Promise<CloudBackupStatus> {
  const status = await nativeStatus();
  if (!status.enabled || !status.account) return backupStatus();
  if (on && !(await adult())) return backupStatus();
  await serial(async () => {
    const check = await nativeStatus();
    if (!check.enabled || !check.account) return;
    const s = await local();
    await persist({ ...s, on });
    if (!on) {
      await listener?.remove();
      listener = null;
    }
  });
  return backupStatus();
}
async function digest(json: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
function validMeta(meta: BackupKeyMeta): boolean {
  return (
    !!meta &&
    validId(meta.saveId) &&
    validId(meta.nonce) &&
    meta.key === `pp.b.${meta.saveId}.${meta.nonce}` &&
    Number.isSafeInteger(meta.seq) &&
    meta.seq >= 0 &&
    Number.isSafeInteger(meta.v) &&
    meta.v > 0 &&
    Number.isFinite(meta.savedAt) &&
    meta.savedAt >= 0 &&
    /^[a-f0-9]{64}$/.test(meta.sha256) &&
    Number.isFinite(meta.bytes) &&
    meta.bytes >= 0 &&
    meta.bytes <= 96 * 1024 &&
    !!meta.summary &&
    Number.isSafeInteger(meta.summary.level) &&
    Number.isSafeInteger(meta.summary.friends)
  );
}
export async function maybeBackup(p: Profile, reason: BackupReason): Promise<boolean> {
  // Capture synchronously: a later save cannot change the snapshot during native work.
  const json = JSON.stringify(p);
  const revision = generation;
  return serial(async () => {
    try {
      const status = await backupStatus();
      if (revision !== generation || (context && context.current() !== p)) return false;
      if (!status.on || storageReadOnly() || new TextEncoder().encode(json).length > RAW_LIMIT) return false;
      const s = await local();
      const now = Date.now();
      if (reason === 'save' && s.lastAt !== null && now - s.lastAt < INTERVAL) return false;
      const sha256 = await digest(json);
      if (sha256 === s.sha256) return false;
      const snapshot = JSON.parse(json) as Profile;
      const key = `pp.b.${s.saveId}.${s.nonce}`;
      const meta: BackupKeyMeta = {
        key,
        saveId: s.saveId,
        nonce: s.nonce,
        seq: s.seq + 1,
        savedAt: now,
        sha256,
        v: snapshot.v,
        summary: { level: snapshot.level, friends: snapshot.home.residents.length, date: new Date(now).toISOString() },
        bytes: 0,
      };
      const own = (await cloud.list()).keys.find((entry) => entry.key === key && validMeta(entry));
      meta.seq = Math.max(s.seq, own?.seq ?? 0) + 1;
      const result = await cloud.write({ key, json, meta });
      full = result.reason === 'quota';
      if (!result.ok) return false;
      await persist({ ...s, seq: meta.seq, lastAt: now, sha256 });
      return true;
    } catch {
      return false;
    } // A failed backup never interrupts play or a paid save.
  });
}
export async function listBackups(): Promise<BackupKeyMeta[]> {
  try {
    if (!(await backupStatus()).on) return [];
    const { keys } = await cloud.list();
    return keys.filter(validMeta).sort((a, b) => a.saveId.localeCompare(b.saveId) || b.savedAt - a.savedAt || b.seq - a.seq);
  } catch {
    return [];
  }
}
export async function removeBackup(key: string): Promise<boolean> {
  if (!(await backupStatus()).on || !(await adult())) return false;
  return serial(async () => {
    if (!(await listBackups()).some((meta) => meta.key === key)) return false;
    try {
      await cloud.remove({ key });
      full = false;
      const s = await local();
      if (key === `pp.b.${s.saveId}.${s.nonce}`) await persist({ ...s, sha256: '', lastAt: null });
      return true;
    } catch {
      return false;
    }
  });
}

/** Decision 77: device purchase state survives. Unresolvable purchased gems refuse the whole restore. */
function keepDevice(restored: Profile, device: Profile, gemIds = device.processedTx): boolean {
  let gems = 0;
  const records = [...purchaseHistory(), ...device.pendingPurchaseRecords];
  for (const tx of gemIds.filter((tx) => !restored.processedTx.includes(tx))) {
    const record = records.find((record) => record.tx === tx);
    const product = record && PRODUCT_BY_KEY[record.key];
    // Piggy amounts were not journalled in 1.0. Guessing from its current amount loses paid gems.
    if (!product || product.key === 'piggy') return false;
    gems += product.gems;
  }
  restored.gems += gems;
  restored.processedTx = [...new Set([...restored.processedTx, ...device.processedTx])];
  restored.pendingPiggy = device.pendingPiggy ? { ...device.pendingPiggy } : null;
  restored.pendingPurchaseRecords = device.pendingPurchaseRecords.map((record) => ({ ...record }));
  restored.roadPassEntitlements = [...device.roadPassEntitlements];
  for (const key of ['productEntitlements', 'revokedProducts', 'refundQuietUntil', 'passLooksOnly', 'installed', 'sessions'] as const)
    Object.assign(restored.meta, { [key]: device.meta[key] });
  restored.settings.notifications = false;
  restored.settings.gameCenter = false;
  // These permission markers belong to this installation, too.
  restored.meta.notifAsked = device.meta.notifAsked;
  restored.gcReported = [...device.gcReported];
  restored.wardrobe = restored.wardrobe.filter(
    (id) =>
      !COSMETICS.some((look) => look.id === id && isPaidLook(look)) &&
      (id !== 'frame_gold' || restored.home.landmarks.keepers_beacon.stage === 4),
  );
  restored.skins = restored.skins.filter((id) => id !== 'aurora' && id !== 'cosmic');
  restored.starter = false;
  restored.pass = false;
  restored.meta.productEntitlements = [];
  for (const product of PRODUCTS) {
    const owned =
      product.key === 'starter'
        ? device.starter
        : product.key === 'pass'
          ? device.pass
          : device.meta.productEntitlements?.includes(product.id);
    if (owned && !device.meta.revokedProducts?.[product.id]) restoreProduct(restored, product.id);
  }
  restored.starter = device.starter;
  restored.pass = device.pass;
  restored.meta.productEntitlements = [...(device.meta.productEntitlements ?? [])];
  restored.meta.passLooksOnly = device.meta.passLooksOnly;
  // Legacy Pass grants are device entitlements, never another device's earned gifts.
  for (const id of device.wardrobe.filter((id) => ['paint_gilded_ground', 'paint_liquid_gold_sea', 'frame_gold'].includes(id)))
    if (device.pass && !restored.wardrobe.includes(id)) restored.wardrobe.push(id);
  for (const look of COSMETICS.filter(isPaidLook))
    if (owns(restored, look.id) && !restored.wardrobe.includes(look.id)) restored.wardrobe.push(look.id);
  if (!restored.skins.includes(restored.skin)) restored.skin = 'classic';
  return true;
}
function clamp(p: Profile): void {
  const now = Date.now();
  const time = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(n, now)) : now);
  p.home.lastTick = time(p.home.lastTick);
  p.vault.lastTick = time(p.vault.lastTick);
  p.lastCollect = time(p.lastCollect);
  p.meta.lastSeen = time(p.meta.lastSeen);
  p.settings.gatePausedUntil = time(p.settings.gatePausedUntil);
}
function parse(json: string): Profile {
  if (new TextEncoder().encode(json).length > RAW_LIMIT) throw new Error('Oversize backup');
  const raw = JSON.parse(json);
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    !Number.isSafeInteger(raw.v) ||
    raw.v < 1 ||
    !Number.isSafeInteger(raw.level) ||
    raw.level < 1 ||
    !Number.isFinite(raw.gems) ||
    raw.gems < 0
  )
    throw new Error('Invalid backup');
  return migrate(raw);
}
async function commitRestore(p: Profile, next: State, device: Profile, previous: State): Promise<void> {
  try {
    await saveProfileChecked(p);
    await persist(next);
  } catch (error) {
    // Restore the current copy if either half of the local commit failed; never discard the rescue.
    await saveProfileChecked(device).catch(() => {});
    await persist(previous).catch(() => {});
    throw error;
  }
}
export function isThisDeviceBackup(meta: BackupKeyMeta): boolean {
  return state?.nonce === meta.nonce;
}
export async function restoreBackup(key: string): Promise<BackupRestoreResult> {
  if (!context || !(await backupStatus()).on || !(await adult())) return 'unavailable';
  return serial(async () => {
    try {
      if (!(await backupStatus()).on || storageReadOnly()) return 'unavailable';
      await context!.beforeRestore?.();
      const read = await cloud.read({ key });
      if (!read.json || !read.meta || !validMeta(read.meta) || read.meta.key !== key) return 'invalid';
      if (read.meta.v > PROFILE_VERSION || JSON.parse(read.json).v > PROFILE_VERSION) return 'newer';
      if ((await digest(read.json)) !== read.meta.sha256) return 'invalid';
      const p = parse(read.json);
      const device = context!.current();
      if (!keepDevice(p, device)) return 'purchases';
      clamp(p);
      const s = await local();
      // Durable rescue before replacing the only current profile.
      await saveKeyChecked(UNDO, JSON.stringify({ json: JSON.stringify(device), state: s, restoredTx: p.processedTx }));
      await commitRestore(p, { ...s, saveId: read.meta.saveId, seq: 0, lastAt: null, sha256: '' }, device, s);
      generation++;
      context!.applied(p);
      return 'ok';
    } catch {
      return 'invalid';
    } finally {
      context?.finished?.();
    }
  });
}
export async function canUndoRestore(): Promise<boolean> {
  try {
    return !!(await loadKey(UNDO));
  } catch {
    return false;
  }
}
export async function undoRestore(): Promise<boolean> {
  if (!context || !(await backupStatus()).on || !(await adult())) return false;
  return serial(async () => {
    try {
      if (storageReadOnly()) return false;
      await context!.beforeRestore?.();
      const raw = await loadKey(UNDO);
      if (!raw) return false;
      const rescue = JSON.parse(raw) as { json: string; state: State; restoredTx: string[] };
      const p = parse(rescue.json);
      const device = context!.current();
      const added = device.processedTx.filter((tx) => !rescue.restoredTx.includes(tx));
      if (!keepDevice(p, device, added)) return false;
      clamp(p);
      const previous = await local();
      await commitRestore(p, { ...rescue.state, on: previous.on, sha256: '', lastAt: null }, device, previous);
      generation++;
      context!.applied(p);
      await removeKey(UNDO);
      return true;
    } catch {
      return false;
    } finally {
      context?.finished?.();
    }
  });
}
/** Reset leaves old cloud keys intact and keeps the installation's nonce. */
export async function newBackupLine(): Promise<void> {
  await serial(async () => {
    if (!available()) return;
    const status = await nativeStatus();
    if (!status.enabled || !status.account) return;
    const s = await local();
    generation++;
    await persist({ ...s, saveId: id(), seq: 0, lastAt: null, sha256: '' });
    await removeKey(UNDO);
  });
}
export function backupPointerEligible(p: Profile): boolean {
  return (
    p.meta.sessions > 1 &&
    !Object.keys(p.stars).some((n) => +n > 3 && p.stars[+n] > 0) &&
    !p.processedTx.length &&
    !p.starter &&
    !p.pass &&
    !p.roadPassEntitlements.length &&
    !(p.meta.productEntitlements ?? []).length
  );
}
export async function takeBackupPointer(p: Profile): Promise<boolean> {
  return serial(async () => {
    if (!backupPointerEligible(p) || !(await backupStatus()).on) return false;
    const s = await local();
    if (s.pointerSeen || !(await listBackups()).length) return false;
    await persist({ ...s, pointerSeen: true });
    return true;
  });
}
