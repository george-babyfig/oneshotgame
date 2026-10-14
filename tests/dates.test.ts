import { describe, expect, it } from 'vitest';
import { clockText, untilText, whenText } from '../src/meta/dates';

describe('plain dates', () => {
  const now = new Date(2026, 0, 5, 10).getTime();
  it('uses the last playable day for exclusive end times', () => {
    const monday = new Date(2026, 0, 12).getTime();
    expect(untilText(monday, now, 'en')).toEqual({ key: 'until {day}', vars: { day: 'Sunday' } });
    expect(untilText(monday, now, 'de')).toEqual({ key: 'until {day}', vars: { day: 'Sonntag' } });
    expect(untilText(monday, new Date(2026, 0, 11, 12).getTime(), 'en')).toEqual({ key: 'until tonight' });
  });
  it('uses a date for longer events and keeps a festival on its last day', () => {
    const later = new Date(2026, 0, 18).getTime();
    expect(untilText(later, now, 'en')).toEqual({ key: 'until {date}', vars: { date: 'January 17' } });
    expect(untilText(later, now, 'de')).toEqual({ key: 'until {date}', vars: { date: '17. Januar' } });
    const festivalEnd = new Date(2026, 0, 31, 23, 59, 59).getTime();
    expect(untilText(festivalEnd + 1000, now, 'en')).toEqual({ key: 'until {date}', vars: { date: 'January 31' } });
  });
  it('formats local hours and minutes in each locale', () => {
    const time = new Date(2026, 0, 5, 14, 30).getTime();
    expect(clockText(time, 'en')).toMatch(/2:30.*PM/i);
    expect(clockText(time, 'de')).toMatch(/14:30/);
  });
  it('adds tomorrow or a weekday when a clock time crosses a local day', () => {
    const late = new Date(2026, 0, 5, 23, 30).getTime();
    const tomorrow = new Date(2026, 0, 6, 2).getTime();
    const later = new Date(2026, 0, 8, 14, 30).getTime();
    expect(whenText(late, now, 'en')).toMatch(/11:30.*PM/i);
    expect(whenText(tomorrow, late, 'en')).toMatch(/^tomorrow 0?2:00.*AM/i);
    expect(whenText(tomorrow, late, 'de')).toBe('morgen 02:00');
    expect(whenText(later, now, 'en')).toMatch(/^Thu 0?2:30.*PM/i);
    expect(whenText(later, now, 'de')).toBe('Do 14:30');
  });
});
