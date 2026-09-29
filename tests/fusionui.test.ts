import { describe, expect, it } from 'vitest';
import { REACTIONS, REACTION_IDS } from '../src/core/round';
import { reactionForPair } from '../src/ui/screens/fieldguide';
import { reactionColor } from '../src/ui/art/reactions';
import { advanceFeedback, enqueueFeedback, feedbackState } from '../src/ui/feel';
import { landingCardRect } from '../src/ui/preview';
import type { LevelScene } from '../src/ui/game';
import { showBestCombo, starMarkerPositions } from '../src/ui/hud';
import { rulesForLevel } from '../src/core/round';

describe('fusion UI data', () => {
  it('separates crowded life targets without changing their values', () => {
    const positions = starMarkerPositions([315, 390, 405], 454, 200, 23);
    expect(positions[1] - positions[0]).toBeGreaterThanOrEqual(23);
    expect(positions[2] - positions[1]).toBeGreaterThanOrEqual(23);
    expect(positions[2]).toBeCloseTo((405 / 454) * 200);
  });
  it('hides the Best Combo line until a taught Combo exists', () => {
    expect(showBestCombo(0, rulesForLevel(26))).toBe(false);
    expect(showBestCombo(2, rulesForLevel(25))).toBe(false);
    expect(showBestCombo(2, rulesForLevel(26))).toBe(true);
  });
  it.each([320, 390])('keeps the warning card below the modifier at %i px', (width) => {
    const scale = 0.86;
    const box = (bottom: number) => ({ bottom: bottom * scale });
    const scene = {
      w: width,
      h: width === 320 ? 568 : 844,
      canvas: { getBoundingClientRect: () => ({ top: 0, height: (width === 320 ? 568 : 844) * scale }) },
      goalsEl: { getBoundingClientRect: () => box(170) },
      el: {
        querySelector: (selector: string) =>
          selector === '.twist' || selector === '.banners .show'
            ? { getBoundingClientRect: () => box(selector === '.twist' ? 205 : 220) }
            : null,
      },
      predictCache: { reaction: 'scorch', lost: 'A very long creature name wanders off', comboEnd: false },
      g: { save() {}, restore() {}, measureText: (text: string) => ({ width: text.length * 12 }) },
      previewTextScale: 1,
    } as unknown as LevelScene;
    const rect = landingCardRect(scene);
    expect(rect.y).toBeCloseTo(228, 5);
    expect(rect.height).toBe(88);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
  });
  it('maps the chart symmetrically to every launch reaction', () => {
    for (const id of REACTION_IDS) {
      const [a, b] = REACTIONS[id].pair;
      expect(reactionForPair(a, b)).toBe(id);
      expect(reactionForPair(b, a)).toBe(id);
      expect(reactionColor(id)).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(reactionForPair('rock', 'seed')).toBeNull();
  });

  it('keeps a reaction and a combo word within the two popup limit', () => {
    let feedback = feedbackState();
    for (const [text, priority] of [
      ['STEAM!', 4],
      ['COMBO 2!', 3],
      ['+3 Supernova', 0],
    ] as const)
      feedback = enqueueFeedback(feedback, { text, priority, x: 0, y: 0, color: '#fff', size: 20, duration: 1, queuedAt: 0 });
    feedback = advanceFeedback(feedback, 0);
    feedback = advanceFeedback(feedback, 250);
    expect(feedback.active.map((item) => item.text)).toEqual(['STEAM!', 'COMBO 2!']);
    expect(feedback.active).toHaveLength(2);
  });
});
