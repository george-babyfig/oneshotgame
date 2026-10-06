// Star Map: the campaign as chapters of ten planets, each with a chest.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { totalStars } from '../../meta/profile';
import { difficultyOf, remixTwist } from '../../core/levels';
import { chapterOf, chapterReward, chestsReady, openChest, rewardText, LEVELS_PER_CHAPTER } from '../../meta/progression';
import type { App } from '../app';
import { t } from '../../i18n';
import { chapterBackdropUrl } from '../art/backdrops';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { remixFrame, remixStars, remixUnlocked } from '../../meta/remix';
import { addRemixLetter } from '../../meta/inbox';

const TWIST_MARK: Record<string, string> = {
  hot: '☀️',
  frozen: '❄️',
  ocean: '🌊',
  tiny: '◌',
  wind: '💨',
  wobble: '🌀',
  twin: '☾',
  moon: '🌙',
  fast: '↻',
  short: '◈',
  boss: '☄️',
  none: '✦',
};

export function showStarMap(app: App, remixChapter = 0, focusChapter = 0) {
  const sameMap = app.screen === 'map';
  const p = app.p;
  if (addRemixLetter(p)) app.save();
  const cur = chapterOf(p.level);
  const ready = chestsReady(p);
  const homeworldLevel =
    p.level >= 5 ? h('div', { class: 'starmap-homeworld-level' }, t('Homeworld Level {n}', { n: p.home.level })) : null;
  const chapters: HTMLElement[] = [];
  // show finished chapters, the current one and one teaser
  for (let n = 1; n <= cur.n + 1; n++) {
    const ch = chapterOf((n - 1) * LEVELS_PER_CHAPTER + 1);
    const locked = n > cur.n;
    const remixOpen = remixUnlocked(p, n);
    const isRemix = remixOpen && remixChapter === n;
    const remixBest = remixStars(p, n);
    const frame = remixFrame(p, n);
    let chStars = 0;
    const nodes: HTMLElement[] = [];
    for (let lv = ch.first; lv <= ch.last; lv++) {
      const s = isRemix ? remixBest[lv - ch.first] : (p.stars[lv] ?? 0);
      chStars += p.stars[lv] ?? 0;
      const open = isRemix || lv <= p.level;
      const k = lv - ch.first;
      const diff = difficultyOf(lv, isRemix ? 'RX' : 'PP');
      const twist = isRemix ? remixTwist(lv) : 'none';
      nodes.push(
        h(
          'button',
          {
            class: `node ${diff}${open ? '' : ' locked'}${!isRemix && lv === p.level ? ' current' : ''}${s === 3 ? ' gold' : ''}${isRemix ? ' remix-node' : ''}`,
            style: `--x:${[18, 50, 82, 66, 34][k % 5]}%`,
            disabled: !open,
            onclick: () => (sfx.click(), haptic.light(), isRemix ? app.preRemix(lv) : app.preLevel(lv)),
          },
          isRemix
            ? h('span', { class: 'remix-twist-mark', title: t('Twist') }, TWIST_MARK[twist] ?? '✦')
            : diff !== 'normal'
              ? h('span', { class: 'skull' }, diff === 'super' ? '💀' : '🔥')
              : null,
          h('b', null, String(lv)),
          h('small', null, open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '🔒'),
        ),
      );
    }
    const chest = ready.includes(n)
      ? btn(t('🎁 Open chapter chest'), 'primary wide chest-btn', () => {
          const r = openChest(p, n);
          if (!r) return;
          sfx.chest();
          haptic.success();
          app.save();
          showStarMap(app);
          const icon = h('div', { class: 'celebrate-chest' }, h('span', { class: 'chest-anim' }, '🎁'));
          const contents = rewardText(r).map((x) => h('span', { class: 'celebrate-item' }, x));
          const m = modal([
            icon,
            h('div', { class: 'm-title' }, t('{name} complete!', { name: t(ch.name) })),
            h('div', { class: 'reward-list' }, ...contents),
            btn(t('Awesome'), 'primary wide', () => m.close()),
          ]);
          celebrate('chest', {
            root: m.el,
            reduceMotion: effectiveReduceMotion(p),
            firstEver: p.chapters.length === 1,
            duration: p.chapters.length === 1 ? 2100 : 1600,
            beats: [
              { at: 180, play: () => icon.classList.add('opened') },
              ...contents.map((item, i) => ({ at: 400 + i * 260, play: () => item.classList.add('shown') })),
            ],
          });
        })
      : p.chapters.includes(n)
        ? h('div', { class: 'chest-done' }, t('✓ Chest opened'))
        : h(
            'div',
            { class: 'chest-preview' },
            t('🎁 Finish the chapter: {reward}', { reward: rewardText(chapterReward(n, p)).join('  ') }),
          );
    chapters.push(
      h(
        'div',
        {
          class: `chapter${locked ? ' locked' : ''}${isRemix ? ' remix-chapter' : ''} remix-frame-${frame}`,
          'data-chapter': String(n),
          style: `--h:${ch.hue};background-image:linear-gradient(180deg,rgba(19,15,45,.38),rgba(10,9,30,.72)),url("${chapterBackdropUrl(n)}")`,
        },
        h(
          'div',
          { class: 'ch-head' },
          h('div', null, h('small', null, t('Chapter {n}', { n })), h('b', null, t(ch.name))),
          h(
            'span',
            { class: 'ch-stars' },
            isRemix ? t('Remix {n}/30', { n: remixBest.reduce((a, b) => a + b, 0) }) : `${chStars}/${LEVELS_PER_CHAPTER * 3}★`,
          ),
        ),
        remixOpen
          ? h(
              'div',
              { class: 'remix-toggle', role: 'group', 'aria-label': t('Bonus Remix') },
              h(
                'button',
                {
                  class: `btn ${isRemix ? 'ghost' : 'primary'}`,
                  type: 'button',
                  'aria-pressed': String(!isRemix),
                  onclick: () => (sfx.click(), haptic.light(), showStarMap(app, 0, n)),
                },
                t('Classic'),
              ),
              h(
                'button',
                {
                  class: `btn ${isRemix ? 'primary' : 'ghost'}`,
                  type: 'button',
                  'aria-pressed': String(isRemix),
                  onclick: () => (sfx.click(), haptic.light(), showStarMap(app, n, n)),
                },
                t('Remix · Bonus'),
              ),
            )
          : null,
        isRemix
          ? h(
              'div',
              { class: 'remix-frame-label' },
              // Says what the next frame needs rather than naming the current one.
              frame === 'gold'
                ? t('🥇 Gold frame')
                : frame === 'silver'
                  ? t('Silver frame · 3★ on all 10 for gold')
                  : t('Clear all 10 for a silver frame'),
            )
          : null,
        locked
          ? h('div', { class: 'ch-lock' }, t('🔒 Finish {name} to unlock', { name: t(cur.name) }))
          : h('div', { class: 'path' }, ...nodes),
        locked || isRemix ? null : chest,
      ),
    );
  }
  const scroll = h('div', { class: 'scroll map' }, ...chapters.reverse());
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Star Map · {n}★', { n: totalStars(p) })),
      homeworldLevel,
      scroll,
    ),
    'map',
  );
  requestAnimationFrame(() => {
    if (focusChapter) {
      const toggle = scroll.querySelector(
        `[data-chapter="${focusChapter}"] .remix-toggle button[aria-pressed="true"]`,
      ) as HTMLElement | null;
      toggle?.focus({ preventScroll: true });
    }
    if (!sameMap) {
      if (remixChapter) scroll.querySelector(`[data-chapter="${remixChapter}"]`)?.scrollIntoView({ block: 'center' });
      else scroll.querySelector('.node.current')?.scrollIntoView({ block: 'center' });
    }
  });
}
