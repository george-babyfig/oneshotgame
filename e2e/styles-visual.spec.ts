import { expect, test } from '@playwright/test';
import { freshInstall, midGame, settle, waitScreen } from './helpers';
import type { Page } from '@playwright/test';

/** Every re-render mounts a new stage canvas that paints on its next animation frame; read it after that frame. */
async function painted(page: Page): Promise<string> {
  const stage = page.locator('canvas.ws-stage');
  await expect(stage).toBeVisible();
  return stage.evaluate(
    (c: HTMLCanvasElement) =>
      new Promise<string>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(c.width > 300 || c.height > 150 ? c.toDataURL() : 'unpainted'))),
      ),
  );
}

test('Styles try-on stays visible across tabs and clears only at Done', async ({ page }) => {
  await freshInstall(page);
  await midGame(page, { level: 45 });
  await page.evaluate(() => {
    const app = (window as any).__app;
    app.p.settings.reduceMotion = true;
    app.p.settings.hidePaidLooks = false;
    app.save();
    app.selectTab('styles');
  });
  await waitScreen(page, 'styles');
  await page.locator('.tab').filter({ hasText: 'Effects' }).click();
  const before = await painted(page);
  expect(before).not.toBe('unpainted');
  await page.locator('.ws-item').filter({ hasText: 'Nebula Swirl Supernova' }).click();
  await settle(page);
  const during = await painted(page);
  expect(during).not.toBe(before);
  await expect(page.locator('.ws-bar')).not.toContainText(/Buy|\$|€|£|¥/);
  await page.locator('.tab').filter({ hasText: 'Objects' }).click();
  await settle(page);
  expect(await painted(page)).not.toBe(before);
  await page
    .locator('.scroll button')
    .filter({ hasText: /^Done$/ })
    .click();
  await settle(page);
  expect(await painted(page)).toBe(before);
});
