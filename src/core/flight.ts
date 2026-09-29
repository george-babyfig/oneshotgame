import { SECTORS } from './world';

export interface FlightParams {
  gravity: number;
  step: number;
  maxTime: number;
  collisionPadding: number;
}

export const STAR_SLING: Readonly<FlightParams> = {
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
}

export type FlightHit = { kind: 'land'; sector: number } | { kind: 'blocked' | 'boss' | 'miss' };

export interface FlightResult {
  points: FlightPoint[];
  state: FlightLaunch;
  hit: FlightHit | null;
  sector: number | null;
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
    if (world.twist === 'wind') state.vx += world.wind * step;
    state.vx += (dx / r) * a * step;
    state.vy += (dy / r) * a * step;
    state.x += state.vx * step;
    state.y += state.vy * step;
    state.elapsed += step;
    points.push({ x: state.x, y: state.y, vx: state.vx, vy: state.vy, elapsed: state.elapsed });
    const time = t0 + state.elapsed;
    const moon = moonPositions(world, time).find((m) => Math.hypot(state.x - m.x, state.y - m.y) < m.r + 8);
    if (moon) hit = { kind: world.twist === 'boss' ? 'boss' : 'blocked' };
    else {
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
  return { points, state, hit, sector: hit?.kind === 'land' ? hit.sector : null };
}
