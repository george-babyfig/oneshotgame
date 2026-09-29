import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { Kind } from '../core/world';
import { OBJECT_FEEL } from './feel';

let on = true;
const native = Capacitor.isNativePlatform();
export const setHaptics = (v: boolean) => (on = v);
let lastHaptic = -Infinity;
const allowed = () => {
  if (!on || !native || performance.now() - lastHaptic < 150) return false;
  lastHaptic = performance.now();
  return true;
};

export const haptic = {
  tick: () => allowed() && Haptics.selectionChanged().catch(() => {}),
  light: () => allowed() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => allowed() && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy: () => allowed() && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success: () => allowed() && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warn: () => allowed() && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
  object: (kind: Kind) => {
    if (!allowed()) return;
    const pattern = OBJECT_FEEL[kind].haptic;
    Haptics.impact({ style: pattern === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
  },
};
