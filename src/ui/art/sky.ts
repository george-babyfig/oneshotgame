import type { ObstacleId, SkyShape } from '../../core/sky';

type G = CanvasRenderingContext2D;
const tau = Math.PI * 2;

function star(g: G, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.54 : r;
    if (!i) g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  g.closePath();
  g.fill();
  g.stroke();
}

function sleepyFace(g: G, x: number, y: number, r: number) {
  g.strokeStyle = '#453d62';
  g.lineWidth = Math.max(1.5, r * 0.08);
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(x + side * r * 0.25, y + r * 0.02, r * 0.1, 0.15, Math.PI - 0.15);
    g.stroke();
  }
  g.beginPath();
  g.arc(x, y + r * 0.19, r * 0.07, 0, Math.PI);
  g.stroke();
}

export function drawSkyShape(g: G, shape: SkyShape, clear = false, still = false, time = 0) {
  g.save();
  g.lineJoin = 'round';
  if (shape.kind === 'rock') {
    const { x, y, r } = shape;
    // a soft light halo so small grey rocks still read against grey-purple hills
    g.fillStyle = 'rgba(255, 244, 214, 0.22)';
    g.beginPath();
    g.arc(x, y, r * 1.45, 0, tau);
    g.fill();
    g.fillStyle = clear ? '#e4e1ec' : '#c3bed3';
    g.strokeStyle = '#3d3a52';
    g.lineWidth = Math.max(2.5, r * 0.14);
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * tau;
      const d = r * (i % 3 === 0 ? 1.06 : i % 2 ? 0.87 : 0.96);
      if (!i) g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      else g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#858293';
    for (const [dx, dy, cr] of [
      [-0.45, -0.36, 0.15],
      [0.42, -0.33, 0.11],
      [0.42, 0.43, 0.16],
    ]) {
      g.beginPath();
      g.ellipse(x + dx * r, y + dy * r, cr * r, cr * r * 0.7, -0.3, 0, tau);
      g.fill();
    }
  } else if (shape.kind === 'bubble') {
    const { x, y, r, moonR } = shape;
    g.fillStyle = clear ? '#d5d4e6' : '#bab6d4';
    g.strokeStyle = '#6e6a8e';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, moonR, 0, tau);
    g.fill();
    g.stroke();
    sleepyFace(g, x, y, moonR);
    g.strokeStyle = clear ? '#fff' : '#b3efff';
    g.lineWidth = Math.max(3, r * 0.1);
    g.beginPath();
    g.arc(x, y, r, 0, tau);
    g.stroke();
    g.strokeStyle = '#f4b9e9';
    g.lineWidth = Math.max(2, r * 0.045);
    g.beginPath();
    g.arc(x, y, r * 0.92, -2.3, -0.45);
    g.stroke();
    g.strokeStyle = '#fffbd1';
    g.beginPath();
    g.arc(x, y, r * 0.95, 0.5, 1.5);
    g.stroke();
  } else if (shape.kind === 'mist') {
    const { x, y, r, curl } = shape;
    const shimmer = still ? 0.6 : 0.6 + Math.sin(time * 2) * 0.08;
    const haze = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    haze.addColorStop(0, clear ? `rgba(137,190,213,${shimmer})` : `rgba(155,142,213,${shimmer})`);
    haze.addColorStop(1, 'rgba(155,142,213,0)');
    g.fillStyle = haze;
    g.beginPath();
    g.arc(x, y, r, 0, tau);
    g.fill();
    g.strokeStyle = clear ? '#e3fbff' : '#d7c8ff';
    g.lineWidth = Math.max(2, r * 0.07);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const rr = r * (0.25 + i * 0.22);
      const a = i * 0.65;
      g.beginPath();
      g.arc(x, y, rr, a, a + curl * 2.6, curl < 0);
      g.stroke();
      const end = a + curl * 2.6;
      const px = x + Math.cos(end) * rr;
      const py = y + Math.sin(end) * rr;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - Math.cos(end + curl * 0.7) * 8, py - Math.sin(end + curl * 0.7) * 8);
      g.stroke();
    }
  } else if (shape.kind === 'ring') {
    const { cx, cy, r, thickness, gaps } = shape;
    const inGap = (angle: number) => gaps.some(({ start, width }) => (((angle - start) % tau) + tau) % tau < width);
    const count = 60;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * tau;
      if (inGap(a)) continue;
      const d = r + ((i % 3) - 1) * thickness * 0.24;
      g.fillStyle = i % 4 === 0 ? '#e8d1a6' : clear ? '#d7d4cc' : '#aaa3aa';
      g.strokeStyle = '#514b62';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, thickness * 0.37, thickness * 0.22, a, 0, tau);
      g.fill();
      g.stroke();
    }
    for (const { start, width } of gaps) {
      for (const a of [start, start + width]) {
        g.strokeStyle = '#fff0a5';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * (r - thickness), cy + Math.sin(a) * (r - thickness));
        g.lineTo(cx + Math.cos(a) * (r + thickness), cy + Math.sin(a) * (r + thickness));
        g.stroke();
      }
    }
  } else {
    const { x, y, coreR } = shape;
    g.strokeStyle = clear ? '#c6a9ec' : '#8f70c3';
    g.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(x, y, coreR * (2.3 + i * 0.8), -2 + i * 0.8, 1.3 + i * 0.8);
      g.stroke();
    }
    g.strokeStyle = '#d7c0ff';
    g.lineWidth = 1.5;
    star(g, x, y, coreR * 1.5, clear ? '#6c4a91' : '#4d326e');
    sleepyFace(g, x, y, coreR * 0.85);
  }
  g.restore();
}

export function skyIconCanvas(id: ObstacleId, size = 48, hidden = false, clear = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = canvas.style.height = `${size}px`;
  const g = canvas.getContext('2d')!;
  g.scale(canvas.width / size, canvas.height / size);
  if (hidden) {
    g.fillStyle = '#767387';
    g.beginPath();
    g.arc(size / 2, size / 2, size * 0.42, 0, tau);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `700 ${size * 0.6}px Fredoka, system-ui`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', size / 2, size / 2);
    return canvas;
  }
  const x = size / 2;
  const y = size / 2;
  const r = size * 0.27;
  const shape: SkyShape =
    id === 'rocks'
      ? { kind: 'rock', index: 0, x, y, r }
      : id === 'bubble'
        ? { kind: 'bubble', x, y, r: r * 1.3, moonR: r * 0.77 }
        : id === 'mist'
          ? { kind: 'mist', x, y, r: r * 1.5, curl: 1 }
          : id === 'ring'
            ? {
                kind: 'ring',
                cx: x,
                cy: y,
                r,
                thickness: 7,
                gaps: [
                  { start: -0.8, width: 0.7 },
                  { start: 2.4, width: 0.7 },
                ],
              }
            : { kind: 'tug', x, y, coreR: r * 0.58 };
  drawSkyShape(g, shape, clear, true);
  return canvas;
}
