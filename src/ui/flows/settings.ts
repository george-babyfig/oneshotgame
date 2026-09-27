// Settings, how-to-play, credits and reset.
import { h, btn, modal, confirmBox } from '../dom';
import { sfx } from '../audio';
import { defaultProfile, saveProfile, type Settings } from '../../meta/profile';
import { GAME_NAME, VERSION } from '../../meta/config';
import type { App } from '../app';
import { askForReminders, scheduleReminders } from '../platform';

export function settingsFlow(app: App) {
  const s = app.p.settings;
  const tog = (label: string, key: keyof Settings) => {
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
  const m = modal([
    h('div', { class: 'm-title' }, 'Settings'),
    tog('Sound effects', 'sound'),
    tog('Music', 'music'),
    tog('Haptics', 'haptics'),
    tog('Reduce motion', 'reduceMotion'),
    tog('Reminders', 'notifications'),
    btn('How to play', 'ghost wide', () => (m.close(), howTo())),
    btn('Restore purchases', 'ghost wide', () => app.restore()),
    btn('Credits', 'ghost wide', () => (m.close(), credits())),
    btn('Reset progress', 'danger wide', async () => {
      m.close();
      if (!(await confirmBox('Erase all progress? This cannot be undone.', 'Erase'))) return;
      const keep = { processedTx: app.p.processedTx, starter: app.p.starter, pass: app.p.pass, settings: app.p.settings };
      app.p = { ...defaultProfile(), ...keep };
      if (keep.starter) app.p.skins.push('aurora');
      await saveProfile(app.p);
      app.startLevel(1, { tutorial: true });
    }),
    h('p', { class: 'tiny muted' }, `${GAME_NAME} v${VERSION} · No accounts, no ads, no tracking. Progress is saved on this device.`),
  ]);
}

export function howTo() {
  modal([
    h('div', { class: 'm-title' }, 'How to play'),
    h(
      'div',
      { class: 'howto' },
      h('p', null, '👆 Pull back anywhere and let go to fling. Gravity bends your shot — watch the dotted line.'),
      h('p', null, '🪨 Rock raises land · ☄️ Ice makes oceans · 🌱 Seeds grow life · 🔥 Magma heats & builds volcanoes'),
      h('p', null, '🦌 Creatures appear when the right lands meet — a Forest next to an Ocean brings Otters!'),
      h('p', null, '★ Reach the life target before your throws run out. Tap the small bubble to swap objects.'),
      h('p', null, '✨ Finished planets orbit your galaxy and make stardust, even while you are away.'),
    ),
  ]);
}

function credits() {
  modal([
    h('div', { class: 'm-title' }, 'Credits'),
    h(
      'div',
      { class: 'howto' },
      h('p', null, `${GAME_NAME} — design, code, art and sound made for this game.`),
      h('p', null, 'Font: Fredoka (SIL Open Font License).'),
      h('p', null, 'Built with Capacitor, Vite and TypeScript.'),
      h('p', null, 'Thank you for playing! 🪐'),
    ),
  ]);
}
