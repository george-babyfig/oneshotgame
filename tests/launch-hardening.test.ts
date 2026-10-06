import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keys = vi.hoisted(() => new Map<string, string>());
vi.mock('../src/meta/storage', () => ({
  loadKey: vi.fn(async (key: string) => keys.get(key) ?? null),
  saveKey: vi.fn(async (key: string, value: string) => {
    keys.set(key, value);
  }),
  saveKeyChecked: vi.fn(async (key: string, value: string) => {
    keys.set(key, value);
  }),
  removeKey: vi.fn(async (key: string) => {
    keys.delete(key);
  }),
}));

import { loadKey } from '../src/meta/storage';
import {
  defaultProfile,
  loadProfile,
  migrate,
  prepareInitRecovery,
  PROFILE_VERSION,
  profileLoadNotice,
  storageReadOnly,
} from '../src/meta/profile';
import { newChallengeSeed, encodeChallenge, decodeChallenge } from '../src/meta/modes';
import { shouldRevoke } from '../src/meta/iap';
import { sweepDetachedPortraits } from '../src/ui/art/critters';

beforeEach(() => {
  keys.clear();
  vi.mocked(loadKey).mockReset();
  vi.mocked(loadKey).mockImplementation(async (key: string) => keys.get(key) ?? null);
});
afterEach(() => vi.unstubAllGlobals());

describe('launch save protection', () => {
  it('quarantines an init failure and retries from the backup', async () => {
    const session = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => session.delete(key),
    });
    const raw = JSON.stringify({ ...defaultProfile(0), level: 17 });
    keys.set('pp.profile', raw);
    keys.set('pp.profile.bak', JSON.stringify({ ...defaultProfile(0), level: 8 }));
    await prepareInitRecovery();
    expect(keys.get('pp.profile.broken')).toBe(raw);
    expect((await loadProfile()).level).toBe(8);
    expect(profileLoadNotice()).toBe('recovered');
  });

  it('quarantines a corrupt primary and reads the backup', async () => {
    keys.set('pp.profile', '{bad');
    keys.set('pp.profile.bak', JSON.stringify({ ...defaultProfile(0), level: 12 }));
    expect((await loadProfile()).level).toBe(12);
    expect(keys.get('pp.profile.broken')).toBe('{bad');
    expect(profileLoadNotice()).toBe('recovered');
  });

  it('keeps both corrupt copies read-only', async () => {
    keys.set('pp.profile', '{bad');
    keys.set('pp.profile.bak', '{also bad');
    await loadProfile();
    expect(storageReadOnly()).toBe(true);
    expect(profileLoadNotice()).toBe('read-only');
  });

  it('keeps a throwing read read-only', async () => {
    vi.mocked(loadKey).mockRejectedValueOnce(new Error('read failed'));
    keys.set('pp.profile.bak', JSON.stringify({ ...defaultProfile(0), level: 8 }));
    expect((await loadProfile()).level).toBe(8);
    expect(storageReadOnly()).toBe(true);
    expect(profileLoadNotice()).toBe('read-only');
  });

  it('snapshots a pre-migration copy', async () => {
    const raw = JSON.stringify({ ...defaultProfile(0), v: PROFILE_VERSION - 1 });
    keys.set('pp.profile', raw);
    await loadProfile();
    expect(keys.get('pp.profile.pre-migration')).toBe(raw);
    keys.set('pp.profile', JSON.stringify({ ...defaultProfile(0), v: PROFILE_VERSION - 1, level: 7 }));
    await loadProfile();
    expect(keys.get('pp.profile.pre-migration')).toBe(raw);
  });

  it('refuses to downgrade a newer save', async () => {
    const raw = JSON.stringify({ ...defaultProfile(0), v: PROFILE_VERSION + 1 });
    keys.set('pp.profile', raw);
    await loadProfile();
    expect(profileLoadNotice()).toBe('newer');
    expect(storageReadOnly()).toBe(true);
    expect(keys.get('pp.profile')).toBe(raw);
    expect(() => migrate(JSON.parse(raw))).toThrow();
  });
});

it('keeps old challenge codes decodable while new seeds have no vowels', () => {
  expect(newChallengeSeed(() => 0)).toMatch(/^[^AEIOU]{5}$/);
  expect(decodeChallenge(encodeChallenge('ABCDE', 27))).toEqual({ seed: 'ABCDE', score: 27 });
});

it('requires explicit StoreKit revocation', () => {
  expect(shouldRevoke({ productId: 'starter', txId: '1' })).toBe(false);
  expect(shouldRevoke({ productId: 'starter', txId: '1', revokedAt: 123 })).toBe(true);
});

it('sweeps detached portraits independently of motion preference', () => {
  const canvas = { isConnected: false } as HTMLCanvasElement;
  const row = { detachedFrames: 60 };
  const removed: HTMLCanvasElement[] = [];
  sweepDetachedPortraits([[canvas, row]], (item) => removed.push(item));
  expect(removed).toEqual([canvas]);
});
