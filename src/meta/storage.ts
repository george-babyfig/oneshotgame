import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// On device we persist via Capacitor Preferences (UserDefaults) because iOS can
// evict web view storage. In a browser we use localStorage.
const native = Capacitor.isNativePlatform();

/** Thrown when storage can't be read (as opposed to the key simply not existing). */
export class StorageReadError extends Error {}

export async function loadKey(key: string): Promise<string | null> {
  try {
    return native ? (await Preferences.get({ key })).value : localStorage.getItem(key);
  } catch (e) {
    throw new StorageReadError(String(e));
  }
}

export async function saveKeyChecked(key: string, value: string): Promise<void> {
  if (native) await Preferences.set({ key, value });
  else localStorage.setItem(key, value);
}

export async function saveKey(key: string, value: string): Promise<void> {
  try {
    await saveKeyChecked(key, value);
  } catch {
    /* storage unavailable — keep playing */
  }
}

export async function removeKey(key: string): Promise<void> {
  if (native) await Preferences.remove({ key });
  else localStorage.removeItem(key);
}
