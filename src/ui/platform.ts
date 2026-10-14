// Native reminders, enabled only from Settings.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { vaultFullAt } from '../meta/economy';
import type { Profile } from '../meta/profile';
import { planReminders } from '../meta/reminders';
import { t } from '../i18n';

const native = () => Capacitor.isNativePlatform();
const ID_VAULT = 101;
const ID_DAILY = 102;

export async function scheduleReminders(p: Profile) {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID_VAULT }, { id: ID_DAILY }] });
    if (!p.settings.notifications || !p.meta.notifAsked) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    const list = planReminders({ now: Date.now(), vaultFullAt: p.galaxy.length ? vaultFullAt(p) : null }).map((item) => ({
      id: item.id,
      title: item.kind === 'vault' ? t('Your stardust vault is full ✨') : t('Comet Garden'),
      body: item.kind === 'vault' ? t('Your planets have been busy.') : t('Your planets have been growing while you were away.'),
      schedule: { at: new Date(item.at) },
    }));
    if (list.length) await LocalNotifications.schedule({ notifications: list });
  } catch {
    /* reminders are best-effort */
  }
}
