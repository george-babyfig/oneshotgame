// J1 — First session: fresh install to planet 6 and the Homeworld (ROADMAP-v2 7.7).
// Runs in every language of the LOCALE matrix plus a pseudo-locale ~40% longer.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  expectNoErrors,
  freshInstall,
  layoutViolations,
  localesToRun,
  pageText,
  settle,
  snap,
  tap,
  tr,
  waitScreen,
  watchErrors,
  type Guard,
  type KnownIssue,
  type LocaleId,
} from './helpers';

/** Today's Home clips its side buttons at 320×568; M4 ("One clear Home") fixes it. */
export const KNOWN_HOME_320: KnownIssue[] = [
  {
    screen: /^home/,
    kind: 'clipped',
    match: /side-btn|nav-btn/,
    maxWidth: 320,
    note: 'Home side buttons clipped at 320×568 (known, fixed in M4)',
  },
  {
    screen: /^home/,
    kind: 'offscreen',
    match: /side-btn|nav-btn/,
    maxWidth: 320,
    note: 'Home side buttons clipped at 320×568 (known, fixed in M4)',
  },
];

const level = (page: Page) => page.evaluate(() => (window as any).__app.p.level as number);
const scenePlanet = (page: Page) => page.evaluate(() => (window as any).__app.scene?.L?.n as number | undefined);

/** Session 1 must show no prices, offers, gem spending or system-style prompts. */
async function expectKidSafe(page: Page, loc: LocaleId, where: string) {
  const text = await pageText(page);
  expect.soft(text, `${where}: no price text`).not.toMatch(/[$€£]|US\$|R\$/);
  for (const key of ['OFFER', 'Want a nudge?', 'Rate Pocket Planet', 'To rate the game, please answer:', 'Ask a grown-up']) {
    expect.soft(text.includes(tr(loc, key)), `${where}: "${tr(loc, key)}" must not appear`).toBe(false);
  }
  const gemButtons = await page.$$eval('button', (bs) =>
    bs
      .filter((b) => (b as HTMLElement).offsetParent !== null)
      .map((b) => (b as HTMLElement).innerText)
      .filter((s) => s.includes('💎')),
  );
  expect.soft(gemButtons, `${where}: no 💎 buttons (continues, gem offers)`).toEqual([]);
  await expect.soft(page.locator('.gate-q'), `${where}: no parental gate`).toHaveCount(0);
}

/** Close whatever sheet is on top by its last button (the "OK / Close / Looks good!" one). */
async function closeSheets(page: Page, info: TestInfo, guard: Guard, where: string, max = 4) {
  for (let i = 0; i < max; i++) {
    await settle(page);
    const top = page.locator(OPEN_MODAL).last();
    if (!(await top.count())) return;
    const title = (
      (await top
        .locator('.m-title, .end-title')
        .first()
        .innerText()
        .catch(() => '')) || '(untitled)'
    ).trim();
    info.annotations.push({ type: 'interstitial', description: `${where}: ${title}` });
    await snap(page, info, guard, `${where}-sheet${i + 1}`);
    const buttons = top.locator('button');
    if (await buttons.count()) await buttons.last().click();
    else {
      // a card without a button closes with a tap outside it
      info.annotations.push({ type: 'no-close-button', description: `${where}: "${title}" has no button; closes on a tap outside` });
      await page.mouse.click(4, 4);
    }
  }
}

async function playPlanet(page: Page, info: TestInfo, guard: Guard, loc: LocaleId, n: number) {
  await page.waitForFunction((k) => (window as any).__app.scene?.L?.n === k, n);
  // a debut ("NEW OBJECT!") card may cover the HUD: read it, then tap through it like a player
  await closeSheets(page, info, guard, `level-${n}`);
  await snap(page, info, guard, `level-${n}`);
  await expectKidSafe(page, loc, `level ${n}`);
  // drive the round to a 3-star ending instead of aiming
  await page.evaluate(() => (window as any).__app.scene.finish(3));
  const results = page.locator(OPEN_MODAL).filter({ has: page.locator('.end-stars') });
  await expect(results).toBeVisible();
  await expect(results.locator('.end-stars .on')).toHaveCount(3);
  await snap(page, info, guard, `results-${n}`);
  await expectKidSafe(page, loc, `results ${n}`);
  await expect(results.getByRole('button', { name: tr(loc, 'Galaxy'), exact: true })).toBeVisible();
  await results.getByRole('button', { name: tr(loc, 'Galaxy'), exact: true }).click();
  await waitScreen(page, 'home');
  expect(await level(page)).toBe(n + 1);
}

async function atHome(page: Page, info: TestInfo, guard: Guard, loc: LocaleId, suffix = '') {
  await waitScreen(page, 'home');
  const n = await level(page);
  await closeSheets(page, info, guard, `home-${n}${suffix}`);
  await snap(page, info, guard, `home-${n}${suffix}`, { known: KNOWN_HOME_320 });
  await expectKidSafe(page, loc, `home before planet ${n}`);
  // Homeworld unlocks when planet 5 is reached (HOME_UNLOCK_LEVEL)
  await expect(page.locator('.world-btn')).toHaveCount(n >= 5 ? 1 : 0);
  return n;
}

async function openPreLevel(page: Page, info: TestInfo, guard: Guard, loc: LocaleId, n: number) {
  await tap(page, '.btn.play');
  const sheet = page.locator(`${OPEN_MODAL}.pre`);
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.m-sub').first()).toContainText(String(n));
  await snap(page, info, guard, `prelevel-${n}`);
  await expectKidSafe(page, loc, `pre-level ${n}`);
  return sheet;
}

for (const loc of localesToRun()) {
  test.describe(`J1 first session [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test(`fresh install → planets 1-5 → Homeworld → planet 6 goals [${loc}]`, async ({ page }, info) => {
      const guard = watchErrors(page);
      await freshInstall(page, { pseudo: loc === 'pseudo' });

      // The game follows the device language on a fresh install.
      const lang = loc === 'pseudo' ? 'en' : loc;
      await expect(page.locator('html')).toHaveAttribute('lang', lang);

      // Planet 1 (the tutorial) starts straight away: no Home, no pop-ups first.
      await waitScreen(page, 'level');
      expect(await scenePlanet(page)).toBe(1);
      await expect(page.locator('.hud')).toBeVisible();
      if (loc === 'pseudo') await expect(page.locator('.hud')).toContainText('[');
      else await expect(page.locator('.hud')).toContainText(tr(loc, 'throws'));

      await playPlanet(page, info, guard, loc, 1);

      let visitedHomeworld = false;
      for (let n = 2; n <= 6; n++) {
        expect(await atHome(page, info, guard, loc)).toBe(n);

        if (n === 5 && !visitedHomeworld) {
          // Homeworld opens at planet 5
          await tap(page, '.world-btn');
          await waitScreen(page, 'homeworld');
          await closeSheets(page, info, guard, 'homeworld');
          await snap(page, info, guard, 'homeworld');
          await expectKidSafe(page, loc, 'homeworld');
          visitedHomeworld = true;
          await tap(page, '.topbar button.icon');
          await atHome(page, info, guard, loc, '-back');
        }

        const sheet = await openPreLevel(page, info, guard, loc, n);
        if (n === 6) {
          // Planet 6 is the first planet with goals (GOALS_FROM)
          await expect(sheet.locator('.pre-goals')).toBeVisible();
          expect(await sheet.locator('.pre-goals .goal').count()).toBeGreaterThan(0);
        } else {
          await expect(sheet.locator('.pre-goals')).toHaveCount(0);
        }
        await sheet.locator('.btn.primary.big').click();
        await waitScreen(page, 'level');
        if (n < 6) await playPlanet(page, info, guard, loc, n);
      }

      // Planet 6's HUD, with its goals
      await page.waitForFunction(() => (window as any).__app.scene?.L?.n === 6);
      await closeSheets(page, info, guard, 'level-6');
      await snap(page, info, guard, 'level-6');
      await expectKidSafe(page, loc, 'level 6');
      expect(visitedHomeworld).toBe(true);
      expectNoErrors(guard);
    });
  });
}

// Keep the known side-rail issue separate so unrelated layout checks still fail.
test.describe('J1 Home layout at the narrowest width', () => {
  test.use({ locale: 'en-US' });
  test('Home after planet 5: nothing clipped or off screen', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    // Win planets 1-5 (reduce motion skips the fly-away), so Home has its galaxy, vault and Homeworld button.
    await page.evaluate(async () => {
      const a = (window as any).__app;
      a.p.settings.reduceMotion = true;
      for (let n = 1; n <= 5; n++) {
        a.startLevel(n, { tutorial: n === 1 });
        a.scene.finish(3);
        await new Promise((r) => setTimeout(r, 50));
      }
      a.p.settings.reduceMotion = false;
      a.p.passport.set = true;
      a.launched = true;
      a.showHome(true);
    });
    expect(await page.evaluate(() => (window as any).__app.p.level)).toBe(6);
    await waitScreen(page, 'home');
    await settle(page);
    const bad = (await layoutViolations(page)).filter((v) => v.kind !== 'tap-target');
    await info.attach('home-layout.json', { body: JSON.stringify(bad, null, 2), contentType: 'application/json' });
    const file = info.outputPath('home-after-planet-5.png');
    await page.screenshot({ path: file });
    await info.attach('home-after-planet-5', { path: file, contentType: 'image/png' });
    expectNoErrors(guard);
    const known =
      (page.viewportSize()?.width ?? 999) <= 320
        ? bad.filter((v) => ['clipped', 'offscreen'].includes(v.kind) && /side-btn|nav-btn/.test(v.what))
        : [];
    if (known.length) info.annotations.push({ type: 'known-issue', description: 'Home side rail clips at 320×568 (ROADMAP-v2 M4)' });
    expect
      .soft(
        bad.filter((v) => !known.includes(v)),
        'Home layout outside the known side-rail issue',
      )
      .toEqual([]);
  });
});
