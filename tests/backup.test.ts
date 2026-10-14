import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import type { BackupKeyMeta, CloudBackupPlugin } from '../src/meta/m13types';
import type { Profile } from '../src/meta/profile';

const fake = vi.hoisted(() => ({
  installed: true,
  native: true,
  enabled: true,
  account: true,
  quota: false,
  local: new Map<string, string>(),
  cloud: new Map<string, { json: string; meta: BackupKeyMeta }>(),
  gate: vi.fn(async () => true),
  changed: null as ((event: { reason: string }) => void) | null,
  view: null as BackupKeyMeta[] | null,
}));
const plugin = vi.hoisted(() => ({
  status: vi.fn(async () => ({ enabled: fake.enabled, account: fake.account })),
  list: vi.fn(async () => ({ keys: fake.view ?? [...fake.cloud.values()].map((entry) => entry.meta) })),
  read: vi.fn(async ({ key }: { key: string }) => fake.cloud.get(key) ?? { json: null }),
  write: vi.fn(async ({ key, json, meta }: { key: string; json: string; meta: BackupKeyMeta }) => {
    if (fake.quota || (!fake.cloud.has(key) && fake.cloud.size >= 6)) return { ok: false, reason: 'quota' as const };
    fake.cloud.set(key, { json, meta: { ...meta, bytes: deflateSync(json).length } });
    return { ok: true };
  }),
  remove: vi.fn(async ({ key }: { key: string }) => {
    fake.cloud.delete(key);
  }),
  addListener: vi.fn(async (_name: string, changed: (event: { reason: string }) => void) => {
    fake.changed = changed;
    return {
      remove: vi.fn(async () => {
        fake.changed = null;
      }),
    };
  }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => (fake.native ? 'ios' : 'web'), isNativePlatform: () => false, isPluginAvailable: () => fake.installed },
  registerPlugin: () => plugin,
}));
vi.mock('../src/meta/storage', () => ({
  loadKey: vi.fn(async (key: string) => fake.local.get(key) ?? null),
  saveKey: vi.fn(async (key: string, value: string) => {
    fake.local.set(key, value);
  }),
  saveKeyChecked: vi.fn(async (key: string, value: string) => {
    fake.local.set(key, value);
  }),
  removeKey: vi.fn(async (key: string) => {
    fake.local.delete(key);
  }),
}));
vi.mock('../src/ui/flows/gate', () => ({ parentalGate: fake.gate }));
import { saveKeyChecked } from '../src/meta/storage';

let backup: typeof import('../src/meta/backup');
let profile: typeof import('../src/meta/profile');
let ledger: typeof import('../src/meta/ledger');
let p: Profile;
let applied: ReturnType<typeof vi.fn<(p: Profile) => void>>;
const nonce = 'a'.repeat(32);
const line = 'b'.repeat(32);
function put(snapshot: Profile, saveId = line, deviceNonce = nonce, at = Date.now()): string {
  const key = `pp.b.${saveId}.${deviceNonce}`;
  const json = JSON.stringify(snapshot);
  fake.cloud.set(key, {
    json,
    meta: {
      key,
      saveId,
      nonce: deviceNonce,
      seq: 1,
      savedAt: at,
      v: snapshot.v,
      sha256: createHash('sha256').update(json).digest('hex'),
      summary: { level: snapshot.level, friends: snapshot.home.residents.length, date: new Date(at).toISOString() },
      bytes: deflateSync(json).length,
    },
  });
  return key;
}
function storeCalls(): number {
  return [plugin.list, plugin.read, plugin.write, plugin.remove].reduce((sum, method) => sum + method.mock.calls.length, 0);
}
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  fake.local.clear();
  fake.cloud.clear();
  fake.view = null;
  fake.changed = null;
  fake.installed = fake.native = fake.enabled = fake.account = true;
  fake.quota = false;
  fake.gate.mockResolvedValue(true);
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 14));
  backup = await import('../src/meta/backup');
  profile = await import('../src/meta/profile');
  ledger = await import('../src/meta/ledger');
  p = profile.defaultProfile(0);
  applied = vi.fn((restored: Profile) => {
    p = restored;
  });
  backup.bindBackupProfile({ current: () => p, applied });
});
afterEach(() => vi.restoreAllMocks());

describe('A12 opt-in snapshots', () => {
  it.each(['web', 'absent', 'disabled', 'account', 'off'] as const)('makes zero plugin store calls while %s', async (mode) => {
    fake.installed = mode !== 'absent';
    fake.native = mode !== 'web';
    fake.enabled = mode !== 'disabled';
    fake.account = mode !== 'account';
    expect((await backup.backupStatus()).on).toBe(false);
    if (mode !== 'off') await backup.setBackupOn(true);
    expect(await backup.maybeBackup(p, 'save')).toBe(false);
    expect(await backup.listBackups()).toEqual([]);
    expect(await backup.restoreBackup('anything')).toBe('unavailable');
    expect(await backup.undoRestore()).toBe(false);
    expect(await backup.removeBackup('anything')).toBe(false);
    expect(await backup.takeBackupPointer(p)).toBe(false);
    expect(storeCalls()).toBe(0);
    expect(plugin.addListener).not.toHaveBeenCalled();
  });
  it('creates one device identity and one listener during concurrent status checks', async () => {
    await Promise.all(Array.from({ length: 8 }, () => backup.backupStatus()));
    const state = JSON.parse(fake.local.get('pp.backup.state')!);
    await backup.setBackupOn(true);
    await Promise.all(Array.from({ length: 8 }, () => backup.backupStatus()));
    expect(JSON.parse(fake.local.get('pp.backup.state')!).nonce).toBe(state.nonce);
    expect(plugin.addListener).toHaveBeenCalledOnce();
  });
  it('persists the off choice across launches and does not open the store', async () => {
    await backup.setBackupOn(true);
    await backup.setBackupOn(false);
    vi.resetModules();
    const relaunched = await import('../src/meta/backup');
    const calls = storeCalls();
    expect((await relaunched.backupStatus()).on).toBe(false);
    expect(await relaunched.maybeBackup(p, 'hidden')).toBe(false);
    expect(storeCalls()).toBe(calls);
  });
  it('does not write oversized raw JSON or a seventh key', async () => {
    await backup.setBackupOn(true);
    const oversized = { ...p, savedRound: 'x'.repeat(256 * 1024) };
    backup.bindBackupProfile({ current: () => oversized, applied });
    expect(await backup.maybeBackup(oversized, 'pause')).toBe(false);
    expect(plugin.write).not.toHaveBeenCalled();
    backup.bindBackupProfile({ current: () => p, applied });
    for (let i = 0; i < 6; i++) put(p, i.toString(16).repeat(32));
    expect(await backup.maybeBackup(p, 'pause')).toBe(false);
    expect(fake.cloud.size).toBe(6);
    expect((await backup.backupStatus()).full).toBe(true);
  });
  it('shows a pointer once only when a copy exists and the fresh player has finished session 1', async () => {
    await backup.setBackupOn(true);
    p.meta.sessions = 1;
    put(p);
    expect(await backup.takeBackupPointer(p)).toBe(false);
    p.meta.sessions = 2;
    expect(await Promise.all([backup.takeBackupPointer(p), backup.takeBackupPointer(p)])).toEqual([true, false]);
    expect(await backup.takeBackupPointer(p)).toBe(false);
  });
  it('requires an adult to opt in, then persists off and stops writes', async () => {
    fake.gate.mockResolvedValue(false);
    expect((await backup.setBackupOn(true)).on).toBe(false);
    expect(storeCalls()).toBe(0);
    fake.gate.mockResolvedValue(true);
    expect((await backup.setBackupOn(true)).on).toBe(true);
    expect(await backup.maybeBackup(p, 'save')).toBe(true);
    await backup.setBackupOn(false);
    const calls = storeCalls();
    p.gems++;
    expect(await backup.maybeBackup(p, 'hidden')).toBe(false);
    expect(storeCalls()).toBe(calls);
    expect(JSON.parse(fake.local.get('pp.backup.state')!).on).toBe(false);
  });
  it('throttles saves for ten minutes, flushes pause/hidden, and skips unchanged snapshots', async () => {
    await backup.setBackupOn(true);
    const bytes = JSON.stringify(p);
    expect(await backup.maybeBackup(p, 'save')).toBe(true);
    expect(JSON.stringify(p)).toBe(bytes);
    p.gems++;
    expect(await backup.maybeBackup(p, 'save')).toBe(false);
    expect(await backup.maybeBackup(p, 'pause')).toBe(true);
    expect(await backup.maybeBackup(p, 'hidden')).toBe(false);
    vi.mocked(Date.now).mockReturnValue(Date.UTC(2026, 9, 14) + 600_000);
    p.gems++;
    expect(await backup.maybeBackup(p, 'save')).toBe(true);
    expect(plugin.write).toHaveBeenCalledTimes(3);
    expect(fake.cloud.size).toBe(1);
    expect([...fake.cloud.values()][0].meta.seq).toBe(3);
    expect(p).not.toHaveProperty('saveId');
  });
  it('two devices with stale views never overwrite a sibling key', async () => {
    put({ ...p, gems: 42 });
    fake.view = [];
    fake.local.set(
      'pp.backup.state',
      JSON.stringify({ on: false, saveId: line, nonce: 'c'.repeat(32), seq: 0, lastAt: null, sha256: '', pointerSeen: false }),
    );
    await backup.setBackupOn(true);
    await backup.maybeBackup(p, 'pause');
    const first = JSON.parse(fake.local.get('pp.backup.state')!);
    // A second isolated module represents another installation with a stale cloud view.
    fake.local.clear();
    fake.local.set(
      'pp.backup.state',
      JSON.stringify({ on: false, saveId: line, nonce: 'd'.repeat(32), seq: 0, lastAt: null, sha256: '', pointerSeen: false }),
    );
    vi.resetModules();
    const other = await import('../src/meta/backup');
    await other.setBackupOn(true);
    expect(await other.maybeBackup(p, 'pause')).toBe(true);
    expect(fake.cloud.size).toBe(3);
    const second = JSON.parse(fake.local.get('pp.backup.state')!);
    expect(first.saveId).toBe(second.saveId);
    expect(first.nonce).not.toBe(second.nonce);
    expect(fake.cloud.get(`pp.b.${line}.${nonce}`)?.json).toContain('"gems":42');
    fake.view = null;
    expect(await other.listBackups()).toHaveLength(3);
  });
  it('keeps saveProfileChecked stable with a backup and another save interleaving', async () => {
    await backup.setBackupOn(true);
    const bytes = JSON.stringify(p);
    await Promise.all([profile.saveProfileChecked(p), backup.maybeBackup(p, 'pause'), profile.saveProfile(p)]);
    expect(fake.local.get('pp.profile')).toBe(bytes);
    expect(JSON.stringify(p)).toBe(bytes);
  });
  it('reports quota, offers removal, and retains the old key on reset', async () => {
    await backup.setBackupOn(true);
    fake.quota = true;
    expect(await backup.maybeBackup(p, 'pause')).toBe(false);
    expect((await backup.backupStatus()).full).toBe(true);
    fake.quota = false;
    await backup.maybeBackup(p, 'pause');
    const old = [...fake.cloud.keys()][0];
    await backup.newBackupLine();
    await backup.maybeBackup(p, 'pause');
    expect(fake.cloud.has(old)).toBe(true);
    expect(fake.cloud.size).toBe(2);
    expect(await backup.removeBackup(old)).toBe(true);
    expect(fake.cloud.size).toBe(1);
  });
  it('requires a new opt-in after an Apple account change', async () => {
    await backup.setBackupOn(true);
    fake.changed?.({ reason: 'account' });
    // Serialize after the account event to observe its durable local write.
    expect(await backup.maybeBackup(p, 'pause')).toBe(false);
    expect((await backup.backupStatus()).on).toBe(false);
    expect(storeCalls()).toBe(0);
  });
  it('lists newest device copies first within each line, and never restores on change', async () => {
    put(p, line, 'c'.repeat(32), Date.now() - 1000);
    put(p, line, 'd'.repeat(32));
    await backup.setBackupOn(true);
    expect((await backup.listBackups()).map((entry) => entry.nonce)).toEqual(['d'.repeat(32), 'c'.repeat(32)]);
    const refresh = vi.fn();
    const stop = backup.onBackupChanged(refresh);
    fake.changed?.({ reason: 'server' });
    expect(refresh).toHaveBeenCalledOnce();
    stop();
    fake.changed?.({ reason: 'initial' });
    expect(refresh).toHaveBeenCalledOnce();
    expect(applied).not.toHaveBeenCalled();
    expect(plugin.read).not.toHaveBeenCalled();
  });
});

describe('A12 explicit adult restore', () => {
  it('keeps live and stored progress if the rescue cannot be saved', async () => {
    await backup.setBackupOn(true);
    const before = JSON.stringify(p);
    vi.mocked(saveKeyChecked).mockRejectedValueOnce(new Error('Disk unavailable'));
    expect(await backup.restoreBackup(put({ ...p, level: 22 }))).toBe('invalid');
    expect(JSON.stringify(p)).toBe(before);
    expect(applied).not.toHaveBeenCalled();
  });
  it('rolls back both local halves if the progress-line state commit fails', async () => {
    await backup.setBackupOn(true);
    const before = JSON.stringify(p);
    const state = fake.local.get('pp.backup.state');
    vi.mocked(saveKeyChecked).mockImplementationOnce(async (key, value) => {
      fake.local.set(key, value);
    });
    vi.mocked(saveKeyChecked).mockRejectedValueOnce(new Error('State write failed'));
    expect(await backup.restoreBackup(put({ ...p, level: 22 }))).toBe('invalid');
    expect(fake.local.get('pp.profile')).toBe(before);
    expect(fake.local.get('pp.backup.state')).toBe(state);
    expect(JSON.stringify(p)).toBe(before);
    expect(applied).not.toHaveBeenCalled();
    expect(await backup.canUndoRestore()).toBe(true);
  });
  it('refuses a failed gate before reading or changing progress', async () => {
    const key = put(p);
    await backup.setBackupOn(true);
    fake.gate.mockResolvedValue(false);
    expect(await backup.restoreBackup(key)).toBe('unavailable');
    expect(plugin.read).not.toHaveBeenCalled();
    expect(applied).not.toHaveBeenCalled();
  });
  it('refuses newer versions, corrupt hashes and malformed profiles', async () => {
    await backup.setBackupOn(true);
    const key = put({ ...p, v: profile.PROFILE_VERSION + 1 });
    expect(await backup.restoreBackup(key)).toBe('newer');
    put(p);
    fake.cloud.get(key)!.meta.sha256 = '0'.repeat(64);
    expect(await backup.restoreBackup(key)).toBe('invalid');
    put({ ...p, gems: -1 });
    expect(await backup.restoreBackup(key)).toBe('invalid');
    expect(applied).not.toHaveBeenCalled();
  });
  it('keeps the device purchase list, merges missing gems, re-derives looks and clamps all five clocks', async () => {
    const saved = profile.defaultProfile(0);
    saved.level = 27;
    saved.gems = 70;
    saved.starter = true;
    saved.skins.push('aurora', 'cosmic');
    saved.skin = 'aurora';
    saved.meta.productEntitlements = ['com.pocketplanet.game.theme.tidepool'];
    saved.wardrobe = ['hat_crown'];
    saved.processedTx = ['remote'];
    saved.home.lastTick =
      saved.vault.lastTick =
      saved.lastCollect =
      saved.meta.lastSeen =
      saved.settings.gatePausedUntil =
        Date.now() + 10000;
    saved.settings.notifications = saved.settings.gameCenter = true;
    p.pass = true;
    p.meta.passLooksOnly = true;
    p.roadPassEntitlements = ['road00'];
    p.meta.installed = 123;
    p.meta.sessions = 4;
    p.processedTx = ['paid'];
    p.pendingPiggy = { amount: 91, startedAt: 42 };
    p.pendingPurchaseRecords = [{ tx: 'paid', key: 'gems_m', at: 0 }];
    p.meta.refundQuietUntil = 888;
    p.meta.revokedProducts = { old: 23 };
    await backup.setBackupOn(true);
    const key = put(saved);
    const before = JSON.stringify(p);
    expect(await backup.restoreBackup(key)).toBe('ok');
    expect(p).toMatchObject({
      level: 27,
      gems: 570,
      pass: true,
      starter: false,
      skin: 'classic',
      roadPassEntitlements: ['road00'],
      pendingPiggy: { amount: 91 },
      settings: { notifications: false, gameCenter: false },
      meta: { installed: 123, sessions: 4, refundQuietUntil: 888, revokedProducts: { old: 23 } },
    });
    expect(p.processedTx).toEqual(['remote', 'paid']);
    expect(p.skins).not.toContain('aurora');
    expect(p.meta.productEntitlements).toEqual([]);
    expect([p.home.lastTick, p.vault.lastTick, p.lastCollect, p.meta.lastSeen, p.settings.gatePausedUntil]).toEqual(
      Array(5).fill(Date.now()),
    );
    expect(JSON.parse(fake.local.get('pp.profile.pre-restore')!).json).toBe(before);
    const state = JSON.parse(fake.local.get('pp.backup.state')!);
    expect(state.saveId).toBe(line);
    expect(state.nonce).not.toBe(nonce);
    expect(await backup.maybeBackup(p, 'pause')).toBe(true);
    expect(fake.cloud.has(key)).toBe(true);
    expect(fake.cloud.size).toBe(2);
  });
  it("restores only this device's theme/starter looks and strips foreign product looks", async () => {
    const saved = profile.defaultProfile(0);
    saved.pass = true;
    saved.roadPass = [0, 4];
    saved.skins.push('cosmic');
    p.starter = true;
    p.meta.productEntitlements = ['com.pocketplanet.game.theme.tidepool'];
    await backup.setBackupOn(true);
    expect(await backup.restoreBackup(put(saved))).toBe('ok');
    expect(p.starter).toBe(true);
    expect(p.pass).toBe(false);
    expect(p.skins).toContain('aurora');
    expect(p.skins).not.toContain('cosmic');
    expect(p.wardrobe).toContain('tidepool_ground');
    expect(p.wardrobe).not.toContain('paint_gilded_ground');
  });
  it.each(['missing', 'piggy'])('refuses %s purchase amounts without losing local progress', async (kind) => {
    p.processedTx = ['unknown'];
    if (kind === 'piggy') p.pendingPurchaseRecords = [{ tx: 'unknown', key: 'piggy', at: 0 }];
    const before = JSON.stringify(p);
    await backup.setBackupOn(true);
    expect(await backup.restoreBackup(put(profile.defaultProfile(0)))).toBe('purchases');
    expect(JSON.stringify(p)).toBe(before);
    expect(applied).not.toHaveBeenCalled();
    expect(fake.local.has('pp.profile.pre-restore')).toBe(false);
  });
  it('undo keeps purchases since restore, and does not add imported gems twice', async () => {
    p.level = 8;
    p.gems = 10;
    await backup.setBackupOn(true);
    const saved = { ...profile.defaultProfile(0), gems: 100, level: 22, processedTx: ['remote'] };
    expect(await backup.restoreBackup(put(saved))).toBe('ok');
    p.processedTx.push('new');
    p.gems += 500;
    ledger.recordPurchase({ tx: 'new', key: 'gems_m', cents: 499, at: Date.now() });
    expect(await backup.undoRestore()).toBe(true);
    expect(p.level).toBe(8);
    expect(p.gems).toBe(510);
    expect(p.processedTx).toEqual(['remote', 'new']);
    expect(await backup.canUndoRestore()).toBe(false);
    expect(await backup.undoRestore()).toBe(false);
  });
  it('continues its own existing key sequence after restoring that line', async () => {
    await backup.setBackupOn(true);
    await backup.maybeBackup(p, 'pause');
    const key = [...fake.cloud.keys()][0];
    expect(await backup.restoreBackup(key)).toBe('ok');
    expect(await backup.maybeBackup(p, 'pause')).toBe(true);
    expect(fake.cloud.size).toBe(1);
    expect(fake.cloud.get(key)!.meta.seq).toBe(2);
    expect(backup.isThisDeviceBackup(fake.cloud.get(key)!.meta)).toBe(true);
  });
  it('ignores a queued snapshot from the old profile after restoring another line', async () => {
    await backup.setBackupOn(true);
    const key = put({ ...profile.defaultProfile(0), level: 22 });
    const old = p;
    const restoring = backup.restoreBackup(key);
    expect(await restoring).toBe('ok');
    expect(await backup.maybeBackup(old, 'hidden')).toBe(false);
    expect(plugin.write).not.toHaveBeenCalled();
  });
  it('keeps undo gated', async () => {
    await backup.setBackupOn(true);
    await backup.restoreBackup(put(profile.defaultProfile(0)));
    fake.gate.mockResolvedValue(false);
    expect(await backup.undoRestore()).toBe(false);
    expect(await backup.canUndoRestore()).toBe(true);
  });
});

// The fake's API also stays aligned with S's native contract.
const contract: CloudBackupPlugin = plugin;
void contract;
