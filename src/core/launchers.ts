export type LauncherId = 'sling' | 'swoop' | 'sparkler' | 'zip' | 'thumper' | 'pinpoint' | 'skipper';
export type Tune = 1 | 2 | 3 | 4;
export type LauncherSelection = Readonly<{ id: LauncherId; tune: Tune }>;
export type LauncherSpecial = 'fusion' | 'wind' | 'break' | 'precision' | 'rebound';

export interface LauncherDef {
  readonly id: LauncherId;
  readonly name: string;
  readonly job: string;
  readonly speedMultiplier: number;
  readonly curveMultiplier: number;
  readonly aimSteps: number;
  readonly reachDelta: -1 | 0 | 1;
  readonly special: LauncherSpecial | null;
  readonly debut: number;
  readonly essence?: 'leaf' | 'dew' | 'stone';
  readonly emblem: string;
  readonly bandColor: string;
}

export interface ResolvedLauncher extends LauncherDef {
  readonly tune: Tune;
  readonly maxPull: number;
  readonly overPullTip: boolean;
}

export const LAUNCHER_IDS: readonly LauncherId[] = Object.freeze(['sling', 'swoop', 'sparkler', 'zip', 'thumper', 'pinpoint', 'skipper']);
/** Gameplay launch roster. Keep LAUNCHER_IDS and all definitions for saved M15 data. */
export const LAUNCH_ROSTER: readonly LauncherId[] = Object.freeze(['sling', 'swoop', 'zip', 'thumper']);
export function isLaunchRosterId(id: LauncherId): boolean {
  return LAUNCH_ROSTER.includes(id);
}
export const STAR_SLING_SELECTION: LauncherSelection = Object.freeze({ id: 'sling', tune: 1 });

// Names and jobs are English localization keys; UI passes them through t().
export const LAUNCHERS: Readonly<Record<LauncherId, LauncherDef>> = Object.freeze({
  sling: Object.freeze({
    id: 'sling',
    name: 'Star Sling',
    job: 'Steady all-rounder',
    speedMultiplier: 1,
    curveMultiplier: 1,
    aimSteps: 28,
    reachDelta: 0,
    special: null,
    debut: 1,
    emblem: '★',
    bandColor: '#f5cb70',
  }),
  swoop: Object.freeze({
    id: 'swoop',
    name: 'Swoop',
    job: 'Bends round things',
    speedMultiplier: 0.92,
    curveMultiplier: 1.35,
    aimSteps: 28,
    reachDelta: 0,
    special: null,
    debut: 31,
    essence: 'dew',
    emblem: '@',
    bandColor: '#85c8dd',
  }),
  sparkler: Object.freeze({
    id: 'sparkler',
    name: 'Sparkler',
    job: 'Fusions go further',
    speedMultiplier: 1,
    curveMultiplier: 1,
    aimSteps: 28,
    reachDelta: 0,
    special: 'fusion',
    debut: 37,
    essence: 'leaf',
    emblem: '✧',
    bandColor: '#97d991',
  }),
  zip: Object.freeze({
    id: 'zip',
    name: 'Zip',
    job: 'Fast and flat',
    speedMultiplier: 1.22,
    curveMultiplier: 0.8,
    aimSteps: 28,
    reachDelta: 0,
    special: 'wind',
    debut: 43,
    essence: 'leaf',
    emblem: '❯',
    bandColor: '#00a6b2',
  }),
  thumper: Object.freeze({
    id: 'thumper',
    name: 'Thumper',
    job: 'Heavy, wide landing',
    speedMultiplier: 0.9,
    curveMultiplier: 1.15,
    aimSteps: 16,
    reachDelta: 1,
    special: 'break',
    debut: 48,
    essence: 'stone',
    emblem: '■',
    bandColor: '#c9a88b',
  }),
  pinpoint: Object.freeze({
    id: 'pinpoint',
    name: 'Pinpoint',
    job: 'Small and exact',
    speedMultiplier: 1,
    curveMultiplier: 1,
    aimSteps: 90,
    reachDelta: -1,
    special: 'precision',
    debut: 53,
    essence: 'stone',
    emblem: '⊙',
    bandColor: '#aab4ee',
  }),
  skipper: Object.freeze({
    id: 'skipper',
    name: 'Skipper',
    job: 'Bounces once',
    speedMultiplier: 1,
    curveMultiplier: 1,
    aimSteps: 28,
    reachDelta: 0,
    special: 'rebound',
    debut: 62,
    essence: 'dew',
    emblem: '〽',
    bandColor: '#f2a8b6',
  }),
});

/** Tuning only eases a drawback; it never improves a launcher's strength. */
export function launcherAtTune(id: LauncherId, tune: Tune): ResolvedLauncher {
  const base = LAUNCHERS[id];
  return {
    ...base,
    tune,
    speedMultiplier: id === 'swoop' ? [0, 0.92, 0.94, 0.96, 0.98][tune] : base.speedMultiplier,
    aimSteps: id === 'thumper' ? [0, 16, 19, 21, 23][tune] : base.aimSteps,
    maxPull: id === 'zip' && tune >= 3 ? (tune === 3 ? 145 : 140) : 150,
    overPullTip: id === 'zip' && tune >= 2,
  };
}

export function launcherReach(selection: LauncherSelection, kind: 'rock' | 'ice' | 'seed' | 'magma' | 'storm' | 'sun'): -1 | 0 | 1 {
  if (selection.id === 'thumper') return 1;
  if (selection.id !== 'pinpoint') return 0;
  if (kind === 'storm' && selection.tune >= 2) return 0;
  if (kind === 'sun' && selection.tune >= 3) return 0;
  if (kind === 'seed' && selection.tune >= 4) return 0;
  return -1;
}

export function skipperLosesPower(
  selection: LauncherSelection,
  kind: 'rock' | 'ice' | 'seed' | 'magma' | 'storm' | 'sun',
  specialBounceNumber: number,
): boolean {
  if (selection.id !== 'skipper' || specialBounceNumber < 1) return false;
  if (selection.tune >= 3 && specialBounceNumber <= selection.tune - 2) return false;
  return selection.tune === 1 || kind === 'rock' || kind === 'magma';
}
