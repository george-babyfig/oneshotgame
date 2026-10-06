import { describe, expect, it } from 'vitest';
import { momentumLoss, momentumRoundPerk, momentumWin, MOMENTUM_PERKS } from '../src/meta/momentum';
import { defaultProfile } from '../src/meta/profile';
import { MOMENTUM_UNLOCK } from '../src/meta/unlocks';

describe('Momentum pause', () => {
  it('builds only on first campaign clears and pauses perks on a retry', () => {
    const p = defaultProfile();
    p.level = MOMENTUM_UNLOCK - 1;
    momentumWin(p);
    expect(p.momentum.streak).toBe(0);
    p.level = MOMENTUM_UNLOCK;
    momentumWin(p);
    momentumWin(p);
    momentumWin(p, false);
    expect(p.momentum.streak).toBe(2);
    expect(momentumLoss(p, '2026-09-28')).toBeNull();
    expect(momentumLoss(p, '2026-09-29')).toBeNull();
    expect(p.momentum.streak).toBe(2);
    expect(p.momentum.paused).toBe(true);
    expect(MOMENTUM_PERKS[p.momentum.paused ? 0 : p.momentum.streak].throws).toBe(0);
    expect(p.momentum.shieldDay).toBe('');
    momentumWin(p, false);
    expect(p.momentum.paused).toBe(true);
    momentumWin(p);
    expect(p.momentum.paused).toBe(false);
    expect(p.momentum.streak).toBe(2);
    momentumWin(p);
    expect(p.momentum.streak).toBe(3);
    expect(p.stats.bestStreak).toBe(3);
  });

  it('readies one Scope at tier three and returns it after eight wins without loss resetting progress', () => {
    const p = defaultProfile();
    p.level = MOMENTUM_UNLOCK;
    for (let i = 0; i < 3; i++) momentumWin(p);
    expect(momentumRoundPerk(p)).toMatchObject({ throws: 2, spark: false, scope: true });
    momentumLoss(p, '2026-10-06');
    expect(momentumRoundPerk(p).scope).toBe(false);
    momentumWin(p);
    expect(momentumRoundPerk(p).scope).toBe(true);
    momentumWin(p, true, true);
    expect(momentumRoundPerk(p).scope).toBe(false);
    for (let i = 0; i < 8; i++) momentumWin(p);
    expect(momentumRoundPerk(p).scope).toBe(true);
  });
});
