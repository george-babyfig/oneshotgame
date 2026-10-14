import type { AlmanacRow, CalendarOverride } from './m14types';
import type { Hemisphere } from './seasons';

// Decision 90: also retain the longer M13 golden runway (through 20 January).
export const ALMANAC_FROZEN_THROUGH = '2027-W03';
/** Shipped rows are a permanent prefix; add future spotlights at the end only. */
export const ALMANAC: readonly AlmanacRow[] = [
  { week: '2027-W04', north: 'star', south: 'volcano', headline: 'Starfall Week' },
  { week: '2027-W08', north: 'ocean', south: 'ocean', headline: 'Ocean Week' },
  { week: '2027-W12', north: 'bloom', south: 'critter', headline: 'Blossom Week' },
  { week: '2027-W25', north: 'volcano', south: 'star', headline: 'Volcano Week' },
];
/** Decision 91: repair only future draws, never the generator or a shipped row. */
export const CALENDAR_OVERRIDES: readonly CalendarOverride[] = [];

export function almanacTheme(week: string, hemisphere: Hemisphere, fallback: string): string {
  if (week <= ALMANAC_FROZEN_THROUGH) return fallback;
  return ALMANAC.find((row) => row.week === week)?.[hemisphere] ?? fallback;
}

export type CalendarKey = { day: string } | { week: string; stop: number };
export function calendarOverride(key: CalendarKey): number {
  return CALENDAR_OVERRIDES.find((row) => ('day' in key ? row.day === key.day : row.week === key.week && row.stop === key.stop))?.salt ?? 0;
}
/** Stops are zero-based; zero preserves the original seed and salt search. */
export function calendarSalt(dayOrWeek: string, stop?: number): number {
  return calendarOverride(stop === undefined ? { day: dayOrWeek } : { week: dayOrWeek, stop });
}
