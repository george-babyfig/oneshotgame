import { describe, expect, it } from 'vitest';
import { CLEAR_PALETTE, CLASSIC_PALETTE } from '../src/core/palette';
import type { BiomeId } from '../src/core/world';
import { allowFullScreenFlash } from '../src/ui/art/planet';

// Machado et al. full-severity matrices, applied to linear sRGB.
const MACHADO = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

function linear(hex: string): number[] {
  return [1, 3, 5].map((at) => {
    const v = parseInt(hex.slice(at, at + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

function lab(hex: string, matrix: readonly (readonly number[])[]): number[] {
  const rgb = linear(hex);
  const [r, g, b] = matrix.map((row) =>
    Math.max(
      0,
      Math.min(
        1,
        row.reduce((sum, value, i) => sum + value * rgb[i], 0),
      ),
    ),
  );
  const xyz = [
    (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883,
  ];
  const [x, y, z] = xyz.map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function worstPair(colors: Record<BiomeId, string>, model: keyof typeof MACHADO) {
  const entries = Object.entries(colors) as [BiomeId, string][];
  let worst = { pair: ['', ''], delta: Infinity };
  for (let a = 0; a < entries.length; a++) {
    for (let b = a + 1; b < entries.length; b++) {
      const left = lab(entries[a][1], MACHADO[model]);
      const right = lab(entries[b][1], MACHADO[model]);
      const delta = Math.hypot(...left.map((v, i) => v - right[i]));
      if (delta < worst.delta) worst = { pair: [entries[a][0], entries[b][0]], delta };
    }
  }
  return worst;
}

describe('land palette under colour-vision simulations', () => {
  for (const model of Object.keys(MACHADO) as (keyof typeof MACHADO)[]) {
    it(`keeps every Clear land pair at least 10 CIE76 apart under ${model}`, () => {
      expect(Object.keys(CLEAR_PALETTE)).toHaveLength(17);
      const clear = worstPair(CLEAR_PALETTE, model);
      expect(clear.delta).toBeGreaterThanOrEqual(10);
      const classic = worstPair(CLASSIC_PALETTE, model);
      console.info(`Clear ${model}: ${clear.pair.join(' / ')} ΔE76 ${clear.delta.toFixed(2)}`);
      console.info(`Classic ${model}: ${classic.pair.join(' / ')} ΔE76 ${classic.delta.toFixed(2)}`);
    });
  }
});

it('allows at most three full-screen flashes in one second', () => {
  expect([0, 100, 200].map((at) => allowFullScreenFlash(at))).toEqual([true, true, true]);
  expect(allowFullScreenFlash(300)).toBe(false);
  expect(allowFullScreenFlash(1000)).toBe(true);
});
