// Kid-screen price scan (ROADMAP-v2 M5, checkout charter 6.6): real money lives only in Grown-ups.
// A mid-game player (level 45, everything unlocked, 500 gems) visits every kid screen and sheet; none may
// show a currency symbol, a formatted price, the store's price strings, or a gem pack / Piggy Bank name.
// The same scan inside Grown-ups must find them (sanity: the scan can see prices at all).
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  dismissSheets,
  expectNoErrors,
  freshInstall,
  midGame,
  openGrownups,
  readableText,
  settle,
  snap,
  tabSel,
  tr,
  waitScreen,
  watchErrors,
  type Guard,
  type KnownIssue,
  type LocaleId,
  type TabId,
} from './helpers';

const LOCALES: LocaleId[] = ['en', 'de'];

/**
 * Layout is not this spec's subject (J2 covers the tabs); problems it meets on other screens are
 * annotated, not failed. Found in M5 QA: long German names widen the 4-column grids past 320 px.
 */
const LAYOUT: KnownIssue[] = [
  {
    screen: /^passport-de/,
    kind: 'offscreen',
    match: /trophy/,
    maxWidth: 320,
    note: 'Passport: the 4-column .trophies grid overflows 320 px in German ("Galaxie-Architekt")',
  },
];

interface Needles {
  /** the store's price strings and every product price formatted in likely currencies/locales */
  prices: string[];
  /** gem pack and Piggy Bank names, in English and in this language */
  names: string[];
  /** the same names in this language only */
  localNames: string[];
}

/** Currency symbols and codes a price would carry. */
const CURRENCY = /[$€£¥￥₩₹]|R\$|US\$|\b(?:USD|EUR|GBP|JPY|BRL)\b/;

/** Price strings straight from the app: the store's localized displays, fallbacks, and Intl formatting of every amount. */
async function needles(page: Page, loc: LocaleId): Promise<Needles> {
  const out = await page.evaluate(async () => {
    const { PRODUCTS } = await (window as any).__e2eImport('/src/meta/tuning.ts');
    const a = (window as any).__app;
    const prices = new Set<string>();
    const locales = [navigator.language, 'en-US', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'ja-JP'];
    for (const p of PRODUCTS as { id: string; key: string; fallbackPrice: string; consumable: boolean; title: string }[]) {
      prices.add(p.fallbackPrice);
      const store = a.prices?.[p.id];
      if (store?.display) prices.add(store.display);
      const amount = store?.amount ?? Number(p.fallbackPrice.slice(1));
      for (const l of locales)
        for (const c of ['USD', 'EUR', 'GBP', 'JPY', 'BRL'])
          prices.add(new Intl.NumberFormat(l, { style: 'currency', currency: c }).format(amount).replace(/ | /g, ' '));
      // the bare amount as it would print in this locale ("0,99" / "0.99")
      prices.add(new Intl.NumberFormat(navigator.language, { minimumFractionDigits: 2 }).format(amount));
    }
    const names = (PRODUCTS as { key: string; title: string }[])
      .filter((p) => p.key.startsWith('gems_') || p.key === 'piggy')
      .map((p) => p.title);
    return { prices: [...prices], names };
  });
  const localNames = out.names.map((n) => tr(loc, n));
  return { prices: out.prices, names: [...new Set([...out.names, ...localNames])], localNames };
}

interface Hit {
  where: string;
  found: string[];
  excerpt: string;
}

function scan(text: string, n: Needles): string[] {
  const flat = text.replace(/ | /g, ' ');
  const found: string[] = [];
  const cur = flat.match(CURRENCY);
  if (cur) found.push(`currency "${cur[0]}"`);
  for (const p of n.prices) if (flat.includes(p)) found.push(`price "${p}"`);
  const lower = flat.toLowerCase();
  for (const name of n.names) if (lower.includes(name.toLowerCase())) found.push(`name "${name}"`);
  return found;
}

/** Snap the current view and record any price or gem-pack name on it. */
async function check(page: Page, info: TestInfo, guard: Guard, n: Needles, hits: Hit[], where: string) {
  await settle(page);
  await snap(page, info, guard, where, { known: LAYOUT });
  const text = await readableText(page);
  const found = scan(text, n);
  if (found.length) {
    const first = found[0].match(/"(.+)"/)?.[1] ?? '';
    const i = text.replace(/ | /g, ' ').indexOf(first);
    hits.push({ where, found, excerpt: i >= 0 ? text.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' ') : '' });
  }
  return found;
}

async function openTab(page: Page, id: TabId) {
  // pushed screens (the Star Road) cover the tab bar: back out to a tab root first
  if (!(await page.locator(tabSel(id)).count())) await page.evaluate((t) => (window as any).__app.selectTab(t), id);
  else await page.locator(tabSel(id)).click();
  await waitScreen(page, id);
  await dismissSheets(page);
}

const sheetOpen = (page: Page) => page.locator(OPEN_MODAL).last();

for (const loc of LOCALES) {
  test.describe(`kid screens show no prices [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test(`every kid screen is price-free; Grown-ups is not [${loc}]`, async ({ page }, info) => {
      test.setTimeout(150_000);
      const guard = watchErrors(page);
      await freshInstall(page);
      await midGame(page, { level: 45 });
      await page.evaluate(() => {
        const a = (window as any).__app;
        a.p.gems = 500;
        a.p.piggy = 120; // the Piggy Bank has something in it: it must still never show to the child
        a.save();
        a.selectTab('home');
      });
      await waitScreen(page, 'home');
      await page.waitForFunction(() => Object.keys((window as any).__app.prices ?? {}).length > 0);
      const n = await needles(page, loc);
      await info.attach('needles.json', { body: JSON.stringify(n, null, 2), contentType: 'application/json' });
      const hits: Hit[] = [];
      const seen: string[] = [];
      const visit = async (where: string) => {
        seen.push(where);
        await check(page, info, guard, n, hits, `${where}-${loc}`);
      };

      // ---- Play
      await visit('play');
      await page.locator('.host .more-play').click();
      await expect(sheetOpen(page)).toBeVisible();
      await visit('play-modes');
      await dismissSheets(page);
      await page.locator(`.topbar button[aria-label="${tr(loc, 'Settings')}"]`).click();
      await expect(sheetOpen(page)).toBeVisible();
      await visit('settings');
      await dismissSheets(page);

      // ---- Missions: Wishes and the Star Road (the Pass is described only in Grown-ups since the M5 fix pass;
      // the Road may show locked paid-lane cells, without a price, and hides them with "Hide paid looks")
      await openTab(page, 'missions');
      await expect(page.locator('.host .wishes-panel .wish').first()).toBeVisible();
      await visit('missions-wishes');
      await page
        .locator('.host .mission-entry')
        .filter({ hasText: tr(loc, 'Star Road') })
        .first()
        .click();
      await waitScreen(page, 'road');
      await dismissSheets(page);
      await visit('star-road');
      await expect(page.locator('.host .pass-cta'), 'no Cosmic Pass pitch on the kid side').toHaveCount(0);
      expect(await page.evaluate(() => typeof (window as any).__app.showPass), 'no kid-side Pass page').toBe('undefined');
      await page.evaluate(() => {
        const a = (window as any).__app;
        a.p.settings.hidePaidLooks = true;
        a.showRoad();
      });
      await waitScreen(page, 'road');
      await visit('star-road-hide-paid');
      await page.evaluate(() => ((window as any).__app.p.settings.hidePaidLooks = false));

      // ---- Homeworld and its Paint sheet
      await openTab(page, 'homeworld');
      await visit('homeworld');
      const paint = page.locator('.host button').filter({ hasText: tr(loc, '🎨 Paint') });
      await expect(paint, 'Homeworld has a Paint button').toHaveCount(1);
      await paint.click();
      await expect(sheetOpen(page)).toBeVisible();
      await visit('homeworld-paint');
      await dismissSheets(page);

      // ---- Collection
      await openTab(page, 'collection');
      await visit('collection');

      // ---- Styles, a paid look tried on, and the Passport
      await openTab(page, 'styles');
      await visit('styles');
      const paidTile = page.locator('.host button').filter({ has: page.locator('small', { hasText: tr(loc, 'Try on') }) });
      if (await paidTile.count()) {
        await paidTile.first().click();
        await settle(page);
        const tryOn = page.locator('.host button').filter({ hasText: new RegExp(`^${tr(loc, 'Try on')}$`) });
        if (await tryOn.count()) await tryOn.first().click();
        await settle(page);
        await visit('styles-try-on');
      } else info.annotations.push({ type: 'skipped-step', description: `${loc}: no paid look with "Try on" on the first Styles tab` });
      // the Atmosphere page (Aurora and Cosmic are paid atmospheres: try one on)
      const atmosphere = page.locator('.host button').filter({ hasText: new RegExp(`^${tr(loc, 'Atmosphere')}$`) });
      await expect(atmosphere, 'Styles has an Atmosphere page').toHaveCount(1);
      await atmosphere.click();
      await settle(page);
      await visit('styles-atmosphere');
      const paidSky = page.locator('.host button').filter({ has: page.locator('small', { hasText: tr(loc, 'Try on') }) });
      if (await paidSky.count()) {
        await paidSky.first().click();
        await settle(page);
        await visit('styles-atmosphere-try-on');
      } else info.annotations.push({ type: 'skipped-step', description: `${loc}: no paid atmosphere with "Try on"` });
      await page.locator('.topbar button.avatar').click();
      await waitScreen(page, 'passport');
      await dismissSheets(page);
      await visit('passport');

      // ---- a failed planet 12+: the continue card, then "Ways to earn gems" (shown when gems are short)
      await page.evaluate(() => {
        const a = (window as any).__app;
        a.p.fails[45] = 1;
        a.p.continuesUsed[45] = 0;
        a.startLevel(45);
      });
      await page.waitForFunction(() => (window as any).__app.scene?.L?.n === 45);
      await dismissSheets(page);
      await page.evaluate(() => (window as any).__app.scene.endModal(0));
      const cont = page.locator(OPEN_MODAL).filter({ hasText: '💎' });
      await expect(cont, 'continue card offers +5 throws for gems').toBeVisible();
      await visit('continue-card');
      await page.evaluate(() => {
        const a = (window as any).__app;
        a.scene.modalOpen?.close();
        a.p.gems = 10;
        a.scene.endModal(0);
      });
      const earn = page.locator(OPEN_MODAL).getByRole('button', { name: tr(loc, 'Ways to earn gems'), exact: true });
      await expect(earn).toBeVisible();
      await visit('continue-card-short');
      await earn.click();
      await expect(page.locator(OPEN_MODAL).filter({ hasText: tr(loc, 'Play and explore to find gems:') })).toBeVisible();
      await visit('ways-to-earn-gems');

      // ---- the away card (a returning player with things to collect)
      await page.evaluate(async () => {
        const a = (window as any).__app;
        a.scene?.modalOpen?.close();
        a.p.gems = 500;
        const { closeModals } = await (window as any).__e2eImport('/src/ui/dom.ts');
        closeModals();
        a.showHome(true);
        const { awayFlow } = await (window as any).__e2eImport('/src/ui/flows/away.ts');
        a.p.meta.lastSeen = Date.now() - 3 * 3600_000;
        awayFlow(a, 3 * 3600_000);
      });
      await waitScreen(page, 'home');
      const away = page.locator(`${OPEN_MODAL}.away-card`);
      if (await away.count()) await visit('away-card');
      else {
        // nothing to collect after 3 h: try a long absence (the recap card)
        await page.evaluate(async () => {
          const a = (window as any).__app;
          const { awayFlow } = await (window as any).__e2eImport('/src/ui/flows/away.ts');
          awayFlow(a, 8 * 86400_000);
        });
        await expect(away, 'the away card opens').toBeVisible();
        await visit('away-card');
      }
      await away.getByRole('button').first().click();
      await settle(page);
      // whatever Home shows next (an intro card) is a kid sheet too
      if (await page.locator(OPEN_MODAL).count()) await visit('after-away');
      await dismissSheets(page);

      await info.attach('kid-price-hits.json', { body: JSON.stringify(hits, null, 2), contentType: 'application/json' });
      expect.soft(seen.length).toBeGreaterThanOrEqual(15);
      expect(hits, `kid screens with a price, currency or gem-pack name [${loc}]`).toEqual([]);

      // ---- sanity: the same scan inside Grown-ups finds the prices and the gem packs
      await openGrownups(page, loc);
      const inside: Hit[] = [];
      const found = await check(page, info, guard, n, inside, `grownups-${loc}`);
      expect(
        found.some((f) => f.startsWith('currency') || f.startsWith('price')),
        `Grown-ups shows prices: ${found}`,
      ).toBe(true);
      for (const name of n.localNames) expect(found, `Grown-ups lists "${name}"`).toContain(`name "${name}"`);
      expectNoErrors(guard);
    });
  });
}
