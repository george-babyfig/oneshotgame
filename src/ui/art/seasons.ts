// Seasonal weather drawn over scenes: snow, blossoms, fireflies, leaves, and
// meteor streaks during real meteor showers. Stateless: positions come from time.
import type { Season } from '../../meta/seasons';

type G = CanvasRenderingContext2D;
const fr = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => fr(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

export function drawSeason(g: G, w: number, h: number, time: number, season: Season, night = 0, count = 36) {
  g.save();
  for (let i = 0; i < count; i++) {
    const sp = 0.5 + rnd(i, 1) * 0.8;
    const x0 = rnd(i, 2) * w;
    switch (season) {
      case 'winter': {
        const y = fr(rnd(i, 3) + time * 0.05 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * sp + i) * 14;
        g.globalAlpha = 0.5 + rnd(i, 4) * 0.4;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x, y, 1.2 + rnd(i, 5) * 2.2, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'spring': {
        const y = fr(rnd(i, 3) + time * 0.035 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * 0.8 * sp + i) * 26;
        g.globalAlpha = 0.55;
        g.fillStyle = i % 3 ? '#ffc2dc' : '#ffe3ef';
        g.save();
        g.translate(x, y);
        g.rotate(time * sp + i);
        g.beginPath();
        g.ellipse(0, 0, 4, 2.4, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        break;
      }
      case 'autumn': {
        const y = fr(rnd(i, 3) + time * 0.03 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * 0.7 * sp + i) * 30;
        g.globalAlpha = 0.6;
        g.fillStyle = ['#ff8a3d', '#e0552f', '#ffc14a'][i % 3];
        g.save();
        g.translate(x, y);
        g.rotate(Math.sin(time * 2 + i) * 1.2);
        g.beginPath();
        g.moveTo(0, -5);
        g.quadraticCurveTo(5, 0, 0, 5);
        g.quadraticCurveTo(-5, 0, 0, -5);
        g.fill();
        g.restore();
        break;
      }
      case 'summer': {
        if (night < 0.3 || i > count * 0.6) break;
        const x = x0 + Math.sin(time * 0.6 * sp + i) * 20;
        const y = rnd(i, 3) * h * 0.9 + Math.cos(time * 0.5 * sp + i) * 16;
        const blink = Math.max(0, Math.sin(time * 2.2 * sp + i * 3));
        g.globalAlpha = blink * night;
        const gl = g.createRadialGradient(x, y, 0, x, y, 7);
        gl.addColorStop(0, 'rgba(230,255,140,0.95)');
        gl.addColorStop(1, 'rgba(230,255,140,0)');
        g.fillStyle = gl;
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.fill();
        break;
      }
    }
  }
  g.restore();
}

/** Occasional meteor streaks across the sky (meteor-shower days, or night-time). */
export function drawMeteors(g: G, w: number, h: number, time: number, rate = 1) {
  g.save();
  for (let i = 0; i < 3 * rate; i++) {
    const period = 3.5 + i * 1.3;
    const k = fr((time + i * 1.7) / period);
    if (k > 0.18) continue;
    const u = k / 0.18;
    const cyc = Math.floor((time + i * 1.7) / period);
    const sx = rnd(cyc, i) * w * 1.2;
    const sy = rnd(cyc, i + 9) * h * 0.4;
    const x = sx - u * w * 0.35;
    const y = sy + u * h * 0.2;
    const gr = g.createLinearGradient(x, y, x + 60, y - 34);
    gr.addColorStop(0, `rgba(255,255,255,${1 - u})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 60, y - 34);
    g.stroke();
  }
  g.restore();
}
