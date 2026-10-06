// Star Atlas: restore constellations with Essences from your planets.
import { h, btn, modal, toast } from '../dom';
import { LAB_TEXT } from '../../meta/labcopy';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import {
  CONSTELLATIONS,
  MATS,
  MAT_EMOJI,
  MAT_NAMES,
  bundleDone,
  canFill,
  constellationFull,
  fillBundle,
  lightConstellation,
  unlockedConstellation,
  type Constellation,
  type Mat,
} from '../../meta/constellations';
import { rewardText } from '../../meta/progression';
import { COSMETIC_BY_ID, currentLook } from '../../meta/cosmetics';
import { itemCanvas } from '../art/keeper';
import type { App } from '../app';
import { t } from '../../i18n';
import { landmarkState } from '../../meta/landmarks';

/** Draw a constellation's stars and lines; lit stars = filled bundles. */
export function drawConstellation(
  g: CanvasRenderingContext2D,
  c: Constellation,
  x: number,
  y: number,
  w: number,
  hh: number,
  lit: number,
  time: number,
  done: boolean,
) {
  const pos = c.stars.map(([u, v]) => [x + u * w, y + v * hh] as [number, number]);
  g.save();
  g.lineWidth = 2;
  for (const [a, b] of c.lines) {
    const on = done || (a < lit && b < lit);
    g.strokeStyle = on ? 'rgba(255,230,150,0.8)' : 'rgba(255,255,255,0.14)';
    g.setLineDash(on ? [] : [4, 6]);
    g.beginPath();
    g.moveTo(...pos[a]);
    g.lineTo(...pos[b]);
    g.stroke();
  }
  g.setLineDash([]);
  pos.forEach(([px, py], i) => {
    const on = done || i < lit;
    const r = on ? 4 + Math.sin(time * 3 + i) * 1 : 3;
    if (on) {
      const gl = g.createRadialGradient(px, py, 0, px, py, 14);
      gl.addColorStop(0, 'rgba(255,230,150,0.8)');
      gl.addColorStop(1, 'rgba(255,230,150,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(px, py, 14, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = on ? '#fff6c8' : 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  });
  g.restore();
}

/** Stars lit so far: spread the filled bundles across the constellation's stars. */
function litStars(app: App, c: Constellation) {
  const done = c.bundles.filter((b) => bundleDone(app.p, b.id)).length;
  return Math.round((done / c.bundles.length) * c.stars.length);
}

function starCanvas(app: App, c: Constellation, done: boolean) {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = 120;
  const H = 80;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  drawConstellation(g, c, 8, 6, W - 16, H - 12, litStars(app, c), 0.5, done);
  return cv;
}

export function showSky(app: App) {
  const p = app.p;
  const look = currentLook(p);
  const cards = CONSTELLATIONS.flatMap((c, i) => {
    if (c.id === 'kite' && landmarkState(p, 'skyglass').stage < 4) return [];
    const open = unlockedConstellation(p, i);
    const lit = p.constellations.includes(c.id);
    const full = constellationFull(p, c);
    const item = c.reward.item && COSMETIC_BY_ID[c.reward.item] ? c.reward.item : null;
    return [
      h(
        'div',
        { class: `const-card${lit ? ' lit' : ''}${open ? '' : ' locked'}` },
        h(
          'div',
          { class: 'const-head' },
          starCanvas(app, c, lit),
          h(
            'div',
            { class: 'grow' },
            h('b', null, t(c.name)),
            h(
              'small',
              null,
              lit
                ? t('✦ Shining in your sky')
                : open
                  ? t('{n}/{m} bundles', { n: c.bundles.filter((b) => bundleDone(p, b.id)).length, m: c.bundles.length })
                  : t('Restore the one before first'),
            ),
            h('div', { class: 'const-reward' }, item ? itemCanvas(item, look, 30) : null, h('span', null, rewardText(c.reward).join('  '))),
          ),
        ),
        open && !lit
          ? h(
              'div',
              { class: 'bundles' },
              ...c.bundles.map((b) => {
                const done = bundleDone(p, b.id);
                const can = canFill(p, b);
                return h(
                  'div',
                  { class: `bundle${done ? ' done' : ''}` },
                  h(
                    'div',
                    { class: 'need' },
                    ...Object.entries(b.need).map(([m, n]) =>
                      h(
                        'span',
                        { class: (p.mats[m as Mat] ?? 0) >= (n ?? 0) || done ? 'ok' : '' },
                        `${MAT_EMOJI[m as Mat]} ${done ? '' : `${p.mats[m as Mat] ?? 0}/`}${n}`,
                      ),
                    ),
                  ),
                  done
                    ? h('b', { class: 'tick' }, '✓')
                    : btn(t('Fill'), can ? 'primary small' : 'ghost small dim', () => {
                        if (!fillBundle(p, c.id, b.id)) return toast(t(LAB_TEXT.atlasNeed));
                        sfx.chest();
                        haptic.success();
                        app.save();
                        showSky(app);
                      }),
                );
              }),
              full
                ? btn(t('✨ Light up {name}', { name: t(c.name) }), 'gem wide', () => {
                    const r = lightConstellation(p, c.id);
                    if (!r) return;
                    sfx.levelUp();
                    haptic.success();
                    app.save();
                    showSky(app);
                    const m = modal([
                      h('div', { class: 'm-title' }, t('{name} shines again!', { name: t(c.name) })),
                      item ? h('div', { class: 'pe-av' }, itemCanvas(item, look, 96)) : null,
                      h('div', { class: 'reward-list' }, ...rewardText(r).map((x) => h('span', null, x))),
                      btn(t('Nice!'), 'primary wide', () => m.close()),
                    ]);
                  })
                : null,
            )
          : null,
      ),
    ];
  });
  const bag = h(
    'div',
    { class: 'mats' },
    ...MATS.map((m) =>
      h('span', { title: t(MAT_NAMES[m]) }, h('b', null, `${MAT_EMOJI[m]} ${p.mats[m] ?? 0}`), h('small', null, t(MAT_NAMES[m]))),
    ),
  );
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Star Atlas')),
      h('div', { class: 'scroll' }, h('p', { class: 'muted' }, t(LAB_TEXT.atlasIntro)), bag, ...cards),
    ),
    'sky',
  );
}
