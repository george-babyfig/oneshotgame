import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// On device we persist via Capacitor Preferences (UserDefaults) because iOS can
// evict web view storage. In a browser we use localStorage.
const native = Capacitor.isNativePlatform();

export async function loadKey(key: string): Promise<string | null> {
  try {
    return native ? (await Preferences.get({ key })).value : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function saveKey(key: string, value: string): Promise<void> {
  try {
    if (native) await Preferences.set({ key, value });
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — keep playing */
  }
}
