// M6 6.8 "Colour and motion": the "Clear" planet palette. Set it in Settings (Planet colours → Clear) like
// a grown-up would, then screenshot planets 1, 12 and 24 (after 4 throws each) at 390×844 for review (attached to the report).
// No visual assertion: the palette's colour-blind distances are unit-tested in tests/cvd.test.ts. The page
// must show no errors.
import { expect, test, type Page } from '@playwright/test';
import { OPEN_MODAL, dismissSheets, expectNoErrors, freshInstall, midGame, settle, watchErrors } from './helpers';

test.use({ locale: 'en-US' });

// Round time only advances by at most 33 ms per drawn frame (src/ui/game.ts), so on a slow CI runner
// (software-rendered WebKit at 2x) a throw takes several times longer in wall-clock time. The conditions
// are the same everywhere; only the patience is CI-aware.
const ROUND_WAIT = process.env.CI ? 60_000 : 15_000;

/** Wait for a condition on the live round; on timeout, say what the round was doing. */
async function waitRound<A>(page: Page, what: string, fn: (arg: A) => boolean, arg?: A) {
  try {
    await page.waitForFunction(fn, arg as A, { timeout: ROUND_WAIT });
  } catch (e) {
    const state = await page
      .evaluate(() => {
        const a = (window as any).__app;
        const s = a?.scene;
        return s
          ? {
              screen: a.screen,
              level: s.L?.n,
              time: +s.time.toFixed(2),
              lastFrameAgoMs: Math.round(performance.now() - s.last),
              shot: !!s.shot,
              ended: s.ended,
              paused: s.paused,
              finishing: s.finishing,
              over: s.over,
              modal: s.modalOpen?.el?.className ?? null,
              throwsLeft: s.throwsLeft,
              hook: !!(window as any).__scene,
            }
          : { screen: a?.screen, scene: null };
      })
      .catch((err) => String(err));
    throw new Error(`${what}: not reached in ${ROUND_WAIT} ms; round state ${JSON.stringify(state)}\n${e}`);
  }
}

test.describe('Clear planet palette [en]', () => {
  test('Settings → Planet colours: Clear; planets 1, 12 and 24 at 390×844', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-320x568', 'screenshots at 390×844 (chromium and webkit)');
    test.slow(!!process.env.CI, '12 real throws: slow runners draw fewer frames per second');
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
      // the new round is mounted and has drawn at least one frame
      await waitRound(
        page,
        `planet ${n} mounted`,
        (n) => {
          const s = (window as any).__app.scene;
          return s?.L?.n === n && s.last > 0 && !!s.canvas?.isConnected;
        },
        n,
      );
      // close an intro card, then wait for the planet to be ready for a fling
      await waitRound(page, `planet ${n} ready to aim`, () => {
        const s = (window as any).__app.scene;
        if (s.modalOpen && !s.ended) s.modalOpen.close();
        return s.canAim();
      });
      // a few throws so the new lands show their Clear colours
      for (const sector of [20, 2, 8, 14]) {
        // a card can open between "ready" and the throw (then fire() is a no-op): wait and try again
        let thrown = false;
        for (let attempt = 0; attempt < 3 && !thrown; attempt++) {
          await waitRound(page, `planet ${n} ready for the throw at sector ${sector}`, () => {
            const s = (window as any).__app.scene;
            if (s.modalOpen && !s.ended) s.modalOpen.close();
            return s.canAim() && !!(window as any).__scene;
          });
          thrown = await page.evaluate((sector) => {
            const w = window as any;
            const before = w.__app.scene.throwsUsed;
            w.__scene.fire(w.__scene.aimAt(sector));
            return w.__app.scene.throwsUsed > before;
          }, sector);
        }
        expect(thrown, `planet ${n}: the throw at sector ${sector} left the launcher`).toBe(true);
        await waitRound(page, `planet ${n}: the throw at sector ${sector} landed`, () => !(window as any).__app.scene.shot);
      }
      await waitRound(page, `planet ${n}: feedback finished`, () => {
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
