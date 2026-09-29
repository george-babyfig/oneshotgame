// Procedural planet renderer: smooth terrain, water, props, clouds and lighting.
import { BIOMES, SECTORS, type Planet, type Sector } from '../../core/world';
import { landColor, type PlanetPalette } from '../../core/palette';
import { drawCachedProps } from './props';
import { shade } from './color';

type G = CanvasRenderingContext2D;

let activePalette: PlanetPalette = 'classic';
export function setPlanetPalette(palette: PlanetPalette): void {
  activePalette = palette;
}

const fullScreenFlashes: number[] = [];
/** Shared gate for any full-screen flash effect: at most three in one second. */
export function allowFullScreenFlash(now = performance.now()): boolean {
  while (fullScreenFlashes.length && now - fullScreenFlashes[0] >= 1000) fullScreenFlashes.shift();
  if (fullScreenFlashes.length >= 3) return false;
  fullScreenFlashes.push(now);
  return true;
}

type Marker = 'waves' | 'dots' | 'peaks' | 'lines' | 'rings' | 'rays';
const LAND_MARKERS: Record<Sector['biome'], { shape: Marker; count: number }> = {
  barren: { shape: 'lines', count: 1 },
  ocean: { shape: 'waves', count: 1 },
  reef: { shape: 'waves', count: 2 },
  icesheet: { shape: 'rays', count: 1 },
  springs: { shape: 'rings', count: 2 },
  meadow: { shape: 'dots', count: 2 },
  forest: { shape: 'peaks', count: 1 },
  jungle: { shape: 'peaks', count: 2 },
  mountain: { shape: 'peaks', count: 3 },
  highland: { shape: 'lines', count: 2 },
  desert: { shape: 'dots', count: 1 },
  savanna: { shape: 'lines', count: 3 },
  tundra: { shape: 'rays', count: 2 },
  taiga: { shape: 'rays', count: 3 },
  swamp: { shape: 'rings', count: 1 },
  marsh: { shape: 'dots', count: 3 },
  volcano: { shape: 'rings', count: 3 },
};

function drawLandMarker(g: G, biome: Sector['biome'], x: number, y: number, size: number) {
  const { shape, count } = LAND_MARKERS[biome];
  g.save();
  g.translate(x, y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const path = new Path2D();
  for (let n = 0; n < count; n++) {
    const dx = (n - (count - 1) / 2) * size * 0.67;
    if (shape === 'waves') {
      path.moveTo(dx - size * 0.28, -size * 0.2);
      path.quadraticCurveTo(dx, -size * 0.55, dx + size * 0.28, -size * 0.2);
      path.moveTo(dx - size * 0.28, size * 0.25);
      path.quadraticCurveTo(dx, -size * 0.1, dx + size * 0.28, size * 0.25);
    } else if (shape === 'peaks') {
      path.moveTo(dx - size * 0.3, size * 0.3);
      path.lineTo(dx, -size * 0.4);
      path.lineTo(dx + size * 0.3, size * 0.3);
    } else if (shape === 'dots' || shape === 'rings') {
      path.moveTo(dx + size * 0.19, 0);
      path.arc(dx, 0, size * 0.19, 0, Math.PI * 2);
    } else if (shape === 'rays') {
      path.moveTo(dx, -size * 0.35);
      path.lineTo(dx, size * 0.35);
      path.moveTo(dx - size * 0.3, 0);
      path.lineTo(dx + size * 0.3, 0);
    } else {
      path.moveTo(dx - size * 0.22, -size * 0.3);
      path.lineTo(dx + size * 0.22, size * 0.3);
    }
  }
  g.strokeStyle = '#17152a';
  g.lineWidth = Math.max(2, size * 0.28);
  g.stroke(path);
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(1, size * 0.14);
  g.stroke(path);
  if (shape === 'dots') {
    g.fillStyle = '#ffffff';
    for (let n = 0; n < count; n++) {
      const dx = (n - (count - 1) / 2) * size * 0.67;
      g.beginPath();
      g.arc(dx, 0, size * 0.19, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

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

interface PlanetGradients {
  cx: number;
  cy: number;
  R: number;
  glow: string;
  lifeK: number;
  atm: CanvasGradient;
  band: CanvasGradient;
  mantle: CanvasGradient;
  core: CanvasGradient;
  shade: CanvasGradient;
}

const gradients = new WeakMap<G, PlanetGradients>();

function planetGradients(g: G, cx: number, cy: number, R: number, glow: string, lifeK: number): PlanetGradients {
  const previous = gradients.get(g);
  if (previous?.cx === cx && previous.cy === cy && previous.R === R && previous.glow === glow && previous.lifeK === lifeK) return previous;
  const atm = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * (1.5 + lifeK * 0.25));
  atm.addColorStop(0, glow);
  atm.addColorStop(1, 'rgba(0,0,0,0)');
  if (previous?.cx === cx && previous.cy === cy && previous.R === R) {
    const next = { ...previous, glow, lifeK, atm };
    gradients.set(g, next);
    return next;
  }
  const band = g.createRadialGradient(cx, cy, R * 0.74, cx, cy, R * 0.9);
  band.addColorStop(0, 'rgba(40,20,40,0.45)');
  band.addColorStop(1, 'rgba(40,20,40,0)');
  const mantle = g.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.05, cx, cy, R * 0.76);
  mantle.addColorStop(0, '#8a5a6e');
  mantle.addColorStop(1, '#4e3350');
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
  core.addColorStop(0, '#fff2a8');
  core.addColorStop(0.35, '#ffb13d');
  core.addColorStop(0.75, '#e0562e');
  core.addColorStop(1, 'rgba(160,50,50,0)');
  const shade = g.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.15, cx, cy, R * 1.3);
  shade.addColorStop(0, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(8,4,30,0.5)');
  const next = { cx, cy, R, glow, lifeK, atm, band, mantle, core, shade };
  gradients.set(g, next);
  return next;
}

export function renderPlanet(g: G, p: Planet, v: PlanetView) {
  const { cx, cy, R, rot, time } = v;
  const glow = glowColor(v.glow, time);
  const fills = planetGradients(g, cx, cy, R, glow, v.lifeK);
  // atmosphere halo
  g.save();
  g.globalAlpha = 0.28 + v.lifeK * 0.35;
  g.fillStyle = fills.atm;
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
    const color = landColor(s.biome, activePalette);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R * 1.3, a0 - 0.01, a0 + STEP + 0.01);
    g.closePath();
    g.fill();
    if (B.sea) {
      // lighter shallows near the surface
      const r = R * surfaceK(s);
      g.fillStyle = shade(color, 0.25);
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
  // soil band under the biomes (darkens the lower terrain for depth)
  g.fillStyle = fills.band;
  g.beginPath();
  g.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
  g.fill();
  // crisp cutaway: rock mantle with a glowing magma heart
  const mantleR = R * 0.76;
  g.fillStyle = fills.mantle;
  g.beginPath();
  g.arc(cx, cy, mantleR, 0, Math.PI * 2);
  g.fill();
  // strata rings (slowly turning)
  g.lineWidth = Math.max(1, R * 0.02);
  for (const [k, col] of [
    [0.66, 'rgba(255,210,190,0.12)'],
    [0.54, 'rgba(0,0,0,0.12)'],
    [0.44, 'rgba(255,210,190,0.1)'],
  ] as [number, string][]) {
    g.strokeStyle = col;
    g.beginPath();
    g.arc(cx, cy, R * k, rot * 0.5, rot * 0.5 + Math.PI * 1.7);
    g.stroke();
  }
  // magma core
  const pulse = 1 + Math.sin(time * 2) * 0.04;
  g.save();
  g.translate(cx, cy);
  g.scale(pulse, pulse);
  g.translate(-cx, -cy);
  g.fillStyle = fills.core;
  g.beginPath();
  g.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // mantle edge
  g.strokeStyle = 'rgba(30,12,35,0.45)';
  g.lineWidth = Math.max(1.5, R * 0.025);
  g.beginPath();
  g.arc(cx, cy, mantleR, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  if (activePalette === 'clear' && !v.simple && R >= 60) {
    for (let i = 0; i < SECTORS; i++) {
      const a = rot + (i + 0.5) * STEP;
      const r = R * Math.min(0.85, surfaceK(p.sectors[i]) - 0.08);
      drawLandMarker(g, p.sectors[i].biome, cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(4, R * 0.072));
    }
  }

  // grassy / sandy lip along the surface
  g.lineWidth = Math.max(1.5, R * 0.03);
  g.lineJoin = 'round';
  for (let i = 0; i < SECTORS; i++) {
    const B = BIOMES[p.sectors[i].biome];
    g.strokeStyle = shade(landColor(p.sectors[i].biome, activePalette), B.sea ? 0.5 : 0.28);
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
      drawCachedProps(g, sec.biome, s, i * 13.7 + sec.land * 3 + sec.water, time);
      g.restore();
    }
  }

  // day/night shading and rim light
  g.fillStyle = fills.shade;
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
