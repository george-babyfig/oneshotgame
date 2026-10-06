// Homeworld structures, drawn standing on the planet's surface. Local
// coordinates: the base sits at (0, 0) and "up" is -y. Higher levels grow a
// little and gain details, so upgrades are visible at a glance.
import type { BuildingType } from '../../meta/homeworld';
import { KINDS, type Kind } from '../../core/world';
import { shade } from './color';

type G = CanvasRenderingContext2D;

function rr(g: G, x: number, y: number, w: number, h: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}
function circ(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function star(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  g.closePath();
  g.fill();
}
/** Level pennant: lv 3+ gets a flag, lv 5 a gold star. */
function pennant(g: G, x: number, y: number, s: number, lv: number, t: number) {
  if (lv < 3) return;
  g.strokeStyle = '#e8e4ff';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - s * 0.3);
  g.stroke();
  const wave = Math.sin(t * 4) * s * 0.02;
  g.fillStyle = lv >= 5 ? '#ffd24a' : '#ff6a7a';
  g.beginPath();
  g.moveTo(x, y - s * 0.3);
  g.lineTo(x + s * 0.18, y - s * 0.25 + wave);
  g.lineTo(x, y - s * 0.2);
  g.fill();
  if (lv >= 5) star(g, x, y - s * 0.34, s * 0.06, '#fff6b0');
}

export function drawStructure(
  g: G,
  type: BuildingType,
  lv: number,
  s: number,
  t: number,
  building = false,
  opts: { kind?: Kind; formOn?: boolean } = {},
) {
  const k = 0.82 + lv * 0.06;
  g.save();
  g.scale(k, k);
  if (building) g.globalAlpha = 0.55;
  switch (type) {
    case 'lab': {
      const kind = opts.kind ?? 'rock';
      const color = KINDS[kind].color;
      // The silhouette grows one readable feature per level.
      rr(g, -s * 0.28, -s * 0.42, s * 0.56, s * 0.42, s * 0.06, '#b8a88d');
      rr(g, -s * 0.32, -s * 0.5, s * 0.64, s * 0.12, s * 0.05, '#705d67');
      rr(g, -s * 0.07, -s * 0.19, s * 0.14, s * 0.19, s * 0.03, '#554456');
      circ(g, 0, -s * 0.32, s * 0.095, color);
      if (lv >= 2) {
        rr(g, s * 0.13, -s * 0.68, s * 0.1, s * 0.22, s * 0.02, '#7e7181');
        for (let i = 0; i < 2; i++)
          circ(g, s * (0.18 + i * 0.08), -s * (0.73 + i * 0.08) + Math.sin(t * 2 + i) * s * 0.02, s * 0.055, color);
      }
      if (lv >= 3) {
        rr(g, -s * 0.19, -s * 0.73, s * 0.31, s * 0.23, s * 0.03, '#cfc2a9');
        rr(g, -s * 0.22, -s * 0.77, s * 0.38, s * 0.07, s * 0.02, '#705d67');
      }
      if (lv >= 4) {
        g.fillStyle = '#f5dc88';
        g.beginPath();
        g.moveTo(-s * 0.23, -s * 0.42);
        g.lineTo(-s * 0.11, -s * 0.42);
        g.lineTo(-s * 0.11, -s * 0.23);
        g.lineTo(-s * 0.17, -s * 0.18);
        g.lineTo(-s * 0.23, -s * 0.23);
        g.closePath();
        g.fill();
        star(g, -s * 0.17, -s * 0.32, s * 0.035, '#fff8dd');
      }
      if (lv >= 5) {
        g.save();
        g.globalAlpha *= 0.55 + Math.sin(t * 3) * 0.12;
        g.fillStyle = color;
        g.beginPath();
        g.arc(0, -s * 0.72, s * 0.26, Math.PI, 0);
        g.fill();
        g.restore();
      }
      if (lv >= 5 && opts.formOn) {
        const a = t * 1.5;
        circ(g, Math.cos(a) * s * 0.33, -s * 0.78 + Math.sin(a) * s * 0.1, s * 0.065, color);
      }
      break;
    }
    case 'mill': {
      rr(g, -s * 0.16, -s * 0.55, s * 0.32, s * 0.55, s * 0.06, '#e8d6b0');
      rr(g, -s * 0.2, -s * 0.62, s * 0.4, s * 0.12, s * 0.06, '#b86b4a');
      rr(g, -s * 0.06, -s * 0.2, s * 0.12, s * 0.2, s * 0.05, '#7a4a30');
      g.save();
      g.translate(0, -s * 0.5);
      g.rotate(t * (building ? 0 : 1.2));
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 2);
        rr(g, -s * 0.05, -s * 0.46, s * 0.1, s * 0.4, s * 0.04, i % 2 ? '#ffd76a' : '#fff2c0');
      }
      circ(g, 0, 0, s * 0.06, '#8a5a36');
      g.restore();
      pennant(g, s * 0.12, -s * 0.62, s, lv, t);
      break;
    }
    case 'greenhouse': {
      rr(g, -s * 0.34, -s * 0.12, s * 0.68, s * 0.12, s * 0.04, '#8a6a4a');
      g.fillStyle = 'rgba(180,240,255,0.45)';
      g.beginPath();
      g.ellipse(0, -s * 0.12, s * 0.32, s * 0.36, 0, Math.PI, 0);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = s * 0.025;
      g.stroke();
      for (let i = -1; i <= 1; i++) {
        const sw = Math.sin(t * 2 + i) * 0.1;
        g.fillStyle = ['#5ecf5a', '#ff8fc8', '#7ae05a'][i + 1];
        g.beginPath();
        g.ellipse(i * s * 0.14, -s * 0.24, s * 0.06, s * 0.12, sw, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.ellipse(-s * 0.14, -s * 0.34, s * 0.05, s * 0.1, -0.5, 0, Math.PI * 2);
      g.fill();
      pennant(g, s * 0.2, -s * 0.4, s, lv, t);
      break;
    }
    case 'grove': {
      const cols = ['#7fdcff', '#b58cff', '#ff8fc8'];
      for (let i = -1; i <= 1; i++) {
        const hgt = s * (0.4 + (i === 0 ? 0.2 : 0) + lv * 0.02);
        g.fillStyle = cols[i + 1];
        g.beginPath();
        g.moveTo(i * s * 0.16 - s * 0.08, 0);
        g.lineTo(i * s * 0.18 - s * 0.02, -hgt);
        g.lineTo(i * s * 0.16 + s * 0.08, 0);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.moveTo(i * s * 0.16 - s * 0.03, -s * 0.05);
        g.lineTo(i * s * 0.18 - s * 0.02, -hgt * 0.9);
        g.lineTo(i * s * 0.16, -s * 0.05);
        g.fill();
      }
      const tw = 0.5 + Math.sin(t * 5) * 0.5;
      g.globalAlpha *= tw;
      star(g, s * 0.2, -s * 0.5, s * 0.05, '#ffffff');
      g.globalAlpha = building ? 0.55 : 1;
      pennant(g, -s * 0.3, -s * 0.05, s, lv, t);
      break;
    }
    case 'den': {
      g.fillStyle = '#7a5a3a';
      g.beginPath();
      g.ellipse(0, 0, s * 0.38, s * 0.34, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = '#5ecf6a';
      g.beginPath();
      g.ellipse(0, -s * 0.24, s * 0.36, s * 0.14, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = '#3a2418';
      g.beginPath();
      g.ellipse(0, 0, s * 0.12, s * 0.16, 0, Math.PI, 0);
      g.fill();
      circ(g, s * 0.2, -s * 0.12, s * 0.05, '#ffe066');
      for (let i = 0; i < Math.min(lv, 4); i++) circ(g, -s * 0.28 + i * s * 0.07, -s * 0.36 - (i % 2) * s * 0.03, s * 0.03, '#ff8fc8');
      pennant(g, s * 0.28, -s * 0.2, s, lv, t);
      break;
    }
    case 'launch_bay': {
      // The widening pad and added fittings make each Bay level recognizable.
      rr(g, -s * 0.38, -s * 0.12, s * 0.76, s * 0.12, s * 0.04, '#677590');
      rr(g, -s * 0.3, -s * 0.16, s * 0.6, s * 0.05, s * 0.02, '#d8e4ff');
      rr(g, -s * 0.32, -s * 0.67, s * 0.07, s * 0.52, s * 0.025, '#a4b1cb');
      rr(g, -s * 0.3, -s * 0.67, s * 0.3, s * 0.06, s * 0.02, '#a4b1cb');
      rr(g, -s * 0.22, -s * 0.45, s * 0.1, s * 0.28, s * 0.02, '#d9b46b');
      if (lv >= 2) {
        rr(g, s * 0.17, -s * 0.34, s * 0.12, s * 0.18, s * 0.02, '#d9b46b');
        for (let i = 0; i < 3; i++)
          circ(g, -s * 0.19 + i * s * 0.18, -s * 0.18, s * 0.018, Math.sin(t * 3 + i) > 0 ? '#ffe87c' : '#b4a466');
      }
      if (lv >= 3) {
        // Keep the booth left of both the rocket and second rack.
        rr(g, -s * 0.45, -s * 0.43, s * 0.14, s * 0.3, s * 0.03, '#8fb9d6');
        rr(g, -s * 0.43, -s * 0.39, s * 0.1, s * 0.1, s * 0.015, '#dff6ff');
      }
      if (lv >= 4) {
        rr(g, s * 0.34, -s * 0.53, s * 0.05, s * 0.36, s * 0.02, '#b8c4da');
        circ(g, s * 0.365, -s * 0.55, s * 0.085, '#d8e4ff');
        rr(g, s * 0.38, -s * 0.24, s * 0.09, s * 0.16, s * 0.02, '#52657b');
      }
      if (lv >= 5) {
        rr(g, -s * 0.38, -s * 0.12, s * 0.76, s * 0.025, s * 0.01, '#b9f6ee');
        star(g, s * 0.365, -s * 0.55, s * 0.045, '#fff3b2');
      }
      // An expedition rocket remains on its pad.
      g.save();
      g.translate(0, -s * 0.16);
      rr(g, -s * 0.07, -s * 0.3, s * 0.14, s * 0.28, s * 0.07, '#ffffff');
      g.fillStyle = '#ff6a7a';
      g.beginPath();
      g.moveTo(-s * 0.07, -s * 0.2);
      g.quadraticCurveTo(0, -s * 0.42, s * 0.07, -s * 0.2);
      g.fill();
      circ(g, 0, -s * 0.16, s * 0.035, '#6ec8ff');
      g.restore();
      pennant(g, -s * 0.3, -s * 0.67, s * 0.7, lv, t);
      break;
    }
    case 'observatory': {
      rr(g, -s * 0.26, -s * 0.3, s * 0.52, s * 0.3, s * 0.04, '#d8d0f0');
      g.fillStyle = '#6e8cff';
      g.beginPath();
      g.arc(0, -s * 0.3, s * 0.26, Math.PI, 0);
      g.fill();
      g.save();
      g.translate(s * 0.05, -s * 0.42);
      g.rotate(-0.6 + Math.sin(t * 0.5) * 0.2);
      rr(g, -s * 0.04, -s * 0.3, s * 0.08, s * 0.3, s * 0.03, '#3a3a5a');
      g.restore();
      rr(g, -s * 0.05, -s * 0.16, s * 0.1, s * 0.16, s * 0.04, '#5a4a8a');
      pennant(g, -s * 0.22, -s * 0.3, s, lv, t);
      break;
    }
    case 'fountain': {
      rr(g, -s * 0.3, -s * 0.12, s * 0.6, s * 0.12, s * 0.05, '#b8c4e0');
      rr(g, -s * 0.05, -s * 0.34, s * 0.1, s * 0.24, s * 0.03, '#c9d2ea');
      for (let i = 0; i < 5; i++) {
        const a = ((t * 1.5 + i / 5) % 1) * Math.PI;
        const x = Math.cos(a) * s * 0.22 * (i % 2 ? 1 : -1);
        const y = -s * 0.36 - Math.sin(a) * s * 0.16;
        circ(g, x, y, s * 0.03, 'rgba(160,230,255,0.9)');
      }
      star(g, 0, -s * 0.4, s * 0.06, '#ffd24a');
      break;
    }
    case 'lantern': {
      g.strokeStyle = '#5a4a8a';
      g.lineWidth = s * 0.04;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -s * 0.5);
      g.quadraticCurveTo(s * 0.1, -s * 0.6, s * 0.18, -s * 0.52);
      g.stroke();
      const glow = g.createRadialGradient(s * 0.18, -s * 0.42, 0, s * 0.18, -s * 0.42, s * 0.2);
      glow.addColorStop(0, `rgba(255,230,140,${0.6 + Math.sin(t * 3) * 0.2})`);
      glow.addColorStop(1, 'rgba(255,230,140,0)');
      g.fillStyle = glow;
      g.beginPath();
      g.arc(s * 0.18, -s * 0.42, s * 0.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff2b8';
      g.beginPath();
      g.arc(s * 0.18, -s * 0.42, s * 0.07, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'flowers': {
      for (let i = -2; i <= 2; i++) {
        const sw = Math.sin(t * 2 + i) * 0.1;
        const x = i * s * 0.1;
        const hgt = s * (0.18 + ((i + 5) % 3) * 0.05);
        g.strokeStyle = '#4f9e5a';
        g.lineWidth = s * 0.025;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + sw * s * 0.3, -hgt);
        g.stroke();
        const c = ['#ff8fc8', '#ffe066', '#b58cff', '#6ec8ff', '#ff6a7a'][i + 2];
        star(g, x + sw * s * 0.3, -hgt, s * 0.06, c);
      }
      break;
    }
    case 'statue': {
      rr(g, -s * 0.2, -s * 0.14, s * 0.4, s * 0.14, s * 0.03, '#b8c4e0');
      // a little golden Keeper
      rr(g, -s * 0.1, -s * 0.42, s * 0.2, s * 0.28, s * 0.07, '#ffc94a');
      circ(g, 0, -s * 0.52, s * 0.14, '#ffd76a');
      circ(g, 0, -s * 0.51, s * 0.09, shade('#ffc94a', -0.35));
      g.strokeStyle = '#ffc94a';
      g.lineWidth = s * 0.05;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(s * 0.08, -s * 0.36);
      g.lineTo(s * 0.18, -s * 0.56);
      g.stroke();
      const tw = 0.5 + Math.sin(t * 4) * 0.5;
      g.globalAlpha *= tw;
      star(g, s * 0.2, -s * 0.62, s * 0.05, '#ffffff');
      break;
    }
    default: {
      const unreachable: never = type;
      throw new Error(`Unknown building: ${unreachable}`);
    }
  }
  g.restore();
  if (building) drawScaffold(g, s, t);
}

/** Scaffolding and a busy drone over a structure being built. */
function drawScaffold(g: G, s: number, t: number) {
  g.save();
  g.strokeStyle = '#ffb13d';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(-s * 0.3, 0);
  g.lineTo(-s * 0.3, -s * 0.6);
  g.moveTo(s * 0.3, 0);
  g.lineTo(s * 0.3, -s * 0.6);
  for (let i = 1; i <= 3; i++) {
    g.moveTo(-s * 0.3, -s * 0.2 * i);
    g.lineTo(s * 0.3, -s * 0.2 * i + s * 0.1);
  }
  g.stroke();
  drawDrone(g, Math.sin(t * 1.7) * s * 0.25, -s * 0.8 + Math.sin(t * 3.1) * s * 0.05, s * 0.5, t);
  g.restore();
}

export function drawDrone(g: G, x: number, y: number, s: number, t: number) {
  g.save();
  g.translate(x, y);
  rr(g, -s * 0.22, -s * 0.08, s * 0.44, s * 0.16, s * 0.08, '#e8e4ff');
  circ(g, 0, 0, s * 0.07, '#6ec8ff');
  for (const sx of [-1, 1]) {
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.ellipse(sx * s * 0.26, -s * 0.12, s * 0.14 * Math.abs(Math.sin(t * 30)), s * 0.03, 0, 0, Math.PI * 2);
    g.fill();
  }
  // welding sparks
  if (Math.sin(t * 9) > 0.3) {
    circ(g, 0, s * 0.2, s * 0.03, '#ffe066');
    circ(g, s * 0.05, s * 0.26, s * 0.02, '#ff8a3d');
  }
  g.restore();
}

/** A smoking meteor rock sitting on a plot. */
export function drawDebris(g: G, s: number, t: number) {
  g.save();
  g.fillStyle = '#6a5a70';
  g.beginPath();
  const pts = [1, 0.8, 1.05, 0.9, 1, 0.85, 0.95];
  pts.forEach((k, i) => {
    const a = Math.PI + (i / (pts.length - 1)) * Math.PI;
    g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * 0.26 * k, Math.sin(a) * s * 0.24 * k);
  });
  g.closePath();
  g.fill();
  circ(g, -s * 0.06, -s * 0.1, s * 0.05, '#ff8a3d');
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.6 + i / 3) % 1;
    g.fillStyle = `rgba(200,190,220,${0.5 * (1 - u)})`;
    g.beginPath();
    g.arc(Math.sin(u * 6 + i) * s * 0.06, -s * 0.2 - u * s * 0.5, s * (0.05 + u * 0.08), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
