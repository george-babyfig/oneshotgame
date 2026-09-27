import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let on = true;
const native = Capacitor.isNativePlatform();
export const setHaptics = (v: boolean) => (on = v);

export const haptic = {
  tick: () => on && native && Haptics.selectionChanged().catch(() => {}),
  light: () => on && native && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => on && native && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy: () => on && native && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success: () => on && native && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warn: () => on && native && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
};
