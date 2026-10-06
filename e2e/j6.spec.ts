// J6: Bonus Remix opens after a finished chapter and never advances the campaign.
import { expect, test } from '@playwright/test';
import { BROWSER_LOCALE, freshInstall, layoutViolations, localesToRun, midGame, OPEN_MODAL, settle, waitScreen } from './helpers';
import { makeLevel } from '../src/core/levels';
import { SPECIES } from '../src/core/world';
import { localPlanetName, type PlanetNameLang } from '../src/i18n/planetNames';

for (const loc of localesToRun().filter((id) => id !== 'pseudo')) {
  test.describe(`J6 Remix [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc], viewport: { width: 320, height: 568 }, screen: { width: 320, height: 568 } });

    test('finished chapter toggle, round and result keep classic progress', async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium-320x568', 'J6 checks the compact six-language layout');
      await freshInstall(page);
      await midGame(page, { level: 11 });
      await page.evaluate(() => (window as any).__app.showStarMap());
      await waitScreen(page, 'map');
      await settle(page);
      const cards = page.locator('.chapter');
      await expect(cards.last().locator('.remix-toggle')).toBeVisible();
      await expect(cards.first().locator('.remix-toggle')).toHaveCount(0);
      await expect(cards.nth(1).locator('.remix-toggle')).toHaveCount(0);
      await cards.last().locator('.remix-toggle button').last().click();
      await expect(page.locator('.chapter.remix-chapter')).toBeVisible();
      const selectedRemix = page.locator('.chapter[data-chapter="1"] .remix-toggle button').last();
      await expect(selectedRemix).toHaveAttribute('aria-pressed', 'true');
      await expect(selectedRemix).toBeFocused();
      await expect(page.locator('.chapter.remix-chapter .remix-node')).toHaveCount(10);
      expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);

      await page.evaluate(
        (ids) => {
          const app = (window as any).__app;
          app.p.seen = ids;
          app.save();
        },
        SPECIES.map((s) => s.id),
      );

      const before = await page.evaluate(() => {
        const p = (window as any).__app.p;
        return {
          stars: JSON.stringify(p.stars),
          gems: p.gems,
          dust: p.dust,
          mats: JSON.stringify(p.mats),
          stats: JSON.stringify(p.stats),
          level: p.level,
          roadPoints: p.roadPoints,
          road: JSON.stringify(p.road),
          galaxy: JSON.stringify(p.galaxy),
        };
      });
      await page.locator('.chapter.remix-chapter .remix-node').first().click();
      await waitScreen(page, 'level');
      const pre = page.locator('.remix-prelevel');
      await expect(pre.locator('.twist-chip')).toBeVisible();
      await expect(pre.locator('.goal')).toHaveCount(1);
      await expect(pre.locator('.targets .tg')).toHaveCount(3);
      const english = makeLevel(1).name;
      const expected = loc === 'en' ? english : localPlanetName(english, loc as PlanetNameLang)!;
      await expect(pre.locator('.m-title')).toHaveText(expected);
      await expect(page.locator('.hud-name')).toHaveText(expected);
      const nameSize = await page.locator('.hud-name').evaluate((el) => ({
        width: el.clientWidth,
        content: el.scrollWidth,
        height: el.clientHeight,
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(nameSize.content, 'localized HUD name fits at 320 px').toBeLessThanOrEqual(nameSize.width);
      expect(nameSize.height, 'localized HUD name stays on one line').toBeLessThanOrEqual(nameSize.line + 1);
      expect(await page.evaluate(() => (window as any).__app.scene.o.remixPalette)).toBe(true);
      await info.attach('remix-dusk-gold-round', { body: await page.screenshot(), contentType: 'image/png' });
      expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);
      await pre.locator('button').last().click();
      await page.waitForFunction(() => (window as any).__app.scene.canAim() && !!(window as any).__scene);
      await page.evaluate(() => {
        const scene = (window as any).__scene;
        scene.fire(scene.aimAt(2));
      });
      await page.waitForFunction(() => !(window as any).__app.scene.shot);
      await page.evaluate(() => (window as any).__app.scene.finish(3));
      await expect(page.locator(`${OPEN_MODAL} .remix-result`)).toBeVisible();
      await expect(page.locator(`${OPEN_MODAL} .remix-result button`)).toHaveCount(2);
      await info.attach('remix-result-card', { body: await page.screenshot(), contentType: 'image/png' });
      await waitScreen(page, 'map'); // result waits over the map; no automatic next round
      await expect(page.locator('.chapter[data-chapter="1"]')).toBeVisible();
      const after = await page.evaluate(() => {
        const p = (window as any).__app.p;
        return {
          stars: JSON.stringify(p.stars),
          gems: p.gems,
          dust: p.dust,
          mats: JSON.stringify(p.mats),
          stats: JSON.stringify(p.stats),
          level: p.level,
          roadPoints: p.roadPoints,
          road: JSON.stringify(p.road),
          galaxy: JSON.stringify(p.galaxy),
        };
      });
      expect(after).toEqual(before);
      expect(await page.evaluate(() => (window as any).__app.p.remix[1].best[0])).toBe(3);
      expect((await layoutViolations(page)).filter((v) => v.kind !== 'tap-target')).toEqual([]);
      await page.locator(`${OPEN_MODAL} .remix-result button`).last().click();
      await expect(page.locator(`${OPEN_MODAL} .remix-result`)).toHaveCount(0);
      await expect(page.locator('.chapter[data-chapter="1"] .remix-node').first().locator('small')).toHaveText('★★★');
      expect(await page.evaluate(() => (window as any).__app.screen)).toBe('map');

      // Chapter one's long name catches the Spanish, Portuguese and Japanese 320 px case.
      await page.evaluate(() => (window as any).__app.preRemix(9));
      await waitScreen(page, 'level');
      const longEnglish = makeLevel(9).name;
      const longExpected = loc === 'en' ? longEnglish : localPlanetName(longEnglish, loc as PlanetNameLang)!;
      await expect(page.locator('.remix-prelevel .m-title')).toHaveText(longExpected);
      await expect(page.locator('.hud-name')).toHaveText(longExpected);
      const longName = await page.locator('.hud-name').evaluate((el) => ({
        width: el.clientWidth,
        content: el.scrollWidth,
        height: el.clientHeight,
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(longName.content, 'long localized HUD name fits at 320 px').toBeLessThanOrEqual(longName.width);
      expect(longName.height, 'long localized HUD name stays on one line').toBeLessThanOrEqual(longName.line + 1);
    });
  });
}
