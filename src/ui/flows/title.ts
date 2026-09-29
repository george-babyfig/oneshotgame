import { makeLevel } from '../../core/levels';
import { currentLook } from '../../meta/cosmetics';
import { t } from '../../i18n';
import { drawKeeper } from '../art/keeper';
import { renderPlanet } from '../art/planet';
import { h, btn } from '../dom';
import type { App } from '../app';

/** A short first-launch scene; the tap works as soon as it appears. */
export function titleBeat(app: App, start: () => void) {
  const canvas = h('canvas', { class: 'title-scene', 'aria-hidden': 'true' });
  canvas.width = 360;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const planet = makeLevel(1).start;
  const look = currentLook(app.p);
  const still = app.p.settings.reduceMotion;
  const began = performance.now();
  let frame = 0;
  let timer = 0;
  let done = false;
  const paint = (now: number) => {
    if (!ctx) return;
    const k = still ? 1 : Math.min(1, (now - began) / 1000);
    ctx.clearRect(0, 0, 360, 320);
    renderPlanet(ctx, planet, { cx: 180, cy: 213, R: 83, rot: 0, time: 0, glow: '#70b9ff', lifeK: 0, simple: true });
    if (still || k > 0.55) {
      ctx.save();
      ctx.globalAlpha = still ? 1 : Math.min(1, (k - 0.55) * 4);
      drawKeeper(ctx, look, 180, 131 - (1 - k) * 120, 70, still ? 0 : now / 1000, { cheer: k });
      ctx.restore();
    }
    if (!still && !done) frame = requestAnimationFrame(paint);
  };
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    start();
  };
  const scene = h(
    'div',
    { class: 'screen first-title', onclick: finish },
    h('h1', null, t('Pocket Planet')),
    canvas,
    h('p', { class: 'first-purpose' }, t('Grow lands · Welcome creatures · Build your Homeworld')),
    btn(t('Tap to start'), 'primary wide', finish),
  );
  app.mount(scene, 'title', () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
  });
  paint(performance.now());
  timer = window.setTimeout(finish, 4500);
}
