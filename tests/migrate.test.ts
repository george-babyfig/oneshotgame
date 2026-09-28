import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';

describe('profile migration', () => {
  it('turns off old reminder settings and fills new counters', () => {
    const old = defaultProfile(0);
    const { gameCenter: _gameCenter, ...oldSettings } = old.settings;
    const { fails: _fails, visits: _visits, continuesUsed: _continuesUsed, ...oldProfile } = old;
    const saved = { ...oldProfile, settings: { ...oldSettings, notifications: true } };
    const p = migrate({ ...saved });
    expect(p.settings.notifications).toBe(false);
    expect(p.settings.gameCenter).toBe(false);
    expect(p.fails).toEqual({});
    expect(p.visits).toEqual({});
    expect(p.continuesUsed).toEqual({});
  });

  it('keeps a new save’s chosen settings and counters', () => {
    const saved = defaultProfile(0);
    saved.settings.notifications = true;
    saved.settings.gameCenter = true;
    saved.fails[11] = 2;
    saved.visits.bunny = 3;
    saved.continuesUsed[11] = 1;
    const p = migrate({ ...saved });
    expect(p.settings.notifications).toBe(true);
    expect(p.settings.gameCenter).toBe(true);
    expect(p.fails[11]).toBe(2);
    expect(p.visits.bunny).toBe(3);
    expect(p.continuesUsed[11]).toBe(1);
  });
});
