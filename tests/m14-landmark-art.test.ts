import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { drawFloatingIsle, drawIsleDecoration, drawRoadLandmark, roadLandmarkPlacement } from '../src/ui/art/landmarks';

/** Records the real art's painted bounds and an optional SVG for visual inspection, without a browser. */
function artCanvas() {
  type State = { x: number; y: number; sx: number; sy: number; fillStyle: string; strokeStyle: string; lineWidth: number };
  const state: State = { x: 0, y: 0, sx: 1, sy: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 };
  const stack: State[] = [];
  const bounds: { left: number; top: number; right: number; bottom: number }[] = [];
  const svg: string[] = [];
  let points: [number, number][] = [];
  const point = (x: number, y: number): [number, number] => [state.x + x * state.sx, state.y + y * state.sy];
  const box = (left: number, top: number, right: number, bottom: number, color: unknown) => {
    if (typeof color === 'string' && !color.startsWith('rgba')) bounds.push({ left, top, right, bottom });
  };
  const g = {
    ...state,
    save: () => stack.push({ ...state }),
    restore: () => Object.assign(state, stack.pop()),
    translate: (x: number, y: number) => {
      state.x += x * state.sx;
      state.y += y * state.sy;
    },
    scale: (x: number, y: number) => {
      state.sx *= x;
      state.sy *= y;
    },
    beginPath: () => {
      points = [];
    },
    moveTo: (x: number, y: number) => {
      points.push(point(x, y));
    },
    lineTo: (x: number, y: number) => {
      points.push(point(x, y));
    },
    createRadialGradient: () => ({ addColorStop() {} }),
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => {
      points.push(point(cx, cy), point(x, y));
    },
    arc: (x: number, y: number, r: number) => {
      const [cx, cy] = point(x, y);
      box(cx - r * state.sx, cy - r * state.sy, cx + r * state.sx, cy + r * state.sy, state.fillStyle);
    },
    roundRect: (x: number, y: number, width: number, height: number) => {
      const [left, top] = point(x, y);
      box(left, top, left + width * state.sx, top + height * state.sy, state.fillStyle);
    },
    closePath: () => {
      if (points.length) points.push(points[0]);
    },
    ellipse: (x: number, y: number, rx: number, ry: number) => {
      const [cx, cy] = point(x, y);
      const ax = rx * state.sx,
        ay = ry * state.sy;
      box(cx - ax, cy - ay, cx + ax, cy + ay, state.fillStyle);
      svg.push(`<ellipse cx="${cx}" cy="${cy}" rx="${ax}" ry="${ay}" fill="${state.fillStyle}"/>`);
    },
    fillRect: (x: number, y: number, width: number, height: number) => {
      const [left, top] = point(x, y);
      box(left, top, left + width * state.sx, top + height * state.sy, state.fillStyle);
      svg.push(`<rect x="${left}" y="${top}" width="${width * state.sx}" height="${height * state.sy}" fill="${state.fillStyle}"/>`);
    },
    fill: () => {
      if (points.length) svg.push(`<polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="${state.fillStyle}"/>`);
    },
    stroke: () => {
      const radius = (state.lineWidth * state.sx) / 2;
      for (const [x, y] of points) box(x - radius, y - radius, x + radius, y + radius, state.strokeStyle);
      svg.push(
        `<polyline points="${points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${state.strokeStyle}" stroke-width="${radius * 2}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    },
  };
  const canvas = new Proxy(g, {
    get: (target, key) => (key in state ? state[key as keyof State] : target[key as keyof typeof target]),
    set: (_target, key, value) => {
      if (key in state) Object.assign(state, { [key]: value });
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g: canvas, bounds, svg };
}

it('the earned Sky Loom keepsake stands at all three child-selected anchors without overlapping the landmark', () => {
  const size = 74;
  const scene = artCanvas();
  const anchors = drawFloatingIsle(scene.g, 100, 100, size);
  const site = artCanvas();
  const placement = roadLandmarkPlacement(100, 100, size);
  drawRoadLandmark(site.g, 4, placement.x, placement.y, placement.size);
  const siteBottom = Math.max(...site.bounds.map((box) => box.bottom));
  for (const [x, y] of anchors) {
    const decor = artCanvas();
    drawIsleDecoration(decor.g, 'decor_sky_loom', x, y, size * 0.52);
    const left = Math.min(...decor.bounds.map((box) => box.left));
    const right = Math.max(...decor.bounds.map((box) => box.right));
    const top = Math.min(...decor.bounds.map((box) => box.top));
    const bottom = Math.max(...decor.bounds.map((box) => box.bottom));
    expect(right - left).toBeLessThan(size * 0.23);
    expect(top).toBeGreaterThan(siteBottom);
    expect(bottom).toBeLessThanOrEqual(y + 0.01); // The solid keepsake stands on the anchor.
    drawIsleDecoration(scene.g, 'decor_sky_loom', x, y, size * 0.52);
  }
  drawRoadLandmark(scene.g, 4, placement.x, placement.y, placement.size);
  if (process.env.M14_ART_REPORT === '1')
    writeFileSync(
      '/private/tmp/m14-fx/isle.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="640" viewBox="40 40 120 96"><rect x="40" y="40" width="120" height="96" fill="#18233a"/>${scene.svg.join('')}</svg>`,
    );
});

it('the site also clears lanterns and statues with all three anchors occupied', () => {
  const size = 74;
  const scene = artCanvas();
  const anchors = drawFloatingIsle(scene.g, 100, 100, size);
  const placement = roadLandmarkPlacement(100, 100, size);
  const site = artCanvas();
  drawRoadLandmark(site.g, 4, placement.x, placement.y, placement.size);
  const siteBottom = Math.max(...site.bounds.map((box) => box.bottom));
  for (const [x, y] of anchors)
    for (const id of ['decor_sky_loom', 'lantern', 'statue']) {
      const decoration = artCanvas();
      drawIsleDecoration(decoration.g, id, x, y, size * 0.52);
      expect(Math.min(...decoration.bounds.map((box) => box.top)), `${id} at ${x},${y}`).toBeGreaterThan(siteBottom);
    }
});
