import { clearLedger, ledger, ledgerSummary } from '../../meta/ledger';
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
import { ensureQuests } from '../../meta/progression';
import { today } from '../../meta/profile';

type Toggle = 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'notifications';

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
  const gameCenterButton: HTMLButtonElement | null = gcAvailable()
    ? btn(app.p.settings.gameCenter ? t('Game Center') : t('Game Center: sign in'), 'ghost wide', async () => {
        gameCenterButton!.disabled = true;
        try {
          if (!gcIsSignedIn()) {
            if (!(await parentalGate('gamecenter'))) return;
            if (!(await gcSignIn(true))) {
              toast(t("Game Center didn't sign in. You can sign in from the iPhone Settings app."));
              return;
            }
            app.p.settings.gameCenter = true;
            app.save();
            app.syncGameCenter();
            gameCenterButton!.textContent = t('Game Center');
          }
          await gcDashboard(app.p);
        } finally {
          gameCenterButton!.disabled = false;
        }
      })
    : null;
  const version = h(
    'p',
    { class: 'tiny muted' },
    `${GAME_NAME} v${VERSION} · ${t('No accounts, no ads, no tracking. Progress is saved on this device.')}`,
  );
  // Dev-only Balance Report; its English labels are never shown in production.
  if (import.meta.env.DEV || import.meta.env.VITE_TESTER === '1') {
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
    tog(t('Reminders'), 'notifications'),
    h('label', { class: 'toggle lang' }, t('Language'), lang),
    h('label', { class: 'toggle lang' }, t('Seasons'), hemi),
    btn(t('How to play'), 'ghost wide', () => (m.close(), howTo())),
    btn(t('Restore purchases'), 'ghost wide', async () => {
      if (await parentalGate('buy')) await app.restore();
    }),
    gameCenterButton,
    Capacitor.isNativePlatform()
      ? btn(t('Rate Pocket Planet'), 'ghost wide', async () => {
          if (!(await parentalGate('rate'))) return;
          try {
            await InAppReview.requestReview();
          } catch {
            /* the system may decline to show a rating sheet */
          }
        })
      : null,
    btn(t('Credits'), 'ghost wide', () => (m.close(), credits())),
    btn(t('Reset progress'), 'danger wide', async () => {
      m.close();
      if (!(await confirmBox(t('Erase all progress? This cannot be undone.'), t('Erase')))) return;
      const keep = { processedTx: app.p.processedTx, starter: app.p.starter, pass: app.p.pass, settings: app.p.settings };
      app.p = { ...defaultProfile(), ...keep };
      if (keep.starter) app.p.skins.push('aurora');
      ensureQuests(app.p, today());
      await saveProfile(app.p);
      await clearLedger();
      app.startLevel(1, { tutorial: true });
    }),
    version,
  ]);
}

export function howTo() {
  ledger.count('help_used');
  modal([
    h('div', { class: 'm-title' }, t('How to play')),
    h(
      'div',
      { class: 'howto' },
      h('p', null, t('👆 Pull back anywhere and let go to fling. Gravity bends your shot — watch the dotted line.')),
      h('p', null, t('🪨 Rock raises land · ☄️ Ice makes oceans · 🌱 Seeds grow life · 🔥 Magma heats & builds volcanoes')),
      h('p', null, t('🦌 Creatures appear when the right lands meet — a Forest next to an Ocean brings Otters!')),
      h('p', null, t('★ Reach the life target before your throws run out. Tap the small bubble to swap objects.')),
      h('p', null, t('✨ Finished planets orbit your galaxy and make stardust, even while you are away.')),
    ),
  ]);
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
