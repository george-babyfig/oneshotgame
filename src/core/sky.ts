import type { LevelDef, Twist } from './levels';

export type ObstacleId = 'rocks' | 'bubble' | 'mist' | 'ring' | 'tug';
export const OBSTACLES: Record<
  ObstacleId,
  { name: string; rule: string; counter: string; intro: string; debut: number; pressure: 1 | 2; icon: string }
> = {
  rocks: {
    name: 'Drift Rocks',
    rule: 'If your throw hits a rock, it goes Bonk! and the rock turns to sparkles.',
    counter: 'Wait for a clear path.',
    intro:
      'Rocks drift across the sky. If your throw hits one, it goes Bonk! and the rock turns to sparkles. The red bonk badge warns you.',
    debut: 33,
    pressure: 1,
    icon: '🪨',
  },
  bubble: {
    name: 'Bubble Moon',
    rule: 'The Bubble Moon bounces your throw when it touches the bubble.',
    counter: 'Try a bank shot or wait for the moon.',
    intro: 'The Bubble Moon bounces your throw. Try a bank shot or wait for the moon. The red bonk badge warns you before you throw.',
    debut: 41,
    pressure: 1,
    icon: '🫧',
  },
  mist: {
    name: 'Magnet Mist',
    rule: 'The mist gives your throw a sideways wiggle.',
    counter: 'Aim around the mist or follow its curl.',
    intro: 'The mist gives your throw a sideways wiggle. Aim around the mist or follow its curl. The red bonk badge warns you.',
    debut: 46,
    pressure: 1,
    icon: '〰️',
  },
  ring: {
    name: 'Rubble Ring',
    rule: 'The ring bonks throws that miss its bright gaps.',
    counter: 'Wait for a bright gap.',
    intro: 'The ring bonks throws that miss its bright gaps. Wait for a gap to turn toward you. The red bonk badge warns you.',
    debut: 51,
    pressure: 2,
    icon: '◌',
  },
  tug: {
    name: 'Tug Star',
    rule: 'The sleepy star tugs your throw, and its core makes it fizzle.',
    counter: 'Aim wide of the sleepy star.',
    intro: 'The sleepy star tugs your throw, and its core makes it fizzle. Aim wide of the star. The red bonk badge warns you.',
    debut: 57,
    pressure: 2,
    icon: '✦',
  },
};

export interface SkyDef {
  obstacle: ObstacleId | null;
  gusty: boolean;
  seed: number;
  hard: boolean;
  rockPhase: number[];
  rockRows: number[];
  rockDirection: number[];
  rockAngle: number[];
  rockSpeed: number[];
  mistAngle: number;
  mistDistance: number;
  mistCurl: 1 | -1;
  tugAngle: number;
  tugDistance: number;
  ringPhase: number;
  ringDirection: 1 | -1;
  ringWidth: number;
}
export interface SkyState {
  brokenRocks: number[];
}
export const EMPTY_SKY_STATE: SkyState = { brokenRocks: [] };
export type SkyShape =
  | { kind: 'rock'; index: number; x: number; y: number; r: number }
  | { kind: 'bubble'; x: number; y: number; r: number; moonR: number }
  | { kind: 'mist'; x: number; y: number; r: number; curl: 1 | -1 }
  | { kind: 'ring'; cx: number; cy: number; r: number; thickness: number; gaps: { start: number; width: number }[] }
  | { kind: 'tug'; x: number; y: number; coreR: number };

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wrap = (x: number, span: number) => ((x % span) + span) % span;

export function skyFor(n: number, twist: Twist, seed: string, difficulty: LevelDef['difficulty']): SkyDef {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const rng = rand(hash);
  const rockRng = rand(hash ^ 0x5a5a7c31);
  const obstacle: ObstacleId | null = twist in OBSTACLES ? (twist as ObstacleId) : null;
  const ringWidth = n === 51 && twist === 'ring' ? 160 : difficulty === 'normal' ? 90 : 130;
  const rockPhase: number[] = [];
  const rockRows: number[] = [];
  for (let i = 0; i < 4; i++) rng(); // preserve the other obstacle seeds
  for (let i = 0; i < 4; i++) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      x = 0.08 + 0.84 * rockRng();
      y = 0.08 + 0.84 * rockRng();
      if (rockPhase.every((px, j) => Math.hypot((x - px) * 3.7, (y - rockRows[j]) * 0.9) >= 0.5)) break;
    }
    rockPhase.push(x);
    rockRows.push(y);
  }
  return {
    obstacle,
    gusty: twist === 'wind' && n >= 55 && difficulty !== 'normal',
    seed: hash >>> 0,
    hard: difficulty !== 'normal',
    rockPhase,
    rockRows,
    rockDirection: [0, 1, 2, 3].map(() => (rng() < 0.5 ? -1 : 1)),
    rockAngle: [0, 1, 2, 3].map(() => (((15 + 45 * rockRng()) * Math.PI) / 180) * (rockRng() < 0.5 ? -1 : 1)),
    rockSpeed: [0, 1, 2, 3].map(() => 0.18 + 0.14 * rockRng()),
    mistAngle: Math.PI * (0.1 + 0.8 * rng()),
    mistDistance: 1.6 + 0.8 * rng(),
    mistCurl: rng() < 0.5 ? -1 : 1,
    tugAngle: Math.PI * (0.16 + 0.68 * rng()),
    tugDistance: 1.8 + 0.8 * rng(),
    ringPhase: Math.PI / 2 - (ringWidth * Math.PI) / 360 + (rng() - 0.5) * 0.16,
    ringDirection: -1,
    ringWidth,
  };
}

export function skyShapesAt(
  def: SkyDef,
  state: SkyState,
  geo: { cx: number; cy: number; R: number; width: number; height: number; launcherY: number },
  t: number,
): SkyShape[] {
  const { cx, cy, R, width, height, launcherY } = geo;
  switch (def.obstacle) {
    case 'rocks': {
      const count = def.hard ? 4 : 3;
      const spanX = width + 0.24 * R;
      const spanY = height + 0.24 * R;
      const top = cy + 0.7 * R;
      const corridor = Math.max(R, launcherY - cy - 1.3 * R);
      return Array.from({ length: count }, (_, index) => ({
        kind: 'rock' as const,
        index,
        x:
          wrap(
            def.rockPhase[index] * spanX + def.rockDirection[index] * Math.cos(def.rockAngle[index]) * def.rockSpeed[index] * R * t,
            spanX,
          ) -
          0.12 * R,
        y:
          wrap(top + def.rockRows[index] * corridor + 0.12 * R + Math.sin(def.rockAngle[index]) * def.rockSpeed[index] * R * t, spanY) -
          0.12 * R,
        r: 0.1 * R,
      })).filter((rock) => !state.brokenRocks.includes(rock.index));
    }
    case 'bubble': {
      const a = t * 0.8;
      const radius = 0.36 * R;
      const d = Math.min(2.05 * R, width / 2 - radius - 8);
      const dy = Math.max(1.3 * R, Math.min(d, launcherY - cy - 0.28 * R - 50));
      return [{ kind: 'bubble', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * dy, r: radius, moonR: 0.28 * R }];
    }
    case 'mist': {
      const a = def.mistAngle;
      return [
        {
          kind: 'mist',
          x: cx + Math.cos(a) * def.mistDistance * R + Math.cos(t * 0.3) * 0.2 * R,
          y: cy + Math.sin(a) * def.mistDistance * R + Math.sin(t * 0.3) * 0.2 * R,
          r: 0.7 * R,
          curl: def.mistCurl,
        },
      ];
    }
    case 'ring': {
      const width = (def.ringWidth * Math.PI) / 180;
      const phase = def.ringPhase + def.ringDirection * t * 0.25;
      return [
        {
          kind: 'ring',
          cx,
          cy,
          r: 1.6 * R,
          thickness: 0.1 * R,
          gaps: Array.from({ length: 2 }, (_, i) => ({ start: wrap(phase + i * Math.PI, Math.PI * 2), width })),
        },
      ];
    }
    case 'tug': {
      const a =
        Math.abs(Math.cos(def.tugAngle)) < 0.4 ? (def.tugAngle < Math.PI / 2 ? Math.acos(0.4) : Math.PI - Math.acos(0.4)) : def.tugAngle;
      return [{ kind: 'tug', x: cx + Math.cos(a) * def.tugDistance * R, y: cy + Math.sin(a) * def.tugDistance * R, coreR: 10 }];
    }
    default:
      return [];
  }
}

export function gustAt(def: SkyDef, t: number): { mult: 1 | 2; warning: boolean } {
  if (!def.gusty) return { mult: 1, warning: false };
  const phase = wrap(t, 2.4);
  return { mult: phase < 0.6 ? 2 : 1, warning: phase >= 1.9 };
}
