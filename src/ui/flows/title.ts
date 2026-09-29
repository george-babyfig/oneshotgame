import { makeLevel } from '../../core/levels';
import { currentLook } from '../../meta/cosmetics';
import { t } from '../../i18n';
import { drawKeeper } from '../art/keeper';
import { renderPlanet } from '../art/planet';
import { h, btn } from '../dom';
import type { App } from '../app';
import { effectiveReduceMotion } from '../motion';

/** A short first-launch scene; the tap works as soon as it appears. */
export function titleBeat(app: App, start: () => void) {
  const canvas = h('canvas', { class: 'title-scene', 'aria-hidden': 'true' });
  canvas.width = 440;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  const planet = makeLevel(1).start;
  const look = currentLook(app.p);
  const still = effectiveReduceMotion(app.p);
  const began = performance.now();
  let frame = 0;
  let timer = 0;
  let done = false;
  const schedule = () => {
    if (!frame && !done && !document.hidden) frame = requestAnimationFrame(paint);
  };
  const paint = (now: number) => {
    frame = 0;
    if (done || document.hidden) return;
    if (!ctx) return;
    const k = still ? 1 : Math.min(1, (now - began) / 1250);
    ctx.clearRect(0, 0, 440, 420);
    renderPlanet(ctx, planet, { cx: 220, cy: 230, R: 83, rot: 0, time: 0, glow: '#70b9ff', lifeK: 0, simple: true });
    if (still || k > 0.3) {
      ctx.save();
      ctx.globalAlpha = still ? 1 : Math.min(1, (k - 0.3) * 5);
      const land = Math.min(1, Math.max(0, (k - 0.3) / 0.55));
      drawKeeper(ctx, look, 220, 157 - (1 - land) * 135, 70, still ? 0 : now / 1000, { cheer: k });
      ctx.restore();
    }
    if (!still && k > 0.8) {
      const puff = Math.min(1, (k - 0.8) * 5);
      ctx.fillStyle = `rgba(195,220,255,${(1 - puff) * 0.45})`;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(220 + (i - 2) * (8 + puff * 10), 159 + Math.abs(i - 2) * 2 - puff * 8, 3 + puff * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!still) schedule();
  };
  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  document.addEventListener('visibilitychange', onVisible);
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVisible);
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
    document.removeEventListener('visibilitychange', onVisible);
  });
  paint(performance.now());
  timer = window.setTimeout(finish, 3800);
}
