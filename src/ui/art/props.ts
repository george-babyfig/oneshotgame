// Hand-built vector props for each biome. Drawn in local space: origin on the
// ground, "up" is -y, `s` is the unit size (about a tenth of the planet radius).
import type { BiomeId } from '../../core/world';
import { hash01 } from './color';
import { canvasDpr } from '../devcapture';

type G = CanvasRenderingContext2D;

function blob(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function trunk(g: G, x: number, h: number, w: number, color = '#6b4a2f') {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x - w / 2, -h, w, h + 1, w / 2);
  g.fill();
}

function roundTree(g: G, x: number, s: number, c1: string, c2: string, k = 1) {
  trunk(g, x, s * 1.1 * k, s * 0.28 * k);
  blob(g, x, -s * 1.45 * k, s * 0.72 * k, c1);
  blob(g, x - s * 0.32 * k, -s * 1.25 * k, s * 0.5 * k, c1);
  blob(g, x + s * 0.34 * k, -s * 1.3 * k, s * 0.48 * k, c1);
  blob(g, x - s * 0.18 * k, -s * 1.62 * k, s * 0.3 * k, c2);
}

function pine(g: G, x: number, s: number, c1: string, c2: string, snow = false, k = 1) {
  trunk(g, x, s * 0.5 * k, s * 0.22 * k);
  for (let i = 0; i < 3; i++) {
    const y = -s * (0.45 + i * 0.5) * k;
    const w = s * (0.75 - i * 0.18) * k;
    g.fillStyle = i % 2 ? c2 : c1;
    g.beginPath();
    g.moveTo(x - w, y);
    g.lineTo(x, y - s * 0.8 * k);
    g.lineTo(x + w, y);
    g.closePath();
    g.fill();
    if (snow) {
      g.fillStyle = '#f4fbff';
      g.beginPath();
      g.moveTo(x - w * 0.35, y - s * 0.52 * k);
      g.lineTo(x, y - s * 0.8 * k);
      g.lineTo(x + w * 0.35, y - s * 0.52 * k);
      g.closePath();
      g.fill();
    }
  }
}

function palm(g: G, x: number, s: number, t: number) {
  g.strokeStyle = '#8a5a34';
  g.lineWidth = s * 0.22;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, 0);
  g.quadraticCurveTo(x + s * 0.35, -s * 1, x + s * 0.15, -s * 1.9);
  g.stroke();
  const sway = Math.sin(t * 1.5 + x) * 0.08;
  g.fillStyle = '#2fb14f';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62 + sway;
    g.save();
    g.translate(x + s * 0.15, -s * 1.9);
    g.rotate(a);
    g.beginPath();
    g.ellipse(s * 0.55, 0, s * 0.62, s * 0.17, 0.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  blob(g, x + s * 0.1, -s * 1.75, s * 0.12, '#7a4a20');
}

function cactus(g: G, x: number, s: number) {
  g.fillStyle = '#4fa35a';
  g.beginPath();
  g.roundRect(x - s * 0.18, -s * 1.4, s * 0.36, s * 1.4, s * 0.18);
  g.roundRect(x - s * 0.6, -s * 0.95, s * 0.26, s * 0.55, s * 0.13);
  g.roundRect(x - s * 0.6, -s * 0.52, s * 0.5, s * 0.22, s * 0.11);
  g.roundRect(x + s * 0.34, -s * 1.15, s * 0.26, s * 0.55, s * 0.13);
  g.roundRect(x + s * 0.1, -s * 0.72, s * 0.5, s * 0.22, s * 0.11);
  g.fill();
  blob(g, x, -s * 1.42, s * 0.1, '#ff7aa8');
}

function acacia(g: G, x: number, s: number) {
  trunk(g, x, s * 1.3, s * 0.18, '#7a5230');
  g.fillStyle = '#6f9a3a';
  g.beginPath();
  g.ellipse(x, -s * 1.45, s * 0.95, s * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#86b44a';
  g.beginPath();
  g.ellipse(x - s * 0.2, -s * 1.55, s * 0.55, s * 0.18, 0, 0, Math.PI * 2);
  g.fill();
}

function grass(g: G, x: number, s: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = s * 0.12;
  g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(x + i * s * 0.12, 0);
    g.quadraticCurveTo(x + i * s * 0.2, -s * 0.3, x + i * s * 0.35, -s * 0.55);
    g.stroke();
  }
}

function flower(g: G, x: number, s: number, color: string) {
  g.strokeStyle = '#3f8f3a';
  g.lineWidth = s * 0.08;
  g.beginPath();
  g.moveTo(x, 0);
  g.lineTo(x, -s * 0.55);
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    blob(g, x + Math.cos(a) * s * 0.14, -s * 0.6 + Math.sin(a) * s * 0.14, s * 0.12, color);
  }
  blob(g, x, -s * 0.6, s * 0.09, '#ffe066');
}

function peak(g: G, x: number, s: number, h: number, snow: boolean, c = '#8a7f8d') {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(x - s * 0.9, 0.5);
  g.lineTo(x, -s * h);
  g.lineTo(x + s * 0.9, 0.5);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.beginPath();
  g.moveTo(x, -s * h);
  g.lineTo(x + s * 0.9, 0.5);
  g.lineTo(x + s * 0.15, 0.5);
  g.closePath();
  g.fill();
  if (snow) {
    g.fillStyle = '#f4fbff';
    g.beginPath();
    g.moveTo(x - s * 0.3, -s * h * 0.66);
    g.lineTo(x, -s * h);
    g.lineTo(x + s * 0.3, -s * h * 0.66);
    g.lineTo(x + s * 0.1, -s * h * 0.72);
    g.lineTo(x - s * 0.05, -s * h * 0.62);
    g.closePath();
    g.fill();
  }
}

function rock(g: G, x: number, s: number, c = '#8d8196') {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(x - s * 0.35, 0.5);
  g.lineTo(x - s * 0.25, -s * 0.22);
  g.lineTo(x + s * 0.05, -s * 0.32);
  g.lineTo(x + s * 0.32, -s * 0.12);
  g.lineTo(x + s * 0.36, 0.5);
  g.closePath();
  g.fill();
}

function wave(g: G, x: number, s: number, t: number) {
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = s * 0.1;
  g.lineCap = 'round';
  const o = Math.sin(t * 2 + x) * s * 0.12;
  g.beginPath();
  g.moveTo(x - s * 0.45 + o, -s * 0.05);
  g.quadraticCurveTo(x + o, -s * 0.35, x + s * 0.45 + o, -s * 0.05);
  g.stroke();
}

function coral(g: G, x: number, s: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = s * 0.14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, s * 0.2);
  g.lineTo(x, -s * 0.5);
  g.moveTo(x, -s * 0.15);
  g.lineTo(x - s * 0.3, -s * 0.45);
  g.moveTo(x, -s * 0.3);
  g.lineTo(x + s * 0.28, -s * 0.62);
  g.stroke();
}

function floe(g: G, x: number, s: number) {
  g.fillStyle = '#f2fbff';
  g.beginPath();
  g.moveTo(x - s * 0.5, 0);
  g.lineTo(x - s * 0.35, -s * 0.28);
  g.lineTo(x + s * 0.3, -s * 0.3);
  g.lineTo(x + s * 0.5, 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#bfe3f7';
  g.fillRect(x - s * 0.5, -s * 0.04, s, s * 0.08);
}

function puff(g: G, x: number, y: number, s: number, t: number, phase: number, color = 'rgba(255,255,255,0.55)') {
  const k = (t * 0.5 + phase) % 1;
  g.globalAlpha = (1 - k) * 0.9;
  blob(g, x + Math.sin(k * 6) * s * 0.15, y - k * s * 1.2, s * (0.18 + k * 0.25), color);
  g.globalAlpha = 1;
}

function volcano(g: G, x: number, s: number, t: number) {
  g.fillStyle = '#6e3a34';
  g.beginPath();
  g.moveTo(x - s * 1.1, 0.5);
  g.lineTo(x - s * 0.28, -s * 1.25);
  g.lineTo(x + s * 0.28, -s * 1.25);
  g.lineTo(x + s * 1.1, 0.5);
  g.closePath();
  g.fill();
  const glow = 0.7 + Math.sin(t * 4) * 0.3;
  g.fillStyle = `rgba(255,${120 + glow * 60},40,1)`;
  g.beginPath();
  g.moveTo(x - s * 0.28, -s * 1.25);
  g.lineTo(x - s * 0.12, -s * 0.8);
  g.lineTo(x, -s * 1.05);
  g.lineTo(x + s * 0.1, -s * 0.7);
  g.lineTo(x + s * 0.28, -s * 1.25);
  g.closePath();
  g.fill();
  puff(g, x, -s * 1.35, s, t, 0, 'rgba(90,80,90,0.7)');
  puff(g, x, -s * 1.35, s, t, 0.5, 'rgba(90,80,90,0.7)');
}

function reeds(g: G, x: number, s: number, t: number) {
  const sway = Math.sin(t * 1.2 + x) * s * 0.06;
  g.strokeStyle = '#5b8a3a';
  g.lineWidth = s * 0.08;
  g.lineCap = 'round';
  for (const dx of [-0.2, 0, 0.18]) {
    g.beginPath();
    g.moveTo(x + dx * s, 0);
    g.lineTo(x + dx * s + sway, -s * (0.9 + dx));
    g.stroke();
  }
  g.fillStyle = '#7a4a2a';
  g.beginPath();
  g.roundRect(x - s * 0.04 + sway, -s * 0.95, s * 0.1, s * 0.3, s * 0.05);
  g.fill();
}

function dune(g: G, x: number, s: number, c: string) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, 0.5, s * 0.8, s * 0.35, 0, Math.PI, 0);
  g.fill();
}

function mound(g: G, x: number, s: number) {
  g.fillStyle = '#f5fbff';
  g.beginPath();
  g.ellipse(x, 0.5, s * 0.55, s * 0.28, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = 'rgba(160,200,230,0.5)';
  g.beginPath();
  g.ellipse(x + s * 0.15, 0.5, s * 0.3, s * 0.12, 0, Math.PI, 0);
  g.fill();
}

/** Draw the props for one sector. `seed` varies the layout per sector. */
export function drawProps(g: G, biome: BiomeId, s: number, seed: number, t: number) {
  const r1 = hash01(seed);
  const r2 = hash01(seed + 7.3);
  const x1 = (r1 - 0.5) * s * 0.9;
  const x2 = (r2 - 0.5) * s * 1.2;
  switch (biome) {
    case 'barren':
      if (r1 < 0.5) rock(g, x1, s * 0.8);
      break;
    case 'meadow':
      grass(g, x2, s, '#6fc04a');
      flower(g, x1, s, ['#ff8fc8', '#fff', '#ffd84a', '#b58cff'][Math.floor(r2 * 4)]);
      break;
    case 'forest':
      roundTree(g, x1 - s * 0.25, s, '#2f9e4f', '#56c46f', 0.9);
      if (r2 > 0.35) roundTree(g, x1 + s * 0.45, s, '#268a44', '#4fbb67', 0.7);
      break;
    case 'jungle':
      palm(g, x1, s, t);
      grass(g, x1 + s * 0.5, s, '#2e9e48');
      break;
    case 'highland':
      roundTree(g, x2, s, '#6f9a52', '#8ebf69', 0.75);
      grass(g, x2 - s * 0.5, s, '#7fa36a');
      break;
    case 'mountain':
      peak(g, x1 * 0.5, s, 1.7 + r2 * 0.4, r2 > 0.4);
      break;
    case 'desert':
      dune(g, x2, s, '#f0cf82');
      if (r1 > 0.35) cactus(g, x1, s * 0.85);
      break;
    case 'savanna':
      acacia(g, x1, s);
      grass(g, x1 + s * 0.6, s, '#c9a63a');
      break;
    case 'tundra':
      mound(g, x1, s);
      if (r2 > 0.5) rock(g, x2 + s * 0.4, s * 0.6, '#9aa4b0');
      break;
    case 'taiga':
      pine(g, x1, s, '#2f7a5f', '#3f9272', true, 0.9);
      if (r2 > 0.45) pine(g, x1 + s * 0.55, s, '#2a6e55', '#3a8768', true, 0.65);
      break;
    case 'swamp':
      reeds(g, x1, s * 0.8, t);
      g.fillStyle = 'rgba(60,70,40,0.6)';
      g.beginPath();
      g.ellipse(x2, 0, s * 0.45, s * 0.1, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'marsh':
      reeds(g, x1, s, t);
      flower(g, x2, s * 0.7, '#fff');
      break;
    case 'volcano':
      volcano(g, x1 * 0.4, s, t);
      break;
    case 'ocean':
      wave(g, x1, s, t);
      break;
    case 'reef':
      coral(g, x1, s, '#ff7aa8');
      coral(g, x1 + s * 0.4, s * 0.8, '#ffb14a');
      break;
    case 'icesheet':
      floe(g, x1, s);
      break;
    case 'springs':
      puff(g, x1, -s * 0.1, s, t, r1);
      puff(g, x1 + s * 0.3, -s * 0.1, s, t, r1 + 0.5);
      break;
  }
}

const movingProps = new Set<BiomeId>(['jungle', 'swamp', 'marsh', 'volcano', 'ocean', 'springs']);
const propSprites = new Map<string, HTMLCanvasElement>();

/** Static scenery shares a sprite across frames as the planet turns. */
export function drawCachedProps(g: G, biome: BiomeId, s: number, seed: number, t: number) {
  if (movingProps.has(biome)) return drawProps(g, biome, s, seed, t);
  const dpr = canvasDpr();
  const key = `${biome}|${s.toFixed(2)}|${seed}|${dpr}`;
  let sprite = propSprites.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = Math.ceil(s * 6 * dpr);
    const pg = sprite.getContext('2d')!;
    pg.setTransform(dpr, 0, 0, dpr, 3 * s * dpr, 3 * s * dpr);
    drawProps(pg, biome, s, seed, 0);
    if (propSprites.size >= 96) propSprites.delete(propSprites.keys().next().value!);
    propSprites.set(key, sprite);
  }
  g.drawImage(sprite, -3 * s, -3 * s, sprite.width / dpr, sprite.height / dpr);
}
