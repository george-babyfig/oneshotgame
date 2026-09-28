// Share text via the iOS share sheet, falling back to the Web Share API or the clipboard.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from './dom';
import { t } from '../i18n';
import { parentalGate } from './flows/gate';

export async function shareText(text: string, title = 'Pocket Planet') {
  if (!(await parentalGate('share'))) return;
  return shareTextUngated(text, title);
}

/** Used only when an image share has already passed the gate. */
export async function shareTextUngated(text: string, title = 'Pocket Planet') {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: title });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast(t('Copied — paste it to a friend!'), 'good');
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (!/cancel|abort/i.test(msg)) {
      try {
        await navigator.clipboard.writeText(text);
        toast(t('Copied to clipboard'), 'good');
      } catch {
        toast(t('Could not share'), 'bad');
      }
    }
  }
}
