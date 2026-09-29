// Animated galaxy on the home screen: your finished planets orbit a sun.
import { SPECIES_BY_ID } from '../../core/world';
import { drawCreature } from '../art/critters';
import type { GalaxyPlanet } from '../../meta/profile';

const rnd = (i: number) => (((Math.sin(i * 91.7) * 43758.5) % 1) + 1) % 1;

export interface GalaxyView {
  stop: () => void;
  /** Canvas-space position of a planet (for fly-out effects). */
  pos: (n: number) => { x: number; y: number } | null;
}

export function drawGalaxy(
  c: HTMLCanvasElement,
  planets: GalaxyPlanet[],
  opts: { reduceMotion?: boolean; onTap?: (g: GalaxyPlanet) => void } = {},
): GalaxyView {
  const g = c.getContext('2d')!;
  let dpr = 0;
  const shown = planets.slice(-12);
  const positions = new Map<number, { x: number; y: number; r: number }>();
  let raf = 0;
  let stopped = false;
  const speed = opts.reduceMotion ? 0 : 1;
  const schedule = () => {
    if (!raf && !stopped && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const draw = (now: number) => {
    raf = 0;
    if (stopped || document.hidden) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width;
    const H = r.height;
    const cx = w / 2;
    const cy = H / 2;
    const t = (now / 1000) * speed;
    g.clearRect(0, 0, w, H);
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t + i));
      g.fillStyle = '#fff';
      const s = rnd(i + 300) < 0.15 ? 2 : 1.2;
      g.fillRect(rnd(i) * w, rnd(i + 100) * H, s, s);
    }
    g.globalAlpha = 1;
    // sun with corona
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    const sun = g.createRadialGradient(cx, cy, 2, cx, cy, 44 * pulse);
    sun.addColorStop(0, '#fff6c2');
    sun.addColorStop(0.35, '#ffc34a');
    sun.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = sun;
    g.beginPath();
    g.arc(cx, cy, 44 * pulse, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffe79a';
    g.beginPath();
    g.arc(cx, cy, 13, 0, Math.PI * 2);
    g.fill();
    const maxR = Math.min(w, H / 0.62) / 2 - 20;
    shown.forEach((pl, i) => {
      const orbit = 46 + ((maxR - 46) * (i + 1)) / Math.max(shown.length, 4);
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx, cy, orbit, orbit * 0.62, 0, 0, Math.PI * 2);
      g.stroke();
      const a = t * (0.35 / (1 + i * 0.35)) + rnd(pl.n) * 6.28;
      const x = cx + Math.cos(a) * orbit;
      const y = cy + Math.sin(a) * orbit * 0.62;
      const size = 9 + Math.min(8, pl.species.length);
      positions.set(pl.n, { x, y, r: size });
      const cols = pl.colors?.length ? pl.colors : [`hsl(${pl.hue} 60% 55%)`];
      const spin = t * 0.6 + i;
      // glow
      g.globalAlpha = 0.35;
      g.fillStyle = cols[0];
      g.beginPath();
      g.arc(x, y, size * 1.5, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      cols.forEach((col, k) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, size, spin + (k / cols.length) * Math.PI * 2, spin + ((k + 1) / cols.length) * Math.PI * 2);
        g.fill();
      });
      const pg = g.createRadialGradient(x - size / 3, y - size / 3, 1, x, y, size);
      pg.addColorStop(0, 'rgba(255,255,255,0.35)');
      pg.addColorStop(1, 'rgba(0,0,30,0.45)');
      g.fillStyle = pg;
      g.beginPath();
      g.arc(x, y, size, 0, Math.PI * 2);
      g.fill();
      const sp = pl.species[0] ? SPECIES_BY_ID[pl.species[0]] : null;
      if (sp) {
        drawCreature(g, sp.id, x, y - size + 1 + Math.sin(t * 3 + i) * 1.2, 0, size * 1.05, t + i);
      }
    });
    if (!opts.reduceMotion) schedule();
  };
  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else schedule();
  };
  document.addEventListener('visibilitychange', onVisible);
  schedule();
  if (opts.onTap) {
    c.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      let best: GalaxyPlanet | null = null;
      let bd = 30;
      for (const pl of shown) {
        const p = positions.get(pl.n);
        if (!p) continue;
        const d = Math.hypot(p.x - x, p.y - y) - p.r;
        if (d < bd) {
          bd = d;
          best = pl;
        }
      }
      if (best) opts.onTap!(best);
    });
  }
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    },
    pos: (n) => positions.get(n) ?? null,
  };
}
