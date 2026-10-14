import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { simulate } from './economy/career';

describe.skipIf(!process.env.SIM)('A12 180-day progress backup size', () => {
  it('fits raw JSON and one native zlib key with metadata headroom', async () => {
    const career = await simulate('Regular', 'default', { days: 180 });
    const json = JSON.stringify(career.profile);
    const raw = Buffer.byteLength(json, 'utf8');
    const compressed = deflateSync(json).length;
    // Native binary-plist metadata is under 2 KB. Reserve 4 KB rather than measuring payload only.
    const key = compressed + 4096;
    console.log(JSON.stringify({ days: career.days.length, level: career.profile.level, raw, compressed, keyWithHeadroom: key }));
    expect(career.days).toHaveLength(180);
    expect(raw).toBeLessThanOrEqual(256 * 1024);
    expect(key).toBeLessThanOrEqual(96 * 1024);
    expect(6 * key).toBeLessThanOrEqual(900 * 1024);
  });
});
