import { describe, expect, it } from 'vitest';
import { REACTIONS, REACTION_IDS } from '../src/core/round';
import { reactionForPair } from '../src/ui/screens/fieldguide';
import { reactionColor } from '../src/ui/art/reactions';
import { advanceFeedback, enqueueFeedback, feedbackState } from '../src/ui/feel';
import { safeTroubleText } from '../src/ui/preview';
import { bannerTopFor, forecastBeatText, forecastInThrows, showBestCombo, starMarkerPositions } from '../src/ui/hud';
import { rulesForLevel } from '../src/core/round';
import { troubleTargetShape } from '../src/ui/art/troubles';

describe('fusion UI data', () => {
  it('reads Trouble beats without a beat index', () => {
    expect(forecastBeatText('♨️', '◆', 3)).toBe('♨️ ◆ in 3');
    expect(forecastInThrows(1)).toBe('in 1 throw');
    expect(forecastInThrows(2)).toBe('in 2 throws');
    expect(safeTroubleText()).toBe('Safe!');
    expect(['vent', 'vine', 'frost'].map((id) => troubleTargetShape(id as 'vent' | 'vine' | 'frost', false))).toEqual(['◆', '▲', '●']);
    expect(troubleTargetShape('vent', true)).toBe('▣');
  });
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
  it('keeps coach banners below the forecast and modifier', () => {
    expect(bannerTopFor(0, 170, 242, 205)).toBe(250);
    expect(bannerTopFor(0, Math.max(170, 190) + 8, 0, 0)).toBe(206);
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
