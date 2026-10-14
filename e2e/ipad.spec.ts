// A14: only the tablet projects run this spec. PR runs English WebKit at 820×1180;
// nightly supplies six languages across both sizes and engines.
import { expect, test, type Page } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  dismissSheets,
  expectNoErrors,
  freshInstall,
  installJourneyClock,
  layoutViolations,
  localesToRun,
  midGame,
  settle,
  snap,
  tabSel,
  tr,
  watchErrors,
} from './helpers';

async function strictLayout(page: Page) {
  // Unlike the shared helper's optional tap watch, every visible target must be 44 px here.
  expect(await layoutViolations(page)).toEqual([]);
}

for (const loc of localesToRun().filter((locale) => locale !== 'pseudo')) {
  test.describe(`M13 iPad ${loc}`, () => {
    test.use({ locale: BROWSER_LOCALE[loc], timezoneId: 'UTC' });

    test('J5 wide Homeworld, Trip sheet and logical round frame', async ({ page }, info) => {
      const guard = watchErrors(page);
      await installJourneyClock(page, '2026-10-14T12:00:00.000Z');
      await freshInstall(page);
      await midGame(page, { level: 45 });
      await page.evaluate(() => {
        const a = (window as any).__app;
        const p = a.p;
        p.settings.reduceMotion = true;
        p.home.level = 3;
        p.home.intro = true;
        p.home.firstHour = 2;
        p.home.plots = Array(8).fill(null);
        p.home.gaps = Array(8).fill(null);
        p.home.plots[0] = { type: 'launch_bay', lv: 3, since: Date.now() };
        p.home.plots[1] = { type: 'den', lv: 2, since: Date.now() };
        p.home.residents = [
          { species: 'otter', fp: 2, rewarded: 1 },
          { species: 'deer', fp: 9, rewarded: 2 },
        ];
        p.home.lastTick = Date.now();
        p.home.expedition = null;
        p.home.tripReturn = null;
        p.home.tripFuel = true;
        p.home.seen.celebrations = [];
        p.home.debris = [];
        a.save();
        a.selectTab('home');
      });
      await dismissSheets(page);
      await expect(page.locator('body')).toHaveClass(/\bwide\b/);
      const home = await page.locator('.screen.home').boundingBox();
      expect(home!.width).toBeCloseTo(520, 0);
      expect(home!.x + home!.width / 2).toBeCloseTo(page.viewportSize()!.width / 2, 0);
      await snap(page, info, guard, 'ipad-home');
      await strictLayout(page);

      await page.locator(tabSel('homeworld')).click();
      await dismissSheets(page);
      await settle(page);
      const canvas = await page.locator('.hw-canvas').boundingBox();
      const panel = await page.locator('.hw-panel').boundingBox();
      expect(canvas).not.toBeNull();
      expect(panel).not.toBeNull();
      expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(panel!.x);
      expect(Math.abs(canvas!.y - panel!.y)).toBeLessThanOrEqual(1);
      // The 12 px column gap leaves 58% of the available column width to the canvas.
      expect(canvas!.width / (canvas!.width + panel!.width)).toBeCloseTo(0.58, 2);
      await snap(page, info, guard, 'ipad-homeworld');
      await strictLayout(page);
      await page
        .locator('.hw-panel')
        .getByRole('button', { name: tr(loc, 'Trip'), exact: true })
        .click();
      await expect(page.locator(OPEN_MODAL).last()).toBeVisible();
      await snap(page, info, guard, 'ipad-trip-sheet');
      await strictLayout(page);
      await dismissSheets(page);

      await page.evaluate(() => (window as any).__app.startLevel(6));
      await expect(page.locator('.screen.level.round-frame')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const scene = (window as any).__app.scene;
            return [scene.w, scene.h];
          }),
        )
        .toEqual([430, 932]);
      await settle(page);
      const frame = await page.locator('.screen.level').boundingBox();
      const gameCanvas = await page.locator('.game-canvas').boundingBox();
      expect(gameCanvas).toEqual(frame);
      expect(frame!.x).toBeGreaterThanOrEqual(-1);
      expect(frame!.y).toBeGreaterThanOrEqual(-1);
      expect(frame!.x + frame!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      expect(frame!.y + frame!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      expect(frame!.width / frame!.height).toBeCloseTo(430 / 932, 5);
      const world = await page.evaluate(() => {
        const scene = (window as any).__app.scene;
        const world = scene.flightWorld(scene.rot);
        return { width: world.width, height: world.height, x: scene.launch.x, y: scene.launch.y };
      });
      expect(world).toEqual({ width: 430, height: 932, x: 215, y: 782 });
      await snap(page, info, guard, 'ipad-round');
      await strictLayout(page);

      // Exercise the real pointer mapping through the CSS scale, not the dev fire hook.
      const scale = gameCanvas!.width / 430;
      const x = gameCanvas!.x + world.x * scale;
      const y = gameCanvas!.y + world.y * scale;
      const used = await page.evaluate(() => (window as any).__app.scene.throwsUsed);
      await expect.poll(() => page.evaluate(() => (window as any).__app.scene.canAim())).toBe(true);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 70 * scale, { steps: 6 });
      const pull = await page.evaluate(() => (window as any).__app.scene.pull().len);
      expect(pull).toBeCloseTo(70, 0);
      await page.mouse.up();
      await expect.poll(() => page.evaluate(() => (window as any).__app.scene.throwsUsed)).toBe(used + 1);

      // Resizing back to a phone restores the original geometry and removes the wide shell.
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('body')).not.toHaveClass(/\bwide\b/);
      await expect(page.locator('.screen.level')).not.toHaveClass(/\bround-frame\b/);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const scene = (window as any).__app.scene;
            return [scene.w, scene.h];
          }),
        )
        .toEqual([390, 844]);
      expectNoErrors(guard);
    });
  });
}
