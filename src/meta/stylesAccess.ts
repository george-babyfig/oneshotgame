import { t } from '../i18n';
import type { Profile } from './profile';
import { PRODUCTS } from './tuning';
import { unlocked } from './unlocks';

/** Every Styles entry uses the same chest-or-owned-product gate. */
export function stylesAccess(p: Profile): boolean {
  const entitlements = p.meta.productEntitlements ?? [];
  return (
    unlocked(p, 'workshop') ||
    PRODUCTS.some(
      (product) =>
        !product.consumable &&
        (product.key === 'starter' ? p.starter : product.key === 'pass' ? p.pass : entitlements.includes(product.id)),
    )
  );
}

export function stylesLockReason(p: Profile): string | undefined {
  if (stylesAccess(p)) return undefined;
  return p.level > 10 ? t('Open your chapter 1 chest to unlock Styles') : t('Opens after chapter 1');
}
