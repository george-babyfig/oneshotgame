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
  DEFAULT_LOOK,
  PRESETS,
  loadPreset,
  savePreset,
  type Look,
  type Slot,
} from '../../meta/cosmetics';
import { drawKeeper, drawLauncher, drawTrail, itemCanvas, keeperHead } from '../art/keeper';
import { drawProjectile } from '../art/projectiles';
import type { App } from '../app';
import { t } from '../../i18n';
import { DYES, applyDye, ownsDye, unlockDye } from '../../meta/dyes';
import { MAT_EMOJI, type Mat } from '../../meta/constellations';

type Tab = Slot | 'dye';
let lastSlot: Tab = 'suit';

/** Animated stage: the Keeper flings a rock every couple of seconds. */
function stage(canvas: HTMLCanvasElement, getLook: () => Look, reduceMotion: boolean, mastered: (id: string) => boolean, emoting = false) {
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
      lean: emoting ? 0 : pull,
      cheer: flying > 0.8 ? 1 : 0,
      emote: emoting,
      et: time,
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

/** Dye tab: recolour the suit body and trim; locked dyes unlock with materials. */
function dyePanel(app: App) {
  const p = app.p;
  const row = (channel: 'main' | 'trim') =>
    h(
      'div',
      { class: 'dye-row' },
      h(
        'button',
        {
          class: `dye none${p.dye[channel] ? '' : ' on'}`,
          onclick: () => (applyDye(p, channel, null), app.save(), sfx.click(), showWorkshop(app, 'dye')),
        },
        h('i', null, '∅'),
        h('small', null, t('Suit colour')),
      ),
      ...DYES.map((d) => {
        const owned = ownsDye(p, d.id);
        const on = p.dye[channel] === d.id;
        return h(
          'button',
          {
            class: `dye${on ? ' on' : ''}${owned ? '' : ' locked'}`,
            onclick: () => {
              if (!owned) {
                if (!unlockDye(p, d.id)) return toast(t('Needs {cost} — finish more planets for materials', { cost: costText(d.cost) }));
                sfx.chest();
                haptic.success();
                toast(t('{name} dye unlocked!', { name: t(d.name) }), 'good');
              } else sfx.click();
              applyDye(p, channel, d.id);
              app.save();
              showWorkshop(app, 'dye');
            },
          },
          h('i', { style: `background:${d.color === 'aurora' ? 'conic-gradient(#ff8fc8,#6ec8ff,#b8ff6e,#ffd24a,#ff8fc8)' : d.color}` }),
          h('small', null, owned ? t(d.name) : costText(d.cost)),
        );
      }),
    );
  return h(
    'div',
    { class: 'dye-panel' },
    h('div', { class: 'sec-title' }, t('Suit')),
    row('main'),
    h('div', { class: 'sec-title' }, t('Trim')),
    row('trim'),
    h('p', { class: 'muted tiny' }, t('Dyes work with every suit. Unlock them once with materials from your planets.')),
  );
}

function costText(cost?: Partial<Record<Mat, number>>) {
  return Object.entries(cost ?? {})
    .map(([m, n]) => `${MAT_EMOJI[m as Mat]}${n}`)
    .join(' ');
}

/** Three outfit slots: tap to wear, 💾 to save the current look. */
function presetRow(app: App, slot: Tab) {
  const p = app.p;
  return h(
    'div',
    { class: 'presets' },
    h('small', null, t('Outfits')),
    ...Array.from({ length: PRESETS }, (_, i) => {
      const saved = p.presets?.[i];
      return h(
        'div',
        { class: 'preset' },
        h(
          'button',
          {
            class: `preset-wear${saved ? '' : ' empty'}`,
            'aria-label': t('Wear outfit {n}', { n: i + 1 }),
            onclick: () => {
              if (!loadPreset(p, i)) return toast(t('Tap 💾 to save your current look here'));
              sfx.click();
              haptic.light();
              app.save();
              showWorkshop(app, slot);
            },
          },
          saved ? keeperHead({ ...DEFAULT_LOOK, ...saved } as Look, 34) : String(i + 1),
        ),
        h(
          'button',
          {
            class: 'preset-save',
            'aria-label': t('Save outfit {n}', { n: i + 1 }),
            onclick: () => {
              savePreset(p, i);
              sfx.coin();
              toast(t('Outfit {n} saved', { n: i + 1 }), 'good');
              app.save();
              showWorkshop(app, slot);
            },
          },
          '💾',
        ),
      );
    }),
  );
}

export function showWorkshop(app: App, slot: Tab = lastSlot, tryOn?: string) {
  lastSlot = slot;
  const p = app.p;
  const worn = currentLook(p);
  const preview: Look = { ...worn };
  if (tryOn && COSMETIC_BY_ID[tryOn]) preview[COSMETIC_BY_ID[tryOn].slot] = tryOn;
  const sel = tryOn ?? worn[slot === 'dye' ? 'suit' : slot];
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
    ...[...SLOTS, 'dye' as const].map((s) =>
      h(
        'button',
        { class: `tab${s === slot ? ' on' : ''}`, onclick: () => (sfx.click(), showWorkshop(app, s)) },
        s === 'dye' ? t('Dye') : t(SLOT_NAMES[s]),
      ),
    ),
  );
  const grid =
    slot === 'dye'
      ? dyePanel(app)
      : h(
          'div',
          { class: 'ws-grid' },
          ...COSMETICS.filter((x) => x.slot === slot).map((x) => {
            const have = owns(p, x.id);
            const on = worn[x.slot] === x.id;
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
    slot === 'emote',
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
        presetRow(app, slot),
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
