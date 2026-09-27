// Workshop: dress your Keeper and pick its launcher and trail. Tap any item to
// try it on in the live preview before buying or equipping it.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import {
  COSMETICS,
  COSMETIC_BY_ID,
  MASTERY_STEPS,
  SLOTS,
  SLOT_NAMES,
  buyCosmetic,
  currentLook,
  equip,
  masteryLevel,
  owns,
  ownedCount,
  sourceText,
  type Look,
  type Slot,
} from '../../meta/cosmetics';
import { drawKeeper, drawLauncher, drawTrail, itemCanvas } from '../art/keeper';
import { drawProjectile } from '../art/projectiles';
import type { App } from '../app';
import { t } from '../../i18n';

let lastSlot: Slot = 'suit';

/** Animated stage: the Keeper flings a rock every couple of seconds. */
function stage(canvas: HTMLCanvasElement, getLook: () => Look, reduceMotion: boolean, mastered: (id: string) => boolean) {
  const g = canvas.getContext('2d')!;
  let raf = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hh);
    const time = reduceMotion ? 0.3 : (now - t0) / 1000;
    const look = getLook();
    const lx = w * 0.58;
    const ly = hh * 0.62;
    // throw cycle: aim 0-1.2s, fly 1.2-2.2s, rest to 2.8s
    const cyc = time % 2.8;
    const pull = cyc < 1.2 ? Math.min(1, cyc / 0.9) : 0;
    const flying = cyc >= 1.2 && cyc < 2.2 ? (cyc - 1.2) / 1 : -1;
    // tiny planet target
    const px = w * 0.9;
    const py = hh * 0.2;
    const pg = g.createRadialGradient(px - 8, py - 8, 4, px, py, 34);
    pg.addColorStop(0, '#6ee29a');
    pg.addColorStop(1, '#2a7fd0');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(px, py, 30, 0, Math.PI * 2);
    g.fill();
    drawKeeper(g, look, w * 0.28, hh * 0.92, Math.min(130, hh * 0.72), time, {
      lean: pull,
      cheer: flying > 0.8 ? 1 : 0,
      look: Math.atan2(py - hh * 0.5, px - w * 0.28),
    });
    drawLauncher(g, look.launcher, lx, ly, time, { x: -pull * 14, y: pull * 22 }, '#c9c2ff', mastered(look.launcher));
    if (flying < 0) {
      drawProjectile(g, 'rock', lx - pull * 14, ly + pull * 22, 30, time);
    } else {
      const pts: { x: number; y: number }[] = [];
      const pos = (k: number) => ({
        x: lx + (px - lx) * k,
        y: ly + (py - ly) * k - Math.sin(k * Math.PI) * hh * 0.25,
      });
      for (let i = 0; i < 18; i++) pts.push(pos(Math.max(0, flying - (18 - i) * 0.025)));
      drawTrail(g, look.trail, pts, time, '#c9c2ff');
      const p = pos(flying);
      drawProjectile(g, 'rock', p.x, p.y, 26, time, flying * 8);
    }
    if (!reduceMotion) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function showWorkshop(app: App, slot: Slot = lastSlot, tryOn?: string) {
  lastSlot = slot;
  const p = app.p;
  const worn = currentLook(p);
  const preview: Look = { ...worn };
  if (tryOn && COSMETIC_BY_ID[tryOn]) preview[COSMETIC_BY_ID[tryOn].slot] = tryOn;
  const sel = tryOn ?? worn[slot];
  const item = COSMETIC_BY_ID[sel];
  const canvas = h('canvas', { class: 'ws-stage' }) as HTMLCanvasElement;

  let action: HTMLElement;
  if (!item) action = h('div');
  else if (worn[item.slot] === item.id) action = h('div', { class: 'ws-state' }, t('✓ Equipped'));
  else if (owns(p, item.id))
    action = btn(t('Equip'), 'primary', () => {
      equip(p, item.id);
      sfx.click();
      haptic.light();
      app.save();
      showWorkshop(app, slot);
    });
  else if (item.source === 'gems')
    action = btn(`${t('Buy')} 💎${item.gems}`, 'gem', () => {
      if (p.gems < (item.gems ?? 0)) return app.needGems();
      buyCosmetic(p, item.id);
      equip(p, item.id);
      sfx.coin();
      haptic.success();
      toast(t('{name} is yours!', { name: t(item.name) }), 'good');
      app.save();
      showWorkshop(app, slot);
    });
  else if (item.source === 'pass' || item.source === 'road' || item.source === 'starter')
    action = btn(`🔒 ${sourceText(item)}`, 'ghost', () => (item.source === 'starter' ? app.showShop() : app.showPass()));
  else action = h('div', { class: 'ws-state locked' }, `🔒 ${sourceText(item)}`);

  const flings = p.mastery[worn.launcher] ?? 0;
  const mLv = masteryLevel(flings);
  const mastery =
    slot === 'launcher'
      ? h(
          'div',
          { class: 'ws-mastery' },
          h('b', null, t('Mastery {stars}', { stars: '★'.repeat(mLv) + '☆'.repeat(MASTERY_STEPS.length - mLv) })),
          h(
            'small',
            null,
            mLv < MASTERY_STEPS.length
              ? t('{n} / {goal} flings with {name}', {
                  n: fmt(flings),
                  goal: fmt(MASTERY_STEPS[mLv]),
                  name: t(COSMETIC_BY_ID[worn.launcher].name),
                })
              : t('Mastered! Your launcher glows gold.'),
          ),
        )
      : null;

  const tabs = h(
    'div',
    { class: 'tabs' },
    ...SLOTS.map((s) =>
      h('button', { class: `tab${s === slot ? ' on' : ''}`, onclick: () => (sfx.click(), showWorkshop(app, s)) }, t(SLOT_NAMES[s])),
    ),
  );
  const grid = h(
    'div',
    { class: 'ws-grid' },
    ...COSMETICS.filter((x) => x.slot === slot).map((x) => {
      const have = owns(p, x.id);
      const on = worn[slot] === x.id;
      return h(
        'button',
        {
          class: `ws-item t-${x.tier}${have ? '' : ' locked'}${on ? ' on' : ''}${x.id === sel ? ' sel' : ''}`,
          onclick: () => (sfx.click(), haptic.light(), showWorkshop(app, slot, x.id)),
        },
        itemCanvas(x.id, worn, 64),
        h('b', null, t(x.name)),
        h('small', null, on ? t('Equipped') : have ? t('Owned') : sourceText(x)),
      );
    }),
  );
  const stop = stage(
    canvas,
    () => preview,
    p.settings.reduceMotion,
    (id) => masteryLevel(p.mastery[id] ?? 0) >= MASTERY_STEPS.length,
  );
  app.mount(
    h(
      'div',
      { class: 'screen page workshop' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Workshop'), h('small', { class: 'muted' }, ` ${ownedCount(p)}/${COSMETICS.length}`)),
      h(
        'div',
        { class: 'ws-top' },
        canvas,
        h('div', { class: 'ws-bar' }, h('div', { class: 'ws-name' }, item ? t(item.name) : ''), action),
      ),
      h(
        'div',
        { class: 'scroll' },
        tabs,
        mastery,
        grid,
        h('p', { class: 'muted' }, t('Every item is earned or bought directly — no random boxes, ever.')),
      ),
    ),
    'workshop',
    stop,
  );
}
