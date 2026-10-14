import type { AlmanacRow, CalendarOverride } from './m14types';
import type { Hemisphere } from './seasons';

/** Package B pins the frozen boundary before adding append-only rows. */
export const ALMANAC_FROZEN_THROUGH = '';
export const ALMANAC: readonly AlmanacRow[] = [];
export const CALENDAR_OVERRIDES: readonly CalendarOverride[] = [];
/** No rows means the caller's existing rotation is unchanged. */
export function almanacTheme(_week: string, _hemisphere: Hemisphere, fallback: string): string {
  return fallback;
}
/** Stops use the Voyage generator's zero-based index. Zero preserves existing seeds. */
export function calendarSalt(_dayOrWeek: string, _stop?: number): number {
  return 0;
}
