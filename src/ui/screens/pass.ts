// Cosmic Pass: hero art, what's included, and what's already waiting for you.
import { h, btn } from '../dom';
import { sfx } from '../audio';
import { totalStars } from '../../meta/profile';
import { STAR_ROAD, PASS_GEMS } from '../../meta/progression';
import { COSMETICS, DEFAULT_LOOK, type Look } from '../../meta/cosmetics';
import { drawKeeper, drawLauncher, drawTrail, itemCanvas } from '../art/keeper';
import type { App } from '../app';
import { t } from '../../i18n';

export const CAPTAIN_LOOK: Look = { suit: 'suit_star', hat: 'hat_halo', launcher: 'l_orbit', trail: 'tr_cosmic', emote: 'em_cheer' };

/** Animated hero banner: the Keeper in the Star Captain set on a golden ticket. */
function hero(canvas: HTMLCanvasElement, reduceMotion: boolean) {
  const g = canvas.getContext('2d')!;
  let raf = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = reduceMotion ? 0.4 : (now - t0) / 1000;
    // nebula
    const bg = g.createLinearGradient(0, 0, w, hh);
    bg.addColorStop(0, '#2a1a6e');
    bg.addColorStop(0.55, '#140e3e');
    bg.addColorStop(1, '#3a1050');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, hh);
    for (const [x, y, r, c] of [
      [0.2, 0.3, 0.5, 'rgba(255,77,225,0.22)'],
      [0.8, 0.7, 0.55, 'rgba(77,195,255,0.2)'],
      [0.6, 0.15, 0.35, 'rgba(255,210,74,0.15)'],
    ] as [number, number, number, string][]) {
      const gl = g.createRadialGradient(x * w, y * hh, 0, x * w, y * hh, r * w);
      gl.addColorStop(0, c);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl;
      g.fillRect(0, 0, w, hh);
    }
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 60; i++) {
      g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * (0.5 + rnd()) + i));
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(rnd() * w, rnd() * hh, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // comet tail sweeping across
    const pts = Array.from({ length: 20 }, (_, k) => {
      const u = ((time * 0.35 + k * 0.012) % 1.4) - 0.2;
      return { x: u * w, y: hh * 0.25 + Math.sin(u * 3) * hh * 0.08 };
    });
    drawTrail(g, 'tr_cosmic', pts, time, '#fff');
    // the Keeper on its Golden Orbit
    drawLauncher(g, 'l_orbit', w * 0.72, hh * 0.64, time, { x: 0, y: 6 }, '#ffd24a', true);
    drawKeeper(g, CAPTAIN_LOOK, w * 0.3, hh * 0.93, hh * 0.62, time, { cheer: 0.5 + Math.sin(time * 2) * 0.5 });
    // golden frame + sheen
    g.strokeStyle = '#ffd24a';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(2, 2, w - 4, hh - 4, 22);
    g.stroke();
    const sx = ((time * 0.25) % 1.6) * w * 1.4 - w * 0.4;
    const sh = g.createLinearGradient(sx - 60, 0, sx + 60, hh);
    sh.addColorStop(0, 'rgba(255,240,180,0)');
    sh.addColorStop(0.5, 'rgba(255,240,180,0.18)');
    sh.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, w, hh);
    if (!reduceMotion) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/** Pass-lane rewards already reached but not yet claimable (you don't own the pass). */
export function passWaiting(stars: number) {
  return STAR_ROAD.filter((tier) => stars >= tier.stars).length;
}

export function showPass(app: App) {
  const p = app.p;
  const stars = totalStars(p);
  const canvas = h('canvas', { class: 'pass-hero' }) as HTMLCanvasElement;
  const waiting = passWaiting(stars);
  const set = COSMETICS.filter((x) => x.source === 'pass');
  const rows: [string, string][] = [
    ['🧑‍🚀', t('The Star Captain set: suit, Halo Ring, Golden Orbit launcher and Comet Tail trail')],
    ['💎', t('{n} gems along the golden lane', { n: PASS_GEMS.toLocaleString() })],
    ['🌌', t('The Cosmic atmosphere for every planet you finish')],
    ['🪪', t('A gold Planet Passport and the Star Captain title')],
    ['🏗️', t('A third build drone on your Homeworld')],
    ['♾️', t('Yours forever — one purchase, no subscription')],
  ];
  const el = h(
    'div',
    { class: 'screen page pass-screen' },
    app.topBar(true),
    h(
      'div',
      { class: 'scroll' },
      h(
        'div',
        { class: 'pass-top' },
        canvas,
        h('div', { class: 'pass-logo' }, h('small', null, t('POCKET PLANET')), h('b', null, t('Cosmic Pass'))),
      ),
      p.pass
        ? h('div', { class: 'pass-owned' }, t('🌌 Cosmic Pass active — you get both lanes!'))
        : waiting
          ? h('div', { class: 'pass-waiting' }, t('🎁 {n} golden rewards are already waiting for you on the Star Road', { n: waiting }))
          : null,
      h(
        'div',
        { class: 'pass-set' },
        ...set.map((x) => h('div', { class: 'pass-item' }, itemCanvas(x.id, DEFAULT_LOOK, 62), h('small', null, t(x.name)))),
      ),
      h('div', { class: 'pass-rows' }, ...rows.map(([i, s]) => h('div', { class: 'pass-row' }, h('span', null, i), h('p', null, s)))),
      p.pass
        ? btn(t('Open the Star Road'), 'primary wide', () => app.showRoad())
        : btn(app.priceOf('pass'), 'buy-real wide big', () => (sfx.click(), app.buy('pass'))),
      p.pass ? null : btn(t('See every reward'), 'ghost wide', () => app.showRoad()),
      h('p', { class: 'muted tiny' }, t('Everything in the pass is shown here. No random rewards.')),
    ),
  );
  const stop = hero(canvas, p.settings.reduceMotion);
  app.mount(el, 'pass', stop);
}
