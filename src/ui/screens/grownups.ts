import { h, btn, modal, confirmBox, toast } from '../dom';
import { getLang, t, tp } from '../../i18n';
import { deviceCurrency, formatCurrency } from '../../meta/currency';
import { COSMETIC_BY_ID, setStyleDraft } from '../../meta/cosmetics';
import { PRODUCTS, PRODUCT_BY_KEY } from '../../meta/tuning';
import { clearLedger, ledgerSummary, playTimeThisWeek, purchaseHistory, spentThisMonth } from '../../meta/ledger';
import type { App } from '../app';
import { parentalGate, setParentPin, clearParentPin } from '../flows/gate';
import { grownupSettings } from '../flows/settings';
import { shopSection } from './shop';
import { diagnosticCode } from '../../meta/diagnostics';
import { ownsProduct } from '../../meta/economy';

const active = new WeakSet<App>();
// Fill these together once the owner has a hosted policy and monitored mailbox.
export const PRIVACY_CONTACT = { email: 'support@YOUR-DOMAIN', policy: 'YOUR-SITE' } as const;

export async function guardGrownups(gate: () => Promise<boolean>, show: () => void): Promise<boolean> {
  if (!(await gate())) return false;
  show();
  return true;
}

export async function enterGrownups(app: App): Promise<boolean> {
  return guardGrownups(
    () => parentalGate('grownups'),
    () => {
      active.add(app);
      renderGrownups(app);
    },
  );
}

export function refreshGrownups(app: App) {
  if (active.has(app) && app.screen === 'shop') renderGrownups(app);
  else void enterGrownups(app);
}

function choice(label: string, value: string, selected: string) {
  return h('option', { value, selected: selected === value }, t(label));
}

function renderGrownups(app: App) {
  const p = app.p;
  const time = playTimeThisWeek();
  const history = purchaseHistory();
  const locale = getLang();
  const currency = app.currencyOf('starter') || deviceCurrency(typeof navigator === 'undefined' ? locale : navigator.language);
  const spent = spentThisMonth(Date.now(), currency);
  const reminder = p.settings.spendingReminder;
  const quietUntil = (app as App & { refundQuietUntil?: number }).refundQuietUntil ?? 0;
  const spending = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Spending reminder') },
    choice('None', '', reminder === null ? '' : String(reminder.cents)),
    ...([0, 500, 1000, 2000] as const).map((cents) =>
      h(
        'option',
        { value: String(cents), selected: reminder?.cents === cents && reminder.currency === currency },
        t('Remind me at {amount}', { amount: formatCurrency(cents, currency, locale) }),
      ),
    ),
  ) as HTMLSelectElement;
  spending.addEventListener('change', () => {
    p.settings.spendingReminder = spending.value === '' ? null : { cents: Number(spending.value), currency };
    app.save();
    renderGrownups(app);
  });
  const breaks = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Suggest a break') },
    choice('Off', '', p.settings.breakAfterRounds === null ? '' : String(p.settings.breakAfterRounds)),
    ...[3, 5, 10].map((n) => h('option', { value: String(n), selected: p.settings.breakAfterRounds === n }, t('After {n} rounds', { n }))),
  ) as HTMLSelectElement;
  breaks.addEventListener('change', () => {
    p.settings.breakAfterRounds = breaks.value ? Number(breaks.value) : null;
    app.save();
  });
  const hide = h(
    'button',
    {
      class: `toggle${p.settings.hidePaidLooks ? ' on' : ''}`,
      role: 'switch',
      'aria-checked': String(p.settings.hidePaidLooks),
      onclick: () => {
        p.settings.hidePaidLooks = !p.settings.hidePaidLooks;
        setStyleDraft(p, null);
        app.save();
        renderGrownups(app);
      },
    },
    t('Hide paid looks'),
    h('i'),
  );
  const gentle = h(
    'div',
    { class: 'grownups-gentle' },
    h(
      'button',
      {
        class: `toggle${p.settings.gentle ? ' on' : ''}`,
        role: 'switch',
        'aria-checked': String(!!p.settings.gentle),
        onclick: () => {
          p.settings.gentle = !p.settings.gentle;
          app.save();
          renderGrownups(app);
        },
      },
      t('Gentle planets'),
      h('i'),
    ),
    h('p', { class: 'muted small' }, t('Sky bumps give the throw back, and Troubles and Clashes rest. Stars count as normal.')),
  );
  const code = diagnosticCode();
  const diagnosticValue = h('span', { class: 'code' }, code);
  const diagnosticLine = h('p', null, t('Diagnostic code:'), ' ', diagnosticValue);
  const copyDiagnostic = btn(t('Copy'), 'ghost', async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t('Code copied'));
    } catch {
      // Older WebViews may lack clipboard.writeText; keep the code selectable if this also fails.
      const field = h('textarea', { 'aria-hidden': 'true', readonly: true }) as HTMLTextAreaElement;
      field.value = code;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      field.style.userSelect = 'text';
      field.style.webkitUserSelect = 'text';
      document.body.append(field);
      field.select();
      field.setSelectionRange(0, code.length);
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        /* selection below remains available */
      }
      field.remove();
      if (copied) toast(t('Code copied'));
      else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(diagnosticValue);
        selection?.removeAllRanges();
        selection?.addRange(range);
        toast(t('Write down the code.'));
      }
    }
  });
  const sections = [
    p.chapters.length && Date.now() >= quietUntil
      ? h(
          'section',
          { class: 'grownups-section' },
          h('h2', null, t("What's new")),
          ...PRODUCTS.filter((x) => !x.consumable)
            .slice(-3)
            .map((x) => h('p', null, t(x.title))),
        )
      : null,
    shopSection(app),
    PRODUCTS.some((product) => !product.consumable && ownsProduct(p, product.id))
      ? btn(t('Styles'), 'ghost wide', () => app.showStyles())
      : null,
    h(
      'section',
      { class: 'grownups-section' },
      h('h2', null, t('Favourites')),
      ...(p.favourites.length
        ? p.favourites.map((id) => h('p', null, t(COSMETIC_BY_ID[id]?.name ?? id)))
        : [h('p', { class: 'muted' }, t('Looks your child hearts in Styles appear here.'))]),
    ),
    h(
      'section',
      { class: 'grownups-section' },
      h('h2', null, t('Purchases')),
      ...(history.length
        ? history.map((item) =>
            h(
              'p',
              null,
              t('{date} · {name} · {amount}', {
                date: new Date(item.at).toLocaleDateString(locale),
                name: t(PRODUCT_BY_KEY[item.key]?.title ?? item.key),
                amount: formatCurrency(item.cents, item.currency ?? 'USD', locale),
              }),
            ),
          )
        : [h('p', { class: 'muted' }, t('No purchases recorded on this device yet.'))]),
      h('p', { class: 'muted small' }, t('Apple purchase history has your complete receipts.')),
    ),
    h(
      'section',
      { class: 'grownups-section' },
      h('h2', null, t('Spending reminder')),
      h('p', null, t('Recorded this month: {amount}', { amount: formatCurrency(spent, currency, locale) })),
      h('label', null, t('Remind me at'), spending),
      reminder !== null && reminder.currency === currency && spent >= reminder.cents
        ? h('p', null, t('Your reminder amount has been reached. Screen Time can set purchase limits.'))
        : null,
      h('p', { class: 'muted small' }, t('This is a reminder, not a purchase limit. Check Screen Time for limits.')),
    ),
    h(
      'section',
      { class: 'grownups-section' },
      h('h2', null, t('Play time')),
      h(
        'p',
        null,
        t('This week: {rounds} and {minutes}', {
          rounds: tp(time.rounds, '{n} round', '{n} rounds'),
          minutes: tp(time.minutes, '{n} minute', '{n} minutes'),
        }),
      ),
      h('label', null, t('Suggest a break'), breaks),
    ),
    h(
      'section',
      { class: 'grownups-section' },
      h('h2', null, t('Grown-up settings')),
      ...grownupSettings(app),
      hide,
      gentle,
      btn(t(p.settings.parentPin ? 'Change parent PIN' : 'Set parent PIN'), 'ghost wide', () => pinDialog(app)),
      p.settings.parentPin
        ? btn(t('Remove parent PIN'), 'ghost wide', async () => {
            await clearParentPin(p);
            renderGrownups(app);
          })
        : null,
    ),
    h(
      'section',
      { class: 'grownups-section' },
      btn(t('Restore Purchases'), 'ghost wide', async () => {
        if (await parentalGate('buy')) await app.restore();
      }),
      h('h2', null, t('Help')),
      h('p', null, t('Ask to Buy: Apple can ask a family organizer to approve a purchase.')),
      h('p', null, t('Screen Time: use iPhone Settings to manage purchases and play time.')),
      h('p', null, t('Family Sharing: eligible looks can be shared with your Apple family. Gems cannot be shared.')),
      h('p', null, t('Refunds: request a refund through Apple purchase history.')),
      h('h3', null, t('Privacy')),
      h('p', null, t('Comet Garden has no accounts, ads, or tracking. The game does not send play data to us.')),
      h('p', null, t('Progress is stored on your iPhone and may be included in iPhone backups. Reset progress removes it from the game.')),
      h('p', null, t('Sharing opens only after a grown-up passes the gate. Game Center is optional and uses your Apple account.')),
      h('p', null, t('If you email support, we use your message to reply.')),
      h('p', null, t('Support email: {email}', { email: PRIVACY_CONTACT.email })),
      h('p', null, t('Privacy policy: {url}', { url: PRIVACY_CONTACT.policy })),
      diagnosticLine,
      copyDiagnostic,
      h('p', { class: 'muted small' }, t('Nothing is sent. A grown-up may paste this code into a support email.')),
      btn(t('Clear play history'), 'danger wide', async () => {
        if (!(await confirmBox(t('Clear play history on this device?'), t('Clear')))) return;
        await clearLedger();
        renderGrownups(app);
      }),
    ),
    import.meta.env.VITE_TESTER === '1'
      ? h(
          'section',
          { class: 'grownups-section' },
          // tester-only, English on purpose: the words must never reach a locale file
          btn('Balance Report', 'ghost wide', () => testerConsent()),
        )
      : null,
  ];
  app.mount(
    h(
      'div',
      { class: 'screen page grownups' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Grown-ups')),
      h('div', { class: 'scroll' }, ...sections),
    ),
    'shop',
  );
}

function pinDialog(app: App) {
  const input = h('input', {
    type: 'password',
    inputMode: 'numeric',
    maxLength: 4,
    'aria-label': t('Four-digit parent PIN'),
  }) as HTMLInputElement;
  const again = h('input', {
    type: 'password',
    inputMode: 'numeric',
    maxLength: 4,
    'aria-label': t('Confirm parent PIN'),
  }) as HTMLInputElement;
  const m = modal([
    h('div', { class: 'm-title' }, t('Set parent PIN')),
    h('p', null, t('Choose four digits. Ask to Buy and your Apple ID password also protect purchases.')),
    input,
    h('label', null, t('Enter it again'), again),
    btn(t('Save PIN'), 'primary wide', async () => {
      if (!/^\d{4}$/.test(input.value)) return toast(t('Enter four digits.'));
      if (input.value !== again.value) return toast(t('The two PINs do not match.'));
      await setParentPin(input.value, app.p);
      m.close();
      renderGrownups(app);
    }),
    btn(t('Cancel'), 'ghost wide', () => m.close()),
  ]);
}

function testerConsent() {
  const m = modal([
    h('div', { class: 'm-title' }, 'Share Balance Report?'),
    h(
      'p',
      null,
      t('This code contains a summary of play and purchases from this device. Copy it if you want to share it with the tester team.'),
    ),
    btn(t('Copy code'), 'primary wide', async () => {
      const summary = ledgerSummary();
      const code = btoa(
        JSON.stringify({
          v: 1,
          rounds: summary.rounds,
          wins: summary.wins,
          minutes: summary.minutes,
          spent: spentThisMonth(),
          economy: summary.economy,
        }),
      );
      try {
        await navigator.clipboard.writeText(code);
        toast(t('Code copied'));
        m.close();
      } catch {
        toast(t('Could not copy the code'));
      }
    }),
    btn(t('Cancel'), 'ghost wide', () => m.close()),
  ]);
}
