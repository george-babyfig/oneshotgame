import { LAUNCHERS, type LauncherId } from '../../core/launchers';
import { drawLauncher } from './keeper';

type G = CanvasRenderingContext2D;

/** Gameplay hardware remains legible over any cosmetic frame. */
export function drawGameplayLauncher(
  g: G,
  id: LauncherId,
  look: string,
  x: number,
  y: number,
  time: number,
  pull: { x: number; y: number },
  objectBand: string,
  mastered: boolean,
): void {
  const def = LAUNCHERS[id];
  g.save();
  g.strokeStyle = def.bandColor;
  g.fillStyle = def.bandColor;
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  switch (id) {
    case 'swoop':
      g.moveTo(x - 35, y + 27);
      g.bezierCurveTo(x - 46, y - 13, x - 18, y - 29, x - 6, y - 9);
      g.moveTo(x + 35, y + 27);
      g.bezierCurveTo(x + 46, y - 13, x + 18, y - 29, x + 6, y - 9);
      break;
    case 'sparkler':
      g.moveTo(x - 38, y + 27);
      g.lineTo(x - 34, y - 15);
      g.lineTo(x - 18, y - 5);
      g.lineTo(x, y - 24);
      g.lineTo(x + 18, y - 5);
      g.lineTo(x + 34, y - 15);
      g.lineTo(x + 38, y + 27);
      break;
    case 'zip':
      g.moveTo(x - 39, y + 32);
      g.lineTo(x - 18, y - 15);
      g.moveTo(x + 39, y + 32);
      g.lineTo(x + 18, y - 15);
      break;
    case 'thumper':
      g.roundRect(x - 44, y + 4, 88, 34, 8);
      break;
    case 'pinpoint':
      g.moveTo(x, y - 24);
      g.lineTo(x - 36, y + 40);
      g.moveTo(x, y - 24);
      g.lineTo(x + 36, y + 40);
      break;
    case 'skipper':
      for (let k = 0; k < 5; k++) {
        const py = y + 34 - k * 11;
        if (k === 0) g.moveTo(x - 31, py);
        g.lineTo(x + (k % 2 ? -18 : -31), py - 6);
        g.lineTo(x + (k % 2 ? 31 : 18), py - 11);
      }
      break;
    default:
      g.arc(x, y + 18, 38, Math.PI, Math.PI * 2);
  }
  g.stroke();
  drawLauncher(g, look, x, y, time, pull, objectBand, mastered);
  // The band and emblem sit above the cosmetic look so the rules remain visible.
  g.strokeStyle = def.bandColor;
  g.lineWidth = 5;
  g.beginPath();
  g.arc(x, y + 28, 26, 0.15, Math.PI - 0.15);
  g.stroke();
  // The held object can be pulled to either side; keep its badge on the other side.
  const badgeX = x + (pull.x > 0 ? -51 : 51);
  const badgeY = y + 49;
  g.fillStyle = '#1c2047';
  g.beginPath();
  g.arc(badgeX, badgeY, 13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = def.bandColor;
  g.lineWidth = 3;
  g.stroke();
  g.font = 'bold 18px system-ui';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.fillText(def.emblem, badgeX, badgeY, 20);
  g.restore();
}

export function launcherIconCanvas(id: LauncherId, size = 42): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * (window.devicePixelRatio || 1);
  canvas.style.width = canvas.style.height = `${size}px`;
  const g = canvas.getContext('2d')!;
  const scale = canvas.width / size;
  g.scale(scale, scale);
  const def = LAUNCHERS[id];
  g.fillStyle = '#25254b';
  g.strokeStyle = def.bandColor;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${Math.round(size * 0.52)}px system-ui`;
  g.fillText(def.emblem, size / 2, size / 2 + 1);
  return canvas;
}

export function drawGameplayTrail(g: G, id: LauncherId, points: readonly { x: number; y: number }[], combo = 0): void {
  if (id === 'sling' || points.length < 2) return;
  g.save();
  g.strokeStyle = LAUNCHERS[id].bandColor;
  g.fillStyle = LAUNCHERS[id].bandColor;
  g.globalAlpha = 0.75;
  if (id === 'swoop' || id === 'pinpoint' || id === 'zip' || id === 'thumper') {
    g.lineWidth = id === 'thumper' ? 7 : id === 'pinpoint' ? 1.5 : id === 'zip' ? 3 : 5;
    g.beginPath();
    points.forEach((point, i) => (i ? g.lineTo(point.x, point.y) : g.moveTo(point.x, point.y)));
    g.stroke();
  }
  const every = id === 'zip' ? 3 : 2;
  for (let i = 0; i < points.length; i += every) {
    const p = points[i];
    if (id === 'sparkler') {
      const r = 2 + Math.min(3, combo);
      g.fillRect(p.x - r / 2, p.y - r / 2, r, r);
    } else if (id === 'skipper') {
      g.beginPath();
      g.arc(p.x, p.y, 3, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'thumper') {
      g.beginPath();
      g.arc(p.x, p.y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}
