// Real-calendar seasons and sky events, read from the device clock (no server).
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Hemisphere = 'north' | 'south';

export function seasonOf(d: Date, hemi: Hemisphere = 'north'): Season {
  const m = d.getMonth(); // 0 = Jan
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  if (hemi === 'north') return north;
  return ({ winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' } as const)[north];
}

export const SEASON_EMOJI: Record<Season, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
export const SEASON_NAMES: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

/** Real annual meteor showers (peak dates, both hemispheres can see them). */
export interface SkyEvent {
  id: string;
  name: string;
  /** [month (1-12), first day, last day] */
  when: [number, number, number];
}
export const SKY_EVENTS: SkyEvent[] = [
  { id: 'quadrantids', name: 'Quadrantid meteor shower', when: [1, 2, 4] },
  { id: 'lyrids', name: 'Lyrid meteor shower', when: [4, 21, 23] },
  { id: 'perseids', name: 'Perseid meteor shower', when: [8, 11, 13] },
  { id: 'orionids', name: 'Orionid meteor shower', when: [10, 20, 22] },
  { id: 'leonids', name: 'Leonid meteor shower', when: [11, 16, 18] },
  { id: 'geminids', name: 'Geminid meteor shower', when: [12, 13, 15] },
];

export function skyEventOn(d: Date): SkyEvent | null {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return SKY_EVENTS.find((e) => e.when[0] === m && day >= e.when[1] && day <= e.when[2]) ?? null;
}

/** 0 = midday, 1 = deep night, from the local hour. */
export function nightness(d: Date): number {
  const h = d.getHours() + d.getMinutes() / 60;
  // full night 22-4, twilight ramps 18-22 and 4-7
  if (h >= 22 || h < 4) return 1;
  if (h >= 18) return (h - 18) / 4;
  if (h < 7) return 1 - (h - 4) / 3;
  return 0;
}
