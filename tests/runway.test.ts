import { describe, expect, it } from 'vitest';
import { ALMANAC, ALMANAC_FROZEN_THROUGH, CALENDAR_OVERRIDES } from '../src/meta/almanac';
import { eventFor, isoWeek, weekStart } from '../src/meta/events';
import { RELEASE } from '../src/meta/release';
import { ROAD_CATALOG, type RoadDefinition } from '../src/meta/starroad';
import { SKINS } from '../src/meta/tuning';
import { THEME_HUES, THEME_PORTS, VOYAGE_LEN } from '../src/meta/voyage';
import { calendarDays, coveringWeeks, preflight } from './sim/calendar-preflight.sim';

export function roadLeadTimeIssues(roads: readonly RoadDefinition[], version: string, submitOn: string): string[] {
  const issues: string[] = [];
  const earliest = calendarDays(submitOn, 29)[28];
  for (const [i, road] of roads.entries()) {
    if (!/^\d+\.\d+$/.test(road.addedIn ?? '')) issues.push(`${road.id}: missing addedIn`);
    if (road.addedIn !== version) continue;
    if (!road.opensOn) {
      issues.push(`${road.id}: opening date needs the owner's launch date`);
      continue;
    }
    const parsed = new Date(`${road.opensOn}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(road.opensOn) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== road.opensOn
    ) {
      issues.push(`${road.id}: invalid opensOn`);
      continue;
    }
    if (road.opensOn < earliest) issues.push(`${road.id}: less than 28 days after submission`);
    const previous = roads[i - 1];
    if (previous && !previous.opensOn) issues.push(`${road.id}: previous Road's opening date is required for cadence`);
    if (previous?.opensOn && road.opensOn < calendarDays(previous.opensOn, 57)[56])
      issues.push(`${road.id}: less than 56 days after the previous Road`);
  }
  return issues;
}

const anchor = process.env.RUNWAY_FROM ?? RELEASE.submitOn;
// 98 forward days plus the preceding/following day at UTC-12 / UTC+14.
const from = new Date(Date.parse(`${anchor}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
const weeks = coveringWeeks(from, 100);
describe('B1 fast runway data and B2 Road lead time', () => {
  it('uses a major.minor release and an exact UTC submission date', () => {
    expect(RELEASE.version).toMatch(/^\d+\.\d+$/);
    expect(calendarDays(RELEASE.submitOn, 1)[0]).toBe(RELEASE.submitOn);
    expect(ALMANAC_FROZEN_THROUGH >= isoWeek(new Date(`${calendarDays(RELEASE.submitOn, 15)[14]}T12:00:00`))).toBe(true);
  });
  it('covers every touching ISO week, including the partial last week', () => {
    expect(calendarDays(from, 100)).toHaveLength(100);
    expect(weeks.length).toBeGreaterThanOrEqual(15);
    expect(coveringWeeks('2026-12-27', 9)).toEqual(['2026-W52', '2026-W53', '2027-W01']);
    expect(coveringWeeks('2027-03-14', 100)).toHaveLength(16);
  });
  it('resolves valid ports, hues and skins in both hemispheres throughout the window', () => {
    for (const week of [...weeks, ...ALMANAC.map((row) => row.week)])
      for (const hemisphere of ['north', 'south'] as const) {
        const theme = eventFor(week, hemisphere);
        expect(THEME_PORTS[theme.id]).toHaveLength(VOYAGE_LEN);
        expect(Number.isFinite(THEME_HUES[theme.id])).toBe(true);
        expect(SKINS.some((skin) => skin.id === theme.skin)).toBe(true);
      }
    for (const row of CALENDAR_OVERRIDES) {
      if (row.day !== undefined) expect(calendarDays(row.day, 1)[0]).toBe(row.day);
      else expect(weekStart(row.week).getUTCDay()).toBe(1);
    }
  });
  it('checks new scheduled Roads; undecided Roads stay dormant until the owner supplies dates', () => {
    // Decision 81 forbids inventing opensOn. This preparation tree is not a release candidate.
    const scheduled = ROAD_CATALOG.filter((road) => road.addedIn !== RELEASE.version || road.opensOn);
    expect(ROAD_CATALOG.every((road) => /^\d+\.\d+$/.test(road.addedIn ?? ''))).toBe(true);
    expect(roadLeadTimeIssues(scheduled, RELEASE.version, RELEASE.submitOn)).toEqual([]);
    const pending = ROAD_CATALOG.filter((road) => road.addedIn === RELEASE.version && !road.opensOn);
    if (pending.length) console.log(`B2 HOLD: owner launch date required for ${pending.map((road) => road.id).join(', ')}`);
    // Release/nightly gates require a complete schedule; ordinary preparation tests permit dormant data.
    if (process.env.RELEASE_CHECK === '1') expect(roadLeadTimeIssues(ROAD_CATALOG, RELEASE.version, RELEASE.submitOn)).toEqual([]);
  });
  it('rejects insufficient lead time, cadence and missing metadata while skipping earlier builds', () => {
    const road = (id: string, addedIn: string, opensOn?: string): RoadDefinition => ({
      id: `road${id}`,
      name: id,
      tiers: [],
      addedIn,
      opensOn,
    });
    expect(roadLeadTimeIssues([road('0', '1.0', '2026-10-01'), road('1', '1.2', '2026-11-26')], '1.2', '2026-10-29')).toEqual([]);
    expect(roadLeadTimeIssues([road('0', '1.0', '2026-10-02'), road('1', '1.2', '2026-11-26')], '1.2', '2026-10-30')).toHaveLength(2);
    expect(roadLeadTimeIssues([road('1', '1.2')], '1.2', '2026-10-14')).toHaveLength(1);
    expect(roadLeadTimeIssues([road('1', '1.2', '2026-02-30')], '1.2', '2026-10-14')).toEqual(['road1: invalid opensOn']);
    expect(roadLeadTimeIssues([{ id: 'road0', name: '0', tiers: [] }], '1.2', '2026-10-14')).toHaveLength(1);
    expect(roadLeadTimeIssues([road('1', '1.2', '2020-01-01')], '1.3', '2026-10-14')).toEqual([]);
  });
});

it.skipIf(process.env.RUNWAY !== '1')(
  'B1 pre-flights 100 Daily dates and all touching weeks, both hemispheres',
  () => {
    const errors = preflight({ from, days: 100, weeks: 'cover' });
    console.log(
      `B1 runway ${anchor}: ${from} through ${calendarDays(from, 100)[99]}, 300 Daily layouts, ${weeks.length} weeks / ${weeks.length * 70} Voyage stops; ${errors.length} issues`,
    );
    expect(errors).toEqual([]);
  },
  240_000,
);
