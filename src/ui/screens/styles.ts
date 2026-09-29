// Styles: dress your Keeper and preview looks without changing the saved outfit.
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
  isPaidLook,
  visibleCosmetics,
  toggleFavourite,
  STYLES_RELEASE,
  DEFAULT_LOOK,
  PRESETS,
  loadPreset,
  savePreset,
  type Look,
  type Slot,
  FACE_NAMES,
  HAIR_NAMES,
  EYE_NAMES,
  EXPRESSION_NAMES,
  EXPRESSIONS,
  SKIN_TONES,
  HAIR_COLORS,
  type AvatarParts,
} from '../../meta/cosmetics';
import { drawKeeper, drawLauncher, drawTrail, itemCanvas, keeperHead } from '../art/keeper';
import { drawProjectile } from '../art/projectiles';
import type { App } from '../app';
import { t } from '../../i18n';
import { DYES, applyDye, ownsDye, unlockDye } from '../../meta/dyes';
import { MAT_EMOJI, type Mat } from '../../meta/constellations';
import { BUDDY_AT, buddyAccs, buddyEligible, currentBuddy, setBuddy, setBuddyAcc } from '../../meta/buddy';
import { ensureFestival, festivalActive } from '../../meta/festivals';
import { RESIDENT_ACCS } from '../../meta/homeworld';
import { SPECIES_BY_ID } from '../../core/world';
import { critterCanvas, drawCreature } from '../art/critters';
import { enterGrownups } from './grownups';
import { SKINS } from '../../meta/tuning';
import { skinSwatch } from './shop';
import { effectiveReduceMotion } from '../motion';

type Tab = Slot | 'dye' | 'buddy' | 'atmosphere' | 'you';
let lastSlot: Tab = 'suit';

function avatarPanel(app: App, preview: Look, repaint: () => void): HTMLElement {
  const draft: AvatarParts = { ...app.p.avatar };
  preview.avatar = draft;
  const grid = (
    label: string,
    key: 'face' | 'skin' | 'hair' | 'hairColor' | 'eyes' | 'expression',
    names: readonly string[],
    colors?: readonly string[],
  ) =>
    h(
      'div',
      { class: 'avatar-group' },
      h('b', null, label),
      h(
        'div',
        { class: 'avatar-options' },
        ...names.map((name, i) => {
          const value = key === 'expression' ? EXPRESSIONS[i] : i;
          const button = h(
            'button',
            {
              class: `avatar-option${draft[key] === value ? ' on' : ''}`,
              'aria-label': colors ? (key === 'skin' ? t('Skin tone {n}', { n: i + 1 }) : t('Hair colour {n}', { n: i + 1 })) : t(name),
              onclick: () => {
                if (key === 'expression') draft.expression = EXPRESSIONS[i];
                else draft[key] = i;
                sfx.click();
                haptic.light();
                button.parentElement?.querySelectorAll('.avatar-option').forEach((el) => el.classList.remove('on'));
                button.classList.add('on');
                repaint();
              },
            },
            colors ? h('span', { class: 'avatar-swatch', style: `background:${colors[i]}` }) : t(name),
          );
          return button;
        }),
      ),
    );
  const groups = h(
    'div',
    { class: 'avatar-groups' },
    grid(t('Face'), 'face', FACE_NAMES),
    grid(t('Skin tone'), 'skin', SKIN_TONES, SKIN_TONES),
    grid(t('Hair'), 'hair', HAIR_NAMES),
    grid(t('Hair colour'), 'hairColor', HAIR_COLORS, HAIR_COLORS),
    grid(t('Eyes'), 'eyes', EYE_NAMES),
    grid(t('Expression'), 'expression', EXPRESSION_NAMES),
  );
  const refresh = () => {
    groups.querySelectorAll('.avatar-group').forEach((group, groupIndex) => {
      const key = (['face', 'skin', 'hair', 'hairColor', 'eyes', 'expression'] as const)[groupIndex];
      group
        .querySelectorAll('.avatar-option')
        .forEach((button, i) => button.classList.toggle('on', draft[key] === (key === 'expression' ? EXPRESSIONS[i] : i)));
    });
  };
  return h(
    'div',
    { class: 'avatar-panel' },
    h('p', { class: 'muted' }, t('Make your Keeper look like you imagine. Every part is yours to try.')),
    groups,
    h(
      'div',
      { class: 'avatar-actions' },
      btn(t('✨ Mix it up'), 'ghost', () => {
        draft.face = Math.floor(Math.random() * FACE_NAMES.length);
        draft.skin = Math.floor(Math.random() * SKIN_TONES.length);
        draft.hair = Math.floor(Math.random() * HAIR_NAMES.length);
        draft.hairColor = Math.floor(Math.random() * HAIR_COLORS.length);
        draft.eyes = Math.floor(Math.random() * EYE_NAMES.length);
        draft.expression = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];
        sfx.click();
        refresh();
        repaint();
      }),
      btn(t('Done'), 'primary', () => {
        app.p.avatar = { ...draft };
        app.save();
        sfx.click();
        haptic.success();
        showStyles(app, 'you');
      }),
    ),
  );
}

/** Animated stage: the Keeper flings a rock every couple of seconds. */
function stage(
  canvas: HTMLCanvasElement,
  getLook: () => Look,
  reduceMotion: boolean,
  mastered: (id: string) => boolean,
  emoting = false,
  buddy: { species: string; acc: string } | null = null,
  glow = '#6ec8ff',
) {
  const g = canvas.getContext('2d')!;
  let raf = 0;
  let stopped = false;
  const t0 = performance.now();
  const schedule = () => {
    if (!raf && !stopped && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const frame = (now: number) => {
    raf = 0;
    if (stopped || document.hidden) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
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
    g.shadowColor = glow === 'aurora' ? '#6ec8ff' : glow === 'cosmic' ? '#a879ff' : glow;
    g.shadowBlur = 24;
    g.fillStyle = pg;
    g.beginPath();
    g.arc(px, py, 30, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    if (buddy) {
      const hop = flying > 0.8 ? Math.abs(Math.sin(time * 9)) * hh * 0.08 : 0;
      drawCreature(g, buddy.species, w * 0.1, hh * 0.94 - hop, 0, Math.min(44, hh * 0.26), time + 0.7, buddy.acc);
    }
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
    if (!reduceMotion) schedule();
  };
  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else schedule();
  };
  document.addEventListener('visibilitychange', onVisible);
  schedule();
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    },
    repaint: () => {
      if (reduceMotion) {
        cancelAnimationFrame(raf);
        raf = 0;
        frame(performance.now());
      }
    },
  };
}

/** Buddy tab: pick a befriended creature and what it wears. */
function buddyPanel(app: App) {
  const p = app.p;
  const friends = buddyEligible(p);
  const pick = (species: string | null) => {
    if (!setBuddy(p, species)) return;
    sfx.click();
    haptic.light();
    app.save();
    showStyles(app, 'buddy');
  };
  const wear = (acc: string | null) => {
    if (!setBuddyAcc(p, acc)) return;
    sfx.click();
    haptic.light();
    app.save();
    showStyles(app, 'buddy');
  };
  const cur = p.buddy.species;
  return h(
    'div',
    { class: 'buddy-panel' },
    h(
      'p',
      { class: 'muted' },
      t('See a creature {n} times on your planets to befriend it. Your buddy cheers you on in every level.', { n: BUDDY_AT }),
    ),
    h(
      'div',
      { class: 'ws-grid' },
      h(
        'button',
        { class: `ws-item${cur ? '' : ' on'}`, onclick: () => pick(null) },
        h('div', { class: 'buddy-none' }, '✕'),
        h('b', null, t('No buddy')),
      ),
      ...friends.map((id) =>
        h(
          'button',
          { class: `ws-item${cur === id ? ' on' : ''}`, onclick: () => pick(id) },
          critterCanvas(id, 64, 0.4, p.buddy.acc ?? ''),
          h('b', null, t(SPECIES_BY_ID[id].name)),
        ),
      ),
    ),
    friends.length ? null : h('p', { class: 'muted' }, t('No friends yet — keep growing life on your planets!')),
    cur
      ? h(
          'div',
          null,
          h('div', { class: 'sec-title' }, t('Accessory')),
          h(
            'div',
            { class: 'acc-grid' },
            h(
              'button',
              { class: `acc${p.buddy.acc === null ? ' on' : ''}`, onclick: () => wear(null) },
              h('div', { class: 'buddy-none' }, '🎪'),
              h('small', null, t('Festival costume')),
            ),
            ...buddyAccs(p).map((a) =>
              h(
                'button',
                { class: `acc${p.buddy.acc === a ? ' on' : ''}`, onclick: () => wear(a) },
                critterCanvas(cur, 54, 0.4, a),
                h('small', null, t(RESIDENT_ACCS.find((x) => x.id === a)?.name ?? '')),
              ),
            ),
          ),
          h('p', { class: 'muted small' }, t('More accessories come from festivals and your Homeworld.')),
        )
      : null,
  );
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
          onclick: () => (applyDye(p, channel, null), app.save(), sfx.click(), showStyles(app, 'dye')),
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
              showStyles(app, 'dye');
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

function atmospherePanel(app: App, selected: string) {
  const p = app.p;
  return h(
    'div',
    { class: 'ws-grid' },
    ...SKINS.filter((x) => !p.settings.hidePaidLooks || (!x.starter && !x.pass)).map((x) => {
      const owned = p.skins.includes(x.id) || (x.starter && p.starter);
      return h(
        'button',
        {
          class: `ws-item${owned ? '' : ' locked'}${p.skin === x.id ? ' on' : ''}${selected === x.id ? ' sel' : ''}`,
          onclick: () => {
            if (owned) {
              p.skin = x.id;
              app.save();
            }
            showStyles(app, 'atmosphere', x.id);
          },
        },
        h('i', { class: 'atmosphere-swatch', style: `background:${skinSwatch(x.glow)}` }),
        h('b', null, t(x.name)),
        h('small', null, p.skin === x.id ? t('Equipped') : owned ? t('Equip') : t('Try on')),
      );
    }),
  );
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
              showStyles(app, slot);
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
              showStyles(app, slot);
            },
          },
          '💾',
        ),
      );
    }),
  );
}

export function showStyles(app: App, slot: Tab = lastSlot, tryOn?: string) {
  lastSlot = slot;
  const p = app.p;
  if (p.stylesNewSeen !== STYLES_RELEASE) {
    p.stylesNewSeen = STYLES_RELEASE;
    app.save();
  }
  document.documentElement.classList.remove('styles-new');
  const worn = currentLook(p);
  const preview: Look = { ...worn };
  if (tryOn && COSMETIC_BY_ID[tryOn]) preview[COSMETIC_BY_ID[tryOn].slot] = tryOn;
  const sel = tryOn ?? (slot === 'buddy' || slot === 'atmosphere' || slot === 'you' ? '' : worn[slot === 'dye' ? 'suit' : slot]);
  const item = COSMETIC_BY_ID[sel];
  const canvas = h('canvas', { class: 'ws-stage' }) as HTMLCanvasElement;
  let repaintPreview = () => {};

  let action: HTMLElement;
  if (!item) action = h('div');
  else if (worn[item.slot] === item.id) action = h('div', { class: 'ws-state' }, t('✓ Equipped'));
  else if (owns(p, item.id))
    action = btn(t('Equip'), 'primary', () => {
      equip(p, item.id);
      sfx.click();
      haptic.light();
      app.save();
      showStyles(app, slot);
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
      showStyles(app, slot);
    });
  else if (isPaidLook(item)) action = btn(t(tryOn ? 'Done' : 'Try on'), 'ghost', () => showStyles(app, slot, tryOn ? undefined : item.id));
  else if (item.source === 'road') action = h('div', { class: 'ws-state locked' }, sourceText(item));
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
    ...['you' as const, ...SLOTS, 'dye' as const, 'buddy' as const, 'atmosphere' as const].map((s) =>
      h(
        'button',
        { class: `tab${s === slot ? ' on' : ''}`, onclick: () => (sfx.click(), showStyles(app, s)) },
        s === 'you'
          ? t('You')
          : s === 'dye'
            ? t('Dye')
            : s === 'buddy'
              ? t('Buddy')
              : s === 'atmosphere'
                ? t('Atmosphere')
                : t(SLOT_NAMES[s]),
      ),
    ),
  );
  const grid =
    slot === 'you'
      ? avatarPanel(app, preview, () => repaintPreview())
      : slot === 'dye'
        ? dyePanel(app)
        : slot === 'buddy'
          ? buddyPanel(app)
          : slot === 'atmosphere'
            ? atmospherePanel(app, tryOn ?? p.skin)
            : h(
                'div',
                { class: 'ws-grid' },
                ...visibleCosmetics(p, slot).map((x) => {
                  const have = owns(p, x.id);
                  const on = worn[x.slot] === x.id;
                  return h(
                    'button',
                    {
                      class: `ws-item t-${x.tier}${have ? '' : ' locked'}${on ? ' on' : ''}${x.id === sel ? ' sel' : ''}`,
                      onclick: () => (sfx.click(), haptic.light(), showStyles(app, slot, x.id)),
                    },
                    itemCanvas(x.id, worn, 64),
                    h('b', null, t(x.name)),
                    h('small', null, on ? t('Equipped') : have ? t('Owned') : isPaidLook(x) ? t('Try on') : sourceText(x)),
                  );
                }),
              );
  const previewSkin = SKINS.find((x) => x.id === (slot === 'atmosphere' ? (tryOn ?? p.skin) : p.skin));
  const glow = previewSkin && (!p.settings.hidePaidLooks || (!previewSkin.starter && !previewSkin.pass)) ? previewSkin.glow : SKINS[0].glow;
  const stageView = stage(
    canvas,
    () => preview,
    effectiveReduceMotion(p),
    (id) => masteryLevel(p.mastery[id] ?? 0) >= MASTERY_STEPS.length,
    slot === 'emote',
    currentBuddy(p, festivalActive(p) ? ensureFestival(p).acc : undefined),
    glow,
  );
  repaintPreview = stageView.repaint;
  app.mount(
    h(
      'div',
      { class: 'screen page workshop' },
      app.topBar(),
      h(
        'div',
        { class: 'page-title' },
        t('Styles'),
        h('small', { class: 'muted' }, ` ${ownedCount(p)}/${COSMETICS.filter((x) => !isPaidLook(x)).length}`),
      ),
      h(
        'div',
        { class: 'ws-top' },
        canvas,
        h(
          'div',
          { class: 'ws-bar' },
          h(
            'div',
            { class: 'ws-name' },
            item
              ? t(item.name)
              : slot === 'you'
                ? t('Your Keeper')
                : slot === 'buddy' && p.buddy.species
                  ? t(SPECIES_BY_ID[p.buddy.species].name)
                  : '',
          ),
          action,
        ),
      ),
      h(
        'div',
        { class: 'scroll' },
        presetRow(app, slot),
        tabs,
        mastery,
        grid,
        item
          ? btn(p.favourites.includes(item.id) ? t('♥ Favourited') : t('♡ Favourite'), 'ghost wide', () => {
              toggleFavourite(p, item.id);
              app.save();
              showStyles(app, slot, tryOn);
            })
          : null,
        btn(t('Grown-ups'), 'ghost small grownups-link', () => void enterGrownups(app)),
      ),
    ),
    'styles',
    stageView.stop,
  );
}
