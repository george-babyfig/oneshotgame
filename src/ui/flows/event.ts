// This week's event: progress, reward tiers and time left.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { SKINS } from '../../meta/config';
import { EVENT_TIERS, claimEventTier, ensureEvent, eventEndsIn } from '../../meta/events';
import { rewardText } from '../../meta/progression';
import { skinSwatch } from '../screens/shop';
import type { App } from '../app';
import { getLang, t } from '../../i18n';
import { untilText } from '../../meta/dates';

export function eventFlow(app: App) {
  const p = app.p;
  const ev = ensureEvent(p);
  const skin = SKINS.find((s) => s.id === ev.skin);
  const body = h('div', { class: 'ev-body' });
  const render = () => {
    const max = EVENT_TIERS[EVENT_TIERS.length - 1].tokens;
    body.replaceChildren(
      h(
        'div',
        { class: 'progress ev-prog', style: `--ev:${ev.color}` },
        h('i', { style: `width:${Math.min(100, (p.event.tokens / max) * 100)}%` }),
        h('span', null, `${ev.emoji} ${fmt(p.event.tokens)} / ${fmt(max)}`),
      ),
      ...EVENT_TIERS.map((tier, i) => {
        const claimed = p.event.claimed.includes(i);
        const ready = !claimed && p.event.tokens >= tier.tokens;
        const last = i === EVENT_TIERS.length - 1;
        return h(
          'div',
          { class: `ev-tier${claimed ? ' claimed' : ready ? ' ready' : ''}` },
          h('b', { class: 'ev-need' }, `${ev.emoji} ${tier.tokens}`),
          h(
            'span',
            { class: 'ev-rew' },
            rewardText(tier.reward).join('  '),
            last && skin ? h('i', { class: 'ev-skin', style: `--g:${skinSwatch(skin.glow)}` }) : null,
            last && skin ? ` ${t(skin.name)}` : null,
          ),
          claimed
            ? h('span', { class: 'q-ok' }, '✓')
            : btn(t('Claim'), ready ? 'primary small' : 'ghost small dim', () => {
                if (!claimEventTier(p, i)) return;
                sfx.chest();
                haptic.success();
                app.save();
                render();
              }),
        );
      }),
    );
  };
  render();
  const now = Date.now();
  const until = untilText(now + eventEndsIn(new Date(now)), now, getLang());
  const untilLabel =
    until.key === 'until tonight'
      ? t('until tonight')
      : until.key === 'until {day}'
        ? t('until {day}', until.vars)
        : t('until {date}', until.vars);
  modal(
    [
      h(
        'div',
        { class: 'ev-banner', style: `--ev:${ev.color}` },
        h('span', { class: 'ev-emoji' }, ev.emoji),
        h('div', null, h('b', null, t(ev.name)), h('small', null, untilLabel)),
      ),
      h(
        'p',
        { class: 'muted' },
        t('{desc} in any mode to earn {emoji}. A new event starts every Monday.', { desc: t(ev.desc), emoji: ev.emoji }),
      ),
      body,
    ],
    { cls: 'tall', onClose: () => app.refresh() },
  );
}
