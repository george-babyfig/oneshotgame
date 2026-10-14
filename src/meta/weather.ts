import { rngFrom } from '../core/levels';
import { nightness, seasonOf, type Hemisphere, type Season } from './seasons';

export type WeatherKind = 'clear' | 'breezy' | 'drizzle' | 'snow' | 'starry';

/** Percent weights in clear, breezy, drizzle, snow, starry order. */
export const WEATHER_WEIGHTS: Record<Season, readonly [number, number, number, number, number]> = {
  spring: [45, 20, 25, 0, 10],
  summer: [60, 15, 10, 0, 15],
  autumn: [40, 30, 25, 0, 5],
  winter: [35, 15, 10, 35, 5],
};

const KINDS: readonly WeatherKind[] = ['clear', 'breezy', 'drizzle', 'snow', 'starry'];

/** The day's stable draw, before the night-only Starry display rule. */
export function seededWeatherOn(date: Date, hemi: Hemisphere): WeatherKind {
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const roll = rngFrom(`WX-${day}-${hemi}`)() * 100;
  let cumulative = 0;
  const weights = WEATHER_WEIGHTS[seasonOf(date, hemi)];
  for (let i = 0; i < KINDS.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return KINDS[i];
  }
  return 'clear';
}

/** Local time changes only Starry's appearance; weather never pays or harms. */
export function weatherOn(date: Date, hemi: Hemisphere = 'north'): WeatherKind {
  const seeded = seededWeatherOn(date, hemi);
  return seeded === 'starry' && nightness(date) < 1 ? 'clear' : seeded;
}
