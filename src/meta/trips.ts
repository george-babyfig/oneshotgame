/** M13 trips: the preview is the promise; only the stored promise is settled. */
import type { HomeState } from './homeworld';
import { addFriendship, bayLevel, queueHomeCelebration } from './homeworld';
import type { Profile } from './profile';
import type { TripBlock, TripHours, TripPlanetRow, TripPreview, TripReturn, TripStatus, TripYield } from './m13types';
import { TRIP_HOURS_BY_BAY, TRIP_FACTOR, TRIP_CAP, TRIP_GEMS, TRIP_FRIENDSHIP, TRIP_MATCH_MULTIPLIER, TRIP_MATCH_SECTORS } from './tuning';
import { decodePlanet } from './galaxyCodec';
import { dropsFor, MATS } from './constellations';
import { homeLandFor } from './friends';
import { COUNTERS } from './buddy';
import { SPECIES_BY_ID, traitOf, type Planet } from '../core/world';
import { makeLevel } from '../core/levels';
import { nextEssenceNeeded } from './nextup';
import { earn } from './wallet';
import { ledger } from './ledger';
import { legacyExpeditionLoot } from './tripsLegacy';

const HOUR = 3_600_000;
const matches = (species: string, planet: Planet): boolean => {
  const home = homeLandFor(species);
  return !!home && planet.sectors.filter((sector) => sector.biome === home).length >= TRIP_MATCH_SECTORS;
};
function yieldFor(planet: Planet, hours: TripHours, match: boolean): TripYield {
  const base = dropsFor(planet, 0);
  const mats: TripYield['mats'] = {};
  for (const mat of MATS) {
    const amount = Math.min(TRIP_CAP[hours], Math.round((base[mat] ?? 0) * TRIP_FACTOR[hours] * (match ? TRIP_MATCH_MULTIPLIER : 1)));
    if (amount) mats[mat] = amount;
  }
  return { mats, gems: TRIP_GEMS[hours], fp: TRIP_FRIENDSHIP[hours][match ? 1 : 0] };
}
export function tripOptions(h: HomeState, now = Date.now()): TripHours[] {
  return [...(TRIP_HOURS_BY_BAY[bayLevel(h, now)] ?? [])];
}
export function tripPlanets(p: Profile): TripPlanetRow[] {
  const needed = nextEssenceNeeded(p);
  const rows: TripPlanetRow[] = p.galaxy
    .filter((entry) => entry.n >= 1 && entry.n <= 120)
    .map((entry) => {
      const planet = decodePlanet(entry);
      const mats = dropsFor(planet, 0);
      return { n: entry.n, entry, planet, mats, total: Object.values(mats).reduce((sum, amount) => sum + amount, 0), needed };
    });
  return rows
    .filter((row) => row.total > 0)
    .sort((a, b) => (needed ? (b.mats[needed] ?? 0) - (a.mats[needed] ?? 0) : 0) || b.total - a.total || a.n - b.n);
}
function freeFriends(p: Profile): string[] {
  return p.home.residents
    .map((friend) => friend.species)
    .filter((species) => !!SPECIES_BY_ID[species] && species !== p.buddy.species && species !== p.home.expedition?.species);
}
export function pickFriend(p: Profile, n: number, hours: TripHours): string | null {
  const row = tripPlanets(p).find((planet) => planet.n === n);
  if (!row || ![1, 4, 8].includes(hours)) return null;
  let candidates = freeFriends(p);
  const residents = p.home.residents.filter((friend) => friend.species !== p.home.expedition?.species);
  const counters = makeLevel(p.level, 'PP').troubles.map((trouble) => COUNTERS[trouble.id]);
  // Preserve the sole counter for each Trouble if another traveller is free.
  const safe = candidates.filter(
    (species) =>
      !counters.some(
        (traits) =>
          traits.includes(traitOf(species)!) && residents.filter((friend) => traits.includes(traitOf(friend.species)!)).length === 1,
      ),
  );
  if (candidates.length > 1) candidates = safe;
  return (
    candidates
      .map((species) => p.home.residents.find((friend) => friend.species === species)!)
      .sort(
        (a, b) =>
          Number(matches(b.species, row.planet)) - Number(matches(a.species, row.planet)) ||
          Number(a.fp >= 25) - Number(b.fp >= 25) ||
          (a.fp < 25 && b.fp < 25 ? a.fp - b.fp : 0),
      )[0]?.species ?? null
  );
}
export function previewTrip(p: Profile, n: number, hours: TripHours, species?: string, now = Date.now()): TripPreview | null {
  if (!Number.isFinite(now) || !tripOptions(p.home, now).includes(hours)) return null;
  const row = tripPlanets(p).find((planet) => planet.n === n);
  const friend = species ?? pickFriend(p, n, hours);
  if (!row || !friend || !freeFriends(p).includes(friend)) return null;
  const match = matches(friend, row.planet);
  const yield_ = yieldFor(row.planet, hours, match);
  if (!Object.values(yield_.mats).some((amount) => amount > 0)) return null;
  return { n, species: friend, hours, ends: now + hours * HOUR, match, yield: yield_, entry: row.entry };
}
function blockFor(p: Profile, now: number): TripBlock | null {
  if (!Number.isFinite(now) || now < (p.home.lastTick ?? 0)) return 'clock';
  const level = bayLevel(p.home, now);
  if (!level) return 'no_bay';
  if (p.level < 21) return 'before_planet_21';
  if (p.home.expedition) return 'busy';
  if (level < 2) return 'bay_level';
  if (!tripPlanets(p).length) return 'no_planets';
  if (!p.home.residents.length) return 'no_friend';
  if (!freeFriends(p).length) return 'only_buddy';
  if (!p.home.tripFuel) return 'needs_win';
  return null;
}
export function startTrip(p: Profile, n: number, hours: TripHours, species?: string, now = Date.now()): 'ok' | TripBlock {
  const block = blockFor(p, now);
  if (block) return block;
  if (!tripOptions(p.home, now).includes(hours)) return 'bay_level';
  if (species && !freeFriends(p).includes(species)) return species === p.buddy.species ? 'only_buddy' : 'no_friend';
  if (!species && tripPlanets(p).some((row) => row.n === n) && !pickFriend(p, n, hours)) return 'no_friend';
  const preview = previewTrip(p, n, hours, species, now);
  if (!preview) return 'no_planets';
  ledger.homeworldAction();
  p.home.expedition = {
    species: preview.species,
    hours,
    ends: preview.ends,
    planet: -1,
    n,
    sentAt: now,
    match: preview.match,
    yield: { ...preview.yield, mats: { ...preview.yield.mats } },
  };
  p.home.tripFuel = false;
  p.home.lastTick = now;
  return 'ok';
}
export function callHome(p: Profile, now = Date.now()): boolean {
  if (!Number.isFinite(now) || now < (p.home.lastTick ?? 0) || !p.home.expedition) return false;
  p.home.expedition = null;
  p.home.tripFuel = true;
  p.home.lastTick = now;
  ledger.homeworldAction();
  return true;
}
export function settleTrips(p: Profile, now = Date.now()): TripReturn | null {
  const h = p.home;
  const trip = h.expedition;
  if (!trip || !Number.isFinite(now) || now < (h.lastTick ?? 0) || trip.ends > now) return null;
  if (!trip.yield && !trip.legacyLoot) trip.legacyLoot = legacyExpeditionLoot(trip.hours, bayLevel(h, now), trip.species);
  // Clear before paying: every subsequent tick sees an already settled trip.
  h.expedition = null;
  if (trip.legacyLoot) {
    earn(p, 'dust', trip.legacyLoot.dust, 'expedition');
    earn(p, 'gems', trip.legacyLoot.gems, 'expedition');
    for (const [id, amount] of Object.entries(trip.legacyLoot.boosters)) p.boosters[id as keyof typeof p.boosters] += amount ?? 0;
  } else if (trip.yield) {
    for (const mat of MATS) earn(p, mat, trip.yield.mats[mat] ?? 0, 'expedition');
    earn(p, 'gems', trip.yield.gems, 'expedition');
    const friend = h.residents.find((resident) => resident.species === trip.species);
    if (friend) addFriendship(p, friend, trip.yield.fp);
  }
  const returned: TripReturn = {
    n: trip.n ?? p.galaxy[trip.planet]?.n ?? -1,
    species: trip.species,
    hours: trip.hours as TripHours,
    returnedAt: now,
    match: !!trip.match,
    ...(trip.legacyLoot ? { legacyLoot: trip.legacyLoot } : { yield: trip.yield }),
  };
  h.tripReturn = returned;
  h.lastTick = now;
  h.seen.celebrations = h.seen.celebrations.filter((id) => !id.startsWith('trip:'));
  queueHomeCelebration(p, `trip:${returned.n}`);
  return returned;
}
export function speedUpTrip(h: HomeState, ms: number, now = Date.now()): boolean {
  if (!Number.isFinite(now) || now < (h.lastTick ?? 0) || !Number.isFinite(ms) || ms <= 0 || !h.expedition || h.expedition.ends <= now)
    return false;
  h.expedition.ends = Math.max(now, h.expedition.ends - ms);
  return true;
}
export function tripStatus(p: Profile, now = Date.now()): TripStatus {
  return { block: blockFor(p, now), trip: p.home.expedition, returned: p.home.tripReturn, options: tripOptions(p.home, now) };
}
