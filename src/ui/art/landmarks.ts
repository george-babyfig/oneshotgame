import type { LandmarkId, LandmarkStage } from '../../meta/homeworldLife';
import type { BuildingType } from '../../meta/homeworld';
import { drawStructure } from './structures';

type G = CanvasRenderingContext2D;

function line(g: G, color: string, width: number, ...points: number[]): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.stroke();
}

function ellipse(g: G, x: number, y: number, rx: number, ry: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function flower(g: G, x: number, y: number, color: string): void {
  line(g, '#467950', 1.4, x, y + 3, x, y - 2);
  for (let a = 0; a < 5; a++) ellipse(g, x + Math.cos(a * 1.257) * 2.8, y - 3 + Math.sin(a * 1.257) * 2.8, 2, 1.6, color);
  ellipse(g, x, y - 3, 1.7, 1.7, '#ffe991');
}

/** The Garden gift is always visible beside each Den, including on picnic days. */
export function drawDenFlowers(g: G, x: number, y: number, size: number, picnic: boolean): void {
  g.save();
  g.translate(x, y);
  g.scale(size / 48, size / 48);
  if (picnic) {
    ellipse(g, 0, 7, 15, 5, '#f3ceaa');
    line(g, '#fff3db', 1.5, -9, 5, 9, 9);
  }
  flower(g, -15, 5, '#ffbad7');
  flower(g, -8, 7, '#ffe89d');
  flower(g, 12, 5, '#ffbad7');
  flower(g, 19, 8, '#ffe89d');
  g.restore();
}

/** Draws the signpost and four permanent build states in a 48-unit local box. */
export function drawLandmark(g: G, id: LandmarkId, stage: LandmarkStage, x: number, y: number, size: number, nightness = 0): void {
  g.save();
  g.translate(x, y);
  g.scale(size / 48, size / 48);
  ellipse(g, 0, 18, 23, 6, 'rgba(18,35,50,.22)');
  if (stage === 0) {
    line(g, '#805b46', 3, 0, 16, 0, -10);
    g.fillStyle = '#edcf92';
    g.fillRect(-11, -13, 22, 9);
    line(g, '#6b845d', 1.8, -6, -8, 0, -11, 6, -8);
    g.restore();
    return;
  }
  if (id === 'sprout_garden') {
    ellipse(g, 0, 11, 20, 8, '#8f744e');
    ellipse(g, 0, 9, 17, 6, stage >= 2 ? '#6eae68' : '#8f9d68');
    if (stage >= 2) for (const px of [-13, -6, 3, 12]) flower(g, px, 8 + (px % 3), px % 2 ? '#ffd3e5' : '#fff1ad');
    if (stage >= 3) {
      line(g, '#d9bd8b', 2, -20, 10, -20, 2, -13, -3, -6, 0);
      line(g, '#d9bd8b', 2, 6, 0, 13, -3, 20, 2, 20, 10);
    }
    if (stage >= 4) {
      g.fillStyle = '#e8c2a2';
      g.fillRect(-5, 4, 10, 5);
      ellipse(g, 0, 3, 9, 3, '#fff1c7');
      flower(g, -18, 1, '#f2a9cd');
      flower(g, 17, 1, '#f2a9cd');
    }
  } else if (id === 'skyglass') {
    ellipse(g, 0, 14, 17, 6, '#778aa0');
    g.fillStyle = '#caa76e';
    g.fillRect(-9, 5, 18, 9);
    if (stage >= 2) {
      line(g, '#d7bd87', 3, -8, 7, -3, -2, 5, -2, 9, 7);
      line(g, '#738b9d', 2, -9, 7, 9, 7);
    }
    if (stage >= 3) {
      line(g, '#e9d4a4', 5, -9, -3, 7, -12);
      ellipse(g, 7, -12, 4, 4, '#b9e7ef');
    }
    if (stage >= 4) {
      ellipse(g, 7, -12, 2.5, 2.5, '#fffbd5');
      line(g, '#f7e5ac', 1.5, 8, -14, 14, -20);
    }
  } else if (id === 'sky_bridge') {
    ellipse(g, -15, 14, 9, 6, '#7c9f75');
    if (stage >= 2) {
      ellipse(g, 15, 9, 11, 5, '#779f93');
      ellipse(g, 15, 7, 10, 3, '#83ba83');
    }
    if (stage >= 3) {
      line(g, '#a97654', 3, -12, 10, -3, 3, 8, 1, 16, 7);
      for (let i = -7; i < 14; i += 5) line(g, '#d7b98c', 3, i, 6 - i / 4, i + 3, 6 - i / 4);
    }
    if (stage >= 4) {
      line(g, '#f3e5b9', 1.5, -12, 4, -3, -5, 9, -7, 19, 2);
      flower(g, 19, 3, '#f7d4e5');
    }
  } else if (id === 'comet_pier') {
    ellipse(g, 0, 15, 22, 5, '#4e9ab0');
    if (stage >= 2) for (const px of [-15, -5, 5, 15]) line(g, '#775f52', 2.5, px, 16, px, 4);
    if (stage >= 3) {
      g.fillStyle = '#d1a06d';
      g.fillRect(-18, 1, 36, 5);
      line(g, '#e9ca95', 1, -18, 1, 18, 1);
    }
    if (stage >= 4) {
      line(g, '#e8d2ab', 2, -12, -2, 14, -2);
      ellipse(g, 14, -4, 4, 4, '#e9efbb');
      line(g, '#e8d2ab', 1.5, 14, -8, 20, -12);
    }
  } else {
    ellipse(g, 0, 17, 19, 5, '#8c96aa');
    g.fillStyle = '#b9bdcb';
    g.fillRect(-8, 2, 16, 14);
    if (stage >= 2) {
      g.fillStyle = '#ddd7cb';
      g.fillRect(-6, -8, 12, 12);
    }
    if (stage >= 3) {
      g.fillStyle = '#d7e0e0';
      g.fillRect(-4, -16, 8, 10);
      line(g, '#aebac9', 2, -8, -7, 8, -7);
    }
    if (stage >= 4) {
      ellipse(g, 0, -17, 7, 4, '#fff0ad');
      g.fillStyle = `rgba(255,243,178,${0.28 + nightness * 0.3})`;
      g.beginPath();
      g.moveTo(0, -18);
      g.lineTo(-17, -2);
      g.lineTo(17, -2);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

/** The Bridge finish supplies three stable decoration anchors. */
export function drawFloatingIsle(g: G, x: number, y: number, size: number): [number, number][] {
  g.save();
  g.translate(x, y);
  g.scale(size / 48, size / 48);
  ellipse(g, 0, 4, 22, 8, '#8fc694');
  g.fillStyle = '#807c87';
  g.beginPath();
  g.moveTo(-20, 5);
  g.lineTo(0, 22);
  g.lineTo(20, 5);
  g.closePath();
  g.fill();
  ellipse(g, 0, 3, 21, 6, '#9ccd97');
  const spots: [number, number][] = [
    [-11, 1],
    [0, -2],
    [11, 1],
  ];
  for (const [sx, sy] of spots) ellipse(g, sx, sy, 2, 1, '#6e9e70');
  g.restore();
  return spots.map(([sx, sy]) => [x + (sx * size) / 48, y + (sy * size) / 48]);
}

export function drawIsleDecoration(g: G, id: string, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y);
  if (id.startsWith('keepsake:')) {
    ellipse(g, -3, -2, size * 0.12, size * 0.08, '#e9c69d');
    ellipse(g, 2, -3, size * 0.14, size * 0.09, '#f5dcb1');
    flower(g, 1, -size * 0.19, '#c5e5ee');
  } else drawStructure(g, id as BuildingType, 1, size, 0);
  g.restore();
}
