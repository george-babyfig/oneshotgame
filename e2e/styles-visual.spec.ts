import { expect, test } from '@playwright/test';
import { freshInstall, midGame, settle, waitScreen } from './helpers';
import type { Page } from '@playwright/test';

test.use({ locale: 'en-US' });

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

test('session one Styles has earned looks and no gem prices or spending controls', async ({ page }) => {
  await freshInstall(page);
  await midGame(page, { level: 11 });
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.meta.sessions = 1;
    a.p.chapters = [1];
    a.selectTab('styles');
  });
  await expect(page.locator('.workshop')).toContainText('Earn gems in play');
  for (const tab of ['Launcher looks', 'Friend outfits', 'Dye', 'Atmosphere', 'Homeworld looks'])
    await expect(page.locator('.tabs').getByRole('button', { name: tab, exact: true })).toHaveCount(0);
  for (const tab of ['Suit', 'Hat', 'Trail', 'Emote', 'Objects', 'Effects']) {
    await page.locator('.tabs').getByRole('button', { name: tab, exact: true }).click();
    await expect(page.locator('.ws-grid')).not.toContainText('💎');
    await expect(page.locator('.ws-get-look')).toHaveCount(0);
    await expect(page.locator('.ws-bar')).not.toContainText(/Buy|💎/);
  }
});

test('double tapping Done cannot spend gems; Get this look needs a separate confirmation', async ({ page }) => {
  await freshInstall(page);
  await midGame(page, { level: 45 });
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.meta.sessions = 2;
    a.p.gems = 110;
    a.p.settings.reduceMotion = true;
    a.selectTab('styles');
  });
  await page.locator('.tabs').getByRole('button', { name: 'Hat', exact: true }).click();
  await page
    .locator('.ws-item')
    .filter({ has: page.locator('b', { hasText: /^Sprout$/ }) })
    .click();
  const done = page.locator('.ws-bar').getByRole('button', { name: 'Done', exact: true });
  const doneBox = await done.boundingBox();
  expect(doneBox).not.toBeNull();
  await page.mouse.dblclick(doneBox!.x + doneBox!.width / 2, doneBox!.y + doneBox!.height / 2, { delay: 100 });
  expect(await page.evaluate(() => (window as any).__app.p.gems)).toBe(110);
  // A double tap on Get this look opens the sheet but can never confirm: Use is still disabled.
  await page.waitForFunction(() => !document.documentElement.classList.contains('input-settling'));
  await page.locator('.ws-get-look').dblclick({ delay: 100 });
  const confirmation = page.locator('.scrim:not(.out) .gem-confirm');
  await expect(confirmation).toContainText('Use 💎80 for Sprout?');
  expect(await page.evaluate(() => (window as any).__app.p.gems)).toBe(110);
  const use = confirmation.getByRole('button', { name: 'Use 💎80', exact: true });
  await expect(use).toBeEnabled();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__app.p.gems)).toBe(110);
  await page.locator('.ws-get-look').click();
  await expect(use).toBeEnabled();
  await use.click();
  expect(await page.evaluate(() => (window as any).__app.p.gems)).toBe(30);
  expect(await page.evaluate(() => (window as any).__app.p.wardrobe.includes('hat_sprout'))).toBe(true);
});

// Content availability is owner-pinned; the spec never invents a production opening date.
import { ROAD01 } from '../src/meta/content/road01';
import { installJourneyClock } from './helpers';

const road01Samples = [
  ['Suit', 'Petal Scout suit'],
  ['Hat', 'Moonpetal folded hat'],
  ['Launcher looks', 'Moonpetal launcher look'],
  ['Trail', 'Crescent Lace trail'],
  ['Effects', 'Crescent Lace Supernova style'],
  ['Effects', 'Woven Sky Supernova'],
  ['Homeworld looks', 'Paper Garden Rock Lab'],
  ['Friend outfits', 'Paper Garden friend outfit'],
] as const;

test('M14 Road 1 installed future looks stay off kid-side Styles', async ({ page }) => {
  const date = ROAD01.road.opensOn;
  const before = date ? new Date(`${date}T12:00:00Z`) : new Date('2026-01-01T12:00:00Z');
  if (date) before.setUTCDate(before.getUTCDate() - 1);
  await installJourneyClock(page, before.toISOString());
  await freshInstall(page);
  await midGame(page, { level: 45 });
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.meta.sessions = 2;
    a.p.roadSeenDay = '';
    a.p.settings.hidePaidLooks = false;
    a.selectTab('styles');
  });
  for (const [tab, name] of road01Samples) {
    await page.locator('.tabs').getByRole('button', { name: tab, exact: true }).click();
    await expect(page.locator('.ws-item').filter({ has: page.locator('b', { hasText: name }) })).toHaveCount(0);
  }
});

for (const [tab, name] of road01Samples) {
  test(`M14 ${name} uses the faithful stage preview with reversible Done`, async ({ page }, testInfo) => {
    test.skip(!ROAD01.road.opensOn, 'Owner launch date is required before Road 1 opens on the kid side');
    await installJourneyClock(page, `${ROAD01.road.opensOn}T12:00:00Z`);
    await freshInstall(page);
    await midGame(page, { level: 45 });
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.meta.sessions = 2;
      a.p.settings.reduceMotion = true;
      a.p.settings.hidePaidLooks = false;
      a.selectTab('styles');
    });
    await page.locator('.tabs').getByRole('button', { name: tab, exact: true }).click();
    const before = await painted(page);
    await page
      .locator('.ws-item')
      .filter({ has: page.locator('b', { hasText: name }) })
      .click();
    await settle(page);
    expect(await painted(page)).not.toBe(before);
    await expect(page.locator('.ws-bar')).not.toContainText(/Buy|\$|€|£|¥/);
    await testInfo.attach(`M14-${name}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.locator('.ws-bar').getByRole('button', { name: 'Done', exact: true }).click();
    await settle(page);
    expect(await painted(page)).toBe(before);
  });
}
