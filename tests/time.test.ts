// Time-travel suite (ROADMAP-v2 7.7, M1 item 1.7): ISO week 53, year end, month end, daylight saving
// in both hemispheres, and a clock moved forward or back.
//
// Vitest runs in the machine's time zone, and setting process.env.TZ inside a test file is unreliable.
// So every date here is built as a LOCAL date (new Date(y, m, d, h)), and the DST checks walk every
// hour of two whole years asserting invariants ("the key changes exactly once, at local midnight"),
// which covers whatever DST transitions the current zone has. To check another zone, run e.g.
//   TZ=Australia/Sydney npx vitest run tests/time.test.ts
import { describe, expect, it } from 'vitest';
import { dayGap, defaultProfile, today } from '../src/meta/profile';
import { EVENTS, eventEndsIn, eventFor, isoWeek } from '../src/meta/events';
import { ensureFestival, festivalDaysLeft, festivalKey, festivalOn, FESTIVALS } from '../src/meta/festivals';
import { clearStop, ensureVoyage, VOYAGE_NAMES, voyageName } from '../src/meta/voyage';
import { seasonOf, skyEventOn } from '../src/meta/seasons';
import { untilText, whenText } from '../src/meta/dates';
import { friendlyTime, inQuietHours, planReminders } from '../src/meta/reminders';
import { dailyNumber } from '../src/meta/modes';
import { canStamp, stamp } from '../src/meta/calendar';
import { collectDust, pendingDust } from '../src/meta/economy';
import { period, ready, tickHome } from '../src/meta/homeworld';
import { checkMail } from '../src/meta/inbox';

const HOUR = 3600000;
const DAY = 86400000;

/** Every hour from local midnight on `from` up to (not including) local midnight on `to`. */
function* hours(from: Date, to: Date) {
  for (let t = from.getTime(); t < to.getTime(); t += HOUR) yield new Date(t);
}
/** Every local calendar day at the given local hour (DST-safe: steps the day field, not 24 h). */
function* days(y0: number, y1: number, hour = 12) {
  for (let i = 0; ; i++) {
    const d = new Date(y0, 0, 1 + i, hour);
    if (d.getFullYear() > y1) return;
    yield d;
  }
}
const weekNum = (key: string) => {
  const [y, w] = key.split('-W').map(Number);
  return { y, w };
};
const localMinutes = (t: number) => {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
};
const dayKey = (t: number) => today(new Date(t));

const TWO_YEARS: [Date, Date] = [new Date(2026, 0, 1), new Date(2028, 0, 1)];

describe('time: local calendar days', () => {
  it('today() changes exactly once per local day, one day at a time, through both DST changes', () => {
    let prev = today(TWO_YEARS[0]);
    let changes = 0;
    for (const d of hours(...TWO_YEARS)) {
      const cur = today(d);
      if (cur !== prev) {
        changes++;
        expect(dayGap(prev, cur), `${prev} → ${cur}`).toBe(1);
        expect(d.getHours(), `${cur} started at local hour ${d.getHours()}`).toBeLessThanOrEqual(1);
        prev = cur;
      }
    }
    expect(changes).toBe(365 + 365 - 1); // 2026 and 2027 are both 365 days
  });

  it('dayGap and the Daily Planet number step by 1 every day, across month ends, Feb 29 and year ends', () => {
    expect(dailyNumber('2026-01-01')).toBe(1);
    let prev = today(new Date(2026, 0, 1));
    for (const d of days(2026, 2032)) {
      const cur = today(d);
      if (cur === prev) continue;
      expect(dayGap(prev, cur), `${prev} → ${cur}`).toBe(1);
      expect(dailyNumber(cur)).toBe(dailyNumber(prev) + 1);
      prev = cur;
    }
    expect(dayGap('2028-02-28', '2028-03-01')).toBe(2);
    expect(dayGap('2026-02-28', '2026-03-01')).toBe(1);
    expect(dayGap('2026-12-31', '2027-01-01')).toBe(1);
    expect(dailyNumber('2027-01-01')).toBe(366);
  });
});

describe('time: ISO weeks and Weekly Voyage', () => {
  it('knows the week-53 years and the year-end edges', () => {
    const wk = (y: number, m: number, d: number) => isoWeek(new Date(y, m - 1, d, 12));
    // 2026 starts on a Thursday, so it has 53 ISO weeks
    expect(wk(2026, 1, 1)).toBe('2026-W01');
    expect(wk(2026, 9, 28)).toBe('2026-W40');
    expect(wk(2026, 12, 28)).toBe('2026-W53');
    expect(wk(2026, 12, 31)).toBe('2026-W53');
    expect(wk(2027, 1, 1)).toBe('2026-W53');
    expect(wk(2027, 1, 3)).toBe('2026-W53');
    expect(wk(2027, 1, 4)).toBe('2027-W01');
    expect(wk(2020, 12, 31)).toBe('2020-W53');
    expect(wk(2021, 1, 3)).toBe('2020-W53');
    expect(wk(2021, 1, 4)).toBe('2021-W01');
    expect(wk(2024, 12, 30)).toBe('2025-W01');
    expect(wk(2025, 12, 29)).toBe('2026-W01');
    expect(wk(2027, 12, 31)).toBe('2027-W52');
    expect(isoWeek(new Date(2027, 0, 3, 23, 59, 59, 999))).toBe('2026-W53');
    expect(isoWeek(new Date(2027, 0, 4, 0, 0, 0, 0))).toBe('2027-W01');
  });

  it('every week has 7 days, starts on a Monday, and only 2015, 2020, 2026 and 2032 have a week 53', () => {
    const long = new Set<number>();
    const perWeek = new Map<string, number>();
    let prev = '';
    for (const d of days(2015, 2033)) {
      const key = isoWeek(d);
      if (key !== prev) {
        if (prev) {
          expect(d.getDay(), `${key} starts on ${d.toDateString()}`).toBe(1);
          const a = weekNum(prev);
          const b = weekNum(key);
          expect(b.y * 100 + b.w, `${prev} → ${key}`).toBeGreaterThan(a.y * 100 + a.w);
          expect(b.w === a.w + 1 || (b.w === 1 && b.y === a.y + 1 && a.w >= 52), `${prev} → ${key}`).toBe(true);
        }
        prev = key;
      }
      perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
      const { y, w } = weekNum(key);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(53);
      if (w === 53) long.add(y);
    }
    expect([...long].sort()).toEqual([2015, 2020, 2026, 2032]);
    const partial = [...perWeek].filter(([, n]) => n !== 7).map(([k]) => k);
    expect(partial).toEqual(['2015-W01', '2033-W52']); // only the two ends of the loop
  });

  it('the week key changes exactly once a week, at local Monday 00:00, through both DST changes', () => {
    let prev = isoWeek(TWO_YEARS[0]);
    let last: Date | null = null;
    let changes = 0;
    for (const d of hours(...TWO_YEARS)) {
      const cur = isoWeek(d);
      if (cur !== prev) {
        changes++;
        expect(d.getDay(), `${cur} began ${d.toString()}`).toBe(1);
        expect(d.getHours()).toBeLessThanOrEqual(1);
        if (last) expect(Math.round((d.getTime() - last.getTime()) / DAY), `${prev} → ${cur}`).toBe(7);
        last = d;
        prev = cur;
      }
    }
    expect(changes).toBe(104); // 2026-W01 → 2027-W52, including 2026-W53
  });

  it('eventEndsIn always points at the start of the next week, within 7 days (+1 h for DST)', () => {
    for (const d of hours(...TWO_YEARS)) {
      const ms = eventEndsIn(d);
      expect(ms, d.toString()).toBeGreaterThan(0);
      expect(ms, d.toString()).toBeLessThanOrEqual(7 * DAY + HOUR);
      const end = d.getTime() + ms;
      expect(isoWeek(new Date(end - 1)), d.toString()).toBe(isoWeek(d));
      expect(isoWeek(new Date(end)), d.toString()).not.toBe(isoWeek(d));
      expect(new Date(end).getDay()).toBe(1);
    }
  });

  it('consecutive weeks never repeat the event or the voyage, including across week 53', () => {
    let prev = '';
    for (const d of days(2020, 2033)) {
      const key = isoWeek(d);
      if (key === prev) continue;
      expect(EVENTS).toContain(eventFor(key));
      expect(VOYAGE_NAMES).toContain(voyageName(key));
      if (prev) {
        if (EVENTS.length > 2) expect(eventFor(key).id, `${prev} → ${key}`).not.toBe(eventFor(prev).id);
        if (VOYAGE_NAMES.length > 2) expect(voyageName(key), `${prev} → ${key}`).not.toBe(voyageName(prev));
      }
      prev = key;
    }
  });

  it('week 53 is its own Voyage week; 2027-W01 starts fresh', () => {
    const p = defaultProfile(0);
    p.level = 30;
    ensureVoyage(p, '2026-W52');
    p.voyage.cleared = 4;
    ensureVoyage(p, isoWeek(new Date(2026, 11, 31, 12)));
    expect(p.voyage).toMatchObject({ week: '2026-W53', cleared: 0 });
    p.voyage.cleared = 2;
    ensureVoyage(p, isoWeek(new Date(2027, 0, 3, 23)));
    expect(p.voyage.cleared).toBe(2);
    ensureVoyage(p, isoWeek(new Date(2027, 0, 4, 0, 30)));
    expect(p.voyage).toMatchObject({ week: '2027-W01', cleared: 0 });
  });
});

describe('time: monthly festivals and month ends', () => {
  it('the festival key changes exactly on the 1st, and days left counts down to 1 on the last day', () => {
    let prev = festivalKey(new Date(2019, 11, 31, 12));
    for (const d of days(2020, 2032)) {
      const key = festivalKey(d);
      if (key !== prev) expect(d.getDate(), key).toBe(1);
      prev = key;
      const inMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      expect(festivalDaysLeft(d)).toBe(inMonth - d.getDate() + 1);
      expect(festivalOn(d)).toBe(FESTIVALS[d.getMonth()]);
    }
  });

  it('handles Feb 28 and Feb 29', () => {
    expect(festivalDaysLeft(new Date(2026, 1, 28, 23, 59))).toBe(1);
    expect(festivalDaysLeft(new Date(2028, 1, 28, 12))).toBe(2);
    expect(festivalDaysLeft(new Date(2028, 1, 29, 12))).toBe(1);
    expect(festivalKey(new Date(2028, 1, 29, 23, 59, 59))).toBe('2028-02');
    expect(festivalKey(new Date(2028, 2, 1, 0, 0))).toBe('2028-03');
    expect(festivalDaysLeft(new Date(2028, 2, 1, 0, 0))).toBe(31);
  });

  it('the year-end festival hands over at local midnight', () => {
    expect(festivalKey(new Date(2026, 11, 31, 23, 59, 59, 999))).toBe('2026-12');
    expect(festivalKey(new Date(2027, 0, 1))).toBe('2027-01');
    expect(festivalOn(new Date(2026, 11, 31, 23)).id).toBe(FESTIVALS[11].id);
    expect(festivalOn(new Date(2027, 0, 1, 0)).id).toBe(FESTIVALS[0].id);
    const p = defaultProfile(0);
    p.level = 30;
    ensureFestival(p, new Date(2026, 11, 31, 23));
    p.festival.spotted = 40;
    p.festival.claimed = [0, 1];
    ensureFestival(p, new Date(2027, 0, 1, 0, 5));
    expect(p.festival).toEqual({ key: '2027-01', spotted: 0, claimed: [] });
  });

  it('the festival key changes 12 times a year, hour by hour through DST', () => {
    let prev = festivalKey(TWO_YEARS[0]);
    let changes = 0;
    for (const d of hours(...TWO_YEARS)) {
      const key = festivalKey(d);
      if (key !== prev) {
        changes++;
        expect(d.getDate()).toBe(1);
        expect(d.getHours()).toBeLessThanOrEqual(1);
        prev = key;
      }
    }
    expect(changes).toBe(23);
  });
});

describe('time: seasons in both hemispheres', () => {
  const opposite = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' } as const;

  it('north and south are always opposite, and change only on Mar 1, Jun 1, Sep 1 and Dec 1', () => {
    let prev = seasonOf(new Date(2025, 11, 31, 12), 'north');
    for (const d of days(2026, 2028)) {
      const n = seasonOf(d, 'north');
      expect(seasonOf(d, 'south')).toBe(opposite[n]);
      if (n !== prev) {
        expect(d.getDate()).toBe(1);
        expect([2, 5, 8, 11]).toContain(d.getMonth());
      }
      prev = n;
    }
  });

  it('year end stays in one season: winter in the north, summer in the south', () => {
    for (const d of [new Date(2026, 11, 31, 23, 59), new Date(2027, 0, 1, 0, 1), new Date(2028, 1, 29, 12)]) {
      expect(seasonOf(d, 'north')).toBe('winter');
      expect(seasonOf(d, 'south')).toBe('summer');
    }
    expect(seasonOf(new Date(2026, 5, 21), 'south')).toBe('winter');
  });

  it('the season letter is one per season across the year end (Dec to Feb is one season)', () => {
    const p = defaultProfile(0);
    p.tutorial = true;
    const seasonLetters = () => p.mailSeen.filter((id) => id.startsWith('season-'));
    checkMail(p, new Date(2026, 11, 5, 9));
    checkMail(p, new Date(2027, 0, 20, 9));
    checkMail(p, new Date(2027, 1, 28, 23));
    expect(seasonLetters()).toEqual(['season-2026-q0']);
    checkMail(p, new Date(2027, 2, 1, 0, 30));
    expect(seasonLetters()).toEqual(['season-2026-q0', 'season-2027-q1']);
  });

  it('sky events straddle the year end correctly', () => {
    expect(skyEventOn(new Date(2026, 11, 31, 22))).toBeNull();
    expect(skyEventOn(new Date(2027, 0, 1, 22))).toBeNull();
    expect(skyEventOn(new Date(2027, 0, 2, 0, 1))?.id).toBe('quadrantids');
  });
});

describe('time: "until" and "when" labels', () => {
  it('the weekly event label says "until tonight" only on Sunday, and names Sunday otherwise, through DST', () => {
    for (const d of hours(...TWO_YEARS)) {
      if (d.getHours() % 3) continue;
      const end = d.getTime() + eventEndsIn(d);
      const label = untilText(end, d.getTime(), 'en');
      if (d.getDay() === 0) expect(label, d.toString()).toEqual({ key: 'until tonight' });
      else expect(label, d.toString()).toEqual({ key: 'until {day}', vars: { day: 'Sunday' } });
    }
  });

  it('a festival ending at local midnight shows the last day of the month, Feb 29 included', () => {
    const end = new Date(2028, 2, 1).getTime();
    expect(untilText(end, new Date(2028, 1, 29, 8).getTime(), 'en')).toEqual({ key: 'until tonight' });
    expect(untilText(end, new Date(2028, 1, 10, 8).getTime(), 'en')).toEqual({
      key: 'until {date}',
      vars: { date: 'February 29' },
    });
  });

  it('whenText says tomorrow exactly when the time is on the next local day, through DST', () => {
    for (const d of hours(...TWO_YEARS)) {
      if (d.getHours() !== 22) continue;
      const now = d.getTime();
      for (const ahead of [1, 3, 26]) {
        const t = now + ahead * HOUR;
        const gap = dayGap(dayKey(now), dayKey(t));
        const s = whenText(t, now, 'en');
        if (gap === 0) expect(s).not.toMatch(/tomorrow|[A-Z][a-z]{2} /);
        else if (gap === 1) expect(s, `${d} +${ahead}h`).toMatch(/^tomorrow /);
        else expect(s).toMatch(/^[A-Z][a-z]{2} /);
      }
    }
  });
});

describe('time: reminders through DST', () => {
  it('friendlyTime always lands between 10:00 and 20:30 local, never earlier, within a day', () => {
    for (let t = TWO_YEARS[0].getTime(); t < TWO_YEARS[1].getTime(); t += 15 * 60000) {
      const f = friendlyTime(t);
      expect(f).toBeGreaterThanOrEqual(t);
      expect(f - t).toBeLessThanOrEqual(DAY + HOUR);
      const m = localMinutes(f);
      expect(m, new Date(t).toString()).toBeGreaterThanOrEqual(10 * 60);
      expect(m, new Date(t).toString()).toBeLessThanOrEqual(20 * 60 + 30);
      expect(inQuietHours(f)).toBe(false);
    }
  });

  it('planReminders: tomorrow 18:30, at most one a day, never today, never in quiet hours', () => {
    for (const d of hours(...TWO_YEARS)) {
      const now = d.getTime();
      const plan = planReminders({ now, vaultFullAt: now + 7 * HOUR });
      const daysUsed = plan.map((r) => dayKey(r.at));
      expect(new Set(daysUsed).size).toBe(plan.length);
      expect(daysUsed).not.toContain(dayKey(now));
      for (const r of plan) {
        expect(r.at).toBeGreaterThan(now);
        expect(inQuietHours(r.at)).toBe(false);
      }
      const daily = plan.find((r) => r.kind === 'daily');
      if (daily) {
        expect(dayGap(dayKey(now), dayKey(daily.at)), d.toString()).toBe(1);
        expect(localMinutes(daily.at)).toBe(18 * 60 + 30);
      }
    }
  });
});

describe('time: the clock moved back or forward', () => {
  const NOW = new Date(2026, 8, 27, 17, 30).getTime();
  const SHIFTS = [-400 * DAY, -8 * DAY, -1 * DAY, -1 * HOUR, 0, HOUR, DAY, 8 * DAY, 400 * DAY];

  function midGame() {
    const p = defaultProfile(NOW - 38 * DAY);
    p.level = 24;
    p.galaxy = [{ n: 1, name: 'Pebble', hue: 40, stars: 3, species: ['otter'], life: 60, colors: [] }];
    p.lastCollect = NOW - 5 * HOUR;
    p.home.plots[0] = {
      type: 'greenhouse',
      lv: 2,
      since: NOW - 4 * HOUR,
      greenhouse: { choice: 'scope', winsTowardNext: 2, stored: 1 },
    };
    p.home.plots[1] = { type: 'launch_bay', lv: 1, since: NOW - 3 * HOUR, done: NOW + 25 * 60000 };
    p.vault.bankedProductionMs = 2 * HOUR;
    p.home.lastTick = NOW;
    p.daily = { last: today(new Date(NOW)), streak: 17 };
    return p;
  }

  it('no clock function throws or returns a negative or NaN value, whichever way the clock moves', () => {
    for (const shift of SHIFTS) {
      const t = NOW + shift;
      const d = new Date(t);
      const p = midGame();
      const label = `shift ${shift / HOUR} h`;
      expect(pendingDust(p, t), label).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < p.home.plots.length; i++) {
        const r = ready(p.home, i, t);
        expect(Number.isFinite(r) && r >= 0, `${label} plot ${i}: ${r}`).toBe(true);
      }
      expect(period(t)).toBeGreaterThanOrEqual(0);
      expect(eventEndsIn(d)).toBeGreaterThan(0);
      expect(festivalDaysLeft(d)).toBeGreaterThanOrEqual(1);
      expect(() => untilText(NOW, t, 'en')).not.toThrow();
      expect(() => whenText(NOW, t, 'en')).not.toThrow();
      expect(() => planReminders({ now: t, vaultFullAt: NOW })).not.toThrow();
      expect(planReminders({ now: t, vaultFullAt: NOW }).every((r) => r.at > t)).toBe(true);
    }
  });

  it('a clock moved back pays nothing and does not rewind the high-water marks', () => {
    for (const shift of SHIFTS.filter((s) => s < 0)) {
      const t = NOW + shift;
      const p = midGame();
      p.lastCollect = NOW;
      const dust = p.dust;
      expect(collectDust(p, t)).toBe(0);
      expect(p.dust).toBe(dust);
      expect(p.lastCollect).toBe(NOW);
      expect(tickHome(p, t)).toEqual([]);
      expect(p.home.lastTick).toBe(NOW);
    }
  });

  it('the Star Calendar never stamps twice on one day or on an earlier day', () => {
    const p = midGame();
    const day = today(new Date(NOW));
    expect(canStamp(p, day)).toBe(false);
    expect(stamp(p, today(new Date(NOW - DAY)))).toBeNull();
    expect(stamp(p, today(new Date(NOW - 400 * DAY)))).toBeNull();
    expect(p.daily.streak).toBe(17);
    // forward a year: one stamp, not 365
    expect(stamp(p, today(new Date(NOW + 400 * DAY)))).not.toBeNull();
    expect(p.daily.streak).toBe(18);
    expect(stamp(p, today(new Date(NOW + 400 * DAY)))).toBeNull();
  });

  it('one period back and forward keeps voyage and festival progress', () => {
    const p = midGame();
    const d = new Date(NOW);
    ensureVoyage(p, isoWeek(d));
    ensureFestival(p, d);
    p.voyage.cleared = 3;
    p.voyage.stars = [3, 2, 3];
    p.festival.spotted = 31;
    p.festival.claimed = [0, 1];
    const before = structuredClone({ voyage: p.voyage, festival: p.festival });

    const weekBack = new Date(NOW - 7 * DAY);
    const monthBack = new Date(2026, 7, 27, 17, 30);
    ensureVoyage(p, isoWeek(weekBack));
    ensureFestival(p, monthBack);
    ensureVoyage(p, isoWeek(d));
    ensureFestival(p, d);

    expect({ voyage: p.voyage, festival: p.festival }).toEqual(before);
  });

  it('a far-forward clock corrected back resets to the current week and month', () => {
    const p = midGame();
    const future = new Date(2027, 5, 20, 12);
    ensureVoyage(p, isoWeek(future));
    ensureFestival(p, future);
    p.voyage.cleared = 2;
    p.festival.spotted = 20;
    const current = new Date(NOW);
    ensureVoyage(p, isoWeek(current));
    ensureFestival(p, current);
    expect(p.voyage).toMatchObject({ week: isoWeek(current), cleared: 0 });
    expect(p.festival).toEqual({ key: festivalKey(current), spotted: 0, claimed: [] });
  });

  it('a voyage stored one week ahead still records stop wins after time-zone travel', () => {
    const p = midGame();
    const current = isoWeek(new Date(NOW));
    const ahead = isoWeek(new Date(NOW + 7 * DAY));
    ensureVoyage(p, ahead);
    ensureVoyage(p, current);
    expect(p.voyage.week).toBe(ahead);
    const result = clearStop(p, 0, 3);
    expect(result.reward).not.toBeNull();
    expect(p.voyage.cleared).toBe(1);
  });
});
