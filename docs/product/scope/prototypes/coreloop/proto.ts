// Scratch prototype (not repo code): Fusions/Clashes + Ember Vent hazard layered on the real world.ts.
import { SECTORS, clonePlanet, impact, lifeScore, novaCharge, settle, wrap, type Kind, type Planet, type Sector } from './world.ts';
import { NOVA_CHARGE } from './levels.ts';

export type Rx = 'steam' | 'glacier' | 'firemount' | 'bloom' | 'raingarden' | 'rainbow' | 'wildfire' | 'deluge';
const PAIRS: Record<string, Rx> = {
  'ice+magma': 'steam',
  'ice+rock': 'glacier',
  'magma+rock': 'firemount',
  'seed+sun': 'bloom',
  'seed+storm': 'raingarden',
  'storm+sun': 'rainbow',
  'magma+sun': 'wildfire',
  'ice+storm': 'deluge',
};
export const reactionOf = (a: Kind, b: Kind): Rx | null => (a === b ? null : PAIRS[[a, b].sort().join('+')] ?? null);
export const CLASH = new Set<Rx>(['wildfire', 'deluge']);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function touch(p: Planet, i: number, f: (s: Sector) => void) {
  const s = p.sectors[wrap(i)];
  f(s);
  s.land = clamp(s.land, 0, 5);
  s.water = clamp(s.water, 0, 5);
  s.heat = clamp(s.heat, -3, 3);
  s.life = clamp(s.life, 0, 3);
}
const habitable = (s: Sector) => s.land >= 1 || s.water >= 1;
export let SCALE = 1; // knob: reaction radius scale

export function applyReaction(p: Planet, rx: Rx, c: number) {
  switch (rx) {
    case 'steam': // centre -> Hot Springs, a warm mist waters +-2
      touch(p, c, (s) => ((s.water = Math.max(s.water, s.land + 1)), (s.heat = 2)));
      for (const d of [-2, -1, 1, 2]) touch(p, c + d, (s) => ((s.water += 1), (s.heat = s.heat > 0 ? s.heat - 1 : s.heat < 0 ? s.heat + 1 : 0)));
      break;
    case 'glacier': // centre +-1 frozen (tundra / ice sheet / taiga), centre raised
      touch(p, c, (s) => (s.land += 1));
      for (const d of [-1, 0, 1]) touch(p, c + d, (s) => (s.heat = Math.min(s.heat, -2)));
      break;
    case 'firemount': // centre becomes a volcano, neighbours rise into mountains
      touch(p, c, (s) => ((s.land = Math.max(s.land, 3)), (s.heat = Math.max(s.heat, 2)), (s.water = Math.min(s.water, 1))));
      for (const d of [-1, 1]) touch(p, c + d, (s) => (s.land += 1));
      break;
    case 'bloom': // flowers +-2
      for (let d = -2; d <= 2; d++) touch(p, c + d, (s) => habitable(s) && (s.life += 1));
      break;
    case 'raingarden': // wet lands within +-3 come alive (marsh / reef)
      for (let d = -3; d <= 3; d++) touch(p, c + d, (s) => s.water >= 1 && (s.life += 1));
      break;
    case 'rainbow': // life +1 under the arc (+-2); also refunds a throw (handled by caller)
      for (let d = -2; d <= 2; d++) touch(p, c + d, (s) => habitable(s) && (s.life += 1));
      break;
    case 'wildfire': // clash: burns green down one step +-2
      for (let d = -2; d <= 2; d++) touch(p, c + d, (s) => ((s.life -= 1), (s.heat += 1)));
      break;
    case 'deluge': // clash: floods +-3
      for (let d = -3; d <= 3; d++) touch(p, c + d, (s) => (s.water += 2));
      break;
  }
}

export interface Glow {
  kind: Kind;
  ttl: number;
}
export interface HazardCfg {
  vents: number[]; // Ember Vent sectors
  every: number; // tick every N throws
}
export interface St {
  p: Planet;
  glow: (Glow | null)[];
  charge: number;
  t: number;
  refund: number;
  vents: number[];
  fusions: Rx[];
  burned: number;
  quenched: number;
}
export function initSt(p: Planet, hz?: HazardCfg): St {
  return { p: clonePlanet(p), glow: Array(SECTORS).fill(null), charge: 0, t: 0, refund: 0, vents: [...(hz?.vents ?? [])], fusions: [], burned: 0, quenched: 0 };
}
export function cloneSt(s: St): St {
  return { ...s, p: clonePlanet(s.p), glow: s.glow.map((g) => (g ? { ...g } : null)), vents: [...s.vents], fusions: [...s.fusions] };
}

export interface Rules {
  fusion: boolean;
  glowTtl: number; // throws a glow survives
  glowR: number; // glow half-width
  hazard?: HazardCfg;
}

/** Ember Vent: every `every` throws, each vent burns the nearest green sector within +-2 (clockwise first), unless shielded. */
function tickHazard(st: St) {
  for (const v of st.vents) {
    for (const d of [1, -1, 2, -2]) {
      const s = st.p.sectors[wrap(v + d)];
      // firebreaks: no fuel (life 0), wet (water>=2), rocky (land>=3), frozen (heat<=-2)
      if (s.life < 1 || s.water >= 2 || s.land >= 3 || s.heat <= -2) continue;
      // a rocky or wet sector between the vent and a +-2 target also blocks
      if (Math.abs(d) === 2) {
        const mid = st.p.sectors[wrap(v + Math.sign(d))];
        if (mid.water >= 2 || mid.land >= 3 || mid.heat <= -2) continue;
      }
      touch(st.p, v + d, (x) => ((x.life -= 1), (x.heat += 1)));
      st.burned++;
      break;
    }
  }
  settle(st.p);
}

/** Apply one throw with the prototype rules. Mutates st. */
export function step(st: St, kind: Kind, at: number, R: Rules) {
  at = wrap(at);
  const nova = st.charge >= NOVA_CHARGE;
  const before = lifeScore(st.p);
  const res = impact(st.p, kind, at, 0, { nova });
  let rx: Rx | null = null;
  if (R.fusion) {
    const g = st.glow[at];
    if (g && g.kind !== kind) rx = reactionOf(g.kind, kind);
    if (rx) {
      applyReaction(st.p, rx, at);
      settle(st.p);
      st.fusions.push(rx);
      if (rx === 'rainbow' && st.refund < 1) st.refund++;
      st.glow.fill(null); // a fusion consumes the glow
    } else {
      for (let i = 0; i < SECTORS; i++) if (st.glow[i] && --st.glow[i]!.ttl <= 0) st.glow[i] = null;
      for (let d = -R.glowR; d <= R.glowR; d++) st.glow[wrap(at + d)] = { kind, ttl: R.glowTtl };
    }
  }
  // cooling a vent: ice or storm footprint covering a vent puts it out
  if (st.vents.length && (kind === 'ice' || kind === 'storm')) {
    const r = kind === 'storm' ? 3 : 1;
    const keep = st.vents.filter((v) => {
      const d = Math.min(Math.abs(wrap(v - at)), SECTORS - Math.abs(wrap(v - at)));
      return d > r;
    });
    st.quenched += st.vents.length - keep.length;
    st.vents = keep;
  }
  st.t++;
  if (R.hazard && st.vents.length && st.t % R.hazard.every === 0) tickHazard(st);
  const changed = res.changed.length;
  const spawned = res.spawned.length;
  st.charge = nova ? 0 : Math.min(NOVA_CHARGE, st.charge + novaCharge(changed, spawned));
  return { rx, delta: lifeScore(st.p) - before };
}

/** Value used by a solver to rank a candidate: life now, optionally after projecting the next hazard tick. */
function evalSt(st: St, R: Rules, lookHazard: boolean) {
  if (!lookHazard || !R.hazard || !st.vents.length) return lifeScore(st.p);
  // project hazard ticks up to and including the next scheduled one
  const q = cloneSt(st);
  const until = Math.ceil((q.t + 1) / R.hazard.every) * R.hazard.every;
  while (q.t < until) {
    q.t++;
    if (q.t % R.hazard.every === 0) tickHazard(q);
  }
  return lifeScore(q.p);
}

export interface PlayOpts {
  aware: boolean; // solver sees reactions/hazards
  swap: boolean; // solver may use the free swap
  lookHazard?: boolean;
}

export interface PlayStats {
  score: number;
  fusions: Rx[];
  nearBest: number[]; // per throw: sectors within 90% of best positive gain
  tradeoff: number; // throws where the best sector differs from the reaction-blind best
  burned: number;
  quenched: number;
  st: St;
}

export function play(start: Planet, queue: Kind[], throws: number, R: Rules, o: PlayOpts): PlayStats {
  let st = initSt(start, R.hazard);
  let hand: [Kind, Kind] = [queue[0], queue[1]];
  let qi = 2;
  const nearBest: number[] = [];
  let tradeoff = 0;
  const blindR: Rules = { ...R, fusion: false, hazard: undefined };
  let n = throws;
  for (let t = 0; t < n; t++) {
    const picks = o.swap && hand[0] !== hand[1] ? [0, 1] : [0];
    let best = -Infinity;
    let bestAt = 0;
    let bestPick = 0;
    let bestBlindAt = 0;
    let bestBlind = -Infinity;
    const base = lifeScore(st.p);
    const vals: number[] = [];
    for (const pi of picks) {
      for (let i = 0; i < SECTORS; i++) {
        const q = cloneSt(st);
        step(q, hand[pi], i, o.aware ? R : blindR);
        const v = evalSt(q, R, !!o.lookHazard && o.aware);
        if (pi === 0) vals.push(v - base);
        if (v > best) ((best = v), (bestAt = i), (bestPick = pi));
        if (pi === 0) {
          const qb = cloneSt(st);
          step(qb, hand[0], i, blindR);
          const vb = lifeScore(qb.p);
          if (vb > bestBlind) ((bestBlind = vb), (bestBlindAt = i));
        }
      }
    }
    const top = Math.max(...vals);
    nearBest.push(top > 0 ? vals.filter((v) => v >= top * 0.9).length : 0);
    if (bestPick === 0 && bestAt !== bestBlindAt) tradeoff++;
    const kind = hand[bestPick];
    const r = step(st, kind, bestAt, R);
    if (r.rx === 'rainbow' && st.refund === 1 && n < throws + 1) n++; // one refund per level
    hand = bestPick === 0 ? [hand[1], queue[qi % queue.length]] : [hand[0], queue[qi % queue.length]];
    qi++;
  }
  return { score: lifeScore(st.p), fusions: st.fusions, nearBest, tradeoff, burned: st.burned, quenched: st.quenched, st };
}
