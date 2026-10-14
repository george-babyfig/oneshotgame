// Availability metadata must stay independent of rewards/tuning: unlocks is also read by tuning.
import { ROAD01 } from './content/road01';
import type { Profile } from './profile';
import type { RoadDefinition } from './starroad';
import { today } from './dates';

export const COSMIC_ROAD_ID = 'road00';
export const ROAD_CONTENT_ROADS: readonly RoadDefinition[] = [ROAD01.road];

export function validRoadDay(day: string): boolean {
  const parsed = new Date(`${day}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}
export function roadOpen(road: Pick<RoadDefinition, 'id' | 'opensOn'>, day: string): boolean {
  // An undated future Road stays dormant until the owner supplies a date.
  return road.id === COSMIC_ROAD_ID || (!!road.opensOn && validRoadDay(road.opensOn) && road.opensOn <= day);
}

function availableRoads(p: Profile) {
  const day = today() > p.roadSeenDay ? today() : p.roadSeenDay;
  const roads: readonly Pick<RoadDefinition, 'id' | 'opensOn'>[] = [{ id: COSMIC_ROAD_ID }, ...ROAD_CONTENT_ROADS];
  return roads.filter((road) => roadOpen(road, day));
}

/** A reached Pass banner can open Passport as soon as the original Pass banner could. */
export function hasAvailableRoadPass(p: Profile): boolean {
  return availableRoads(p).some((road) => p.roadPassEntitlements.includes(road.id));
}

/** Claims and entitlements have the same early access as the original Pass, once their Road opens. */
export function hasAvailableRoadAccess(p: Profile): boolean {
  return availableRoads(p).some((road) => {
    const state = p.roadRecords[road.id];
    return p.roadPassEntitlements.includes(road.id) || !!state?.claimedFreeTierIds.length || !!state?.claimedPaidTierIds.length;
  });
}
