import { btn, h, modal } from '../../dom';
import { t } from '../../../i18n';

let pending = false;

/** Spending always needs a fresh, deliberate tap: Use stays disabled while a double tap could still land. */
export function confirmGemUse(name: string, gems: number, preview?: HTMLElement): Promise<boolean> {
  if (pending) return Promise.resolve(false);
  pending = true;
  return new Promise((resolve) => {
    let answered = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (yes: boolean) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      pending = false;
      resolve(yes);
    };
    const confirm = btn(t('Use 💎{n}', { n: gems }), 'gem wide', () => {
      if (confirm.disabled) return;
      finish(true);
      sheet.close();
    });
    confirm.disabled = true;
    const sheet = modal(
      [
        h('div', { class: 'm-title' }, t('Use 💎{n} for {name}?', { n: gems, name })),
        preview ?? null,
        btn(t('Cancel'), 'ghost wide', () => sheet.close()),
        confirm,
      ],
      { cls: 'gem-confirm', onClose: () => finish(false), onAbort: () => finish(false) },
    );
    // A second tap from the previous action cannot become a confirmation.
    timer = setTimeout(() => {
      confirm.disabled = false;
    }, 450);
  });
}
