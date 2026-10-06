// Cosmetic ink sits behind the fixed gameplay symbols. No style changes a hit box,
// object body, element colour, badge, aim line, preview, goal chip, land or threat.
import { KINDS, type Kind } from '../../core/world';
import { COSMETIC_BY_ID, type StyledLook } from '../../meta/cosmetics';
import type { BuildingType } from '../../meta/homeworld';
import { drawTrail } from './keeper';

type G = CanvasRenderingContext2D;
type Point = Readonly<{ x: number; y: number }>;
export const STYLE_PARTICLE_CAP = 12;
export const STYLE_ALPHA_CAP = 0.45;

export function homeworldStyleColors(look: StyledLook): { ground?: string[]; sea?: string[] } {
  return {
    ground: look.ground ? COSMETIC_BY_ID[look.ground]?.colors : undefined,
    sea: look.sea ? COSMETIC_BY_ID[look.sea]?.colors : undefined,
  };
}

export function structureStyleId(look: StyledLook, type: BuildingType, kind?: Kind): string | undefined {
  if (type === 'lab') return kind ? look[`labSkin:${kind}`] : undefined;
  if (type === 'den') return look.denSkin;
  if (type === 'greenhouse') return look.greenhouseSkin;
  if (type === 'launch_bay') return look.launchBaySkin;
  if (type === 'flowers' || type === 'fountain' || type === 'lantern') return look[`decoration:${type}`];
  return undefined;
}

/** Overlay after the normal friend sprite. It never covers its eyes or face. */
export function drawFriendOutfit(g: G, look: StyledLook, x: number, y: number, size: number): void {
  const item = COSMETIC_BY_ID[look.friendOutfit ?? ''];
  if (!item) return;
  g.save();
  g.globalAlpha = 0.45;
  g.strokeStyle = item.colors[0];
  g.lineWidth = Math.max(2, size * (item.id.endsWith('_friend_2') ? 0.075 : 0.055));
  g.lineCap = 'round';
  g.beginPath();
  if (item.id.endsWith('_friend_2')) g.arc(x, y + size * 0.07, size * 0.23, 0.1, Math.PI - 0.1);
  else g.arc(x, y + size * 0.18, size * 0.31, 0.18, Math.PI - 0.18);
  g.stroke();
  if (!item.id.endsWith('_friend_2')) {
    g.fillStyle = item.colors[1] ?? item.colors[0];
    g.beginPath();
    g.moveTo(x - size * 0.22, y + size * 0.12);
    g.lineTo(x, y + size * 0.34);
    g.lineTo(x + size * 0.22, y + size * 0.12);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function motif(g: G, x: number, y: number, r: number, shape: string) {
  g.beginPath();
  if (shape === 'crystal' || shape === 'nebula') {
    g.moveTo(x, y - r);
    g.lineTo(x + r * 0.7, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r * 0.7, y);
    g.closePath();
  } else if (shape === 'wave' || shape === 'ribbon') {
    g.ellipse(x, y, r, r * 0.4, -0.4, 0, Math.PI * 2);
  } else if (shape === 'candy') {
    g.roundRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2, r * 0.3);
  } else {
    g.arc(x, y, r * 0.65, 0, Math.PI * 2);
  }
  g.fill();
}

function marks(g: G, id: string | undefined, points: readonly Point[], still: boolean) {
  if (!id) return;
  const item = COSMETIC_BY_ID[id];
  if (!item?.motif) return;
  const count = still ? 1 : Math.min(STYLE_PARTICLE_CAP, points.length);
  if (!count) return;
  g.save();
  g.fillStyle = item.colors[0];
  for (let i = 0; i < count; i++) {
    const index = Math.floor((i * points.length) / count);
    const p = points[index];
    g.globalAlpha = STYLE_ALPHA_CAP * ((index + 1) / points.length);
    motif(g, p.x, p.y, 2.5, item.motif);
  }
  g.restore();
}

/** B replaces fx.ts's drawTrail call with this; the object feel trail remains separate. */
export function drawStyledShotTrail(g: G, look: StyledLook, kind: Kind, points: Point[], time: number, still = false): void {
  drawTrail(g, look.trail, points, time, KINDS[kind].color);
  marks(g, look[`shotTrail:${kind}`], points, still);
}

/** Add after the normal impact. Element-coloured core and silhouette stay untouched. */
export function drawStyledBurst(g: G, look: StyledLook, kind: Kind, x: number, y: number, radius: number, still = false): void {
  const item = COSMETIC_BY_ID[look[`burst:${kind}`] ?? ''];
  if (!item?.motif) return;
  g.save();
  g.fillStyle = item.colors[0];
  g.globalAlpha = STYLE_ALPHA_CAP;
  const count = still ? 3 : 6;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    motif(g, x + Math.cos(a) * radius * 0.8, y + Math.sin(a) * radius * 0.8, 3, item.motif);
  }
  g.restore();
}

/** Fixed six marks; draw only after the normal Supernova/Fusion label and icon. */
export function drawStyledEvent(
  g: G,
  look: StyledLook,
  event: 'supernova' | 'fusion',
  x: number,
  y: number,
  radius: number,
  still = false,
): void {
  const item = COSMETIC_BY_ID[look[event] ?? ''];
  if (!item?.motif) return;
  g.save();
  g.fillStyle = item.colors[0];
  g.globalAlpha = STYLE_ALPHA_CAP;
  const count = still ? 3 : 6;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    motif(g, x + Math.cos(a) * radius, y + Math.sin(a) * radius, 3, item.motif);
  }
  g.restore();
}

/** The same ink path is used by Styles and gameplay, so try-on is faithful. */
export function drawStylePreview(g: G, look: StyledLook, kind: Kind, points: Point[], time: number, still = false): void {
  drawStyledShotTrail(g, look, kind, points, time, still);
  if (points.length) {
    const last = points[points.length - 1];
    // Show the impact beside the flying object, as it appears at impact in a round.
    const impact = { x: last.x + 29, y: last.y - 22 };
    drawStyledBurst(g, look, kind, impact.x, impact.y, 22, still);
    drawStyledEvent(g, look, 'supernova', impact.x, impact.y, 28, still);
    drawStyledEvent(g, look, 'fusion', impact.x, impact.y, 26, still);
  }
}
