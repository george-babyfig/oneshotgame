import { describe, expect, it } from 'vitest';
import {
  checkChallenge,
  clearParentPin,
  createChallenge,
  hashParentPin,
  setParentPin,
  shuffleDigits,
  verifyParentPin,
} from '../src/ui/flows/gate';
import { defaultProfile } from '../src/meta/profile';

describe('Gate v2 rules', () => {
  it('generates three-digit numbers across the full range', () => {
    expect(createChallenge(() => 0).number).toBe(100);
    expect(createChallenge(() => 0.999999).number).toBe(999);
    expect(createChallenge(() => 1).number).toBe(999);
  });

  it('accepts only the exact answer', () => {
    const challenge = { number: 412, pausedUntil: 0 };
    expect(checkChallenge(challenge, '412', 1000).passed).toBe(true);
    expect(checkChallenge(challenge, '0412', 1000).passed).toBe(false);
  });

  it('pauses for 30 seconds and changes the number after a wrong answer', () => {
    const original = { number: 412, pausedUntil: 0 };
    const wrong = checkChallenge(original, '413', 1000, () => 0.9);
    expect(wrong.passed).toBe(false);
    expect(wrong.challenge.number).not.toBe(original.number);
    expect(wrong.challenge.pausedUntil).toBe(31_000);
    expect(checkChallenge(wrong.challenge, String(wrong.challenge.number), 30_999).passed).toBe(false);
    expect(checkChallenge(wrong.challenge, String(wrong.challenge.number), 31_000).passed).toBe(true);
    expect(checkChallenge(original, '000', 1000, () => (412 - 100) / 900).challenge.number).not.toBe(412);
  });

  it('shuffles all ten digits once', () => {
    const digits = shuffleDigits(() => 0);
    expect([...digits].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(digits).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('hashes and verifies a four-digit PIN', async () => {
    const hash = await hashParentPin('1234');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('1234');
    expect(await verifyParentPin('1234', hash)).toBe(true);
    expect(await verifyParentPin('4321', hash)).toBe(false);
    expect(await verifyParentPin('1234', '1234')).toBe(false);
    await expect(hashParentPin('123')).rejects.toThrow();
  });

  it('stores only a PIN hash and can clear it', async () => {
    const profile = defaultProfile();
    await setParentPin('1234', profile);
    const stored = (profile.settings as typeof profile.settings & { parentPin?: string }).parentPin;
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyParentPin('1234', stored!)).toBe(true);
    await clearParentPin(profile);
    expect((profile.settings as typeof profile.settings & { parentPin?: string }).parentPin).toBe('');
  });
});
