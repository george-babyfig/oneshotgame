// Soft chapter scenery; its low contrast keeps the planet and aim guide clear.
import { canvasDpr } from '../devcapture';
type G = CanvasRenderingContext2D;

const PALETTES = [
  ['#786e9f', '#b18c9f', '#e8b7a3'],
  ['#82647e', '#bd786d', '#e5a37f'],
  ['#4b7898', '#6eabb1', '#afd8ce'],
  ['#607ea6', '#a3bad2', '#d7e3ef'],
  ['#567e7c', '#8eb79b', '#c3d5a3'],
  ['#5e6b9b', '#859dbe', '#cfb0c8'],
] as const;

function paintChapterBackdrop(g: G, chapter: number, w: number, h: number): void {
  const palette = PALETTES[(chapter - 1) % PALETTES.length];
  const cycle = Math.floor((chapter - 1) / PALETTES.length);
  g.save();
  g.globalAlpha = 0.18;
  for (let layer = 0; layer < 3; layer++) {
    g.fillStyle = palette[layer];
    g.beginPath();
    g.ellipse(w * (0.08 + layer * 0.09), h * (0.72 + layer * 0.08), w * 0.42, h * (0.25 - layer * 0.03), 0, 0, Math.PI * 2);
    g.ellipse(w * (0.91 - layer * 0.07), h * (0.77 + layer * 0.06), w * 0.35, h * (0.2 - layer * 0.02), 0, 0, Math.PI * 2);
    g.fill();
  }
  const motif = (chapter - 1) % 6;
  g.strokeStyle = palette[2];
  g.lineWidth = Math.max(2, w * 0.006);
  g.globalAlpha = 0.17;
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.21);
    const y = h * (0.12 + (i % 3) * 0.07);
    g.beginPath();
    if (motif === 1 || motif === 5) {
      g.moveTo(x, y + 14);
      g.lineTo(x + 7, y - 14);
      g.lineTo(x + 15, y + 12);
    } else if (motif === 2 || motif === 3) {
      g.arc(x, y, 10 + (i % 2) * 6, 0.1, Math.PI * 1.2);
    } else {
      g.ellipse(x, y, 7, 17, i * 0.3, 0, Math.PI * 2);
    }
    g.stroke();
  }
  if (cycle) {
    g.fillStyle = `hsla(${(chapter * 37) % 360},45%,65%,0.08)`;
    g.fillRect(0, 0, w, h);
  }
  g.restore();
}

const backdropCache = new Map<string, HTMLCanvasElement>();

/** Draw on top of the star field but behind the planet. */
export function drawChapterBackdrop(g: G, chapter: number, w: number, h: number, time = 0, reduceMotion = false): void {
  if (w <= 0 || h <= 0) return;
  const dpr = canvasDpr();
  const key = `${chapter}|${w}|${h}|${dpr}`;
  let canvas = backdropCache.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.ceil((w + 32) * dpr);
    canvas.height = Math.ceil(h * dpr);
    const bg = canvas.getContext('2d')!;
    bg.setTransform(dpr, 0, 0, dpr, 16 * dpr, 0);
    paintChapterBackdrop(bg, chapter, w, h);
    if (backdropCache.size >= 8) backdropCache.delete(backdropCache.keys().next().value!);
    backdropCache.set(key, canvas);
  }
  const drift = reduceMotion ? 0 : Math.sin(time * 0.12) * Math.min(8, w * 0.02);
  g.drawImage(canvas, (16 - drift) * dpr, 0, w * dpr, h * dpr, 0, 0, w, h);
}

const cardUrls = new Map<number, string>();
export function chapterBackdropUrl(chapter: number): string {
  const cached = cardUrls.get(chapter);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 180;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#171833';
  g.fillRect(0, 0, 440, 180);
  drawChapterBackdrop(g, chapter, 440, 180, 0, true);
  const url = canvas.toDataURL();
  cardUrls.set(chapter, url);
  return url;
}
