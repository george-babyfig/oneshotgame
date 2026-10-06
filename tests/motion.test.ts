import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { MOTION, clamp01, countValue, duration, easeOut, effectiveReduceMotion, spring } from '../src/ui/motion';

afterEach(() => vi.unstubAllGlobals());

describe('motion timing', () => {
  it('keeps every show short and the calm version shorter', () => {
    for (const ms of Object.values(MOTION)) {
      expect(ms).toBeLessThan(2000);
      expect(duration(ms, true)).toBeLessThanOrEqual(MOTION.calm);
      expect(duration(ms, false)).toBe(ms);
    }
  });

  it('clamps progress and lets the spring overshoot before settling', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(spring(0)).toBe(0);
    expect(spring(0.35)).toBeGreaterThan(1);
    expect(spring(1)).toBe(1);
  });

  it('counts smoothly from either direction and lands exactly', () => {
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(countValue(10, 110, 0)).toBe(10);
    expect(countValue(10, 110, MOTION.count / 2)).toBeGreaterThan(60);
    expect(countValue(10, 110, MOTION.count)).toBe(110);
    expect(countValue(110, 10, MOTION.count)).toBe(10);
  });

  it('honours either the saved choice or the device setting', () => {
    const p = defaultProfile();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(effectiveReduceMotion(p)).toBe(false);
    p.settings.reduceMotion = true;
    expect(effectiveReduceMotion(p)).toBe(true);
    p.settings.reduceMotion = false;
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(effectiveReduceMotion(p)).toBe(true);
  });
});
