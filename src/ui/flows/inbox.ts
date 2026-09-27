// Inbox: a list of letters; open one to read it and collect any gift.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { claimMail, letterOf, type Mail } from '../../meta/inbox';
import { rewardText } from '../../meta/progression';
import { SPECIES_BY_ID } from '../../core/world';
import { critterCanvas } from '../art/critters';
import type { App } from '../app';
import { t } from '../../i18n';

/** Template values shown to the player (creature ids become their names). */
function shown(app: App, m: Mail) {
  const v: Record<string, string | number> = { ...(m.vars ?? {}) };
  if (typeof v.c === 'string' && SPECIES_BY_ID[v.c]) {
    const nick = app.p.home.residents.find((r) => r.species === v.c)?.nick;
    v.c = nick ?? t(SPECIES_BY_ID[v.c].name);
  }
  if (typeof v.e === 'string') v.e = t(v.e);
  return v;
}

function face(m: Mail) {
  const c = m.vars?.c;
  return typeof c === 'string' && SPECIES_BY_ID[c] ? critterCanvas(c, 44) : h('span', { class: 'mail-mc' }, '🛰️');
}

function openLetter(app: App, m: Mail) {
  const L = letterOf(m);
  if (!L) return;
  const v = shown(app, m);
  m.read = true;
  app.save();
  const gift = L.gift && !m.claimed ? L.gift : null;
  const box = modal([
    h('div', { class: 'letter' }, h('div', { class: 'letter-face' }, face(m)), h('small', null, t('From: {who}', { who: t(L.from, v) }))),
    h('div', { class: 'm-title' }, t(L.title, v)),
    h('p', { class: 'letter-body' }, t(L.body, v)),
    gift ? h('div', { class: 'reward-list' }, ...rewardText(gift).map((x) => h('span', null, x))) : null,
    btn(gift ? t('Collect gift') : t('Close'), 'primary wide', () => {
      if (gift) {
        claimMail(app.p, m.id);
        sfx.chest();
        haptic.success();
        app.save();
        app.refresh();
      }
      box.close();
      inboxFlow(app);
    }),
  ]);
}

export function inboxFlow(app: App) {
  const p = app.p;
  const rows = p.mail.map((m) => {
    const L = letterOf(m);
    if (!L) return null;
    const v = shown(app, m);
    const pending = !m.read || (!!L.gift && !m.claimed);
    return h(
      'button',
      { class: `mail${pending ? ' new' : ''}`, onclick: () => (sfx.click(), list.close(), openLetter(app, m)) },
      face(m),
      h('div', { class: 'grow' }, h('b', null, t(L.title, v)), h('small', null, t(L.from, v))),
      L.gift && !m.claimed ? h('span', { class: 'mail-gift' }, '🎁') : pending ? h('span', { class: 'mail-dot' }) : null,
    );
  });
  const list = modal(
    [
      h('div', { class: 'm-title' }, t('Inbox')),
      rows.some((r) => r) ? h('div', { class: 'mail-list' }, ...rows) : h('p', { class: 'muted' }, t('No letters yet.')),
    ],
    { onClose: () => app.refresh() },
  );
}
