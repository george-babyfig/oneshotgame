// This week's event: progress, reward tiers and time left.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { SKINS } from '../../meta/config';
import { EVENT_TIERS, claimEventTier, ensureEvent, eventEndsIn } from '../../meta/events';
import { rewardText } from '../../meta/progression';
import { skinSwatch } from '../screens/shop';
import type { App } from '../app';

function timeLeft(ms: number) {
  const d = Math.floor(ms / 86400000);
  const hr = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${hr}h left` : `${hr}h ${Math.floor((ms % 3600000) / 60000)}m left`;
}

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
      ...EVENT_TIERS.map((t, i) => {
        const claimed = p.event.claimed.includes(i);
        const ready = !claimed && p.event.tokens >= t.tokens;
        const last = i === EVENT_TIERS.length - 1;
        return h(
          'div',
          { class: `ev-tier${claimed ? ' claimed' : ready ? ' ready' : ''}` },
          h('b', { class: 'ev-need' }, `${ev.emoji} ${t.tokens}`),
          h(
            'span',
            { class: 'ev-rew' },
            rewardText(t.reward).join('  '),
            last && skin ? h('i', { class: 'ev-skin', style: `--g:${skinSwatch(skin.glow)}` }) : null,
            last && skin ? ` ${skin.name}` : null,
          ),
          claimed
            ? h('span', { class: 'q-ok' }, '✓')
            : btn('Claim', ready ? 'primary small' : 'ghost small dim', () => {
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
  modal(
    [
      h(
        'div',
        { class: 'ev-banner', style: `--ev:${ev.color}` },
        h('span', { class: 'ev-emoji' }, ev.emoji),
        h('div', null, h('b', null, ev.name), h('small', null, timeLeft(eventEndsIn()))),
      ),
      h('p', { class: 'muted' }, `${ev.desc} in any mode to earn ${ev.emoji}. A new event starts every Monday.`),
      body,
    ],
    { cls: 'tall', onClose: () => app.refresh() },
  );
}
