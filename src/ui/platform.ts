// Native niceties: gentle local reminders and the App Store rating prompt.
// Everything is opt-in and silently does nothing on the web.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { InAppReview } from '@capacitor-community/in-app-review';
import { h, btn, modal } from './dom';
import { vaultFullAt } from '../meta/economy';
import type { Profile } from '../meta/profile';

const native = () => Capacitor.isNativePlatform();
const ID_VAULT = 101;
const ID_GIFT = 102;

/** Move a time into friendly hours (10:00–20:30 local) so we never buzz at night. */
export function friendlyTime(t: number): number {
  const d = new Date(t);
  const hr = d.getHours() + d.getMinutes() / 60;
  if (hr >= 10 && hr <= 20.5) return t;
  const next = new Date(d);
  if (hr > 20.5) next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next.getTime();
}

export async function scheduleReminders(p: Profile) {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID_VAULT }, { id: ID_GIFT }] });
    if (!p.settings.notifications || !p.meta.notifAsked) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    const list = [];
    const full = vaultFullAt(p);
    if (p.galaxy.length && full > Date.now() + 30 * 60000) {
      list.push({
        id: ID_VAULT,
        title: 'Your stardust vault is full ✨',
        body: 'Your planets have been busy. Come collect!',
        schedule: { at: new Date(friendlyTime(full)) },
      });
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 30, 0, 0);
    list.push({
      id: ID_GIFT,
      title: 'Your daily gift is ready 🎁',
      body: 'Keep your streak going — and see who visited your galaxy.',
      schedule: { at: tomorrow },
    });
    await LocalNotifications.schedule({ notifications: list });
  } catch {
    /* reminders are best-effort */
  }
}

/** Ask (once, in context) whether the player wants reminders, then the system prompt. */
export function askForReminders(p: Profile, save: () => void) {
  if (!native() || p.meta.notifAsked || !p.settings.notifications) return;
  p.meta.notifAsked = true;
  save();
  const m = modal([
    h('div', { class: 'gift-ic' }, '🔔'),
    h('div', { class: 'm-title' }, 'Want a nudge?'),
    h(
      'p',
      { class: 'muted' },
      'We can let you know when your stardust vault is full and your daily gift is ready. No more than once a day, never at night.',
    ),
    btn('Yes please', 'primary wide', async () => {
      m.close();
      try {
        await LocalNotifications.requestPermissions();
        scheduleReminders(p);
      } catch {
        /* ignore */
      }
    }),
    btn('No thanks', 'ghost wide', () => {
      p.settings.notifications = false;
      save();
      m.close();
    }),
  ]);
}

/** Ask for an App Store rating at a happy moment (Apple caps how often it shows). */
export function maybeAskReview(p: Profile, save: () => void, stars: number, level: number) {
  if (!native() || p.meta.rated || stars < 3 || level < 8 || p.meta.sessions < 3) return;
  p.meta.rated = true;
  save();
  setTimeout(() => InAppReview.requestReview().catch(() => {}), 900);
}
