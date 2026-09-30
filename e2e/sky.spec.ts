import { expect, test } from '@playwright/test';
import { BROWSER_LOCALE, dismissSheets, freshInstall, layoutViolations, localesToRun, midGame, tr, waitScreen } from './helpers';

const six = localesToRun().filter((loc) => loc !== 'pseudo');

for (const loc of six) {
  test.describe(`Sky guide and pre-level card [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test('names a met obstacle and shows its rule, counter and silhouettes', async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium-320x568', 'Sky card layout is checked at 320×568');
      await freshInstall(page);
      await midGame(page, { level: 60 });
      await page.evaluate(() => (window as any).__app.preLevel(33));
      await waitScreen(page, 'level');
      await dismissSheets(page);
      const card = page.locator('.level-info .sky-prelevel');
      await expect(card).toBeVisible();
      await expect(card.locator('canvas')).toHaveCount(1);
      expect((await card.innerText()).trim().length).toBeGreaterThan(20);
      expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);
      await page.evaluate(() => (window as any).__app.showFieldGuide());
      await waitScreen(page, 'fieldguide');
      await page.getByRole('button', { name: tr(loc, 'Sky'), exact: true }).click();
      await expect(page.locator('.guide-sky-card')).toHaveCount(5);
      await expect(page.locator('.guide-sky-card').first().locator('canvas')).toHaveCount(1);
      await expect(page.locator('.guide-sky-card').first().locator('small')).toBeVisible();
      await expect(page.locator('.guide-sky-card.unknown')).toHaveCount(4);
      expect((await page.locator('.guide-sky > p').innerText()).length).toBeGreaterThan(30);
      const smallTabs = await page.locator('.guide-tabs .btn').evaluateAll(
        (buttons) =>
          buttons.filter((button) => {
            const rect = button.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          }).length,
      );
      expect(smallTabs).toBe(0);
      expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);
    });
  });
}

test('the 320 px pre-level button stays put and cannot select a booster', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-320x568');
  await freshInstall(page);
  await midGame(page, { level: 60 });
  await page.evaluate(() => (window as any).__app.preLevel(33));
  await waitScreen(page, 'level');
  await dismissSheets(page);
  const gotIt = page.locator('.level-info .btn').last();
  const before = await gotIt.boundingBox();
  expect(before).not.toBeNull();
  await page.waitForTimeout(350);
  const after = await gotIt.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  expect(after!.y + after!.height).toBeLessThanOrEqual(568);
  await gotIt.click();
  await expect(page.locator('.level-info')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__app.scene.o.boosters.spark)).toBe(false);
});

test.describe('honest aim line at 320×568', () => {
  test.use({ locale: 'en-US' });

  test('draws the red bonk badge on the launcher ring before a rock bonk', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-320x568', 'Canvas pixels checked at 320×568');
    await freshInstall(page);
    await midGame(page, { level: 60 });
    await page.evaluate(() => (window as any).__app.preLevel(33));
    await waitScreen(page, 'level');
    await dismissSheets(page);
    await page.locator('.level-info .btn').last().click();
    const badge = await page.evaluate(() => {
      const s = (window as any).__app.scene;
      let vector: { vx: number; vy: number } | null = null;
      for (let vx = -850; vx <= 850 && !vector; vx += 85) {
        for (let vy = -900; vy <= -360 && !vector; vy += 90) {
          if ((window as any).__scene.predict(vx, vy).kind === 'bonk') vector = { vx, vy };
        }
      }
      if (!vector) return { found: false, redPixels: 0 };
      s.aimFrom = { ...s.launch };
      s.aimTo = { x: s.launch.x - vector.vx / 6.2, y: s.launch.y - vector.vy / 6.2 };
      s.draw();
      const dpr = s.canvas.width / s.w;
      const px = Math.round((s.launch.x + 40) * dpr);
      const py = Math.round((s.launch.y - 40) * dpr);
      const data = s.g.getImageData(px - Math.round(15 * dpr), py - Math.round(15 * dpr), Math.round(30 * dpr), Math.round(30 * dpr)).data;
      let redPixels = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] > 130 && data[i + 1] < 100 && data[i + 2] < 130) redPixels++;
      return { found: true, redPixels };
    });
    expect(badge.found).toBe(true);
    expect(badge.redPixels).toBeGreaterThan(30);
    expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);
  });

  test('annotates Rubble Ring frame time while aiming', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-320x568', 'Local frame timing on Chromium');
    await freshInstall(page);
    await midGame(page, { level: 60 });
    await page.evaluate(() => (window as any).__app.startLevel(51));
    await waitScreen(page, 'level');
    await dismissSheets(page);
    const p95 = await page.evaluate(async () => {
      const s = (window as any).__app.scene;
      s.aimFrom = { ...s.launch };
      s.aimTo = { x: s.launch.x - 25, y: s.launch.y + 95 };
      const times: number[] = [];
      let last = 0;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          if (last) times.push(now - last);
          last = now;
          if (now - start < 2_000) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      s.aimFrom = s.aimTo = null;
      const sorted = times.slice(1).sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
    });
    info.annotations.push({ type: 'frame-time', description: `Rubble Ring aiming p95: ${p95.toFixed(1)} ms` });
    if (!process.env.CI) expect(p95).toBeLessThanOrEqual(17.2);
  });
});
