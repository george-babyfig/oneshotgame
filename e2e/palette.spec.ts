// M6 6.8 "Colour and motion": the "Clear" planet palette. Set it in Settings (Planet colours → Clear) like
// a grown-up would, then screenshot planets 1, 12 and 24 (after 4 throws each) at 390×844 for review (attached to the report).
// No visual assertion: the palette's colour-blind distances are unit-tested in tests/cvd.test.ts. The page
// must show no errors.
import { expect, test } from '@playwright/test';
import { OPEN_MODAL, dismissSheets, expectNoErrors, freshInstall, midGame, settle, watchErrors } from './helpers';

test.use({ locale: 'en-US' });

test.describe('Clear planet palette [en]', () => {
  test('Settings → Planet colours: Clear; planets 1, 12 and 24 at 390×844', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-320x568', 'screenshots at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 30 });

    await page.locator('.topbar button[aria-label="Settings"]').click();
    const sheet = page.locator(OPEN_MODAL);
    const colours = sheet.getByRole('combobox', { name: 'Planet colours' });
    await expect(colours).toHaveValue('classic');
    await colours.selectOption('clear');
    expect(await page.evaluate(() => (window as any).__app.p.settings.planetColours)).toBe('clear');
    const settingsShot = info.outputPath('clear-settings.png');
    await page.screenshot({ path: settingsShot });
    await info.attach('clear-settings', { path: settingsShot, contentType: 'image/png' });
    await dismissSheets(page);

    for (const n of [1, 12, 24]) {
      await page.evaluate((n) => (window as any).__app.startLevel(n, { tutorial: n === 1 }), n);
      await page.waitForFunction((n) => (window as any).__app.scene?.L?.n === n, n);
      // close an intro card, then wait for the planet to be ready for a fling
      await page.waitForFunction(() => {
        const s = (window as any).__app.scene;
        if (s.modalOpen && !s.ended) s.modalOpen.close();
        return s.canAim();
      });
      // a few throws so the new lands show their Clear colours
      for (const sector of [20, 2, 8, 14]) {
        await page.waitForFunction(() => {
          const s = (window as any).__app.scene;
          if (s.modalOpen && !s.ended) s.modalOpen.close();
          return s.canAim() && !!(window as any).__scene;
        });
        await page.evaluate((sector) => {
          const w = window as any;
          w.__scene.fire(w.__scene.aimAt(sector));
        }, sector);
        await page.waitForFunction(() => !(window as any).__app.scene.shot, null, { timeout: 15_000 });
      }
      await page.waitForFunction(() => {
        const s = (window as any).__app.scene;
        return !s.feedback.active.length && !s.feedback.waiting.length;
      });
      await settle(page);
      await page.waitForTimeout(300);
      const file = info.outputPath(`clear-planet-${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ path: file });
      await info.attach(`clear-planet-${n}`, { path: file, contentType: 'image/png' });
    }
    expect(await page.evaluate(() => (window as any).__app.p.settings.planetColours), 'the choice sticks').toBe('clear');
    expectNoErrors(guard);
  });
});
