import { REACTIONS, type ReactionId } from '../../core/round';
import { KINDS, type Kind } from '../../core/world';
import { drawProjectile } from './projectiles';
import { t } from '../../i18n';
import { canvasDpr } from '../devcapture';

const COLORS: Record<ReactionId, string> = {
  steam: '#c6eeff',
  rainGarden: '#7de8bb',
  wildflowers: '#ffb9dd',
  glacier: '#b9e6ff',
  scorch: '#ff8b83',
};

export function reactionColor(id: ReactionId): string {
  return COLORS[id];
}

/** A small symbol that stays legible in a chip, banner or sticker. */
export function drawReactionIcon(g: CanvasRenderingContext2D, id: ReactionId, x: number, y: number, size: number) {
  const color = COLORS[id];
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(1.5, size * 0.09);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const u = size / 2;
  if (id === 'steam') {
    for (const offset of [-0.42, 0, 0.42]) {
      g.beginPath();
      g.moveTo(offset * u, 0.65 * u);
      g.bezierCurveTo((offset - 0.3) * u, 0.1 * u, (offset + 0.3) * u, -0.15 * u, offset * u, -0.7 * u);
      g.stroke();
    }
  } else if (id === 'rainGarden') {
    g.beginPath();
    g.moveTo(0, 0.7 * u);
    g.lineTo(0, -0.25 * u);
    g.moveTo(0, 0.15 * u);
    g.quadraticCurveTo(-0.7 * u, -0.6 * u, -0.8 * u, -0.15 * u);
    g.quadraticCurveTo(-0.5 * u, 0.2 * u, 0, 0.15 * u);
    g.moveTo(0, -0.05 * u);
    g.quadraticCurveTo(0.7 * u, -0.7 * u, 0.8 * u, -0.25 * u);
    g.quadraticCurveTo(0.5 * u, 0.08 * u, 0, -0.05 * u);
    g.stroke();
    g.beginPath();
    g.arc(0, -0.75 * u, 0.13 * u, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'wildflowers') {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      g.beginPath();
      g.ellipse(Math.cos(a) * u * 0.46, Math.sin(a) * u * 0.46, u * 0.34, u * 0.2, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ffe68e';
    g.beginPath();
    g.arc(0, 0, u * 0.25, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'glacier') {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * u * 0.9, Math.sin(a) * u * 0.9);
      g.stroke();
    }
  } else {
    g.beginPath();
    g.moveTo(-u * 0.7, -u * 0.6);
    g.quadraticCurveTo(u * 0.8, -u * 0.8, u * 0.48, u * 0.25);
    g.quadraticCurveTo(u * 0.18, u * 0.85, -u * 0.48, u * 0.5);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(-u * 0.7, -u * 0.6);
    g.quadraticCurveTo(-u * 0.1, u * 0.3, u * 0.2, u * 0.85);
    g.moveTo(-u * 0.65, u * 0.85);
    g.lineTo(-u * 0.28, u * 0.58);
    g.lineTo(-u * 0.05, u * 0.8);
    g.stroke();
  }
  g.restore();
}

export function reactionCanvas(id: ReactionId, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = canvasDpr();
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const g = canvas.getContext('2d');
  if (g) {
    g.scale(dpr, dpr);
    drawReactionIcon(g, id, size / 2, size / 2, size * 0.78);
  }
  return canvas;
}

export function reactionPair(id: ReactionId, size: number): HTMLElement {
  const pair = document.createElement('span');
  pair.className = 'reaction-pair';
  for (const [index, kind] of REACTIONS[id].pair.entries()) {
    if (index) pair.append(' + ');
    const image = document.createElement('span');
    image.title = t(KINDS[kind as Kind].name);
    image.append(drawProjectileCanvas(kind, size));
    pair.append(image);
  }
  pair.append(' = ', reactionCanvas(id, size));
  return pair;
}

function drawProjectileCanvas(kind: Kind, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const g = canvas.getContext('2d');
  if (g) drawProjectile(g, kind, size / 2, size / 2, size * 0.8, 0);
  return canvas;
}
