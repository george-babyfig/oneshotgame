// Step-0 contracts only. Package A installs the engine; the 1.0 paths remain active.
import type { HomeState } from './homeworld';
import type { Profile } from './profile';
import type { TripBlock, TripHours, TripPlanetRow, TripPreview, TripReturn, TripStatus } from './m13types';

export function tripOptions(_h: HomeState, _now = Date.now()): TripHours[] {
  return [];
}
export function tripPlanets(_p: Profile): TripPlanetRow[] {
  return [];
}
export function pickFriend(_p: Profile, _n: number, _hours: TripHours): string | null {
  return null;
}
export function previewTrip(_p: Profile, _n: number, _hours: TripHours, _species?: string, _now = Date.now()): TripPreview | null {
  return null;
}
export function startTrip(_p: Profile, _n: number, _hours: TripHours, _species?: string, _now = Date.now()): 'ok' | TripBlock {
  return 'no_bay';
}
export function callHome(_p: Profile, _now = Date.now()): boolean {
  return false;
}
export function settleTrips(_p: Profile, _now = Date.now()): TripReturn | null {
  return null;
}
export function speedUpTrip(_h: HomeState, _ms: number, _now = Date.now()): boolean {
  return false;
}
export function tripStatus(_p: Profile, _now = Date.now()): TripStatus {
  return { block: 'no_bay', trip: null, returned: null, options: [] };
}
