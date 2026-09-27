// Procedural planet renderer: smooth terrain, water, props, clouds and lighting.
import { BIOMES, SECTORS, type Planet, type Sector } from '../../core/world';
import { drawProps } from './props';
import { shade } from './color';

type G = CanvasRenderingContext2D;

/** Surface radius factor for a sector (1 = planet radius). Shared with hit tests. */
export function surfaceK(s: Sector) {
  const top = BIOMES[s.biome].sea ? Math.max(s.land, s.water) : s.land;
  return 0.92 + top * 0.035;
}

export interface PlanetView {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  time: number;
  /** Atmosphere color ('aurora' / 'cosmic' animate). */
  glow: string;
  /** 0..1: how alive the planet is (brightens the atmosphere). */
  lifeK: number;
  /** Per-sector white flash 0..1. */
  flash?: (i: number) => number;
  /** Draw a creature standing at a sector. */
  creature?: (g: G, i: number, x: number, y: number, angle: number) => void;
  /** Skip props (tiny thumbnails). */
  simple?: boolean;
  clouds?: boolean;
}

const STEP = (Math.PI * 2) / SECTORS;

function glowColor(glow: string, t: number) {
  if (glow === 'aurora') return `hsl(${(t * 40) % 360} 90% 65%)`;
  if (glow === 'cosmic') return `hsl(${265 + Math.sin(t * 1.5) * 45} 95% 68%)`;
  return glow;
}

/** Smoothed surface radius at an absolute angle. */
function radiusAt(p: Planet, R: number, rot: number, ang: number) {
  let u = (ang - rot) / STEP - 0.5;
  u = ((u % SECTORS) + SECTORS) % SECTORS;
  const i0 = Math.floor(u);
  const f = u - i0;
  const a = surfaceK(p.sectors[i0 % SECTORS]);
  const b = surfaceK(p.sectors[(i0 + 1) % SECTORS]);
  // ease so plateaus stay flat-ish and steps become slopes
  const s = f < 0.3 ? 0 : f > 0.7 ? 1 : (1 - Math.cos(((f - 0.3) / 0.4) * Math.PI)) / 2;
  return R * (a + (b - a) * s);
}

export function renderPlanet(g: G, p: Planet, v: PlanetView) {
  const { cx, cy, R, rot, time } = v;
  const glow = glowColor(v.glow, time);
  // atmosphere halo
  const atm = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * (1.5 + v.lifeK * 0.25));
  atm.addColorStop(0, glow);
  atm.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.globalAlpha = 0.28 + v.lifeK * 0.35;
  g.fillStyle = atm;
  g.beginPath();
  g.arc(cx, cy, R * 1.8, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // terrain outline
  const N = SECTORS * 6;
  const surf = new Path2D();
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    const r = radiusAt(p, R, rot, a);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (k === 0) surf.moveTo(x, y);
    else surf.lineTo(x, y);
  }
  surf.closePath();

  g.save();
  g.clip(surf);
  // biome wedges
  for (let i = 0; i < SECTORS; i++) {
    const s = p.sectors[i];
    const B = BIOMES[s.biome];
    const a0 = rot + i * STEP;
    g.fillStyle = B.color;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R * 1.3, a0 - 0.01, a0 + STEP + 0.01);
    g.closePath();
    g.fill();
    if (B.sea) {
      // lighter shallows near the surface
      const r = R * surfaceK(s);
      g.fillStyle = shade(B.color, 0.25);
      g.beginPath();
      g.arc(cx, cy, r, a0 - 0.01, a0 + STEP + 0.01);
      g.arc(cx, cy, r - R * 0.05, a0 + STEP + 0.01, a0 - 0.01, true);
      g.closePath();
      g.fill();
    }
    const f = v.flash?.(i) ?? 0;
    if (f > 0) {
      g.globalAlpha = Math.min(1, f);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, R * 1.3, a0, a0 + STEP);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }
  }
  // soil and rocky core
  const soil = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.8);
  soil.addColorStop(0, '#3a2440');
  soil.addColorStop(0.7, '#6a4a5c');
  soil.addColorStop(0.86, 'rgba(120,86,100,0.75)');
  soil.addColorStop(1, 'rgba(120,86,100,0)');
  g.fillStyle = soil;
  g.beginPath();
  g.arc(cx, cy, R * 0.8, 0, Math.PI * 2);
  g.fill();
  // strata lines
  g.strokeStyle = 'rgba(255,220,200,0.07)';
  g.lineWidth = Math.max(1, R * 0.015);
  for (const k of [0.36, 0.5, 0.62]) {
    g.beginPath();
    g.arc(cx, cy, R * k, rot * 0.5, rot * 0.5 + Math.PI * 1.6);
    g.stroke();
  }
  // glowing core
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
  core.addColorStop(0, 'rgba(255,170,90,0.55)');
  core.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = core;
  g.beginPath();
  g.arc(cx, cy, R * 0.3, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // grassy / sandy lip along the surface
  g.lineWidth = Math.max(1.5, R * 0.03);
  g.lineJoin = 'round';
  for (let i = 0; i < SECTORS; i++) {
    const B = BIOMES[p.sectors[i].biome];
    g.strokeStyle = shade(B.color, B.sea ? 0.5 : 0.28);
    g.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = rot + (i + k / 6) * STEP;
      const r = radiusAt(p, R, rot, a) - g.lineWidth / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  // props and creatures
  if (!v.simple) {
    const s = R * 0.085;
    for (let i = 0; i < SECTORS; i++) {
      const sec = p.sectors[i];
      const a = rot + (i + 0.5) * STEP;
      const r = radiusAt(p, R, rot, a);
      g.save();
      g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.rotate(a + Math.PI / 2);
      drawProps(g, sec.biome, s, i * 13.7 + sec.land * 3 + sec.water, time);
      g.restore();
    }
  }

  // day/night shading and rim light
  const shadeG = g.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.15, cx, cy, R * 1.3);
  shadeG.addColorStop(0, 'rgba(255,255,255,0.16)');
  shadeG.addColorStop(0.5, 'rgba(255,255,255,0)');
  shadeG.addColorStop(1, 'rgba(8,4,30,0.5)');
  g.fillStyle = shadeG;
  g.beginPath();
  g.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = Math.max(1, R * 0.02);
  g.beginPath();
  g.arc(cx, cy, R * 1.14, Math.PI * 1.05, Math.PI * 1.55);
  g.stroke();

  // creatures are drawn after shading so they stay bright and readable
  if (v.creature) {
    for (let i = 0; i < SECTORS; i++) {
      if (!p.sectors[i].species) continue;
      const a = rot + (i + 0.5) * STEP;
      const r = radiusAt(p, R, rot, a);
      v.creature(g, i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a);
    }
  }

  // drifting clouds
  if (v.clouds !== false && !v.simple) {
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {
      const a = rot * 0.4 + time * 0.07 + k * 1.7;
      const d = R * (1.24 + (k % 2) * 0.06);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 2);
      g.globalAlpha = 0.75 + 0.15 * Math.sin(time + k);
      for (const [dx, dy, rr] of [
        [-0.09, 0, 0.05],
        [0, -0.025, 0.065],
        [0.09, 0, 0.045],
      ]) {
        g.beginPath();
        g.arc(dx * R, dy * R, rr * R, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }
}
