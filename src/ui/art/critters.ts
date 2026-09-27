// "Critters": every creature drawn as vector art in one house style — chubby
// bodies, big shiny eyes, rosy cheeks — assembled from a small parts kit.
type G = CanvasRenderingContext2D;

type Shape = 'round' | 'tall' | 'long' | 'fish' | 'bird' | 'tiny';
type Feature =
  | 'bunnyEars'
  | 'roundEars'
  | 'pointyEars'
  | 'tuftEars'
  | 'bigEars'
  | 'antlers'
  | 'goatHorns'
  | 'unicornHorn'
  | 'ossicones'
  | 'dragonHorns'
  | 'beak'
  | 'duckBill'
  | 'crest'
  | 'wings'
  | 'batWings'
  | 'butterflyWings'
  | 'fins'
  | 'fishTail'
  | 'whaleTail'
  | 'tentacles'
  | 'shell'
  | 'claws'
  | 'stinger'
  | 'trunk'
  | 'tusks'
  | 'hump'
  | 'neck'
  | 'spots'
  | 'stripes'
  | 'spikes'
  | 'whiskers'
  | 'snout'
  | 'longSnout'
  | 'beard'
  | 'mane'
  | 'fluffyTail'
  | 'longTail'
  | 'plumeTail'
  | 'flippers'
  | 'spout'
  | 'leafCrown'
  | 'sparkles'
  | 'crown'
  | 'topEyes'
  | 'fur';

interface Spec {
  body: string;
  belly?: string;
  accent?: string;
  shape: Shape;
  f: Feature[];
  /** Eye size multiplier. */
  eye?: number;
  glow?: string;
}

const SPECS: Record<string, Spec> = {
  bunny: { body: '#f3eef7', belly: '#ffffff', accent: '#ffb3cf', shape: 'round', f: ['bunnyEars', 'fluffyTail', 'whiskers'] },
  deer: { body: '#c08a55', belly: '#f3dfc2', accent: '#8a5a30', shape: 'round', f: ['pointyEars', 'antlers', 'spots', 'snout'] },
  parrot: { body: '#3fc36b', belly: '#b8f5a0', accent: '#ff4a4a', shape: 'bird', f: ['beak', 'crest', 'wings', 'plumeTail'] },
  fish: { body: '#ffb14a', belly: '#ffe3a8', accent: '#ff7a2f', shape: 'fish', f: ['fins', 'fishTail'] },
  reeffish: { body: '#3fb9ff', belly: '#bde9ff', accent: '#ffd84a', shape: 'fish', f: ['fins', 'fishTail', 'stripes'] },
  seal: { body: '#a3b6c8', belly: '#e6eef6', accent: '#6d8397', shape: 'long', f: ['flippers', 'whiskers', 'snout'] },
  crab: { body: '#ff6a4a', belly: '#ffb09a', accent: '#d9442a', shape: 'round', f: ['claws', 'topEyes'] },
  goat: { body: '#efe7dc', belly: '#ffffff', accent: '#9a8a76', shape: 'round', f: ['goatHorns', 'pointyEars', 'beard', 'snout'] },
  llama: { body: '#f4e6d0', belly: '#fff8ec', accent: '#c9a77e', shape: 'tall', f: ['neck', 'pointyEars', 'fur', 'snout'] },
  scorpion: { body: '#d98a3a', belly: '#f2c07a', accent: '#8a4a1a', shape: 'long', f: ['claws', 'stinger'] },
  giraffe: { body: '#f0c05a', belly: '#fbe3a5', accent: '#b9772f', shape: 'tall', f: ['neck', 'ossicones', 'spots', 'pointyEars'] },
  penguin: { body: '#2b2f45', belly: '#ffffff', accent: '#ff9a3d', shape: 'round', f: ['beak', 'flippers'] },
  owl: { body: '#8a6a4a', belly: '#ecd8bc', accent: '#ffb13d', shape: 'round', f: ['tuftEars', 'beak', 'wings'], eye: 1.35 },
  frog: { body: '#6ecb4a', belly: '#dcf7a8', accent: '#3f8f2a', shape: 'round', f: ['topEyes', 'spots'] },
  duck: { body: '#ffe36e', belly: '#fff6c2', accent: '#ff9a3d', shape: 'bird', f: ['duckBill', 'wings'] },
  newt: { body: '#ff7a3d', belly: '#ffc08a', accent: '#ffe066', shape: 'long', f: ['spots', 'longTail'] },
  otter: { body: '#8a5a3a', belly: '#ecc9a4', accent: '#5a3a22', shape: 'round', f: ['roundEars', 'whiskers', 'snout', 'longTail'] },
  turtle: { body: '#7fb07a', belly: '#cfe8b8', accent: '#2d2a3a', shape: 'round', f: ['shell'] },
  octopus: { body: '#b86bff', belly: '#e2c2ff', accent: '#8a3fe0', shape: 'round', f: ['tentacles', 'spots'] },
  whale: { body: '#6d8fc4', belly: '#e8f2ff', accent: '#4a6aa0', shape: 'fish', f: ['whaleTail', 'fins', 'spout'] },
  camel: { body: '#d9a860', belly: '#f2d4a0', accent: '#a0743a', shape: 'tall', f: ['hump', 'neck', 'pointyEars', 'snout'] },
  eagle: { body: '#6a4a30', belly: '#ffffff', accent: '#ffcf3d', shape: 'bird', f: ['beak', 'wings', 'crest'] },
  bear: { body: '#8a5a36', belly: '#d2a674', accent: '#5a3a22', shape: 'round', f: ['roundEars', 'snout'] },
  butterfly: { body: '#4a3a5a', belly: '#6a5a7a', accent: '#7ad7ff', shape: 'tiny', f: ['butterflyWings'] },
  elephant: { body: '#9aa3b5', belly: '#c8cfdc', accent: '#ffb3cf', shape: 'round', f: ['bigEars', 'trunk'] },
  wolf: { body: '#9fb4cf', belly: '#eef3ff', accent: '#6f86a8', shape: 'round', f: ['pointyEars', 'snout', 'fluffyTail', 'fur'] },
  flamingo: { body: '#ff8fb8', belly: '#ffd0e0', accent: '#2d2a3a', shape: 'bird', f: ['neck', 'beak', 'wings'] },
  croc: { body: '#4f8a3a', belly: '#c8e0a0', accent: '#2f5a22', shape: 'long', f: ['longSnout', 'spikes', 'longTail'] },
  dragon: {
    body: '#ff5a5a',
    belly: '#ffd07a',
    accent: '#b8303a',
    shape: 'round',
    f: ['dragonHorns', 'batWings', 'spikes', 'longTail'],
    glow: '#ff8a4a',
  },
  unicorn: {
    body: '#ffffff',
    belly: '#ffeaf6',
    accent: '#ff8fc8',
    shape: 'round',
    f: ['unicornHorn', 'mane', 'pointyEars', 'snout'],
    glow: '#ffb3f0',
  },
  sunbird: {
    body: '#ffb13d',
    belly: '#ffe7a0',
    accent: '#ff4a8a',
    shape: 'bird',
    f: ['beak', 'crest', 'wings', 'plumeTail'],
    glow: '#ffd84a',
  },
  kraken: { body: '#d64a8a', belly: '#f5a8cc', accent: '#8a1f5a', shape: 'round', f: ['tentacles', 'spots'], glow: '#ff6ab0', eye: 1.2 },
  mammoth: { body: '#8a5a36', belly: '#b07a4a', accent: '#fff6e0', shape: 'round', f: ['bigEars', 'trunk', 'tusks', 'fur'] },
  dino: { body: '#3aa05a', belly: '#d8f0a0', accent: '#ffd84a', shape: 'round', f: ['spikes', 'longTail', 'snout'], glow: '#ff7a3d' },
  worldtree: { body: '#7dffb0', belly: '#d8ffe8', accent: '#2f9e4f', shape: 'round', f: ['leafCrown', 'sparkles'], glow: '#7dffb0' },
  leviathan: {
    body: '#2a5ad8',
    belly: '#9fd0ff',
    accent: '#ffd84a',
    shape: 'fish',
    f: ['whaleTail', 'fins', 'crown', 'sparkles'],
    glow: '#6ec8ff',
  },
};

const has = (s: Spec, f: Feature) => s.f.includes(f);

function ell(g: G, x: number, y: number, rx: number, ry: number, color: string, rot = 0) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  g.fill();
}

function tri(g: G, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.lineTo(cx, cy);
  g.closePath();
  g.fill();
}

function line(g: G, pts: number[], color: string, w: number) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.stroke();
}

/** Body geometry for a shape, in units of u (ground at y=0). */
function bodyOf(shape: Shape) {
  switch (shape) {
    case 'tall':
      return { x: 0, y: -0.45, rx: 0.44, ry: 0.4, head: { x: 0.12, y: -1.15, r: 0.3 } };
    case 'long':
      return { x: 0, y: -0.3, rx: 0.62, ry: 0.3, head: { x: 0.45, y: -0.42, r: 0.3 } };
    case 'fish':
      return { x: 0, y: -0.42, rx: 0.56, ry: 0.38, head: null };
    case 'bird':
      return { x: 0, y: -0.5, rx: 0.4, ry: 0.44, head: null };
    case 'tiny':
      return { x: 0, y: -0.55, rx: 0.12, ry: 0.28, head: null };
    default:
      return { x: 0, y: -0.5, rx: 0.5, ry: 0.47, head: null };
  }
}

function eyes(g: G, x: number, y: number, u: number, k: number, blink: boolean, sep = 0.17) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * sep * u;
    if (blink) {
      line(g, [ex - 0.07 * u, y, ex + 0.07 * u, y], '#2a1f3a', 0.04 * u);
      continue;
    }
    ell(g, ex, y, 0.1 * u * k, 0.12 * u * k, '#ffffff');
    ell(g, ex + 0.015 * u, y + 0.015 * u, 0.065 * u * k, 0.08 * u * k, '#2a1f3a');
    ell(g, ex - 0.02 * u * k, y - 0.035 * u * k, 0.028 * u * k, 0.028 * u * k, '#ffffff');
  }
}

function face(g: G, x: number, y: number, u: number, s: Spec, blink: boolean, sep = 0.17) {
  eyes(g, x, y, u, s.eye ?? 1, blink, sep);
  // cheeks
  g.globalAlpha = 0.45;
  ell(g, x - (sep + 0.1) * u, y + 0.12 * u, 0.07 * u, 0.045 * u, '#ff7a9a');
  ell(g, x + (sep + 0.1) * u, y + 0.12 * u, 0.07 * u, 0.045 * u, '#ff7a9a');
  g.globalAlpha = 1;
  if (!has(s, 'beak') && !has(s, 'duckBill') && !has(s, 'trunk')) {
    g.strokeStyle = '#2a1f3a';
    g.lineWidth = 0.035 * u;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(x, y + 0.1 * u, 0.06 * u, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
}

/**
 * Draw a creature standing on the ground at (x, y), with "up" rotated by `angle`
 * (0 = screen up). `size` is roughly its height in px.
 */
/** `acc` = an accessory worn by a Homeworld resident (see RESIDENT_ACCS). */
export function drawCreature(g: G, id: string, x: number, y: number, angle: number, size: number, t: number, acc2 = '') {
  const s = SPECS[id];
  if (!s) return;
  const u = size;
  const bob = Math.sin(t * 3);
  const blink = (t * 0.7 + (id.length % 5) * 0.37) % 4 < 0.12;
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  // squash & stretch idle
  g.scale(1 + bob * 0.03, 1 - bob * 0.03);
  if (s.glow) {
    const gl = g.createRadialGradient(0, -0.55 * u, 0, 0, -0.55 * u, 0.95 * u);
    gl.addColorStop(0, s.glow + 'aa');
    gl.addColorStop(1, s.glow + '00');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(0, -0.55 * u, 0.95 * u, 0, Math.PI * 2);
    g.fill();
  }
  // soft ground shadow
  ell(g, 0, 0, 0.45 * u, 0.08 * u, 'rgba(0,0,0,0.25)');
  const b = bodyOf(s.shape);
  const bx = b.x * u;
  const by = b.y * u;
  const acc = s.accent ?? '#333';

  // ---- behind the body
  if (has(s, 'butterflyWings')) {
    const flap = 0.75 + Math.abs(Math.sin(t * 6)) * 0.25;
    for (const sx of [-1, 1]) {
      ell(g, sx * 0.3 * u * flap, -0.72 * u, 0.3 * u * flap, 0.26 * u, acc, sx * 0.4);
      ell(g, sx * 0.24 * u * flap, -0.38 * u, 0.2 * u * flap, 0.17 * u, '#ffb3f0', -sx * 0.3);
      ell(g, sx * 0.3 * u * flap, -0.74 * u, 0.1 * u * flap, 0.09 * u, '#ffffff');
    }
  }
  if (has(s, 'batWings')) {
    const flap = Math.sin(t * 4) * 0.15;
    for (const sx of [-1, 1]) {
      g.save();
      g.translate(sx * 0.3 * u, -0.7 * u);
      g.rotate(sx * (0.3 + flap));
      g.fillStyle = s.accent!;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(sx * 0.65 * u, -0.35 * u);
      g.lineTo(sx * 0.55 * u, 0.05 * u);
      g.lineTo(sx * 0.4 * u, -0.05 * u);
      g.lineTo(sx * 0.3 * u, 0.15 * u);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
  if (has(s, 'fluffyTail')) ell(g, -0.5 * u, -0.3 * u, 0.18 * u, 0.16 * u, s.belly ?? s.body);
  if (has(s, 'longTail')) line(g, [-0.35 * u, -0.25 * u, -0.7 * u, -0.15 * u, -0.9 * u, -0.3 * u + bob * 0.05 * u], s.body, 0.16 * u);
  if (has(s, 'plumeTail')) {
    for (const [dx, c] of [
      [-0.2, acc],
      [0, s.body],
      [0.2, '#4ab8ff'],
    ] as [number, string][])
      ell(g, -0.45 * u, -0.25 * u + dx * u * 0.4, 0.28 * u, 0.07 * u, c, 0.4 + dx);
  }
  if (has(s, 'fishTail')) tri(g, -0.5 * u, by, -0.85 * u, by - 0.3 * u + bob * 0.04 * u, -0.85 * u, by + 0.3 * u + bob * 0.04 * u, acc);
  if (has(s, 'whaleTail')) {
    tri(g, -0.5 * u, by, -0.9 * u, by - 0.35 * u, -0.72 * u, by, acc);
    tri(g, -0.5 * u, by, -0.9 * u, by + 0.2 * u, -0.72 * u, by, acc);
  }
  if (has(s, 'stinger')) {
    line(g, [-0.5 * u, -0.3 * u, -0.75 * u, -0.6 * u, -0.55 * u, -0.95 * u, -0.3 * u, -0.9 * u], s.body, 0.14 * u);
    tri(g, -0.3 * u, -0.98 * u, -0.3 * u, -0.8 * u, -0.12 * u, -0.9 * u, acc);
  }
  if (has(s, 'hump')) ell(g, -0.1 * u, -0.85 * u, 0.28 * u, 0.22 * u, s.body);
  if (has(s, 'tentacles')) {
    for (let k = 0; k < 5; k++) {
      const tx = (-0.4 + k * 0.2) * u;
      const w = Math.sin(t * 3 + k) * 0.08 * u;
      line(g, [tx, -0.25 * u, tx + w, -0.05 * u, tx - w * 0.5 + (k - 2) * 0.05 * u, 0], s.body, 0.13 * u);
    }
  }
  if (has(s, 'claws')) {
    for (const sx of [-1, 1]) {
      const cx = sx * 0.55 * u;
      const cy = -0.55 * u + Math.sin(t * 4 + sx) * 0.04 * u;
      ell(g, cx, cy, 0.16 * u, 0.13 * u, s.body);
      tri(g, cx, cy - 0.02 * u, cx + sx * 0.18 * u, cy - 0.12 * u, cx + sx * 0.06 * u, cy + 0.02 * u, 'rgba(0,0,0,0.25)');
    }
  }

  // ---- legs / feet
  if (s.shape === 'tall' || s.shape === 'round' || s.shape === 'bird') {
    const fy = -0.04 * u;
    const leg = s.shape === 'bird' ? acc : s.body;
    if (s.shape === 'tall') {
      line(g, [-0.2 * u, by + 0.2 * u, -0.22 * u, fy], s.accent ?? s.body, 0.1 * u);
      line(g, [0.2 * u, by + 0.2 * u, 0.22 * u, fy], s.accent ?? s.body, 0.1 * u);
    } else if (!has(s, 'tentacles')) {
      ell(g, -0.2 * u, fy, 0.13 * u, 0.07 * u, s.shape === 'bird' ? leg : shadeHex(s.body));
      ell(g, 0.2 * u, fy, 0.13 * u, 0.07 * u, s.shape === 'bird' ? leg : shadeHex(s.body));
    }
  }
  if (s.shape === 'long') {
    for (const lx of [-0.35, -0.1, 0.15, 0.35]) line(g, [lx * u, by, lx * u, -0.02 * u], shadeHex(s.body), 0.09 * u);
  }

  // ---- body
  if (has(s, 'neck')) {
    const nx = s.shape === 'bird' ? 0.1 : 0.12;
    line(g, [0, by - 0.1 * u, nx * u, -1.05 * u], s.body, 0.22 * u);
  }
  ell(g, bx, by, b.rx * u, b.ry * u, s.body);
  if (s.belly && s.shape !== 'tiny')
    ell(g, bx + (s.shape === 'long' ? 0.05 * u : 0), by + b.ry * u * 0.25, b.rx * u * 0.62, b.ry * u * 0.6, s.belly);
  if (has(s, 'shell')) {
    ell(g, 0, -0.6 * u, 0.55 * u, 0.42 * u, acc);
    g.strokeStyle = 'rgba(255,150,80,0.55)';
    g.lineWidth = 0.04 * u;
    for (const [dx, dy] of [
      [-0.22, -0.65],
      [0.22, -0.65],
      [0, -0.82],
      [0, -0.45],
    ]) {
      g.beginPath();
      g.arc(dx * u, dy * u, 0.13 * u, 0, Math.PI * 2);
      g.stroke();
    }
  }
  if (has(s, 'spots')) {
    g.globalAlpha = 0.55;
    for (const [dx, dy, r] of [
      [-0.25, -0.62, 0.07],
      [0.18, -0.72, 0.05],
      [-0.05, -0.35, 0.06],
      [0.3, -0.45, 0.045],
    ])
      ell(g, bx + dx * u * (b.rx / 0.5), dy * u, r * u, r * u, acc);
    g.globalAlpha = 1;
  }
  if (has(s, 'stripes')) {
    g.fillStyle = s.accent!;
    for (const dx of [-0.2, 0.05, 0.3]) {
      g.beginPath();
      g.ellipse(dx * u, by, 0.05 * u, b.ry * u * 0.85, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (has(s, 'fur')) {
    g.fillStyle = s.body;
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * (0.15 + k * 0.14);
      tri(
        g,
        bx + Math.cos(a) * b.rx * u,
        by + Math.sin(a) * b.ry * u,
        bx + Math.cos(a + 0.1) * (b.rx + 0.08) * u,
        by + Math.sin(a + 0.1) * (b.ry + 0.08) * u,
        bx + Math.cos(a + 0.2) * b.rx * u,
        by + Math.sin(a + 0.2) * b.ry * u,
        s.body,
      );
    }
  }
  if (has(s, 'spikes')) {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI * (1.15 + k * 0.17);
      const px = bx + Math.cos(a) * b.rx * u;
      const py = by + Math.sin(a) * b.ry * u;
      tri(g, px - 0.07 * u, py + 0.03 * u, px + Math.cos(a) * 0.16 * u, py + Math.sin(a) * 0.16 * u, px + 0.07 * u, py + 0.03 * u, acc);
    }
  }
  if (has(s, 'wings')) {
    const flap = Math.sin(t * 5) * 0.12;
    ell(g, -0.3 * u, by + 0.02 * u, 0.14 * u, 0.26 * u, shadeHex(s.body), 0.35 + flap);
    ell(g, 0.3 * u, by + 0.02 * u, 0.14 * u, 0.26 * u, shadeHex(s.body), -0.35 - flap);
  }
  if (has(s, 'flippers')) {
    ell(g, -0.42 * u, by + 0.08 * u, 0.1 * u, 0.2 * u, shadeHex(s.body), 0.6);
    ell(g, 0.42 * u, by + 0.08 * u, 0.1 * u, 0.2 * u, shadeHex(s.body), -0.6);
  }
  if (has(s, 'fins')) tri(g, -0.1 * u, by - b.ry * u * 0.8, 0.15 * u, by - b.ry * u * 1.35, 0.25 * u, by - b.ry * u * 0.8, acc);
  if (has(s, 'spout')) {
    const k = (t * 0.8) % 1;
    g.globalAlpha = 1 - k;
    ell(g, 0.1 * u, by - b.ry * u - k * 0.5 * u, 0.06 * u + k * 0.1 * u, 0.06 * u + k * 0.1 * u, '#bfe8ff');
    g.globalAlpha = 1;
  }

  // ---- head (separate for tall/long bodies)
  let hx = 0;
  let hy = -0.62 * u;
  if (b.head) {
    hx = b.head.x * u;
    hy = b.head.y * u;
    ell(g, hx, hy, b.head.r * u, b.head.r * u * 0.92, s.body);
  }
  if (s.shape === 'fish') {
    hx = 0.22 * u;
    hy = by - 0.04 * u;
  }
  if (s.shape === 'bird') hy = -0.68 * u;
  if (s.shape === 'tiny') hy = -0.82 * u;
  const hr = b.head ? b.head.r * u : 0.45 * u;

  // ears & horns (on top of head)
  const top = hy - hr * 0.8;
  if (has(s, 'bunnyEars')) {
    for (const sx of [-1, 1]) {
      const w = Math.sin(t * 2 + sx) * 0.04;
      ell(g, hx + sx * 0.15 * u, top - 0.28 * u, 0.1 * u, 0.3 * u, s.body, sx * (0.15 + w));
      ell(g, hx + sx * 0.15 * u, top - 0.26 * u, 0.05 * u, 0.2 * u, acc, sx * (0.15 + w));
    }
  }
  if (has(s, 'roundEars')) for (const sx of [-1, 1]) ell(g, hx + sx * hr * 0.72, top + 0.06 * u, 0.12 * u, 0.12 * u, s.body);
  if (has(s, 'pointyEars'))
    for (const sx of [-1, 1])
      tri(g, hx + sx * hr * 0.35, top + 0.1 * u, hx + sx * hr * 0.8, top - 0.2 * u, hx + sx * hr * 0.85, top + 0.18 * u, s.body);
  if (has(s, 'tuftEars'))
    for (const sx of [-1, 1])
      tri(g, hx + sx * hr * 0.4, top + 0.12 * u, hx + sx * hr * 0.75, top - 0.16 * u, hx + sx * hr * 0.9, top + 0.2 * u, shadeHex(s.body));
  if (has(s, 'bigEars')) for (const sx of [-1, 1]) ell(g, hx + sx * hr * 0.95, hy - 0.05 * u, 0.24 * u, 0.3 * u, shadeHex(s.body));
  if (has(s, 'antlers'))
    for (const sx of [-1, 1])
      line(
        g,
        [
          hx + sx * 0.12 * u,
          top + 0.05 * u,
          hx + sx * 0.22 * u,
          top - 0.3 * u,
          hx + sx * 0.38 * u,
          top - 0.42 * u,
          hx + sx * 0.22 * u,
          top - 0.3 * u,
          hx + sx * 0.1 * u,
          top - 0.4 * u,
        ],
        acc,
        0.06 * u,
      );
  if (has(s, 'goatHorns'))
    for (const sx of [-1, 1])
      line(g, [hx + sx * 0.12 * u, top + 0.08 * u, hx + sx * 0.28 * u, top - 0.18 * u, hx + sx * 0.4 * u, top - 0.02 * u], acc, 0.08 * u);
  if (has(s, 'unicornHorn')) {
    tri(g, hx - 0.07 * u, top + 0.05 * u, hx, top - 0.45 * u, hx + 0.07 * u, top + 0.05 * u, '#ffd84a');
    line(g, [hx - 0.04 * u, top - 0.08 * u, hx + 0.04 * u, top - 0.14 * u], '#fff3b0', 0.025 * u);
  }
  if (has(s, 'ossicones'))
    for (const sx of [-1, 1]) line(g, [hx + sx * 0.1 * u, top + 0.05 * u, hx + sx * 0.12 * u, top - 0.18 * u], acc, 0.06 * u);
  if (has(s, 'dragonHorns'))
    for (const sx of [-1, 1])
      tri(g, hx + sx * 0.12 * u, top + 0.08 * u, hx + sx * 0.32 * u, top - 0.3 * u, hx + sx * 0.28 * u, top + 0.12 * u, '#ffd07a');
  if (has(s, 'crest')) for (const k of [-1, 0, 1]) ell(g, hx + k * 0.08 * u, top - 0.1 * u, 0.05 * u, 0.14 * u, acc, k * 0.4);
  if (has(s, 'mane')) {
    const cols = ['#ff8fc8', '#b58cff', '#6ec8ff', '#b8ff6e'];
    cols.forEach((c, k) => ell(g, hx - hr * 0.7 - k * 0.02 * u, hy - 0.2 * u + k * 0.14 * u, 0.12 * u, 0.1 * u, c));
  }
  if (has(s, 'leafCrown'))
    for (let k = -2; k <= 2; k++)
      ell(g, hx + k * 0.14 * u, top - 0.08 * u - (2 - Math.abs(k)) * 0.05 * u, 0.07 * u, 0.15 * u, s.accent!, k * 0.35);
  if (has(s, 'crown')) {
    g.fillStyle = '#ffd84a';
    g.beginPath();
    g.moveTo(hx - 0.2 * u, by - b.ry * u * 0.7);
    for (let k = 0; k <= 4; k++) g.lineTo(hx - 0.2 * u + k * 0.1 * u, by - b.ry * u * 0.7 - (k % 2 ? 0.08 : 0.2) * u);
    g.lineTo(hx + 0.2 * u, by - b.ry * u * 0.7);
    g.closePath();
    g.fill();
  }

  // snouts, beaks, trunks
  const fy = hy + 0.02 * u;
  if (has(s, 'snout')) ell(g, hx + 0.02 * u, fy + 0.14 * u, 0.15 * u, 0.1 * u, s.belly ?? s.body);
  if (has(s, 'longSnout')) {
    ell(g, hx + 0.25 * u, fy + 0.08 * u, 0.3 * u, 0.1 * u, s.body);
    for (let k = 0; k < 3; k++)
      tri(
        g,
        hx + (0.1 + k * 0.12) * u,
        fy + 0.13 * u,
        hx + (0.14 + k * 0.12) * u,
        fy + 0.2 * u,
        hx + (0.18 + k * 0.12) * u,
        fy + 0.13 * u,
        '#fff',
      );
  }
  if (has(s, 'beard')) tri(g, hx - 0.06 * u, fy + 0.22 * u, hx, fy + 0.42 * u, hx + 0.06 * u, fy + 0.22 * u, s.belly ?? '#fff');

  // face
  if (has(s, 'topEyes')) {
    for (const sx of [-1, 1]) ell(g, hx + sx * 0.2 * u, hy - hr * 0.55, 0.15 * u, 0.15 * u, s.body);
    face(g, hx, hy - hr * 0.55, u, s, blink, 0.2);
  } else if (s.shape === 'fish') {
    face(g, hx, hy, u * 0.85, s, blink, 0.12);
  } else {
    face(g, hx, hy, u, s, blink);
  }
  if (has(s, 'whiskers')) {
    g.strokeStyle = 'rgba(40,30,50,0.5)';
    g.lineWidth = 0.02 * u;
    for (const sx of [-1, 1])
      for (const dy of [0.12, 0.18]) {
        g.beginPath();
        g.moveTo(hx + sx * 0.14 * u, fy + dy * u);
        g.lineTo(hx + sx * 0.36 * u, fy + (dy - 0.03) * u);
        g.stroke();
      }
  }
  if (has(s, 'beak'))
    tri(
      g,
      hx - 0.07 * u,
      fy + 0.1 * u,
      hx,
      fy + 0.26 * u,
      hx + 0.07 * u,
      fy + 0.1 * u,
      s.shape === 'bird' || id === 'penguin' || id === 'owl' ? acc : '#ffcf3d',
    );
  if (has(s, 'duckBill')) ell(g, hx, fy + 0.16 * u, 0.13 * u, 0.06 * u, acc);
  if (has(s, 'trunk')) {
    line(g, [hx, fy + 0.1 * u, hx + 0.02 * u, fy + 0.32 * u, hx + 0.12 * u + Math.sin(t * 2) * 0.04 * u, fy + 0.42 * u], s.body, 0.13 * u);
  }
  if (has(s, 'tusks'))
    for (const sx of [-1, 1])
      line(g, [hx + sx * 0.1 * u, fy + 0.2 * u, hx + sx * 0.2 * u, fy + 0.36 * u, hx + sx * 0.1 * u, fy + 0.44 * u], acc, 0.05 * u);
  if (has(s, 'sparkles')) {
    for (let k = 0; k < 3; k++) {
      const a = t * 1.5 + (k * Math.PI * 2) / 3;
      const px = Math.cos(a) * 0.65 * u;
      const py = -0.6 * u + Math.sin(a) * 0.45 * u;
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + k);
      tri(g, px, py - 0.07 * u, px + 0.03 * u, py, px - 0.03 * u, py, '#fffbe0');
      tri(g, px, py + 0.07 * u, px + 0.03 * u, py, px - 0.03 * u, py, '#fffbe0');
      g.globalAlpha = 1;
    }
  }
  if (acc2) drawAccessory(g, acc2, hx, hy, top, hr, u, t);
  g.restore();
}

function shadeHex(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * 0.8);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Render a creature to a standalone canvas (for DOM cards like the Lifebook). */
export function critterCanvas(id: string, px: number, t = 0.4, acc = ''): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr);
  c.style.width = c.style.height = `${px}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  drawCreature(g, id, px / 2, px * 0.9, 0, px * 0.62, t, acc);
  return c;
}

export const HAS_ART = (id: string) => id in SPECS;

/** Accessories drawn relative to the head: top of head, face level, neck. */
function drawAccessory(g: G, id: string, hx: number, hy: number, top: number, hr: number, u: number, t: number) {
  switch (id) {
    case 'bow': {
      const x = hx + hr * 0.45;
      const y = top + hr * 0.1;
      tri(g, x, y, x - 0.16 * u, y - 0.1 * u, x - 0.16 * u, y + 0.1 * u, '#ff6aa8');
      tri(g, x, y, x + 0.16 * u, y - 0.1 * u, x + 0.16 * u, y + 0.1 * u, '#ff6aa8');
      ell(g, x, y, 0.05 * u, 0.05 * u, '#ffd0e6');
      break;
    }
    case 'flower': {
      const x = hx - hr * 0.5;
      const y = top + hr * 0.15;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + t * 0.4;
        ell(g, x + Math.cos(a) * 0.07 * u, y + Math.sin(a) * 0.07 * u, 0.06 * u, 0.06 * u, k % 2 ? '#ffe066' : '#ffffff');
      }
      ell(g, x, y, 0.04 * u, 0.04 * u, '#ff9a3d');
      break;
    }
    case 'scarf': {
      const y = hy + hr * 0.78;
      g.fillStyle = '#ff5a5a';
      g.beginPath();
      g.roundRect(hx - hr * 0.8, y - 0.05 * u, hr * 1.6, 0.11 * u, 0.05 * u);
      g.fill();
      g.fillStyle = '#e03a4a';
      g.beginPath();
      g.roundRect(hx + hr * 0.35, y, 0.1 * u, 0.22 * u + Math.sin(t * 3) * 0.02 * u, 0.04 * u);
      g.fill();
      g.fillStyle = '#ffffff';
      for (let k = -1; k <= 1; k++) ell(g, hx + k * hr * 0.45, y, 0.02 * u, 0.02 * u, '#ffffff');
      break;
    }
    case 'crown': {
      const y = top + 0.02 * u;
      g.fillStyle = '#ffd24a';
      g.beginPath();
      g.moveTo(hx - 0.16 * u, y);
      g.lineTo(hx - 0.18 * u, y - 0.16 * u);
      g.lineTo(hx - 0.08 * u, y - 0.08 * u);
      g.lineTo(hx, y - 0.2 * u);
      g.lineTo(hx + 0.08 * u, y - 0.08 * u);
      g.lineTo(hx + 0.18 * u, y - 0.16 * u);
      g.lineTo(hx + 0.16 * u, y);
      g.closePath();
      g.fill();
      ell(g, hx, y - 0.05 * u, 0.03 * u, 0.03 * u, '#ff4a8a');
      break;
    }
    case 'shades': {
      const y = hy - hr * 0.08;
      for (const sx of [-1, 1]) {
        g.fillStyle = '#231a33';
        g.beginPath();
        g.roundRect(hx + sx * hr * 0.28 - 0.1 * u, y - 0.06 * u, 0.2 * u, 0.13 * u, 0.05 * u);
        g.fill();
      }
      g.strokeStyle = '#231a33';
      g.lineWidth = 0.03 * u;
      g.beginPath();
      g.moveTo(hx - hr * 0.1, y);
      g.lineTo(hx + hr * 0.1, y);
      g.stroke();
      ell(g, hx - hr * 0.33, y - 0.02 * u, 0.03 * u, 0.02 * u, 'rgba(255,255,255,0.7)');
      break;
    }
    case 'party': {
      const y = top + 0.04 * u;
      g.fillStyle = '#6ec8ff';
      g.beginPath();
      g.moveTo(hx - 0.13 * u, y);
      g.lineTo(hx + 0.02 * u, y - 0.4 * u);
      g.lineTo(hx + 0.15 * u, y);
      g.closePath();
      g.fill();
      g.strokeStyle = '#ffd24a';
      g.lineWidth = 0.035 * u;
      g.beginPath();
      g.moveTo(hx - 0.08 * u, y - 0.12 * u);
      g.lineTo(hx + 0.1 * u, y - 0.14 * u);
      g.moveTo(hx - 0.03 * u, y - 0.26 * u);
      g.lineTo(hx + 0.06 * u, y - 0.27 * u);
      g.stroke();
      ell(g, hx + 0.02 * u, y - 0.42 * u, 0.05 * u, 0.05 * u, '#ff6aa8');
      break;
    }
    // ---- festival costumes (meta/festivals.ts)
    case 'heart': {
      // a bobbing heart on a springy stalk
      const bx = hx + Math.sin(t * 2.4) * 0.04 * u;
      const by = top - 0.3 * u;
      line(g, [hx, top + 0.02 * u, (hx + bx) / 2 + 0.03 * u, top - 0.14 * u, bx, by], '#3a2a4a', 0.025 * u);
      heart(g, bx, by, 0.1 * u, '#ff5a9a');
      break;
    }
    case 'leaf': {
      const y = top + 0.02 * u;
      line(g, [hx, y, hx + 0.01 * u, y - 0.14 * u], '#3f8f2a', 0.03 * u);
      const sway = Math.sin(t * 1.6) * 0.15;
      ell(g, hx - 0.08 * u, y - 0.16 * u, 0.1 * u, 0.05 * u, '#6fd65a', -0.5 + sway);
      ell(g, hx + 0.09 * u, y - 0.18 * u, 0.1 * u, 0.05 * u, '#8ae66e', 0.5 + sway);
      break;
    }
    case 'rainhat': {
      const y = top + 0.06 * u;
      ell(g, hx, y, hr * 1.05, 0.07 * u, '#f0b820');
      g.fillStyle = '#ffd24a';
      g.beginPath();
      g.ellipse(hx, y - 0.02 * u, hr * 0.62, 0.2 * u, 0, Math.PI, 0);
      g.fill();
      ell(g, hx - hr * 0.2, y - 0.12 * u, 0.05 * u, 0.025 * u, 'rgba(255,255,255,0.6)', -0.3);
      break;
    }
    case 'wreath': {
      const y = top + 0.05 * u;
      const cols = ['#ff8fc8', '#ffe066', '#ffffff', '#b58cff', '#ff9a4a'];
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        const px = hx + Math.cos(a) * hr * 0.75;
        const py = y + Math.sin(a) * 0.1 * u;
        ell(g, px, py + 0.02 * u, 0.05 * u, 0.03 * u, '#5ec85a', a);
        ell(g, px, py, 0.05 * u, 0.05 * u, cols[k % cols.length]);
        ell(g, px, py, 0.02 * u, 0.02 * u, '#ffb13d');
      }
      break;
    }
    case 'star': {
      const x = hx + hr * 0.5;
      const y = top + hr * 0.12;
      star5(g, x, y, 0.1 * u, t, '#ffd84a');
      ell(g, x - 0.02 * u, y - 0.02 * u, 0.02 * u, 0.015 * u, 'rgba(255,255,255,0.8)');
      break;
    }
    case 'lantern': {
      // a tiny paper lantern hanging from a stick over the head
      const sx = hx + hr * 0.2;
      const y = top - 0.22 * u;
      line(g, [hx - hr * 0.3, top + 0.02 * u, sx + 0.1 * u, y], '#8a5a30', 0.03 * u);
      const swing = Math.sin(t * 2) * 0.03 * u;
      line(g, [sx + 0.1 * u, y, sx + 0.1 * u + swing, y + 0.08 * u], '#3a2a4a', 0.015 * u);
      const lx = sx + 0.1 * u + swing;
      const ly = y + 0.16 * u;
      const gl = g.createRadialGradient(lx, ly, 0, lx, ly, 0.2 * u);
      gl.addColorStop(0, 'rgba(255,200,90,0.55)');
      gl.addColorStop(1, 'rgba(255,200,90,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(lx, ly, 0.2 * u, 0, Math.PI * 2);
      g.fill();
      ell(g, lx, ly, 0.07 * u, 0.09 * u, '#ff6a3d');
      ell(g, lx, ly, 0.04 * u, 0.07 * u, '#ffb13d');
      g.fillStyle = '#5a2a1a';
      g.fillRect(lx - 0.04 * u, ly - 0.1 * u, 0.08 * u, 0.02 * u);
      g.fillRect(lx - 0.04 * u, ly + 0.08 * u, 0.08 * u, 0.02 * u);
      break;
    }
    case 'acorn': {
      const y = top + 0.07 * u;
      g.fillStyle = '#9a6a3a';
      g.beginPath();
      g.ellipse(hx, y, hr * 0.62, 0.16 * u, 0, Math.PI, 0);
      g.fill();
      g.strokeStyle = 'rgba(90,50,20,0.6)';
      g.lineWidth = 0.015 * u;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(hx + k * hr * 0.2, y);
        g.lineTo(hx + k * hr * 0.12, y - 0.13 * u);
        g.stroke();
      }
      line(g, [hx, y - 0.15 * u, hx + 0.04 * u, y - 0.24 * u], '#6a4020', 0.035 * u);
      break;
    }
    case 'pumpkin': {
      const y = top - 0.02 * u;
      for (const [dx, c] of [
        [-0.08, '#f07a1a'],
        [0.08, '#f07a1a'],
        [0, '#ff9a3a'],
      ] as [number, string][])
        ell(g, hx + dx * u, y, 0.11 * u, 0.12 * u, c);
      line(g, [hx, y - 0.11 * u, hx + 0.03 * u, y - 0.2 * u], '#3f8f2a', 0.04 * u);
      ell(g, hx + 0.07 * u, y - 0.17 * u, 0.05 * u, 0.025 * u, '#6fd65a', 0.4);
      // a friendly face
      ell(g, hx - 0.04 * u, y - 0.02 * u, 0.018 * u, 0.018 * u, '#5a2a0a');
      ell(g, hx + 0.04 * u, y - 0.02 * u, 0.018 * u, 0.018 * u, '#5a2a0a');
      g.strokeStyle = '#5a2a0a';
      g.lineWidth = 0.015 * u;
      g.beginPath();
      g.arc(hx, y + 0.02 * u, 0.04 * u, 0.2, Math.PI - 0.2);
      g.stroke();
      break;
    }
    case 'knit': {
      const y = top + 0.08 * u;
      g.fillStyle = '#b58cff';
      g.beginPath();
      g.ellipse(hx, y, hr * 0.7, 0.22 * u, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = '#8a5ae0';
      g.beginPath();
      g.roundRect(hx - hr * 0.74, y - 0.05 * u, hr * 1.48, 0.08 * u, 0.04 * u);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.015 * u;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(hx + k * hr * 0.2, y - 0.06 * u);
        g.lineTo(hx + k * hr * 0.14, y - 0.18 * u);
        g.stroke();
      }
      ell(g, hx, y - 0.25 * u, 0.07 * u, 0.07 * u, '#ffe066');
      break;
    }
    case 'pom': {
      const y = top + 0.06 * u;
      const tip = Math.sin(t * 2) * 0.03 * u;
      g.fillStyle = '#ff4a5a';
      g.beginPath();
      g.moveTo(hx - hr * 0.6, y);
      g.quadraticCurveTo(hx - 0.02 * u, y - 0.4 * u, hx + 0.26 * u + tip, y - 0.2 * u);
      g.quadraticCurveTo(hx + 0.1 * u, y - 0.14 * u, hx + hr * 0.6, y);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.roundRect(hx - hr * 0.68, y - 0.05 * u, hr * 1.36, 0.09 * u, 0.045 * u);
      g.fill();
      ell(g, hx + 0.27 * u + tip, y - 0.2 * u, 0.06 * u, 0.06 * u, '#ffffff');
      break;
    }
  }
}

function heart(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.4);
  g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  g.fill();
}

function star5(g: G, x: number, y: number, r: number, t: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5 + Math.sin(t) * 0.1;
    const rr = k % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
