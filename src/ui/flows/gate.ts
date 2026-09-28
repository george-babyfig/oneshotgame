// Parental gate before purchases and actions that leave the game.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { t } from '../../i18n';

export type GateReason = 'buy' | 'share' | 'rate' | 'reminders' | 'gamecenter' | 'link';

export function parentalGate(reason: GateReason = 'buy', rnd = Math.random): Promise<boolean> {
  const a = 6 + Math.floor(rnd() * 4);
  const b = 6 + Math.floor(rnd() * 4);
  const answer = a * b;
  const choices = [answer, answer + a, answer - b, answer + 10].sort(() => rnd() - 0.5);
  const explanation = {
    buy: t('To continue to the App Store, please answer:'),
    share: t('Sharing is for grown-ups. Please answer:'),
    rate: t('To rate the game, please answer:'),
    reminders: t('To turn on reminders, please answer:'),
    gamecenter: t('To sign in to Game Center, please answer:'),
    link: t('To leave the game, please answer:'),
  }[reason];
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      m.close();
      resolve(ok);
    };
    const m = modal(
      [
        h('div', { class: 'm-title' }, t('Ask a grown-up')),
        h('p', { class: 'muted' }, explanation),
        h('div', { class: 'gate-q' }, `${a} × ${b} = ?`),
        h(
          'div',
          { class: 'gate-a' },
          ...choices.map((c) =>
            btn(String(c), 'ghost', () => {
              if (c !== answer) sfx.error();
              finish(c === answer);
            }),
          ),
        ),
        btn(t('Cancel'), 'ghost wide', () => finish(false)),
      ],
      { onClose: () => finish(false), onAbort: () => finish(false) },
    );
  });
}
