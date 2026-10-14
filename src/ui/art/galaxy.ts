import { SPECIES_BY_ID } from '../../core/world';
import type { GalaxyPlanet } from '../../meta/profile';
import type { Look } from '../../meta/cosmetics';
import { drawCreature } from './critters';
import { drawKeeper } from './keeper';

const rnd = (i: number) => (((Math.sin(i * 91.7) * 43758.5) % 1) + 1) % 1;
const TAU = Math.PI * 2;

export interface GalaxyView {
  stop: () => void;
  pos: (n: number) => { x: number; y: number } | null;
}

export function drawGalaxy(
  c: HTMLCanvasElement,
  planets: GalaxyPlanet[],
  opts: { reduceMotion?: boolean; onTap?: (g: GalaxyPlanet) => void; look?: Look } = {},
): GalaxyView {
  const g = c.getContext('2d');
  if (!g) return { stop: () => {}, pos: () => null };
  let dpr = 0;
  const shown = planets.slice(-12);
  const fallbackColors = shown.map((pl) => `hsl(${pl.hue} 60% 55%)`);
  const positions = new Map<number, { x: number; y: number; r: number }>();
  for (const planet of shown) positions.set(planet.n, { x: 0, y: 0, r: 0 });
  const stars = Array.from({ length: 48 }, (_, i) => ({
    x: rnd(i),
    y: rnd(i + 100),
    phase: rnd(i + 200) * TAU,
    size: rnd(i + 300) < 0.15 ? 2 : 1.2,
  }));
  const shade = g.createRadialGradient(-0.3, -0.3, 0.1, 0, 0, 1);
  shade.addColorStop(0, 'rgba(255,255,255,.35)');
  shade.addColorStop(1, 'rgba(0,0,30,.45)');
  let corona: CanvasGradient | null = null;
  let w = 0;
  let height = 0;
  let raf = 0;
  let stopped = false;
  const born = performance.now();
  const keeperPose = { cheer: 0 };

  const schedule = () => {
    if (!raf && !stopped && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const draw = (now: number) => {
    raf = 0;
    if (stopped || document.hidden) return;
    // screen transitions can insert the canvas a frame or two later: wait for it rather than stopping
    if (!c.isConnected || !c.clientWidth) {
      schedule();
      return;
    }
    const width = c.clientWidth;
    const h = c.clientHeight;
    const nextDpr = Math.min(2, devicePixelRatio || 1);
    if (width !== w || h !== height || nextDpr !== dpr) {
      w = width;
      height = h;
      dpr = nextDpr;
      c.width = Math.round(w * dpr);
      c.height = Math.round(height * dpr);
      corona = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 44);
      corona.addColorStop(0, '#fff6c2');
      corona.addColorStop(0.35, '#ffc34a');
      corona.addColorStop(1, 'rgba(255,140,40,0)');
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, height);
    const cx = w / 2;
    const cy = height / 2;
    const elapsed = (now - born) / 1000;
    const t = opts.reduceMotion ? 0 : elapsed;
    for (const star of stars) {
      g.globalAlpha = opts.reduceMotion ? 0.42 : 0.25 + 0.4 * Math.abs(Math.sin(t + star.phase));
      g.fillStyle = '#fff';
      g.fillRect(star.x * w, star.y * height, star.size, star.size);
    }
    g.globalAlpha = 1;
    if (corona) {
      g.save();
      g.translate(cx, cy);
      const pulse = opts.reduceMotion ? 1 : 1 + Math.sin(t * 1.6) * 0.04;
      g.scale(pulse, pulse);
      g.translate(-cx, -cy);
      g.fillStyle = corona;
      g.fillRect(cx - 44, cy - 44, 88, 88);
      g.restore();
    }
    g.fillStyle = '#ffe79a';
    g.beginPath();
    g.arc(cx, cy, 13, 0, TAU);
    g.fill();
    const maxR = Math.max(48, Math.min(w, height / 0.62) / 2 - 20);
    for (let i = 0; i < shown.length; i++) {
      const pl = shown[i];
      const orbit = 46 + ((maxR - 46) * (i + 1)) / Math.max(shown.length, 4);
      g.strokeStyle = 'rgba(255,255,255,.08)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx, cy, orbit, orbit * 0.62, 0, 0, TAU);
      g.stroke();
      const a = t * (0.35 / (1 + i * 0.35)) + rnd(pl.n) * TAU;
      const x = cx + Math.cos(a) * orbit;
      const y = cy + Math.sin(a) * orbit * 0.62;
      const size = 9 + Math.min(8, pl.species.length);
      const pos = positions.get(pl.n)!;
      pos.x = x;
      pos.y = y;
      pos.r = size;
      const colors = pl.colors;
      const fallback = fallbackColors[i];
      g.globalAlpha = 0.3;
      g.fillStyle = colors?.[0] ?? fallback;
      g.beginPath();
      g.arc(x, y, size * 1.4, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      const count = colors?.length || 1;
      const spin = opts.reduceMotion ? 0 : t * 0.55 + i;
      for (let k = 0; k < count; k++) {
        g.fillStyle = colors?.[k] ?? fallback;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, size, spin + (k / count) * TAU, spin + ((k + 1) / count) * TAU);
        g.fill();
      }
      g.save();
      g.translate(x, y);
      g.scale(size, size);
      g.fillStyle = shade;
      g.beginPath();
      g.arc(0, 0, 1, 0, TAU);
      g.fill();
      g.restore();
      const species = pl.species[0] ? SPECIES_BY_ID[pl.species[0]] : null;
      const peek = opts.reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.7 + i * 2.2));
      if (species && (peek > 0.68 || opts.reduceMotion)) {
        drawCreature(g, species.id, x, y - size + 3 - peek * 5, 0, size * 0.9, t + i);
      }
    }
    if (opts.look) {
      const wave = opts.reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.8));
      keeperPose.cheer = wave * 0.45;
      drawKeeper(g, opts.look, Math.max(38, w - 37), height - 5, 56, t, keeperPose);
    }
    // One quiet surprise every 30 seconds; nothing covers a round.
    if (!opts.reduceMotion) {
      const phase = elapsed % 30;
      if (elapsed >= 30 && phase < 1.2) {
        g.strokeStyle = `rgba(200,235,255,${(1 - phase / 1.2) * 0.7})`;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(w + 45 - phase * (w + 80), 12 + phase * 24);
        g.lineTo(w + 12 - phase * (w + 80), 26 + phase * 24);
        g.stroke();
      }
      schedule();
    }
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
    c.addEventListener('click', (event) => {
      const rect = c.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let best: GalaxyPlanet | null = null;
      let distance = 30;
      for (const pl of shown) {
        const p = positions.get(pl.n)!;
        const d = Math.hypot(p.x - x, p.y - y) - p.r;
        if (d < distance) {
          best = pl;
          distance = d;
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
