// Sticker art: die-cut stickers with a white border, drawn in code like the
// rest of the game's art.
import { drawCreature } from './critters';
import { SPECIES_BY_ID } from '../../core/world';
import { FESTIVALS, FESTIVAL_BY_ID } from '../../meta/festivals';
import { STICKER_BY_ID } from '../../meta/stickers';

type G = CanvasRenderingContext2D;

const RARITY_BG: Record<string, [string, string]> = {
  common: ['#e6fff2', '#9ef0c6'],
  uncommon: ['#e6f3ff', '#9fd0ff'],
  rare: ['#f3e8ff', '#c9a2ff'],
  legendary: ['#fff6d6', '#ffd24a'],
};

/** A creature that models each festival's costume on its sticker. */
const FEST_MODEL = ['bunny', 'otter', 'frog', 'duck', 'deer', 'seal', 'owl', 'penguin', 'bear', 'elephant', 'llama', 'wolf'];

function path(g: G, kind: string, r: number) {
  g.beginPath();
  if (kind === 'fest') {
    // scalloped rosette
    const n = 14;
    for (let k = 0; k <= n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2;
      const rr = k % 2 ? r * 0.9 : r;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (kind === 'voyage') {
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 'feat') {
    // shield
    g.moveTo(0, -r);
    g.quadraticCurveTo(r * 0.9, -r * 0.9, r * 0.9, -r * 0.45);
    g.quadraticCurveTo(r * 0.9, r * 0.5, 0, r);
    g.quadraticCurveTo(-r * 0.9, r * 0.5, -r * 0.9, -r * 0.45);
    g.quadraticCurveTo(-r * 0.9, -r * 0.9, 0, -r);
  } else g.arc(0, 0, r, 0, Math.PI * 2);
  g.closePath();
}

function star(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function featIcon(g: G, id: string, r: number, t: number) {
  const u = r;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  switch (id) {
    case 'guardian': {
      const tail = g.createLinearGradient(-u * 0.6, u * 0.4, u * 0.1, -u * 0.1);
      tail.addColorStop(0, 'rgba(255,160,90,0)');
      tail.addColorStop(1, 'rgba(255,160,90,0.9)');
      g.fillStyle = tail;
      g.beginPath();
      g.moveTo(-u * 0.6, u * 0.5);
      g.lineTo(u * 0.05, -u * 0.25);
      g.lineTo(u * 0.25, 0.05 * u);
      g.closePath();
      g.fill();
      g.fillStyle = '#8a7aa8';
      g.beginPath();
      g.arc(u * 0.15, -u * 0.1, u * 0.3, 0, Math.PI * 2);
      g.fill();
      star(g, u * 0.15, -u * 0.1, u * 0.14, '#ffd84a');
      break;
    }
    case 'atlas':
    case 'crown': {
      const pts: [number, number][] =
        id === 'atlas'
          ? [
              [-0.5, 0.3],
              [-0.15, -0.1],
              [0.2, 0.15],
              [0.5, -0.35],
            ]
          : [
              [-0.5, 0.35],
              [-0.45, -0.3],
              [-0.2, 0.05],
              [0, -0.45],
              [0.2, 0.05],
              [0.45, -0.3],
              [0.5, 0.35],
            ];
      g.strokeStyle = 'rgba(255,240,180,0.9)';
      g.lineWidth = u * 0.06;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)));
      if (id === 'crown') g.closePath();
      g.stroke();
      pts.forEach(([x, y]) => star(g, x * u, y * u, u * 0.13, '#ffe680'));
      break;
    }
    case 'calendar': {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.roundRect(-u * 0.5, -u * 0.42, u, u * 0.9, u * 0.12);
      g.fill();
      g.fillStyle = '#ff6a7a';
      g.beginPath();
      g.roundRect(-u * 0.5, -u * 0.42, u, u * 0.25, [u * 0.12, u * 0.12, 0, 0]);
      g.fill();
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) star(g, -u * 0.34 + col * u * 0.225, -u * 0.02 + row * u * 0.16, u * 0.07, '#ffb13d');
      break;
    }
    case 'home': {
      g.fillStyle = '#3fae6a';
      g.beginPath();
      g.arc(0, u * 0.12, u * 0.45, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#46a0e6';
      g.beginPath();
      g.ellipse(-u * 0.15, u * 0.28, u * 0.15, u * 0.08, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff1d6';
      g.fillRect(-u * 0.1, -u * 0.48, u * 0.2, u * 0.2);
      g.fillStyle = '#e0604a';
      g.beginPath();
      g.moveTo(-u * 0.18, -u * 0.46);
      g.lineTo(0, -u * 0.64);
      g.lineTo(u * 0.18, -u * 0.46);
      g.closePath();
      g.fill();
      break;
    }
    case 'passport': {
      g.fillStyle = '#5a6aff';
      g.beginPath();
      g.roundRect(-u * 0.38, -u * 0.5, u * 0.76, u, u * 0.1);
      g.fill();
      g.strokeStyle = '#ffd84a';
      g.lineWidth = u * 0.05;
      g.beginPath();
      g.arc(0, -u * 0.08, u * 0.2, 0, Math.PI * 2);
      g.moveTo(-u * 0.2, -u * 0.08);
      g.lineTo(u * 0.2, -u * 0.08);
      g.stroke();
      g.fillStyle = '#ffd84a';
      g.fillRect(-u * 0.2, u * 0.25, u * 0.4, u * 0.05);
      break;
    }
    case 'scholar': {
      g.strokeStyle = '#6a4a30';
      g.lineWidth = u * 0.12;
      g.beginPath();
      g.moveTo(u * 0.12, u * 0.12);
      g.lineTo(u * 0.45, u * 0.45);
      g.stroke();
      g.fillStyle = 'rgba(190,235,255,0.9)';
      g.strokeStyle = '#ffd24a';
      g.lineWidth = u * 0.08;
      g.beginPath();
      g.arc(-u * 0.08, -u * 0.08, u * 0.3, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      star(g, -u * 0.08, -u * 0.08, u * 0.12, '#ffb13d');
      break;
    }
    case 'perfect':
      star(g, -u * 0.36, u * 0.08, u * 0.22, '#ffd84a');
      star(g, u * 0.36, u * 0.08, u * 0.22, '#ffd84a');
      star(g, 0, -u * 0.12, u * 0.3, '#ffe680');
      break;
    case 'dye': {
      const cols = ['#ff6a7a', '#ffd84a', '#5ef2b0', '#6ec8ff', '#b58cff'];
      cols.forEach((c, k) => {
        const a = -Math.PI / 2 + (k / cols.length) * Math.PI * 2 + t * 0.2;
        g.fillStyle = c;
        g.beginPath();
        g.arc(Math.cos(a) * u * 0.3, Math.sin(a) * u * 0.3, u * 0.17, 0, Math.PI * 2);
        g.fill();
      });
      break;
    }
    default: {
      // rank medal
      g.fillStyle = '#6e8cff';
      g.beginPath();
      g.moveTo(-u * 0.3, -u * 0.55);
      g.lineTo(-u * 0.08, -u * 0.55);
      g.lineTo(u * 0.08, -u * 0.1);
      g.lineTo(-u * 0.1, -u * 0.1);
      g.closePath();
      g.moveTo(u * 0.3, -u * 0.55);
      g.lineTo(u * 0.08, -u * 0.55);
      g.lineTo(-u * 0.08, -u * 0.1);
      g.lineTo(u * 0.1, -u * 0.1);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffc94a';
      g.beginPath();
      g.arc(0, u * 0.15, u * 0.32, 0, Math.PI * 2);
      g.fill();
      star(g, 0, u * 0.15, u * 0.18, '#e89a1a');
    }
  }
}

/** Draw a sticker centred at 0,0 with radius r. `locked` draws a grey silhouette. */
export function drawSticker(g: G, id: string, r: number, t = 0.4, locked = false) {
  const s = STICKER_BY_ID[id];
  if (!s) return;
  g.save();
  // shadow + white die-cut border
  g.shadowColor = 'rgba(0,0,0,0.28)';
  g.shadowBlur = r * 0.12;
  g.shadowOffsetY = r * 0.05;
  path(g, s.kind, r);
  g.fillStyle = locked ? 'rgba(255,255,255,0.18)' : '#ffffff';
  g.fill();
  g.shadowColor = 'transparent';
  const inner = r * 0.86;
  path(g, s.kind, inner);
  g.save();
  g.clip();
  let bg: [string, string] = ['#e8e4ff', '#b8b0ff'];
  if (s.kind === 'critter') bg = RARITY_BG[SPECIES_BY_ID[s.art]?.rarity ?? 'common'];
  else if (s.kind === 'fest') {
    const c = FESTIVAL_BY_ID[s.art]?.color ?? '#ffd84a';
    bg = ['#fffaf0', c];
  } else if (s.kind === 'voyage') bg = ['#2c3a8a', '#12184a'];
  else bg = ['#3a2a7a', '#1c1446'];
  const gr = g.createRadialGradient(0, -inner * 0.4, inner * 0.1, 0, 0, inner * 1.2);
  gr.addColorStop(0, bg[0]);
  gr.addColorStop(1, bg[1]);
  g.fillStyle = locked ? '#3a3560' : gr;
  g.fillRect(-r, -r, r * 2, r * 2);
  if (locked) g.globalAlpha = 0.35;
  if (s.kind === 'critter') drawCreature(g, s.art, 0, inner * 0.72, 0, inner * 1.05, t);
  else if (s.kind === 'fest') {
    const i = FESTIVALS.findIndex((f) => f.id === s.art);
    drawCreature(g, FEST_MODEL[i] ?? 'bunny', 0, inner * 0.85, 0, inner * 0.9, t, FESTIVALS[i]?.acc ?? '');
  } else if (s.kind === 'voyage') {
    // a ringed planet with the voyage count
    for (let k = 0; k < 12; k++) {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(Math.sin(k * 7.1) * inner * 0.8, Math.cos(k * 3.3) * inner * 0.8, 1.5, 1.5);
    }
    g.fillStyle = '#ff9a5a';
    g.beginPath();
    g.arc(0, 0, inner * 0.42, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffd84a';
    g.lineWidth = inner * 0.08;
    g.beginPath();
    g.ellipse(0, 0, inner * 0.72, inner * 0.2, -0.35, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = `800 ${Math.round(inner * 0.5)}px Fredoka, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.art, 0, inner * 0.04);
  } else featIcon(g, s.art, inner * 0.9, t);
  g.restore();
  // gloss
  if (!locked) {
    g.globalAlpha = 0.25;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(-r * 0.3, -r * 0.45, r * 0.35, r * 0.14, -0.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function stickerCanvas(id: string, px: number, locked = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr);
  c.style.width = c.style.height = `${px}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.translate(px / 2, px / 2);
  drawSticker(g, id, px * 0.44, 0.4, locked);
  return c;
}
