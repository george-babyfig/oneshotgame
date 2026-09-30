import { SECTORS } from './world';
import { EMPTY_SKY_STATE, gustAt, skyShapesAt, type SkyDef, type SkyState } from './sky';

export interface FlightParams {
  launcher: 'sling';
  gravity: number;
  step: number;
  maxTime: number;
  collisionPadding: number;
}

export const STAR_SLING: Readonly<FlightParams> = {
  launcher: 'sling',
  gravity: 5.2e7,
  step: 1 / 240,
  maxTime: 5,
  collisionPadding: 6,
};

export interface FlightPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  elapsed: number;
}

export interface FlightLaunch extends FlightPoint {
  carry?: number;
  bounceCount?: number;
}

export interface FlightWorld {
  cx: number;
  cy: number;
  radius: number;
  gravity?: number;
  surface: readonly number[];
  rotation: number;
  spin: number;
  twist: string;
  wind: number;
  width: number;
  height: number;
  launcherY: number;
  bossActive?: boolean;
  sky?: SkyDef;
  skyState?: SkyState;
}

export type FlightHit =
  | { kind: 'land'; sector: number }
  | { kind: 'bonk'; by: 'moon' | 'rock' | 'ring' | 'bubble'; x: number; y: number; rock?: number }
  | { kind: 'fizzle'; x: number; y: number }
  | { kind: 'boss' | 'miss' };

export interface FlightResult {
  points: FlightPoint[];
  state: FlightLaunch;
  hit: FlightHit | null;
  sector: number | null;
  bounces: { x: number; y: number; elapsed: number }[];
}

function moonPositions(w: FlightWorld, time: number) {
  const { cx, cy, radius: R } = w;
  if (w.twist === 'boss') {
    if (!w.bossActive) return [];
    const r = R * 0.3;
    const dx = Math.min(R * 2.15, w.width / 2 - r * 1.3);
    const dy = Math.max(R * 1.2, Math.min(R * 1.75, w.launcherY - cy - r - 60));
    return [{ x: cx + Math.cos(time * 0.45) * dx, y: cy + Math.sin(time * 0.45) * dy, r }];
  }
  if (w.twist !== 'moon' && w.twist !== 'twin') return [];
  const a = time * 0.8;
  const d = R * 2.05;
  const dy = Math.max(R * 1.3, Math.min(d, w.launcherY - cy - R * 0.28 - 50));
  const moons = [{ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * dy, r: R * 0.28 }];
  if (w.twist === 'twin') {
    const b = -time * 0.6 + Math.PI;
    const e = R * 1.6;
    moons.push({ x: cx + Math.cos(b) * e, y: cy + Math.sin(b) * e, r: R * 0.22 });
  }
  return moons;
}

function rotationAt(w: FlightWorld, t0: number, elapsed: number) {
  if (w.twist !== 'wobble') return w.rotation + w.spin * elapsed;
  return w.rotation + ((w.spin * 1.7) / 0.9) * (Math.sin((t0 + elapsed) * 0.9) - Math.sin(t0 * 0.9));
}

/** Advance a shot with a fixed physics step; carry keeps caller frame rate out of the path. */
export function fly(params: FlightParams, launch: FlightLaunch, world: FlightWorld, t0: number, dt: number): FlightResult {
  const state = { ...launch, carry: (launch.carry ?? 0) + Math.max(0, dt) };
  const points: FlightPoint[] = [];
  const bounces: FlightResult['bounces'] = [];
  let bounceCount = state.bounceCount ?? 0;
  let hit: FlightHit | null = null;
  const step = params.step;
  while (state.carry + 1e-10 >= step && !hit) {
    state.carry -= step;
    const dx = world.cx - state.x;
    const dy = world.cy - state.y;
    const r2 = Math.max(dx * dx + dy * dy, 400);
    const r = Math.sqrt(r2);
    const gravity = world.gravity ?? params.gravity;
    const a = (world.twist === 'heavy' ? gravity * 1.45 : gravity) / r2;
    if (world.twist === 'wind') state.vx += world.wind * (world.sky ? gustAt(world.sky, t0 + state.elapsed).mult : 1) * step;
    const shapes = world.sky?.obstacle
      ? skyShapesAt(
          world.sky,
          world.skyState ?? EMPTY_SKY_STATE,
          { cx: world.cx, cy: world.cy, R: world.radius, width: world.width, height: world.height, launcherY: world.launcherY },
          t0 + state.elapsed,
        )
      : [];
    for (const shape of shapes) {
      if (shape.kind === 'mist' && Math.hypot(state.x - shape.x, state.y - shape.y) < shape.r) {
        const { vx, vy } = state;
        const speed = Math.hypot(vx, vy) || 1;
        state.vx += (-vy / speed) * 260 * shape.curl * step;
        state.vy += (vx / speed) * 260 * shape.curl * step;
      } else if (shape.kind === 'tug') {
        const tx = shape.x - state.x;
        const ty = shape.y - state.y;
        const tr2 = Math.max(tx * tx + ty * ty, 30 * 30);
        const ta = (((0.3 * gravity) / tr2) * step) / Math.sqrt(tr2);
        state.vx += tx * ta;
        state.vy += ty * ta;
      }
    }
    state.vx += (dx / r) * a * step;
    state.vy += (dy / r) * a * step;
    state.x += state.vx * step;
    state.y += state.vy * step;
    state.elapsed += step;
    points.push({ x: state.x, y: state.y, vx: state.vx, vy: state.vy, elapsed: state.elapsed });
    const time = t0 + state.elapsed;
    const collisionShapes = world.sky?.obstacle
      ? skyShapesAt(
          world.sky,
          world.skyState ?? EMPTY_SKY_STATE,
          { cx: world.cx, cy: world.cy, R: world.radius, width: world.width, height: world.height, launcherY: world.launcherY },
          time,
        )
      : [];
    const moon = moonPositions(world, time).find((m) => Math.hypot(state.x - m.x, state.y - m.y) < m.r + 8);
    if (moon) hit = world.twist === 'boss' ? { kind: 'boss' } : { kind: 'bonk', by: 'moon', x: state.x, y: state.y };
    else {
      for (const shape of collisionShapes) {
        if (shape.kind === 'rock' && Math.hypot(state.x - shape.x, state.y - shape.y) < shape.r + params.collisionPadding)
          hit = { kind: 'bonk', by: 'rock', x: state.x, y: state.y, rock: shape.index };
        if (shape.kind === 'tug' && Math.hypot(state.x - shape.x, state.y - shape.y) < shape.coreR)
          hit = { kind: 'fizzle', x: state.x, y: state.y };
        if (
          shape.kind === 'ring' &&
          Math.abs(Math.hypot(state.x - shape.cx, state.y - shape.cy) - shape.r) < shape.thickness / 2 + params.collisionPadding
        ) {
          const angle = ((Math.atan2(state.y - shape.cy, state.x - shape.cx) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const inGap = shape.gaps.some((gap) => (angle - gap.start + Math.PI * 2) % (Math.PI * 2) < gap.width);
          if (!inGap) hit = { kind: 'bonk', by: 'ring', x: state.x, y: state.y };
        }
        if (shape.kind === 'bubble' && Math.hypot(state.x - shape.x, state.y - shape.y) < shape.r + params.collisionPadding) {
          const dist = Math.hypot(state.x - shape.x, state.y - shape.y) || 1;
          const nx = (state.x - shape.x) / dist;
          const ny = (state.y - shape.y) / dist;
          const dot = state.vx * nx + state.vy * ny;
          if (dot < 0 && bounceCount >= 3) hit = { kind: 'bonk', by: 'bubble', x: state.x, y: state.y };
          else if (dot < 0) {
            state.vx = (state.vx - 2 * dot * nx) * 0.9;
            state.vy = (state.vy - 2 * dot * ny) * 0.9;
            state.x = shape.x + nx * (shape.r + params.collisionPadding + 0.01);
            state.y = shape.y + ny * (shape.r + params.collisionPadding + 0.01);
            points[points.length - 1] = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, elapsed: state.elapsed };
            bounces.push({ x: state.x, y: state.y, elapsed: state.elapsed });
            state.bounceCount = ++bounceCount;
          }
        }
        if (hit) break;
      }
      if (hit) break;
      const angle = Math.atan2(state.y - world.cy, state.x - world.cx) - rotationAt(world, t0, state.elapsed);
      const turn = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sector = Math.floor(turn / ((Math.PI * 2) / SECTORS)) % SECTORS;
      if (Math.hypot(state.x - world.cx, state.y - world.cy) <= (world.surface[sector] ?? world.radius) + params.collisionPadding)
        hit = { kind: 'land', sector };
      else if (
        state.elapsed > params.maxTime ||
        state.x < -150 ||
        state.x > world.width + 150 ||
        state.y < -250 ||
        state.y > world.height + 150
      )
        hit = { kind: 'miss' };
    }
  }
  return { points, state, hit, sector: hit?.kind === 'land' ? hit.sector : null, bounces };
}

/** Simulate one launch to contact or the time limit. */
export function flyFull(params: FlightParams, launch: FlightLaunch, world: FlightWorld, t0: number): FlightResult {
  return fly(params, launch, world, t0, params.maxTime + params.step);
}

/** Matches the live scene's resting planet and launcher layout. */
export function sceneGeometry(width: number, height: number, sizeScale: number) {
  const cx = width / 2;
  const cy = height * 0.43;
  const R = Math.min(width * 0.27, height * 0.17) * sizeScale;
  const launcherY = height - 150;
  return { cx, cy, R, width, height, launcherY, launch: { x: cx, y: launcherY } };
}
