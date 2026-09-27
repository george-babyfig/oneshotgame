// Share text via the iOS share sheet, falling back to the Web Share API or the clipboard.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from './dom';

export async function shareText(text: string, title = 'Pocket Planet') {
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
    toast('Copied — paste it to a friend!', 'good');
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (!/cancel|abort/i.test(msg)) {
      try {
        await navigator.clipboard.writeText(text);
        toast('Copied to clipboard', 'good');
      } catch {
        toast('Could not share', 'bad');
      }
    }
  }
}
