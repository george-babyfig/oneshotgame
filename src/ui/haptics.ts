import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { Kind } from '../core/world';
import { COMBO_HAPTIC, OBJECT_FEEL, REACTION_HAPTIC, type FeelHaptic } from './feel';

let on = true;
const native = Capacitor.isNativePlatform();
export const setHaptics = (v: boolean) => (on = v);
let lastHaptic = -Infinity;
const allowed = () => {
  if (!on || !native || performance.now() - lastHaptic < 150) return false;
  lastHaptic = performance.now();
  return true;
};
const impactStyle = (feel: FeelHaptic) => (feel === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light);

export const haptic = {
  trouble: (kind: 'act' | 'blocked' | 'settled' | 'spread') => {
    if (!allowed()) return;
    Haptics.impact({ style: kind === 'settled' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
  },
  sky: () => allowed() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  tick: () => allowed() && Haptics.selectionChanged().catch(() => {}),
  light: () => allowed() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => allowed() && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy: () => allowed() && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success: () => allowed() && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warn: () => allowed() && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
  reaction: (kind: 'fusion' | 'clash') => allowed() && Haptics.impact({ style: impactStyle(REACTION_HAPTIC[kind]) }).catch(() => {}),
  combo: () => allowed() && Haptics.impact({ style: impactStyle(COMBO_HAPTIC) }).catch(() => {}),
  object: (kind: Kind) => {
    if (!allowed()) return;
    const pattern = OBJECT_FEEL[kind].haptic;
    Haptics.impact({ style: impactStyle(pattern) }).catch(() => {});
  },
};
