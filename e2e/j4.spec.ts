// J4 — Modes journey at the smallest supported phone width.
import { expect, test, type Page } from '@playwright/test';
import {
  BROWSER_LOCALE,
  GATE,
  OPEN_MODAL,
  expectNoErrors,
  freshInstall,
  midGame,
  settle,
  tr,
  waitScreen,
  watchErrors,
  type LocaleId,
} from './helpers';

/** Post-win intro cards (e.g. "Your Homeworld is ready") wait on Home for a mid-game save; see each once. */
async function dismissIntros(page: Page) {
  for (let i = 0; i < 8 && (await page.locator(OPEN_MODAL).count()); i++) {
    await page.locator(OPEN_MODAL).last().locator('button').last().click();
    await settle(page);
    if ((await page.evaluate(() => (window as any).__app.screen)) !== 'home') {
      await page.evaluate(() => (window as any).__app.showHome(true));
      await waitScreen(page, 'home');
      await settle(page);
    }
  }
}

async function mode(page: Page, loc: LocaleId, name: string) {
  await dismissIntros(page);
  await page.locator('.host .more-play').click();
  await page
    .locator(OPEN_MODAL)
    .locator('button.mode')
    .filter({ hasText: tr(loc, name) })
    .click();
}

async function finish(page: Page, score: number) {
  await page.evaluate((value) => {
    const scene = (window as any).__app.scene;
    scene.score = value;
    scene.shownScore = value;
    scene.finish(3);
  }, score);
  await expect(page.locator(OPEN_MODAL).last()).toBeVisible();
}

async function home(page: Page, loc: LocaleId) {
  await page
    .locator(OPEN_MODAL)
    .last()
    .getByRole('button', { name: tr(loc, 'Home'), exact: true })
    .click();
  await waitScreen(page, 'home');
  await settle(page);
}

for (const loc of ['en', 'pseudo'] as const) {
  test.describe(`J4 modes [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test('Daily, Rush, Zen and Challenge round trip', async ({ page }, info) => {
      test.skip(page.viewportSize()?.width !== 320, 'J4 runs at 320×568');
      test.setTimeout(180_000);
      const guard = watchErrors(page);
      await freshInstall(page, { pseudo: loc === 'pseudo' });
      await midGame(page, { level: 45 });
      await page.evaluate(() => ((window as any).__app.p.settings.reduceMotion = true));

      await mode(page, loc, 'Daily Planet');
      await waitScreen(page, 'level');
      await finish(page, 350);
      const daily = page.locator(OPEN_MODAL).last();
      await expect(daily.getByRole('button', { name: tr(loc, 'Share result') })).toBeVisible();
      await page.evaluate(() => {
        (window as any).__shared = 0;
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: () => {
            (window as any).__shared++;
            return Promise.resolve();
          },
        });
      });
      await daily.getByRole('button', { name: tr(loc, 'Share result') }).click();
      await expect(page.locator(GATE)).toBeVisible();
      await page
        .locator(GATE)
        .getByRole('button', { name: tr(loc, 'Cancel') })
        .click();
      expect(await page.evaluate(() => (window as any).__shared)).toBe(0);
      await home(page, loc);

      await mode(page, loc, 'Meteor Rush');
      await waitScreen(page, 'level');
      await finish(page, 410);
      expect(await page.evaluate(() => (window as any).__app.p.stats.rushBest)).toBeGreaterThanOrEqual(410);
      await home(page, loc);

      await mode(page, loc, 'Zen Garden');
      await waitScreen(page, 'level');
      await page.evaluate(async () => {
        const scene = (window as any).__app.scene;
        const hook = (window as any).__scene;
        hook.fire(hook.aimAt(0));
        while (scene.shot) await new Promise((resolve) => setTimeout(resolve, 30));
      });
      await page.waitForFunction(() => !!(window as any).__app.p.zen);
      await page.locator('.hud button[aria-label]').first().click();
      await page
        .locator(OPEN_MODAL)
        .last()
        .getByRole('button', { name: tr(loc, 'Leave to galaxy') })
        .click();
      await waitScreen(page, 'home');
      await page.reload();
      await page.waitForFunction(() => !!(window as any).__app?.p);
      expect(await page.evaluate(() => !!(window as any).__app.p.zen)).toBe(true);
      expect(await page.evaluate(() => (window as any).__app.p.stats.rushBest)).toBeGreaterThanOrEqual(410);
      await waitScreen(page, 'home');

      await mode(page, loc, 'Challenge a Friend');
      const menu = page.locator(OPEN_MODAL).last();
      await menu.locator('input.code-input').fill('BAD-CODE');
      await menu.getByRole('button', { name: tr(loc, 'Play their planet') }).click();
      await expect(page.locator('.toast').last()).toContainText(tr(loc, "That code doesn't look right — check it and try again"));
      await menu.getByRole('button', { name: tr(loc, '✨ New challenge') }).click();
      await waitScreen(page, 'level');
      await finish(page, 320);
      const result = page.locator(OPEN_MODAL).last();
      const code = (await result.locator('.code').innerText()).trim();
      expect(code).toMatch(/^\d+-[2-9BCDFGHJKMNPQRSTVWXYZ]{5}-[0-9A-Z]+[2-9A-HJKMNP-Z]$/);
      await home(page, loc);
      await mode(page, loc, 'Challenge a Friend');
      await page.locator(OPEN_MODAL).last().locator('input.code-input').fill(code);
      await page
        .locator(OPEN_MODAL)
        .last()
        .getByRole('button', { name: tr(loc, 'Play their planet') })
        .click();
      await waitScreen(page, 'level');
      await finish(page, 330);
      await expect(page.locator(OPEN_MODAL).last().locator('.versus')).toBeVisible();
      await home(page, loc);
      expectNoErrors(guard);
      info.annotations.push({
        type: 'scope',
        description: 'J4 en/pseudo 320×568: all four modes, gated share, persistence and code handling',
      });
    });
  });
}
