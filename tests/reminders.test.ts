import { describe, expect, it } from 'vitest';
import { friendlyTime, inQuietHours, planReminders, QUIET_FROM, QUIET_UNTIL } from '../src/meta/reminders';

const local = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute).getTime();

describe('reminder planning', () => {
  it('marks 21:00–09:00 local as quiet hours', () => {
    expect(QUIET_FROM).toBe(21);
    expect(QUIET_UNTIL).toBe(9);
    expect(inQuietHours(local(28, 20, 59))).toBe(false);
    expect(inQuietHours(local(28, 21))).toBe(true);
    expect(inQuietHours(local(29, 8, 59))).toBe(true);
    expect(inQuietHours(local(29, 9))).toBe(false);
  });

  it('moves early and late times into friendly hours', () => {
    expect(friendlyTime(local(28, 8))).toBe(local(28, 10));
    expect(friendlyTime(local(28, 20, 30))).toBe(local(28, 20, 30));
    expect(friendlyTime(local(28, 20, 30) + 1000)).toBe(local(29, 10));
    expect(friendlyTime(local(28, 21))).toBe(local(29, 10));
  });

  it('plans the daily reminder for 18:30 on the next local day', () => {
    expect(planReminders({ now: local(28, 12), vaultFullAt: null })).toEqual([{ id: 102, at: local(29, 18, 30), kind: 'daily' }]);
  });

  it('never reminds on the day the game was opened', () => {
    expect(planReminders({ now: local(28, 12), vaultFullAt: local(28, 14) })).toEqual([{ id: 102, at: local(29, 18, 30), kind: 'daily' }]);
  });

  it('keeps only the earlier reminder when the vault fills tomorrow', () => {
    expect(planReminders({ now: local(28, 12), vaultFullAt: local(29, 11) })).toEqual([{ id: 101, at: local(29, 11), kind: 'vault' }]);
  });

  it('keeps only the earlier reminder when both land on the same day', () => {
    expect(planReminders({ now: local(28, 12), vaultFullAt: local(28, 22) })).toEqual([{ id: 101, at: local(29, 10), kind: 'vault' }]);
    expect(planReminders({ now: local(28, 12), vaultFullAt: local(29, 20) })).toEqual([{ id: 102, at: local(29, 18, 30), kind: 'daily' }]);
  });

  it('skips a vault time already in the past', () => {
    expect(planReminders({ now: local(28, 12), vaultFullAt: local(28, 8) })).toEqual([{ id: 102, at: local(29, 18, 30), kind: 'daily' }]);
  });
});
