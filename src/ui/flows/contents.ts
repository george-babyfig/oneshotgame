import { today, type Profile } from '../../meta/profile';
import { unlocked } from '../../meta/unlocks';
import { getLang, t } from '../../i18n';
import type { ProductDef } from '../../meta/config';
import { btn, h, modal } from '../dom';
import { ROAD_CATALOG, playableRoads, productOpen, roadForProduct } from '../../meta/starroad';
import { ledger } from '../../meta/ledger';

/** Calendar dates are plain, localized dates; the catalogue has no guessed opening day. */
export function productOpeningText(product: ProductDef, day = today()): string | undefined {
  const road = ROAD_CATALOG.find((def) => def.id === roadForProduct(product.id));
  const opensOn = product.opensOn ?? road?.opensOn;
  // Only the Pass waits for its Road; a Theme or Style Single is delivered and usable at once.
  if (!road || !opensOn || product.kind !== 'road_pass' || productOpen(product, day)) return undefined;
  return t('Opens {date}', {
    date: new Intl.DateTimeFormat(getLang(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${opensOn}T12:00:00Z`)),
  });
}

/** Confirm the exact contents and local store price after the parent gate. */
export function contentsSheet(product: ProductDef, price: string, piggyGems = 0, roadPoints = 0, day = today()): Promise<boolean> {
  ledger.count('contents_sheet');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (buy: boolean) => {
      if (settled) return;
      settled = true;
      sheet.close();
      resolve(buy);
    };
    const items = product.key === 'piggy' ? [t('{n} gems saved', { n: piggyGems })] : product.contents.map((item) => t(item));
    const roadId = roadForProduct(product.id);
    const road = ROAD_CATALOG.find((def) => def.id === roadId);
    const reached = road?.tiers.filter((tier) => roadPoints >= tier.stars).length ?? 0;
    const sheet = modal(
      [
        h('div', { class: 'm-title' }, product.emoji, ' ', t(product.title)),
        h('p', { class: 'muted' }, t(product.description)),
        road
          ? h('p', null, t('{reached} of {total} Road steps reached. Looks unlock along the Road.', { reached, total: road.tiers.length }))
          : null,
        productOpeningText(product, day) ? h('p', null, productOpeningText(product, day)!) : null,
        h('ul', null, ...items.map((item) => h('li', null, item))),
        h('p', null, price),
        h('p', { class: 'muted' }, product.consumable ? t('Family Sharing: no') : t('Family Sharing: yes')),
        h('p', { class: 'muted' }, product.consumable ? t('Used up when spent') : t('Never expires')),
        btn(t('Buy'), 'primary wide', () => finish(true)),
        btn(t('Cancel'), 'ghost wide', () => finish(false)),
      ],
      { onClose: () => finish(false), onAbort: () => finish(false) },
    );
  });
}

/** New release looks use their fixed contents instead of the legacy gem receipt fallback. */
export function roadReceiptInMissions(product: ProductDef, p: Profile, day = today()): boolean {
  return (
    product.kind === 'road_pass' &&
    unlocked(p, 'quests') &&
    unlocked(p, 'star_road') &&
    playableRoads(p, day).some((road) => road.id === roadForProduct(product.id))
  );
}

export function releaseReceipt(product: ProductDef, p: Profile, day = today()): Promise<void> {
  return new Promise((resolve) => {
    const opening = productOpeningText(product, day);
    const sheet = modal(
      [
        h('div', { class: 'm-title' }, t('Purchase complete')),
        h('p', null, t(product.description)),
        product.kind !== 'road_pass'
          ? h('p', null, t('Styles'))
          : roadReceiptInMissions(product, p, day)
            ? h('p', null, t('Your Road is in Missions'))
            : null,
        opening ? h('p', null, opening) : null,
        h('ul', null, ...product.contents.map((item) => h('li', null, t(item)))),
        btn(t('Done'), 'primary wide', () => sheet.close()),
      ],
      { onClose: resolve, onAbort: resolve },
    );
  });
}
