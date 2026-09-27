// Settings, language, how-to-play, credits and reset.
import { h, btn, modal, confirmBox } from '../dom';
import { sfx } from '../audio';
import { defaultProfile, saveProfile, type Settings } from '../../meta/profile';
import { GAME_NAME, VERSION } from '../../meta/config';
import type { App } from '../app';
import { askForReminders, scheduleReminders } from '../platform';
import { LANGS, detectLang, t } from '../../i18n';
import { gcAvailable, gcDashboard } from '../gamecenter';

type Toggle = 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'notifications';

export function settingsFlow(app: App) {
  const s: Settings = app.p.settings;
  const tog = (label: string, key: Toggle) => {
    const b = h('button', { class: `toggle${s[key] ? ' on' : ''}`, role: 'switch', 'aria-checked': String(s[key]) }, label, h('i'));
    b.addEventListener('click', () => {
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      b.setAttribute('aria-checked', String(s[key]));
      app.applySettings();
      app.save();
      sfx.click();
      if (key === 'notifications') {
        if (s.notifications && !app.p.meta.notifAsked) askForReminders(app.p, () => app.save());
        else scheduleReminders(app.p);
      }
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
  const m = modal([
    h('div', { class: 'm-title' }, t('Settings')),
    tog(t('Sound effects'), 'sound'),
    tog(t('Music'), 'music'),
    tog(t('Haptics'), 'haptics'),
    tog(t('Reduce motion'), 'reduceMotion'),
    tog(t('Reminders'), 'notifications'),
    h('label', { class: 'toggle lang' }, t('Language'), lang),
    btn(t('How to play'), 'ghost wide', () => (m.close(), howTo())),
    btn(t('Restore purchases'), 'ghost wide', () => app.restore()),
    gcAvailable() ? btn(t('Game Center'), 'ghost wide', () => gcDashboard()) : null,
    btn(t('Credits'), 'ghost wide', () => (m.close(), credits())),
    btn(t('Reset progress'), 'danger wide', async () => {
      m.close();
      if (!(await confirmBox(t('Erase all progress? This cannot be undone.'), t('Erase')))) return;
      const keep = { processedTx: app.p.processedTx, starter: app.p.starter, pass: app.p.pass, settings: app.p.settings };
      app.p = { ...defaultProfile(), ...keep };
      if (keep.starter) app.p.skins.push('aurora');
      await saveProfile(app.p);
      app.startLevel(1, { tutorial: true });
    }),
    h(
      'p',
      { class: 'tiny muted' },
      `${GAME_NAME} v${VERSION} · ${t('No accounts, no ads, no tracking. Progress is saved on this device.')}`,
    ),
  ]);
}

export function howTo() {
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
