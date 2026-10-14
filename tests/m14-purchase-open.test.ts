import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { COSMETICS, cosmeticOpen } from '../src/meta/cosmetics';
import { ROAD01 } from '../src/meta/content/road01';
import { productOpeningText } from '../src/ui/flows/contents';

// Road 1 stays dormant until the owner pins its date, but a grown-up can buy its Theme and Style Single
// from install: those purchases must be visible and usable at once (only the Pass waits for its Road).
describe('M14 purchases before Road 1 opens', () => {
  const theme = ROAD01.products.find((product) => product.kind !== 'road_pass' && product.key.startsWith('theme'))!;
  const single = ROAD01.products.find((product) => product.key.startsWith('style'))!;
  const pass = ROAD01.products.find((product) => product.kind === 'road_pass')!;
  const looksOf = (productId: string) => COSMETICS.filter((x) => x.productId === productId);

  it('hides unowned Road 1 product looks and shows them once bought', () => {
    for (const product of [theme, single]) {
      const p = defaultProfile();
      const looks = looksOf(product.id);
      expect(looks.length).toBeGreaterThan(0);
      expect(looks.every((x) => !cosmeticOpen(p, x))).toBe(true);
      p.meta.productEntitlements = [...(p.meta.productEntitlements ?? []), product.id];
      expect(looks.every((x) => cosmeticOpen(p, x))).toBe(true);
    }
  });

  it('shows "Opens {date}" only on the Pass', () => {
    const dated = (product: typeof pass) => ({ ...product, opensOn: '2099-01-01' });
    expect(productOpeningText(dated(pass), '2026-10-14')).toMatch(/2099/);
    expect(productOpeningText(dated(theme), '2026-10-14')).toBeUndefined();
    expect(productOpeningText(dated(single), '2026-10-14')).toBeUndefined();
  });
});
