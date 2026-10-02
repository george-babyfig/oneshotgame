import { clearLedger, ledgerSummary } from '../../meta/ledger';
// Settings, language, how-to-play, credits and reset.
import { h, btn, modal, confirmBox, toast } from '../dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { InAppReview } from '@capacitor-community/in-app-review';
import { sfx } from '../audio';
import { defaultProfile, saveProfile, type Settings } from '../../meta/profile';
import { GAME_NAME, VERSION } from '../../meta/config';
import type { App } from '../app';
import { scheduleReminders } from '../platform';
import { LANGS, detectLang, t } from '../../i18n';
import { gcAvailable, gcDashboard, gcIsSignedIn, gcSignIn } from '../gamecenter';
import { parentalGate } from './gate';
import { ensureWishes } from '../../meta/wishes';
import { today } from '../../meta/profile';
import { enterGrownups } from '../screens/grownups';

type Toggle = 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'notifications';
type TextSize = Settings['textSize'];

export function setTextSize(size: TextSize) {
  document.documentElement.style.setProperty('--text-scale', size === 'extra-large' ? '1.36' : size === 'large' ? '1.18' : '1');
  document.documentElement.classList.toggle('text-xl', size === 'extra-large');
}

// Settings is loaded with the app, so the mirrored choice applies before the first screen.
if (typeof document !== 'undefined') {
  try {
    const saved = localStorage.getItem('pp.textSize');
    if (saved === 'large' || saved === 'extra-large') setTextSize(saved);
  } catch {
    // Browsers may disable local storage.
  }
}

export function settingsFlow(app: App) {
  const s: Settings = app.p.settings;
  const tog = (label: string, key: Toggle) => {
    const b = h('button', { class: `toggle${s[key] ? ' on' : ''}`, role: 'switch', 'aria-checked': String(s[key]) }, label, h('i'));
    b.addEventListener('click', async () => {
      if (key === 'notifications' && !s.notifications) {
        b.setAttribute('disabled', '');
        try {
          if (!(await parentalGate('reminders'))) return;
          app.p.meta.notifAsked = true;
          if (Capacitor.isNativePlatform()) {
            try {
              const permission = await LocalNotifications.requestPermissions();
              if (permission.display !== 'granted') throw new Error('Permission denied');
            } catch {
              s.notifications = false;
              b.classList.remove('on');
              b.setAttribute('aria-checked', 'false');
              app.save();
              toast(t('Reminders are off in the iPhone Settings app.'));
              return;
            }
          }
          s.notifications = true;
          b.classList.add('on');
          b.setAttribute('aria-checked', 'true');
          app.save();
          sfx.click();
          await scheduleReminders(app.p);
        } finally {
          b.removeAttribute('disabled');
        }
        return;
      }
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      b.setAttribute('aria-checked', String(s[key]));
      app.applySettings();
      app.save();
      sfx.click();
      if (key === 'notifications') scheduleReminders(app.p);
    });
    return b;
  };
  const lang = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Language') },
    h('option', { value: '' }, `${t('Automatic')} (${LANGS.find((l) => l.id === detectLang())?.name})`),
    ...LANGS.map((l) => h('option', { value: l.id }, l.name)),
  ) as HTMLSelectElement;
  lang.value = s.lang;
  lang.addEventListener('change', () => {
    s.lang = lang.value;
    app.applySettings();
    app.save();
    m.close();
    app.refresh();
    settingsFlow(app);
  });
  const size = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Text size') },
    h('option', { value: 'standard' }, t('Standard')),
    h('option', { value: 'large' }, t('Large')),
    h('option', { value: 'extra-large' }, t('Extra large')),
  ) as HTMLSelectElement;
  size.value = s.textSize;
  setTextSize(s.textSize);
  size.addEventListener('change', () => {
    const choice = size.value as TextSize;
    s.textSize = choice;
    setTextSize(choice);
    try {
      localStorage.setItem('pp.textSize', choice);
    } catch {
      // The profile still saves the choice.
    }
    app.save();
  });
  const colours = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Planet colours') },
    h('option', { value: 'classic' }, t('Classic colours')),
    h('option', { value: 'clear' }, t('Clear colours')),
  ) as HTMLSelectElement;
  colours.value = s.planetColours;
  colours.addEventListener('change', () => {
    s.planetColours = colours.value === 'clear' ? 'clear' : 'classic';
    app.applySettings();
    app.save();
  });
  const hemi = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Seasons') },
    h('option', { value: 'north' }, t('Northern hemisphere')),
    h('option', { value: 'south' }, t('Southern hemisphere')),
  ) as HTMLSelectElement;
  hemi.value = s.hemi;
  hemi.addEventListener('change', () => {
    s.hemi = hemi.value === 'south' ? 'south' : 'north';
    app.save();
    app.refresh();
  });
  const version = h(
    'p',
    { class: 'tiny muted' },
    `${GAME_NAME} v${VERSION} · ${t('No accounts, no ads, no tracking. Progress is saved on this device.')}`,
  );
  // Dev-only Balance Report; its English labels are never shown in production.
  if (import.meta.env.DEV) {
    let hold = 0;
    version.addEventListener('pointerdown', () => {
      hold = window.setTimeout(() => {
        hold = 0;
        const summary = ledgerSummary();
        modal([
          h('div', { class: 'm-title' }, 'Balance Report'),
          h('pre', { style: 'white-space:pre-wrap;overflow:auto;max-height:60vh;font-size:11px' }, JSON.stringify(summary, null, 2)),
        ]);
      }, 1000);
    });
    for (const event of ['pointerup', 'pointercancel', 'pointerleave']) version.addEventListener(event, () => window.clearTimeout(hold));
  }
  const m = modal([
    h('div', { class: 'm-title' }, t('Settings')),
    tog(t('Sound effects'), 'sound'),
    tog(t('Music'), 'music'),
    tog(t('Haptics'), 'haptics'),
    tog(t('Reduce motion'), 'reduceMotion'),
    h('label', { class: 'toggle lang' }, t('Language'), lang),
    h('label', { class: 'toggle lang' }, t('Text size'), size),
    h('label', { class: 'toggle lang' }, t('Planet colours'), colours),
    h('label', { class: 'toggle lang' }, t('Seasons'), hemi),
    btn(t('Field Guide'), 'ghost wide', () => (m.close(), app.showFieldGuide())),
    btn(t('Grown-ups'), 'ghost wide', () => {
      m.close();
      void enterGrownups(app);
    }),
    btn(t('Credits'), 'ghost wide', () => (m.close(), credits())),
    btn(t('Reset progress'), 'danger wide', async () => {
      m.close();
      if (!(await confirmBox(t('Erase all progress? This cannot be undone.'), t('Erase')))) return;
      const keep = {
        processedTx: app.p.processedTx,
        pendingPiggy: app.p.pendingPiggy,
        pendingPurchaseRecords: app.p.pendingPurchaseRecords,
        starter: app.p.starter,
        pass: app.p.pass,
        settings: app.p.settings,
      };
      app.p = { ...defaultProfile(), ...keep };
      if (keep.starter) app.p.skins.push('aurora');
      ensureWishes(app.p, today());
      await saveProfile(app.p);
      await clearLedger();
      app.startLevel(1, { tutorial: true });
    }),
    version,
  ]);
}

export function grownupSettings(app: App): HTMLElement[] {
  const reminders = h(
    'button',
    { class: `toggle${app.p.settings.notifications ? ' on' : ''}`, role: 'switch', 'aria-checked': String(app.p.settings.notifications) },
    t('Reminders'),
    h('i'),
  );
  reminders.addEventListener('click', async () => {
    const s = app.p.settings;
    if (!s.notifications && Capacitor.isNativePlatform()) {
      if (!(await parentalGate('reminders'))) return;
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') throw new Error('Permission denied');
      } catch {
        toast(t('Reminders are off in the iPhone Settings app.'));
        return;
      }
    }
    s.notifications = !s.notifications;
    app.p.meta.notifAsked = true;
    reminders.classList.toggle('on', s.notifications);
    reminders.setAttribute('aria-checked', String(s.notifications));
    app.save();
    await scheduleReminders(app.p);
  });
  const gameCenterButton = gcAvailable()
    ? btn(app.p.settings.gameCenter ? t('Game Center') : t('Game Center: sign in'), 'ghost wide', async () => {
        if (!gcIsSignedIn()) {
          if (!(await parentalGate('gamecenter'))) return;
          if (!(await gcSignIn(true))) {
            toast(t("Game Center didn't sign in. You can sign in from the iPhone Settings app."));
            return;
          }
          app.p.settings.gameCenter = true;
          app.save();
          app.syncGameCenter();
        }
        await gcDashboard(app.p);
      })
    : null;
  const rate = Capacitor.isNativePlatform()
    ? btn(t('Rate Comet Garden'), 'ghost wide', async () => {
        if (!(await parentalGate('rate'))) return;
        try {
          await InAppReview.requestReview();
        } catch {
          /* the system may decline to show a rating sheet */
        }
      })
    : null;
  return [reminders, gameCenterButton, rate].filter((x): x is HTMLButtonElement => x !== null);
}

function credits() {
  modal([
    h('div', { class: 'm-title' }, t('Credits')),
    h(
      'div',
      { class: 'howto' },
      h('p', null, `${GAME_NAME} — ${t('design, code, art and sound made for this game.')}`),
      h('p', null, t('Font: Fredoka (SIL Open Font License).')),
      h('p', null, t('Built with Capacitor, Vite and TypeScript.')),
      h('p', null, t('Thank you for playing! 🪐')),
    ),
  ]);
}
