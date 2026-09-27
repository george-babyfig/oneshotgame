// Parental gate: a grown-up question before any real-money purchase
// (required by Apple for apps in the Kids Category, and good practice anyway).
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { t } from '../../i18n';

export function parentalGate(rnd = Math.random): Promise<boolean> {
  const a = 6 + Math.floor(rnd() * 4);
  const b = 6 + Math.floor(rnd() * 4);
  const answer = a * b;
  const choices = [answer, answer + a, answer - b, answer + 10].sort(() => rnd() - 0.5);
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
        h('p', { class: 'muted' }, t('To continue to the App Store, please answer:')),
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
