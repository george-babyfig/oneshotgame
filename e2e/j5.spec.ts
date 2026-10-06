// J5 — M10 Homeworld Labs at 320×568 in every shipped language.
import { expect, test, type Page } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  expectKidSafe,
  expectNoErrors,
  freshInstall,
  localesToRun,
  planetFiveHomeworld,
  snap,
  tr,
  watchErrors,
} from './helpers';

const state = (page: Page) => page.evaluate(() => (window as any).__app.p);

// The buttons expose the same handler as a canvas tap to VoiceOver and the journey.
async function selectPlot(page: Page, index: number) {
  const button = page.locator('.hw-plot-list button').nth(index);
  await expect(button).toHaveAttribute('aria-label', /.+/);
  await button.dispatchEvent('click');
}

for (const loc of localesToRun().filter((locale) => locale !== 'pseudo')) {
  test.describe(`J5 ${loc}`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    for (const reduceMotion of [false, true]) {
      test(`first hour, Labs and pouch; Reduce Motion ${reduceMotion}`, async ({ page }, info) => {
        test.skip(info.project.name !== 'chromium-320x568', 'J5 locale matrix runs at 320×568');
        await page.clock.install();
        await page.emulateMedia({ reducedMotion: reduceMotion ? 'reduce' : 'no-preference' });
        const guard = watchErrors(page);
        await freshInstall(page, { title: 'tap' });
        await planetFiveHomeworld(page, { reduceMotion }); // setting is applied before Homeworld mounts
        await expect(page.getByRole('navigation', { name: tr(loc, 'Homeworld plots') })).toHaveCount(1);

        const firstLab = page.locator(`${OPEN_MODAL}.first-hour`).last();
        await expect(firstLab).toBeVisible();
        await snap(page, info, guard, 'j5-first-hour-lab');
        await expectKidSafe(page, loc);
        const before = (await state(page)).dust;
        await firstLab.locator('.first-lab-choices .btn').first().click();
        await firstLab.locator('button.primary.wide').click();
        expect((await state(page)).home.firstHour).toBe(1);
        expect((await state(page)).dust).toBe(before);

        const friendWaiting = page.locator(`${OPEN_MODAL}.first-hour`).last();
        await expect(friendWaiting).toBeVisible();
        await expect(friendWaiting).toContainText(tr(loc, 'Rock Lab'));
        await friendWaiting.locator('button.primary.wide, button.ghost.wide.dim').first().click();
        expect((await state(page)).home.firstHour).toBe(1);
        expect((await state(page)).dust).toBe(before);
        await snap(page, info, guard, 'j5-first-hour-wait');
        await expectKidSafe(page, loc);
        await page.clock.fastForward('00:31');
        await friendWaiting.getByRole('button', { name: tr(loc, 'Close') }).click();
        await page.locator('.hw-panel button.primary.wide').click();
        const invite = page.locator(`${OPEN_MODAL}.first-hour`).last();
        await snap(page, info, guard, 'j5-first-hour-friend');
        await expectKidSafe(page, loc);
        await invite.locator('button.primary.wide').click();
        const completed = await state(page);
        expect(completed.home.firstHour).toBe(2);
        expect(completed.home.residents).toHaveLength(1);
        expect(completed.dust).toBe(before + 100);
        const friendMoment = page.locator(`${OPEN_MODAL}.lab-moment`).last();
        await expect(friendMoment).toBeVisible();
        await snap(page, info, guard, 'j5-first-friend-moment');
        await expectKidSafe(page, loc);
        await friendMoment.locator('button').last().click();

        await page.evaluate(() => {
          const a = (window as any).__app;
          a.p.mats.stone = 100;
          a.save();
          a.showHomeworld();
        });
        await page.locator('.hw-pouch-head').click();
        const pouch = page.locator(`${OPEN_MODAL}.essence-sheet`).last();
        await expect(pouch).toBeVisible();
        await snap(page, info, guard, 'j5-pouch');
        await expectKidSafe(page, loc);
        await pouch.getByRole('button', { name: tr(loc, 'Close') }).click();

        await selectPlot(page, 0);
        await expect(page.locator('.hw-lab-card')).toBeVisible();
        await snap(page, info, guard, 'j5-lab-card');
        await expectKidSafe(page, loc);
        await page.locator('.lab-buy button').click();
        const levelMoment = page.locator(`${OPEN_MODAL}.lab-moment`).last();
        await expect(levelMoment).toBeVisible();
        await expect(levelMoment).toHaveClass(reduceMotion ? /celebrate-still/ : /lab-moment/);
        if (!reduceMotion) await expect(levelMoment).not.toHaveClass(/celebrate-still/);
        await snap(page, info, guard, 'j5-lab-level-moment');
        await expectKidSafe(page, loc);
        await levelMoment.locator('button').last().click();
        expect((await state(page)).lab.rock).toBe(2);

        await page.evaluate(() => {
          const a = (window as any).__app;
          a.p.home.ring = 2;
          a.p.level = 12; // Rock Fusion is untaught until planet 25.
          a.save();
          a.showHomeworld();
        });
        await selectPlot(page, 0);
        const buy = page.locator('.lab-buy');
        await expect(buy).toContainText(tr(loc, 'A new trick, later'));
        await expect(buy.locator('button')).toHaveCount(0);
        await expect(buy).not.toContainText('✨');
        await snap(page, info, guard, 'j5-untaught-buy');

        await page.evaluate(() => {
          const a = (window as any).__app;
          a.p.dust = 1000; // The rollback guard, not the price, must stop this build.
          a.p.home.lastTick = Date.now() + 60_000;
        });
        const plots = (await state(page)).home.plots as ({ type: string } | null)[];
        const debris = (await state(page)).home.debris as number[];
        const free = plots.findIndex((building, index) => !building && !debris.includes(index));
        expect(free).toBeGreaterThanOrEqual(0);
        await selectPlot(page, free);
        await snap(page, info, guard, 'j5-build-list');
        await page
          .locator('.hw-opt.lab-opt')
          .filter({ hasText: tr(loc, 'Ice Lab') })
          .click();
        expect((await state(page)).home.plots.filter((b: any) => b?.type === 'lab')).toHaveLength(1);
        expect((await state(page)).dust).toBe(1000);
        await expect(page.locator('.toasts')).toContainText(tr(loc, 'Already being built'));

        await page.evaluate(() => {
          const a = (window as any).__app;
          a.p.home.lastTick = Date.now();
          a.startLevel(6);
          // Give the injected three-star win two green lands, so Essence must appear.
          for (const sector of a.scene.planet.sectors.slice(0, 2)) sector.biome = 'meadow';
          a.scene.finish(3);
        });
        await page.clock.runFor(2500);
        const results = page
          .locator(OPEN_MODAL)
          .filter({ has: page.locator('.end-stars') })
          .last();
        await expect(results).toBeVisible();
        await expect(results.locator('.essence-progress')).toBeVisible();
        await snap(page, info, guard, 'j5-results-essence');
        await expectKidSafe(page, loc);
        await expectNoErrors(guard);
      });
    }
  });
}
