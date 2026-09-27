// Vector sprites for the six flingable objects.
import type { Kind } from '../../core/world';

type G = CanvasRenderingContext2D;

function eyesOn(g: G, x: number, y: number, r: number) {
  // tiny determined face so every object feels like a little character
  for (const sx of [-1, 1]) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x + sx * r * 0.28, y, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#231a33';
    g.beginPath();
    g.ellipse(x + sx * r * 0.28 + r * 0.03, y + r * 0.03, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawProjectile(g: G, kind: Kind, x: number, y: number, size: number, t: number, spin = 0) {
  const r = size / 2;
  g.save();
  g.translate(x, y);
  switch (kind) {
    case 'rock': {
      g.rotate(spin);
      g.fillStyle = '#9a8ea8';
      g.beginPath();
      const pts = [1, 0.85, 1.05, 0.9, 1, 0.8, 0.95, 0.9];
      pts.forEach((k, i) => {
        const a = (i / pts.length) * Math.PI * 2;
        const px = Math.cos(a) * r * k;
        const py = Math.sin(a) * r * k;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.moveTo(-r * 0.6, -r * 0.2);
      g.lineTo(-r * 0.2, -r * 0.7);
      g.lineTo(r * 0.3, -r * 0.55);
      g.lineTo(-r * 0.1, -r * 0.1);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.beginPath();
      g.arc(r * 0.35, r * 0.3, r * 0.18, 0, Math.PI * 2);
      g.fill();
      g.rotate(-spin);
      eyesOn(g, 0, -r * 0.05, r);
      break;
    }
    case 'ice': {
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
      gl.addColorStop(0, 'rgba(160,230,255,0.6)');
      gl.addColorStop(1, 'rgba(160,230,255,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      g.fill();
      g.rotate(spin * 0.5);
      g.fillStyle = '#7fdcff';
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.fillStyle = '#d8f6ff';
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55 - r * 0.1);
      }
      g.closePath();
      g.fill();
      g.rotate(-spin * 0.5);
      eyesOn(g, 0, 0, r * 0.9);
      break;
    }
    case 'magma': {
      const pulse = 1 + Math.sin(t * 8) * 0.06;
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.7);
      gl.addColorStop(0, 'rgba(255,150,60,0.7)');
      gl.addColorStop(1, 'rgba(255,90,30,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      g.fill();
      const body = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * pulse);
      body.addColorStop(0, '#ffe07a');
      body.addColorStop(0.5, '#ff8a3a');
      body.addColorStop(1, '#d9431e');
      g.fillStyle = body;
      g.beginPath();
      g.arc(0, 0, r * pulse, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(90,30,20,0.45)';
      for (const [dx, dy, rr] of [
        [0.4, 0.3, 0.2],
        [-0.45, 0.35, 0.14],
        [0.1, -0.55, 0.12],
      ]) {
        g.beginPath();
        g.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
        g.fill();
      }
      eyesOn(g, 0, -r * 0.05, r);
      break;
    }
    case 'seed': {
      g.rotate(Math.sin(t * 6) * 0.2);
      g.fillStyle = '#b5773f';
      g.beginPath();
      g.ellipse(0, r * 0.1, r * 0.75, r * 0.9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#d99a5a';
      g.beginPath();
      g.ellipse(-r * 0.2, -r * 0.1, r * 0.3, r * 0.5, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5fd66a';
      g.beginPath();
      g.ellipse(-r * 0.3, -r * 0.95, r * 0.35, r * 0.16, -0.6, 0, Math.PI * 2);
      g.ellipse(r * 0.3, -r * 0.95, r * 0.35, r * 0.16, 0.6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#3fa84a';
      g.lineWidth = r * 0.12;
      g.beginPath();
      g.moveTo(0, -r * 0.75);
      g.lineTo(0, -r * 1.05);
      g.stroke();
      eyesOn(g, 0, r * 0.15, r * 0.9);
      break;
    }
    case 'storm': {
      g.fillStyle = '#8fa6ff';
      for (let k = 0; k < 3; k++) {
        const dx = (k - 1) * r * 0.45;
        const dy = r * 0.8 + ((t * 3 + k * 0.33) % 1) * r * 0.6;
        g.beginPath();
        g.ellipse(dx, dy, r * 0.08, r * 0.16, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#e8eeff';
      for (const [dx, dy, rr] of [
        [-0.45, 0.15, 0.45],
        [0.1, -0.2, 0.6],
        [0.55, 0.15, 0.42],
        [0, 0.25, 0.5],
      ]) {
        g.beginPath();
        g.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(120,140,200,0.35)';
      g.beginPath();
      g.ellipse(0, r * 0.5, r * 0.9, r * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      eyesOn(g, 0, r * 0.05, r * 0.9);
      break;
    }
    case 'sun': {
      g.rotate(t * 1.5);
      g.fillStyle = '#ffb13d';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.beginPath();
        g.moveTo(Math.cos(a - 0.18) * r * 0.8, Math.sin(a - 0.18) * r * 0.8);
        g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
        g.lineTo(Math.cos(a + 0.18) * r * 0.8, Math.sin(a + 0.18) * r * 0.8);
        g.closePath();
        g.fill();
      }
      g.rotate(-t * 1.5);
      const body = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.9);
      body.addColorStop(0, '#fff6c2');
      body.addColorStop(1, '#ffc93d');
      g.fillStyle = body;
      g.beginPath();
      g.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      g.fill();
      eyesOn(g, 0, -r * 0.05, r * 0.95);
      break;
    }
  }
  g.restore();
}

/** Standalone canvas icon for DOM (queue bubbles, pre-level chips). */
export function projectileCanvas(kind: Kind, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr);
  c.style.width = c.style.height = `${px}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  drawProjectile(g, kind, px / 2, px / 2 + (kind === 'seed' ? px * 0.08 : 0), px * 0.6, 0.3);
  return c;
}
