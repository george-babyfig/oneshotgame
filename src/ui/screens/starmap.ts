// Star Map: the campaign as chapters of ten planets, each with a chest.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { totalStars } from '../../meta/profile';
import { chapterOf, chapterReward, chestsReady, openChest, rewardText, LEVELS_PER_CHAPTER } from '../../meta/progression';
import type { App } from '../app';

export function showStarMap(app: App) {
  const p = app.p;
  const cur = chapterOf(p.level);
  const ready = chestsReady(p);
  const chapters: HTMLElement[] = [];
  // show finished chapters, the current one and one teaser
  for (let n = 1; n <= cur.n + 1; n++) {
    const ch = chapterOf((n - 1) * LEVELS_PER_CHAPTER + 1);
    const locked = n > cur.n;
    let chStars = 0;
    const nodes: HTMLElement[] = [];
    for (let lv = ch.first; lv <= ch.last; lv++) {
      const s = p.stars[lv] ?? 0;
      chStars += s;
      const open = lv <= p.level;
      const k = lv - ch.first;
      nodes.push(
        h(
          'button',
          {
            class: `node${open ? '' : ' locked'}${lv === p.level ? ' current' : ''}${s === 3 ? ' gold' : ''}`,
            style: `--x:${[18, 50, 82, 66, 34][k % 5]}%`,
            disabled: !open,
            onclick: () => (sfx.click(), haptic.light(), app.preLevel(lv)),
          },
          h('b', null, String(lv)),
          h('small', null, open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '🔒'),
        ),
      );
    }
    const chest = ready.includes(n)
      ? btn('🎁 Open chapter chest', 'primary wide chest-btn', () => {
          const r = openChest(p, n);
          if (!r) return;
          sfx.chest();
          haptic.success();
          app.save();
          const m = modal([
            h('div', { class: 'chest-anim' }, '🎁'),
            h('div', { class: 'm-title' }, `${ch.name} complete!`),
            h('div', { class: 'reward-list' }, ...rewardText(r).map((t) => h('span', null, t))),
            btn('Awesome', 'primary wide', () => (m.close(), showStarMap(app))),
          ]);
        })
      : p.chapters.includes(n)
        ? h('div', { class: 'chest-done' }, '✓ Chest opened')
        : h('div', { class: 'chest-preview' }, `🎁 Finish the chapter: ${rewardText(chapterReward(n)).join('  ')}`);
    chapters.push(
      h(
        'div',
        { class: `chapter${locked ? ' locked' : ''}`, style: `--h:${ch.hue}` },
        h(
          'div',
          { class: 'ch-head' },
          h('div', null, h('small', null, `Chapter ${n}`), h('b', null, ch.name)),
          h('span', { class: 'ch-stars' }, `${chStars}/${LEVELS_PER_CHAPTER * 3}★`),
        ),
        locked ? h('div', { class: 'ch-lock' }, `🔒 Finish ${cur.name} to unlock`) : h('div', { class: 'path' }, ...nodes),
        locked ? null : chest,
      ),
    );
  }
  const scroll = h('div', { class: 'scroll map' }, ...chapters.reverse());
  app.mount(
    h('div', { class: 'screen page' }, app.topBar(true), h('div', { class: 'page-title' }, `Star Map · ${totalStars(p)}★`), scroll),
    'map',
  );
  // bring the current chapter into view
  requestAnimationFrame(() => scroll.querySelector('.node.current')?.scrollIntoView({ block: 'center' }));
}
