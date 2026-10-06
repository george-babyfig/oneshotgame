import { LAUNCHER_IDS, LAUNCH_ROSTER, isLaunchRosterId, type LauncherId, type Tune } from '../core/launchers';
import type { Profile } from './profile';
import { completedHabitatCount } from './habitats';
import { bayLevel } from './homeworld';
import { balance, spend, type Material } from './wallet';

export { LAUNCHER_IDS };
export const LAUNCHER_DEBUT: Readonly<Record<LauncherId, number>> = {
  sling: 1,
  swoop: 31,
  sparkler: 37,
  zip: 43,
  thumper: 48,
  pinpoint: 53,
  skipper: 62,
};
export const LAUNCHER_ESSENCE: Readonly<Partial<Record<LauncherId, Material>>> = {
  swoop: 'dew',
  sparkler: 'leaf',
  zip: 'leaf',
  thumper: 'stone',
  pinpoint: 'stone',
  skipper: 'dew',
};
export const TUNE_COST: Readonly<Record<Tune, { dust: number; essence: number; bay: number; flings: number }>> = {
  1: { dust: 0, essence: 0, bay: 1, flings: 0 },
  2: { dust: 1500, essence: 15, bay: 2, flings: 100 },
  3: { dust: 4000, essence: 35, bay: 3, flings: 500 },
  4: { dust: 9000, essence: 60, bay: 5, flings: 2000 },
};

export type Availability =
  { kind: 'owned' } | { kind: 'waiting-planet'; planet: number } | { kind: 'waiting-channel'; label: string; done: number; total: number };

export interface LauncherBayApi {
  owned(p: Profile): LauncherId[];
  tune(p: Profile, id: LauncherId): Tune;
  availability(p: Profile, id: LauncherId): Availability;
  select(p: Profile, id: LauncherId): boolean;
  tuneUp(p: Profile, id: LauncherId): 'ok' | 'locked' | 'mastery' | 'bay' | 'resources';
}

export function isLauncherId(id: unknown): id is LauncherId {
  return typeof id === 'string' && (LAUNCHER_IDS as readonly string[]).includes(id);
}

function channel(p: Profile, id: LauncherId): { label: string; done: number; total: number } {
  switch (id) {
    case 'sling':
      return { label: 'Starting launcher', done: 1, total: 1 };
    case 'swoop':
      return { label: 'Open chapter 3 chest', done: Number(p.chapters.includes(3)), total: 1 };
    case 'sparkler':
      return { label: 'Combo 3 on three planets', done: Math.min(p.launcher.comboThreePlanets.length, 3), total: 3 };
    case 'zip':
      return { label: 'Complete the Comet Pier', done: p.cometPier.stage, total: 4 };
    case 'thumper':
      return { label: 'Complete three habitat sets', done: Math.min(completedHabitatCount(p), 3), total: 3 };
    case 'pinpoint':
      return { label: 'Open chapter 5 chest', done: Number(p.chapters.includes(5)), total: 1 };
    case 'skipper':
      return { label: 'Open chapter 6 chest', done: Number(p.chapters.includes(6)), total: 1 };
  }
}

export const launcherBay: LauncherBayApi = {
  owned(p) {
    return LAUNCH_ROSTER.filter((id) => launcherBay.availability(p, id).kind === 'owned');
  },
  tune(p, id) {
    if (id === 'sling' || launcherBay.availability(p, id).kind !== 'owned') return 1;
    const value = p.launcher.tunes[id];
    return value === 2 || value === 3 || value === 4 ? value : 1;
  },
  availability(p, id) {
    if (id === 'sling') return { kind: 'owned' };
    const c = channel(p, id);
    // Show the unfinished side of the later-of earn rule.
    if (c.done < c.total) return { kind: 'waiting-channel', ...c };
    if (p.level < LAUNCHER_DEBUT[id]) return { kind: 'waiting-planet', planet: LAUNCHER_DEBUT[id] };
    return { kind: 'owned' };
  },
  select(p, id) {
    if (!isLauncherId(id) || !isLaunchRosterId(id) || launcherBay.availability(p, id).kind !== 'owned') return false;
    p.launcher.selected = id;
    return true;
  },
  tuneUp(p, id) {
    if (!isLauncherId(id) || !isLaunchRosterId(id) || id === 'sling' || launcherBay.availability(p, id).kind !== 'owned') return 'locked';
    const next = (launcherBay.tune(p, id) + 1) as Tune;
    if (next > 4) return 'locked';
    const cost = TUNE_COST[next];
    if ((p.launcher.flings[id] ?? 0) < cost.flings) return 'mastery';
    if (bayLevel(p.home) < cost.bay) return 'bay';
    const essence = LAUNCHER_ESSENCE[id]!;
    if (balance(p, 'dust') < cost.dust || balance(p, essence) < cost.essence) return 'resources';
    spend(p, 'dust', cost.dust, 'launcher_tune');
    spend(p, essence, cost.essence, 'launcher_tune');
    p.launcher.tunes[id] = next;
    return 'ok';
  },
};

export const { owned, tune, availability, select, tuneUp } = launcherBay;

/** Count only real gameplay flings; callers exclude Bay practice and forced modes. */
export function recordLauncherFling(p: Profile, id: LauncherId): void {
  if (!isLaunchRosterId(id)) return;
  if (id !== 'sling' && launcherBay.availability(p, id).kind !== 'owned') return;
  p.launcher.flings[id] = Math.min(Number.MAX_SAFE_INTEGER, (p.launcher.flings[id] ?? 0) + 1);
}

export function recordLauncherRound(p: Profile, id: LauncherId): void {
  if (!isLaunchRosterId(id)) return;
  if (id === 'sling' || launcherBay.availability(p, id).kind !== 'owned') return;
  p.launcher.completedRounds[id] = Math.min(3, (p.launcher.completedRounds[id] ?? 0) + 1);
}

/** Use stable mode/planet keys so replaying a planet never grants extra progress. */
export function recordComboThreePlanet(_p: Profile, _mode: 'campaign' | 'voyage' | 'zen' | string, _planet: string | number): void {
  // Preserve existing feat keys for M15 without earning a hidden launcher now.
}
