import { isLaunchRosterId, type LauncherId, type Tune } from '../core/launchers';
import type { LevelDef } from '../core/levels';
import type { RoundMode } from '../core/modifiers';
import type { Profile } from './profile';
import { UNLOCKS } from './unlocks';
import { launcherBay } from './launchbay';

export type LauncherSelection = Readonly<{ id: LauncherId; tune: Tune }>;
export const SLING_SELECTION: LauncherSelection = { id: 'sling', tune: 1 };

/** A newly owned launcher waits for the next campaign win; one card per planet. */
export function pendingLauncherIntroAfterWin(p: Profile, wonPlanet: number) {
  if (p.mailSeen.includes(`launcher-intro-planet:${wonPlanet}`)) return undefined;
  return UNLOCKS.find(
    (row) =>
      row.placement === 'launcher' &&
      !!row.intro &&
      launcherBay.availability(p, row.id.slice('launcher_'.length) as LauncherId).kind === 'owned' &&
      !p.mailSeen.includes(`coach-${row.id}`),
  );
}

export function needsSlingGhost(id: LauncherId, completedRounds: number): boolean {
  return id !== 'sling' && completedRounds < 3;
}

/** Badge advice is fixed editorial data, independent of the solver. */
export function goodHere(id: LauncherId, level: Pick<LevelDef, 'twist' | 'sky'>): boolean {
  if (id === 'swoop') return level.twist === 'moon' || level.twist === 'twin';
  if (id === 'zip') return level.twist === 'fast' || level.twist === 'wobble' || level.twist === 'wind' || level.sky.obstacle === 'mist';
  if (id === 'thumper') return level.sky.obstacle === 'rocks' || level.sky.obstacle === 'ring';
  return false;
}

export function launcherChoiceAllowed(mode: RoundMode | 'practice', planet: number): boolean {
  return planet >= 31 && (mode === 'campaign' || mode === 'voyage' || mode === 'zen' || mode === 'practice');
}

/** Ownership and tune come from the Bay; invalid saved picks fall back to the Sling. */
export function resolveLauncher(
  mode: RoundMode | 'practice',
  planet: number,
  selected: LauncherId,
  owned: readonly LauncherId[],
  tune: (id: LauncherId) => Tune,
): LauncherSelection {
  if (!launcherChoiceAllowed(mode, planet)) return SLING_SELECTION;
  const id = isLaunchRosterId(selected) && owned.includes(selected) ? selected : 'sling';
  return { id, tune: id === 'sling' ? 1 : tune(id) };
}
