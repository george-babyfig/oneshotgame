// The Keeper: the player's little astronaut who flings everything, plus its
// launcher and the trail its throws leave. Same house style as the critters.
import { COSMETIC_BY_ID, fullSet, type Look } from '../../meta/cosmetics';
import { shade } from './color';

type G = CanvasRenderingContext2D;

const col = (id: string, i: number, fb: string) => COSMETIC_BY_ID[id]?.colors[i] ?? fb;

function suitFill(g: G, c: string, r: number, t: number) {
  if (c !== 'aurora') return c;
  const gr = g.createLinearGradient(-r, -r, r, r);
  const k = (Math.sin(t * 1.5) + 1) / 2;
  gr.addColorStop(0, '#ff8fc8');
  gr.addColorStop(0.35 + k * 0.2, '#6ec8ff');
  gr.addColorStop(1, '#b8ff6e');
  return gr;
}

export interface KeeperPose {
  /** -1..1: leaning back while aiming. */
  lean?: number;
  /** 0..1: arms-up cheer. */
  cheer?: number;
  /** Look toward this angle (radians) with the eyes. */
  look?: number;
  /** Play the look's emote; `et` = seconds since it started. */
  emote?: boolean;
  et?: number;
}

/** Draws the Keeper standing with its feet at (x, y). size ≈ total height. */
export function drawKeeper(g: G, look: Look, x: number, y: number, size: number, t: number, pose: KeeperPose = {}) {
  const r = size * 0.3; // helmet radius
  const lean = pose.lean ?? 0;
  let cheer = pose.cheer ?? 0;
  // emote choreography
  const em = pose.emote ? look.emote : '';
  const et = pose.et ?? t;
  let dx = 0;
  let dy = 0;
  let spin = 0;
  let wave = false;
  switch (em) {
    case 'em_cheer':
      cheer = 0.6 + Math.abs(Math.sin(et * 5)) * 0.4;
      break;
    case 'em_wave':
      wave = true;
      break;
    case 'em_jump': {
      const k = (et % 1.1) / 0.7;
      dy = k < 1 ? -Math.sin(k * Math.PI) * size * 0.45 : 0;
      cheer = k < 1 ? 1 : 0.3;
      break;
    }
    case 'em_spin':
      spin = et % 1.6 < 0.8 ? ((et % 1.6) / 0.8) * Math.PI * 2 : 0;
      cheer = 1;
      break;
    case 'em_dance':
      dx = Math.sin(et * 8) * size * 0.08;
      spin = Math.sin(et * 8) * 0.18;
      cheer = 0.5 + Math.sin(et * 16) * 0.5;
      break;
    case 'em_flag':
    case 'em_fireworks':
      cheer = em === 'em_fireworks' ? 1 : 0.2;
      wave = em === 'em_flag';
      break;
  }
  const bob = Math.sin(t * 3) * size * 0.015 - cheer * size * 0.08;
  const body = look.suit;
  const main = col(body, 0, '#6ec8ff');
  const trim = col(body, 1, '#ffffff');
  const visor = col(body, 2, '#1d2a5e');
  const set = fullSet(look);
  g.save();
  if (em === 'em_fireworks') drawFireworks(g, x, y - size * 1.25, size, et);
  g.translate(x + dx, y + bob + dy);
  g.rotate(lean * -0.18);
  if (spin) {
    g.translate(0, -size * 0.45);
    g.rotate(spin);
    g.translate(0, size * 0.45);
  }
  // set flourish
  if (set) {
    const gl = g.createRadialGradient(0, -size * 0.45, 0, 0, -size * 0.45, size * 0.75);
    gl.addColorStop(0, 'rgba(255,215,90,0.45)');
    gl.addColorStop(1, 'rgba(255,215,90,0)');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(0, -size * 0.45, size * 0.75, 0, Math.PI * 2);
    g.fill();
  }
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.ellipse(0, 0, size * 0.26, size * 0.05, 0, 0, Math.PI * 2);
  g.fill();
  // legs
  g.fillStyle = shade(main === 'aurora' ? '#6ec8ff' : main, -0.25);
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.roundRect(sx * size * 0.1 - size * 0.07, -size * 0.2, size * 0.14, size * 0.2, size * 0.05);
    g.fill();
  }
  // backpack
  g.fillStyle = shade(main === 'aurora' ? '#b58cff' : main, -0.35);
  g.beginPath();
  g.roundRect(-size * 0.27, -size * 0.52, size * 0.14, size * 0.28, size * 0.05);
  g.fill();
  // torso
  g.fillStyle = suitFill(g, main, size * 0.3, t);
  g.beginPath();
  g.roundRect(-size * 0.2, -size * 0.52, size * 0.4, size * 0.36, size * 0.13);
  g.fill();
  // belt / trim
  g.fillStyle = trim;
  g.beginPath();
  g.roundRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.06, size * 0.03);
  g.fill();
  g.fillStyle = set ? '#ffd24a' : '#ff6a7a';
  g.beginPath();
  g.arc(0, -size * 0.25, size * 0.035, 0, Math.PI * 2);
  g.fill();
  // arms (raised when cheering)
  g.strokeStyle = suitFill(g, main, size * 0.3, t);
  g.lineCap = 'round';
  g.lineWidth = size * 0.1;
  for (const sx of [-1, 1]) {
    const up = wave && sx > 0 ? 1 : cheer > 0 ? cheer : sx > 0 ? Math.max(0, lean) * 0.6 : 0;
    const ax = sx * size * (0.28 - up * 0.02) + (wave && sx > 0 ? Math.sin(et * 12) * size * 0.08 : 0);
    const ay = -size * (0.34 + up * 0.32);
    if (em === 'em_flag' && sx > 0) {
      // a little flag on a pole
      g.save();
      g.strokeStyle = '#e8e4ff';
      g.lineWidth = size * 0.03;
      g.beginPath();
      g.moveTo(ax, ay + size * 0.1);
      g.lineTo(ax, ay - size * 0.45);
      g.stroke();
      g.fillStyle = col(look.suit, 0, '#ff6a7a') === 'aurora' ? '#ff8fc8' : col(look.suit, 0, '#ff6a7a');
      g.beginPath();
      g.moveTo(ax, ay - size * 0.45);
      g.quadraticCurveTo(ax + size * 0.18, ay - size * 0.42 + Math.sin(et * 9) * size * 0.04, ax + size * 0.32, ay - size * 0.38);
      g.lineTo(ax, ay - size * 0.26);
      g.fill();
      star(g, ax + size * 0.12, ay - size * 0.36, size * 0.04, '#fff6b0');
      g.restore();
      g.strokeStyle = suitFill(g, main, size * 0.3, t);
      g.lineWidth = size * 0.1;
      g.lineCap = 'round';
    }
    g.beginPath();
    g.moveTo(sx * size * 0.16, -size * 0.44);
    g.lineTo(ax, ay);
    g.stroke();
    g.fillStyle = trim;
    g.beginPath();
    g.arc(ax, ay, size * 0.055, 0, Math.PI * 2);
    g.fill();
  }
  // helmet
  const hy = -size * 0.72;
  g.fillStyle = trim;
  g.beginPath();
  g.arc(0, hy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = shade(trim === '#ffffff' ? '#c9d2ea' : trim, -0.15);
  g.lineWidth = size * 0.025;
  g.stroke();
  // visor with a face
  g.fillStyle = visor;
  g.beginPath();
  g.ellipse(0, hy + r * 0.08, r * 0.74, r * 0.6, 0, 0, Math.PI * 2);
  g.fill();
  const lx = Math.cos(pose.look ?? -Math.PI / 2) * r * 0.08;
  const ly = Math.sin(pose.look ?? -Math.PI / 2) * r * 0.06;
  for (const sx of [-1, 1]) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(sx * r * 0.28 + lx, hy + r * 0.05 + ly, r * 0.15, cheer > 0.5 ? r * 0.06 : r * 0.19, 0, 0, Math.PI * 2);
    g.fill();
    if (cheer <= 0.5) {
      g.fillStyle = '#231a33';
      g.beginPath();
      g.arc(sx * r * 0.28 + lx * 1.4, hy + r * 0.08 + ly * 1.4, r * 0.1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(sx * r * 0.28 + lx * 1.4 - r * 0.04, hy + r * 0.03 + ly * 1.4, r * 0.035, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,120,160,0.55)';
    g.beginPath();
    g.ellipse(sx * r * 0.5, hy + r * 0.3, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = size * 0.02;
  g.beginPath();
  g.arc(0, hy + r * 0.25, r * (cheer > 0.3 ? 0.16 : 0.1), 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  // visor shine
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(-r * 0.38, hy - r * 0.2, r * 0.14, r * 0.08, -0.6, 0, Math.PI * 2);
  g.fill();
  drawHat(g, look.hat, 0, hy, r, t);
  g.restore();
}

function drawHat(g: G, id: string, x: number, hy: number, r: number, t: number) {
  const c0 = col(id, 0, '#ffffff');
  const c1 = col(id, 1, '#ffffff');
  const top = hy - r;
  g.save();
  switch (id) {
    case 'hat_antenna': {
      g.strokeStyle = '#c9d2ea';
      g.lineWidth = r * 0.1;
      g.beginPath();
      g.moveTo(x + r * 0.3, top + r * 0.15);
      g.lineTo(x + r * 0.45, top - r * 0.45);
      g.stroke();
      g.fillStyle = c0;
      g.shadowColor = c0;
      g.shadowBlur = 6 + Math.sin(t * 5) * 4;
      g.beginPath();
      g.arc(x + r * 0.45, top - r * 0.5, r * 0.16, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'hat_sprout': {
      g.strokeStyle = shade(c0, -0.3);
      g.lineWidth = r * 0.1;
      g.beginPath();
      g.moveTo(x, top + r * 0.05);
      g.lineTo(x, top - r * 0.3);
      g.stroke();
      g.fillStyle = c0;
      const sw = Math.sin(t * 2) * 0.15;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(x + sx * r * 0.28, top - r * 0.38, r * 0.3, r * 0.14, sx * (0.5 + sw), 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'hat_bunny': {
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(x + sx * r * 0.45, top + r * 0.2);
        g.rotate(sx * 0.25 + Math.sin(t * 2 + sx) * 0.06);
        g.fillStyle = c0;
        g.beginPath();
        g.ellipse(0, -r * 0.55, r * 0.22, r * 0.6, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = c1;
        g.beginPath();
        g.ellipse(0, -r * 0.55, r * 0.11, r * 0.42, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      break;
    }
    case 'hat_horns': {
      for (const sx of [-1, 1]) {
        g.fillStyle = c0;
        g.beginPath();
        g.moveTo(x + sx * r * 0.35, top + r * 0.25);
        g.quadraticCurveTo(x + sx * r * 0.95, top - r * 0.1, x + sx * r * 0.75, top - r * 0.6);
        g.quadraticCurveTo(x + sx * r * 0.6, top - r * 0.05, x + sx * r * 0.1, top + r * 0.12);
        g.closePath();
        g.fill();
      }
      g.fillStyle = c1;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(x + i * r * 0.22 - r * 0.1, top + r * 0.08);
        g.lineTo(x + i * r * 0.22, top - r * 0.18);
        g.lineTo(x + i * r * 0.22 + r * 0.1, top + r * 0.08);
        g.fill();
      }
      break;
    }
    case 'hat_flower': {
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        const fx = x + Math.cos(a) * r * 0.82;
        const fy = hy + Math.sin(a) * r * 0.82;
        g.fillStyle = i % 2 ? c1 : c0;
        for (let k = 0; k < 5; k++) {
          const b = (k / 5) * Math.PI * 2 + t * 0.5;
          g.beginPath();
          g.arc(fx + Math.cos(b) * r * 0.1, fy + Math.sin(b) * r * 0.1, r * 0.09, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(fx, fy, r * 0.06, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'hat_wizard': {
      g.fillStyle = c0;
      g.beginPath();
      g.moveTo(x - r * 0.75, top + r * 0.3);
      g.quadraticCurveTo(x + r * 0.1, top - r * 0.5, x + r * 0.55, top - r * 1.15 + Math.sin(t * 2) * r * 0.05);
      g.quadraticCurveTo(x + r * 0.35, top - r * 0.3, x + r * 0.75, top + r * 0.3);
      g.closePath();
      g.fill();
      g.fillStyle = shade(c0, -0.25);
      g.beginPath();
      g.ellipse(x, top + r * 0.3, r * 0.85, r * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      star(g, x + r * 0.05, top - r * 0.25, r * 0.16, c1);
      star(g, x + r * 0.35, top - r * 0.7, r * 0.1, c1);
      break;
    }
    case 'hat_crown': {
      g.fillStyle = c0;
      g.beginPath();
      g.moveTo(x - r * 0.5, top + r * 0.18);
      g.lineTo(x - r * 0.55, top - r * 0.35);
      g.lineTo(x - r * 0.25, top - r * 0.1);
      g.lineTo(x, top - r * 0.48);
      g.lineTo(x + r * 0.25, top - r * 0.1);
      g.lineTo(x + r * 0.55, top - r * 0.35);
      g.lineTo(x + r * 0.5, top + r * 0.18);
      g.closePath();
      g.fill();
      g.fillStyle = c1;
      g.beginPath();
      g.arc(x, top - r * 0.02, r * 0.09, 0, Math.PI * 2);
      g.fill();
      sparkle(g, x + r * 0.55, top - r * 0.45, r * 0.12, t);
      break;
    }
    case 'hat_beanie': {
      g.fillStyle = c0;
      g.beginPath();
      g.arc(x, top + r * 0.55, r * 0.78, Math.PI * 1.08, Math.PI * 1.92);
      g.closePath();
      g.fill();
      g.fillStyle = c1;
      g.beginPath();
      g.roundRect(x - r * 0.78, top + r * 0.28, r * 1.56, r * 0.22, r * 0.1);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = r * 0.05;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(x + i * r * 0.24, top + r * 0.28);
        g.lineTo(x + i * r * 0.2, top - r * 0.12);
        g.stroke();
      }
      g.fillStyle = c1;
      g.beginPath();
      g.arc(x, top - r * 0.26 + Math.sin(t * 3) * r * 0.03, r * 0.18, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'hat_halo': {
      g.strokeStyle = c0;
      g.shadowColor = c0;
      g.shadowBlur = 10;
      g.lineWidth = r * 0.14;
      g.beginPath();
      g.ellipse(x, top - r * 0.35 + Math.sin(t * 2.5) * r * 0.06, r * 0.62, r * 0.18, 0, 0, Math.PI * 2);
      g.stroke();
      break;
    }
  }
  g.restore();
}

function drawFireworks(g: G, x: number, y: number, size: number, et: number) {
  const cols = ['#ff6a7a', '#ffd24a', '#5ef2b0', '#6ec8ff', '#b58cff'];
  for (let i = 0; i < 3; i++) {
    const k = ((et + i * 0.37) % 1.1) / 1.1;
    const cx = x + (i - 1) * size * 0.55;
    const cy = y - (i % 2) * size * 0.25;
    g.globalAlpha = 1 - k;
    g.fillStyle = cols[(i + Math.floor((et + i * 0.37) / 1.1)) % cols.length];
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + Math.cos(a) * k * size * 0.35, cy + Math.sin(a) * k * size * 0.35 + k * k * size * 0.1, size * 0.025, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
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

function sparkle(g: G, x: number, y: number, r: number, t: number) {
  const k = 0.6 + Math.sin(t * 6) * 0.4;
  g.fillStyle = `rgba(255,255,255,${k})`;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

/** The launcher the object sits in, centred at (x, y). `pull` is the rubber-band offset. */
export function drawLauncher(g: G, id: string, x: number, y: number, t: number, pull = { x: 0, y: 0 }, band = '#ffffff', mastered = false) {
  const c0 = col(id, 0, '#c9c2ff');
  const c1 = col(id, 1, '#ffffff');
  g.save();
  if (mastered) {
    const gl = g.createRadialGradient(x, y + 10, 4, x, y + 10, 56);
    gl.addColorStop(0, `rgba(255,210,74,${0.35 + Math.sin(t * 3) * 0.1})`);
    gl.addColorStop(1, 'rgba(255,210,74,0)');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y + 10, 56, 0, Math.PI * 2);
    g.fill();
  }
  const forkBand = (lx: number, rx: number, ty: number) => {
    g.strokeStyle = band;
    g.globalAlpha = 0.75;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + lx, y + ty);
    g.lineTo(x + pull.x, y + pull.y);
    g.lineTo(x + rx, y + ty);
    g.stroke();
    g.globalAlpha = 1;
  };
  switch (id) {
    case 'l_twig':
    case 'l_petal': {
      g.strokeStyle = id === 'l_twig' ? c0 : '#4f9e5a';
      g.lineCap = 'round';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(x, y + 44);
      g.lineTo(x, y + 18);
      g.moveTo(x, y + 20);
      g.quadraticCurveTo(x - 24, y + 10, x - 28, y - 6);
      g.moveTo(x, y + 20);
      g.quadraticCurveTo(x + 24, y + 10, x + 28, y - 6);
      g.stroke();
      if (id === 'l_petal') {
        for (const sx of [-1, 1]) {
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 + t;
            g.fillStyle = k % 2 ? c0 : '#ffd0e6';
            g.beginPath();
            g.arc(x + sx * 28 + Math.cos(a) * 5, y - 8 + Math.sin(a) * 5, 4.5, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#ffe066';
          g.beginPath();
          g.arc(x + sx * 28, y - 8, 3, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        g.fillStyle = c1;
        g.beginPath();
        g.ellipse(x + 10, y + 30, 6, 3, -0.6, 0, Math.PI * 2);
        g.fill();
      }
      forkBand(-28, 28, -6);
      break;
    }
    case 'l_cannon': {
      g.fillStyle = shade(c0, -0.3);
      g.beginPath();
      g.roundRect(x - 26, y + 24, 52, 16, 8);
      g.fill();
      g.fillStyle = c0;
      g.beginPath();
      g.roundRect(x - 20, y - 4, 40, 34, 12);
      g.fill();
      g.fillStyle = c1;
      g.beginPath();
      g.roundRect(x - 22, y - 8, 44, 8, 4);
      g.fill();
      for (let i = 0; i < 3; i++) {
        g.fillStyle = `rgba(255,${180 + i * 25},80,${0.4 + 0.3 * Math.sin(t * 6 + i)})`;
        g.beginPath();
        g.arc(x - 10 + i * 10, y + 14, 3, 0, Math.PI * 2);
        g.fill();
      }
      forkBand(-20, 20, -6);
      break;
    }
    case 'l_crystal': {
      for (const sx of [-1, 1]) {
        g.fillStyle = c0;
        g.beginPath();
        g.moveTo(x + sx * 30, y - 16);
        g.lineTo(x + sx * 38, y + 6);
        g.lineTo(x + sx * 30, y + 34);
        g.lineTo(x + sx * 22, y + 6);
        g.closePath();
        g.fill();
        g.fillStyle = c1;
        g.beginPath();
        g.moveTo(x + sx * 30, y - 12);
        g.lineTo(x + sx * 33, y + 4);
        g.lineTo(x + sx * 29, y + 4);
        g.closePath();
        g.fill();
        sparkle(g, x + sx * 34, y - 14, 5, t + sx);
      }
      g.fillStyle = 'rgba(127,220,255,0.18)';
      g.beginPath();
      g.ellipse(x, y + 36, 40, 8, 0, 0, Math.PI * 2);
      g.fill();
      forkBand(-30, 30, -6);
      break;
    }
    case 'l_orbit': {
      g.strokeStyle = c0;
      g.shadowColor = c0;
      g.shadowBlur = 12;
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(x, y + 6, 40, 14, 0, 0, Math.PI * 2);
      g.stroke();
      g.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + (i * Math.PI * 2) / 3;
        star(g, x + Math.cos(a) * 40, y + 6 + Math.sin(a) * 14, 5, c1);
      }
      g.fillStyle = 'rgba(255,210,74,0.12)';
      g.beginPath();
      g.arc(x, y, 34, 0, Math.PI * 2);
      g.fill();
      forkBand(-38, 38, 4);
      break;
    }
    default: {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.beginPath();
      g.arc(x, y, 34, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 2;
      g.stroke();
      forkBand(-26, 26, 0);
    }
  }
  g.restore();
}

/** A throw's trail; `pts` oldest first. */
export function drawTrail(g: G, id: string, pts: { x: number; y: number }[], t: number, kindColor: string) {
  const n = pts.length;
  if (!n) return;
  g.save();
  pts.forEach((p, k) => {
    const a = (k + 1) / n;
    switch (id) {
      case 'tr_sparkle':
        if (k % 2) break;
        g.globalAlpha = a * 0.9;
        sparkle(g, p.x, p.y, 3 + a * 5, t + k);
        break;
      case 'tr_hearts':
        if (k % 3) break;
        g.globalAlpha = a * 0.8;
        heart(g, p.x, p.y, 3 + a * 5, col(id, 0, '#ff6a9a'));
        break;
      case 'tr_bubbles':
        if (k % 2) break;
        g.globalAlpha = a * 0.7;
        g.strokeStyle = col(id, 0, '#9fe6ff');
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(p.x + Math.sin(k + t * 4) * 3, p.y, 2 + a * 5, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'tr_embers':
        g.globalAlpha = a * 0.8;
        g.fillStyle = k % 2 ? col(id, 0, '#ff8a3d') : col(id, 1, '#ffd24a');
        g.beginPath();
        g.arc(p.x + Math.sin(k * 3 + t * 9) * 3, p.y - (1 - a) * 6, 1.5 + a * 3, 0, Math.PI * 2);
        g.fill();
        break;
      case 'tr_rainbow':
      case 'tr_cosmic': {
        const cs = COSMETIC_BY_ID[id].colors;
        if (k === 0) break;
        const q = pts[k - 1];
        g.globalAlpha = a * 0.75;
        g.lineCap = 'round';
        cs.forEach((cc, j) => {
          g.strokeStyle = cc;
          g.lineWidth = 2.2 + a * 1.5;
          const off = (j - (cs.length - 1) / 2) * 2.4 * a;
          g.beginPath();
          g.moveTo(q.x, q.y + off);
          g.lineTo(p.x, p.y + off);
          g.stroke();
        });
        if (id === 'tr_cosmic' && k % 4 === 0) sparkle(g, p.x, p.y, 4, t + k);
        break;
      }
      default:
        g.globalAlpha = a * 0.5;
        g.fillStyle = kindColor;
        g.beginPath();
        g.arc(p.x, p.y, 3 + k * 0.4, 0, Math.PI * 2);
        g.fill();
    }
  });
  g.restore();
}

function heart(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y + r * 0.8);
  g.bezierCurveTo(x - r * 1.2, y - r * 0.1, x - r * 0.6, y - r, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.6, y - r, x + r * 1.2, y - r * 0.1, x, y + r * 0.8);
  g.fill();
}

/** A static portrait canvas of the Keeper (UI, profile card). */
export function keeperCanvas(look: Look, px: number, t = 0.3, pose: KeeperPose = {}): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = `${px}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  drawKeeper(g, look, px / 2, px * 0.97, px * 0.78, t, pose);
  return cv;
}

/** A small preview tile for any cosmetic item. */
export function itemCanvas(id: string, look: Look, px: number, t = 0.3): HTMLCanvasElement {
  const x = COSMETIC_BY_ID[id];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = `${px}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  if (!x) return cv;
  if (x.slot === 'launcher') {
    g.translate(px / 2, px * 0.42);
    g.scale(px / 100, px / 100);
    drawLauncher(g, id, 0, 0, t, { x: 0, y: 8 });
  } else if (x.slot === 'trail') {
    const pts = Array.from({ length: 16 }, (_, k) => ({ x: px * 0.1 + k * px * 0.05, y: px * 0.7 - Math.sin(k / 5) * px * 0.4 }));
    drawTrail(g, id, pts, t, '#c9c2ff');
    g.fillStyle = '#9a8ea8';
    g.beginPath();
    g.arc(pts[15].x + px * 0.04, pts[15].y - px * 0.03, px * 0.08, 0, Math.PI * 2);
    g.fill();
  } else if (x.slot === 'emote') {
    drawKeeper(g, { ...look, emote: id }, px / 2, px * 0.97, px * 0.72, t, { emote: true, et: 0.35 });
  } else if (x.slot === 'hat') {
    const size = px * 1.15;
    drawKeeper(g, { ...look, hat: id }, px / 2, px * 0.6 + size * 0.72, size, t);
  } else {
    drawKeeper(g, { ...look, [x.slot]: id }, px / 2, px * 0.97, px * 0.95, t);
  }
  return cv;
}

/** Just the Keeper's helmet, for small avatar buttons. */
export function keeperHead(look: Look, px: number, t = 0.3): HTMLCanvasElement {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = `${px}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  const size = px * 1.2;
  drawKeeper(g, look, px / 2, px * 0.56 + size * 0.72, size, t);
  return cv;
}
