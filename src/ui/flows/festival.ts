// This month's festival: the costume, costumed critters spotted, and reward tiers.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { FESTIVAL_TIERS, claimFestival, ensureFestival, festivalDaysLeft } from '../../meta/festivals';
import { RESIDENT_ACCS } from '../../meta/homeworld';
import { rewardText } from '../../meta/progression';
import { critterCanvas } from '../art/critters';
import { stickerCanvas } from '../art/stickers';
import type { App } from '../app';
import { t, tp } from '../../i18n';

const MODELS = ['bunny', 'penguin', 'otter'];

export function festivalFlow(app: App) {
  const p = app.p;
  const f = ensureFestival(p);
  const body = h('div', { class: 'ev-body' });
  const accName = RESIDENT_ACCS.find((a) => a.id === f.acc)?.name ?? '';
  const render = () => {
    const max = FESTIVAL_TIERS[FESTIVAL_TIERS.length - 1].spot;
    body.replaceChildren(
      h(
        'div',
        { class: 'progress ev-prog', style: `--ev:${f.color}` },
        h('i', { style: `width:${Math.min(100, (p.festival.spotted / max) * 100)}%` }),
        h('span', null, t('{n} / {max} critters spotted', { n: fmt(Math.min(p.festival.spotted, max)), max })),
      ),
      ...FESTIVAL_TIERS.map((tier, i) => {
        const claimed = p.festival.claimed.includes(i);
        const ready = !claimed && p.festival.spotted >= tier.spot;
        return h(
          'div',
          { class: `ev-tier${claimed ? ' claimed' : ready ? ' ready' : ''}` },
          h('b', { class: 'ev-need' }, `${f.emoji} ${tier.spot}`),
          h(
            'span',
            { class: 'ev-rew fest-rew' },
            tier.sticker ? stickerCanvas(`f_${f.id}`, 30) : null,
            tier.acc ? critterCanvas('bunny', 30, 0.4, f.acc) : null,
            [
              rewardText(tier.reward).join('  '),
              tier.sticker ? t('+ sticker') : '',
              tier.acc ? t('+ {name} for residents', { name: t(accName) }) : '',
            ]
              .filter(Boolean)
              .join(' '),
          ),
          claimed
            ? h('span', { class: 'q-ok' }, '✓')
            : btn(t('Claim'), ready ? 'primary small' : 'ghost small dim', () => {
                if (!claimFestival(p, i)) return;
                sfx.chest();
                haptic.success();
                if (tier.sticker) toast(t('New sticker for your Album!'), 'good');
                if (tier.acc) toast(t('Your residents can now wear the {name}!', { name: t(accName) }), 'good');
                app.save();
                render();
              }),
        );
      }),
    );
  };
  render();
  const days = festivalDaysLeft();
  modal(
    [
      h(
        'div',
        { class: 'ev-banner', style: `--ev:${f.color}` },
        h('span', { class: 'ev-emoji' }, f.emoji),
        h('div', null, h('b', null, t(f.name)), h('small', null, tp(days, '{n} day left', '{n} days left'))),
      ),
      h('div', { class: 'fest-models' }, ...MODELS.map((id, k) => critterCanvas(id, 64, 0.4 + k, f.acc))),
      h(
        'p',
        { class: 'muted' },
        t('This month every creature wears the festival costume: {name}. Spot them on your planets in any mode.', { name: t(accName) }),
      ),
      body,
      h('p', { class: 'muted small' }, t('A new festival starts every month, and each one comes back next year.')),
    ],
    { cls: 'tall', onClose: () => app.refresh() },
  );
}
