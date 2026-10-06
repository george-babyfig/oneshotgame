import { describe, expect, it } from 'vitest';
import { aimTagFacts, aimTagRing, aimTagSummary, aimTagSymbols, intersects, placeAimTag } from '../src/ui/aimtag';
import { SPECIES_BY_ID } from '../src/core/world';
import type { StepResult } from '../src/core/round';

describe('on-planet aim tag', () => {
  it.each([
    [320, 568],
    [390, 844],
  ])('stays on screen and avoids the final aim segment, HUD, queue and finger at %i×%i', (width, height) => {
    const reserved = [
      { x: 0, y: 0, width, height: 240 },
      { x: 0, y: height - 94, width, height: 94 },
      { x: width - 100, y: 345, width: 100, height: 110 },
      { x: 4, y: 260, width: 60, height: 75 },
    ];
    const line = [
      { x: width / 2 + 32, y: 312 },
      { x: width / 2 + 105, y: 312 },
    ] as const;
    const { rect } = placeAimTag(
      { x: width / 2 + 102, y: 312 },
      { x: width / 2, y: 312 },
      { width: 94, height: 66 },
      { width, height },
      reserved,
      [line[0], line[1]],
    )!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(height);
    for (const zone of reserved) expect(intersects(rect, zone, 5)).toBe(false);
    expect(intersects(rect, { x: line[0].x, y: 303, width: line[1].x - line[0].x, height: 18 })).toBe(false);
  });

  it('renders the same fusion, combo, arrivals, losses and settled Trouble as the prediction', () => {
    const ids = Object.keys(SPECIES_BY_ID);
    const result = {
      before: 10,
      after: 26,
      spawned: [{ id: ids[0], at: 4 }],
      firstArrivals: [ids[0]],
      lost: [
        { species: ids[1], sector: 7 },
        { species: ids[2], sector: 8 },
      ],
      reactions: [{ id: 'steam', at: 4, partner: 5, sectors: [4, 5] }],
      combo: { links: 5, step: 5, superFusion: true },
      troubleEvents: [{ id: 'vent', kind: 'settled', sector: 4 }],
    } as unknown as StepResult;
    const facts = aimTagFacts(result, 'forest');
    expect(facts.delta).toBe(16);
    expect(aimTagRing(facts)).toBe('double-gold');
    expect(facts.comboBeads).toBe(4);
    expect(aimTagSymbols(facts)).toEqual(
      expect.arrayContaining(['♨️', `✓♨️`, `${SPECIES_BY_ID[ids[1]].emoji}↗`, `${SPECIES_BY_ID[ids[2]].emoji}↗`]),
    );
    expect(aimTagSymbols(facts).some((icon) => icon.includes('✨'))).toBe(true);
    expect(aimTagSummary(facts)).toContain('+16');
    expect(aimTagSummary(facts)).toContain('Vent cooled!');
    expect(aimTagRing({ ...facts, reaction: 'scorch', superFusion: false })).toBe('red');
    expect(aimTagFacts({ ...result, after: 7, combo: { links: 0, step: 0 } }, 'desert').delta).toBe(-3);
  });
});
