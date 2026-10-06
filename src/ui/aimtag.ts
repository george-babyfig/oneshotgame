import { BIOMES, SPECIES_BY_ID, type BiomeId } from '../core/world';
import { REACTIONS, type StepResult } from '../core/round';
import { TROUBLES } from '../core/troubles';
import { t } from '../i18n';

export interface AimTagFacts {
  delta: number;
  land: BiomeId;
  arrivals: string[];
  firstArrivals: string[];
  lost: StepResult['lost'];
  reaction?: StepResult['reactions'][number]['id'];
  superFusion: boolean;
  comboBeads: number;
  comboEnd: boolean;
  settled: StepResult['troubleEvents'];
  firstTroubleSettled: boolean;
  trouble: string;
}

export function aimTagFacts(result: StepResult, land: BiomeId): AimTagFacts {
  return {
    delta: result.after - result.before,
    land,
    arrivals: result.spawned.map((arrival) => arrival.id),
    firstArrivals: result.firstArrivals,
    lost: result.lost,
    reaction: result.reactions[0]?.id,
    superFusion: !!result.combo.superFusion,
    comboBeads: result.combo.step ? Math.min(4, result.combo.links) : 0,
    comboEnd: !!result.combo.ended && result.combo.links === 0,
    settled: result.troubleEvents.filter((event) => event.kind === 'settled'),
    firstTroubleSettled: result.troubleEvents[0]?.kind === 'settled',
    trouble: result.troubleEvents[0]
      ? result.troubleEvents[0].kind === 'settled'
        ? result.troubleEvents[0].id === 'vent'
          ? t('Vent cooled!')
          : t('{name} settled!', { name: t(TROUBLES[result.troubleEvents[0].id].name) })
        : result.troubleEvents[0].kind === 'blocked'
          ? t('Safe!')
          : t('{name} reaches this land', { name: t(TROUBLES[result.troubleEvents[0].id].name) })
      : '',
  };
}

export function aimTagSummary(facts: AimTagFacts): string {
  const land = t(BIOMES[facts.land].name);
  const parts = [land];
  if (facts.delta) parts.push(t('{n} life', { n: `${facts.delta > 0 ? '+' : ''}${facts.delta}` }));
  for (const id of facts.arrivals) parts.push(t('{creature} moves in', { creature: t(SPECIES_BY_ID[id].name) }));
  if (facts.reaction) parts.push(t(REACTIONS[facts.reaction].name));
  if (facts.comboBeads) parts.push(t('Combo {n}', { n: facts.comboBeads }));
  if (facts.comboEnd) parts.push(t('Combo ends'));
  for (const lost of facts.lost) parts.push(t('{creature} wanders off', { creature: t(SPECIES_BY_ID[lost.species].name) }));
  if (facts.trouble) parts.push(facts.trouble);
  for (const event of facts.settled.slice(facts.firstTroubleSettled ? 1 : 0))
    parts.push(event.id === 'vent' ? t('Vent cooled!') : t('{name} settled!', { name: t(TROUBLES[event.id].name) }));
  return parts.join('. ');
}

export function aimTagRing(facts: AimTagFacts): 'plain' | 'gold' | 'double-gold' | 'red' {
  if (!facts.reaction) return 'plain';
  if (REACTIONS[facts.reaction].kind === 'clash') return 'red';
  return facts.superFusion ? 'double-gold' : 'gold';
}

export function aimTagSymbols(facts: AimTagFacts): string[] {
  const icons = [BIOMES[facts.land].deco || '●'];
  for (const id of facts.arrivals) icons.push(`${SPECIES_BY_ID[id].emoji}${facts.firstArrivals.includes(id) ? '✨' : ''}`);
  if (facts.reaction) icons.push(REACTIONS[facts.reaction].icon);
  for (const lost of facts.lost) icons.push(`${SPECIES_BY_ID[lost.species].emoji}↗`);
  for (const event of facts.settled) icons.push(`✓${TROUBLES[event.id].icon}`);
  if (facts.comboEnd) icons.push('◌̸');
  return icons;
}

export function aimTagSize(facts: AimTagFacts, screenWidth: number): { width: number; height: number } {
  return { width: screenWidth <= 330 ? 94 : 104, height: 66 + (Math.ceil(aimTagSymbols(facts).length / 5) - 1) * 18 };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface TagPlacement {
  rect: Rect;
  anchor: Point;
}

export function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

export function segmentNearRect(a: Point, b: Point, rect: Rect, gap: number): boolean {
  const box = { x: rect.x - gap, y: rect.y - gap, width: rect.width + gap * 2, height: rect.height + gap * 2 };
  if (a.x >= box.x && a.x <= box.x + box.width && a.y >= box.y && a.y <= box.y + box.height) return true;
  if (b.x >= box.x && b.x <= box.x + box.width && b.y >= box.y && b.y <= box.y + box.height) return true;
  if (a.x === b.x && a.y === b.y) return false;
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
  return corners.some((p, i) => {
    const q = corners[(i + 1) % corners.length];
    return cross(a, b, p) * cross(a, b, q) <= 0 && cross(p, q, a) * cross(p, q, b) <= 0;
  });
}

/** Try either tangent around the predicted sector, then move a little farther around the rim. */
export function placeAimTag(
  anchor: Point,
  center: Point,
  size: { width: number; height: number },
  screen: { width: number; height: number },
  reserved: Rect[],
  lastSegment: [Point, Point] | null,
): TagPlacement | null {
  const radialX = anchor.x - center.x;
  const radialY = anchor.y - center.y;
  const length = Math.hypot(radialX, radialY) || 1;
  const tx = -radialY / length;
  const ty = radialX / length;
  const candidates = [0, 48, -48, 84, -84, 120, -120, 160, -160];
  const rectAt = (offset: number): Rect => {
    const x = anchor.x + tx * offset;
    const y = anchor.y + ty * offset;
    return {
      x: Math.max(6, Math.min(screen.width - size.width - 6, x - size.width / 2)),
      y: Math.max(6, Math.min(screen.height - size.height - 6, y - size.height / 2)),
      ...size,
    };
  };
  const safe = (rect: Rect) =>
    reserved.every((zone) => !intersects(rect, zone, 5)) && (!lastSegment || !segmentNearRect(lastSegment[0], lastSegment[1], rect, 9));
  for (const offset of candidates) {
    const rect = rectAt(offset);
    if (safe(rect)) return { rect, anchor };
  }
  // Rarely a crowded screen has no rim slot. Search the free canvas, closest to the sector first.
  const alternatives: Rect[] = [];
  for (let y = 6; y <= screen.height - size.height - 6; y += 12)
    for (let x = 6; x <= screen.width - size.width - 6; x += 12) alternatives.push({ x, y, ...size });
  alternatives.sort(
    (a, b) =>
      Math.hypot(a.x + size.width / 2 - anchor.x, a.y + size.height / 2 - anchor.y) -
      Math.hypot(b.x + size.width / 2 - anchor.x, b.y + size.height / 2 - anchor.y),
  );
  const rect = alternatives.find(safe);
  return rect ? { rect, anchor } : null;
}
