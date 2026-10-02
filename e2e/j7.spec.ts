// J7 — Background the app mid-round and resume the same round (ROADMAP-v2 7.7; M6 6.9 "Resume a round").
// A mid-game player starts planet 12 and makes 3 throws. The app goes to the background (the page becomes
// hidden, then pagehide), which must auto-pause the round and checkpoint it. The web view is then killed
// (a reload). On relaunch the same round comes back exactly — planet, throws left, score, the queue
// position, the planet's lands — under the "Welcome back — your planet is waiting" card. Playing the round
// to its end clears the saved round.
import { expect, test, type Page } from '@playwright/test';
import { OPEN_MODAL, expectNoErrors, freshInstall, midGame, settle, snap, watchErrors } from './helpers';

// slow CI runners draw fewer frames per second, so real throws take longer there
const ROUND_WAIT = process.env.CI ? 60_000 : 15_000;

test.use({ locale: 'en-US' });

const PLANET = 12;

/** Everything the resume must bring back, read from the running scene. */
function roundSnapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__app.scene;
    return {
      planet: s.L.n as number,
      throwsLeft: s.throwsLeft as number,
      throwsUsed: s.throwsUsed as number,
      throwsTotal: s.throwsTotal as number,
      score: s.score as number,
      starsGot: s.starsGot as number,
      qi: s.qi as number,
      cur: s.cur as string,
      next: s.next as string,
      lands: s.planet.sectors.map((x: any) => `${x.biome}:${x.species ?? ''}`).join(','),
      nova: { ...s.nova },
      rot: Math.round(s.rot * 1e6) / 1e6,
    };
  });
}

/** Aim at a sector with the dev hook, fire, and wait until the round accepts the next throw. */
async function throwAt(page: Page, sector: number) {
  await page.waitForFunction(() => {
    const s = (window as any).__app.scene;
    if (s.modalOpen && !s.ended && !s.paused) s.modalOpen.close();
    return s.canAim() && !!(window as any).__scene;
  });
  await page.evaluate((sector) => {
    const w = window as any;
    w.__scene.fire(w.__scene.aimAt(sector));
  }, sector);
  await page.waitForFunction(() => !(window as any).__app.scene.shot, null, { timeout: ROUND_WAIT });
}

/** The profile as the storage layer holds it (what survives the web view being killed). */
function storedSavedRound(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('pp.profile');
    return raw ? ((JSON.parse(raw).savedRound as string | undefined) ?? null) : null;
  });
}

test.describe('J7 resume a round [en]', () => {
  test('Remix survives a killed web view and finishes into Remix progress only', async ({ page }) => {
    test.setTimeout(120_000);
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 11 });
    await page.evaluate(() => (window as any).__app.startRemix(1));
    await page.waitForFunction(() => (window as any).__app.scene?.L.seed.startsWith('RX') && !!(window as any).__scene);
    await throwAt(page, 2);
    const before = await roundSnapshot(page);
    const classicStars = await page.evaluate(() => JSON.stringify((window as any).__app.p.stars));
    expect(await storedSavedRound(page), 'a resolved Remix throw is checkpointed').not.toBeNull();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => storedSavedRound(page)).not.toBeNull();
    expect(await page.evaluate(() => JSON.parse((window as any).__app.p.savedRound).scene.mode)).toBe('remix');

    await page.reload();
    await page.waitForFunction(() => (window as any).__app?.screen === 'level' && !!(window as any).__app.scene);
    const card = page.locator(OPEN_MODAL).filter({ hasText: 'Welcome back — your planet is waiting' });
    await expect(card).toBeVisible();
    const scene = await page.evaluate(() => {
      const s = (window as any).__app.scene;
      const dpr = s.canvas.width / s.w;
      let goldSamples = 0;
      for (let k = 0; k < 12; k++) {
        const angle = (k * Math.PI) / 6;
        const x = Math.round((s.cx + Math.cos(angle) * s.R * 1.17) * dpr);
        const y = Math.round((s.cy + Math.sin(angle) * s.R * 1.17) * dpr);
        const pixels = s.g.getImageData(x - 2, y - 2, 5, 5).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] > 145 && pixels[i] > pixels[i + 1] + 20 && pixels[i + 1] > pixels[i + 2] + 25) {
            goldSamples++;
            break;
          }
        }
      }
      return { label: s.o.label, palette: s.o.remixPalette, seed: s.L.seed, goldSamples };
    });
    expect(scene.label).toBe('Remix · Bonus');
    expect(scene.palette).toBe(true);
    expect(scene.seed).toMatch(/^RX-/);
    expect(scene.goldSamples, 'the resumed planet has its gold rim').toBeGreaterThanOrEqual(6);
    const restored = await roundSnapshot(page);
    expect({ ...restored, rot: 0 }).toEqual({ ...before, rot: 0 });

    await card.getByRole('button', { name: 'Resume' }).click();
    await page.evaluate(() => (window as any).__app.scene.finish(2));
    await expect(page.locator(`${OPEN_MODAL} .remix-result`)).toBeVisible();
    expect(await page.evaluate(() => (window as any).__app.p.remix[1].best[0])).toBe(2);
    expect(await page.evaluate(() => JSON.stringify((window as any).__app.p.stars))).toBe(classicStars);
    expect(await page.evaluate(() => (window as any).__app.p.savedRound ?? null)).toBeNull();
    expectNoErrors(guard);
  });

  test(`planet ${PLANET}: 3 throws → background → web view killed → the same round resumes; finishing clears it`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 30 });
    await page.evaluate((n) => (window as any).__app.startLevel(n), PLANET);
    await page.waitForFunction((n) => (window as any).__app.scene?.L?.n === n && !!(window as any).__scene, PLANET);

    for (const sector of [2, 9, 16]) await throwAt(page, sector);
    // let the landing feedback finish so the state is at rest
    await page.waitForFunction(() => {
      const s = (window as any).__app.scene;
      return !s.feedback.active.length && !s.feedback.waiting.length;
    });
    const before = await roundSnapshot(page);
    expect(before.throwsUsed, '3 throws made').toBe(3);
    // every resolved throw is checkpointed (a kill without a background event can't undo a throw)
    expect(await storedSavedRound(page), 'the round is checkpointed after each throw').not.toBeNull();

    // ---- the app goes to the background
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });
    expect(await page.evaluate(() => (window as any).__app.scene.paused), 'auto-paused').toBe(true);
    await expect(page.locator(OPEN_MODAL).filter({ hasText: 'Paused' }), 'the pause card is up').toBeVisible();
    await expect.poll(() => storedSavedRound(page), { message: 'the round is checkpointed to storage' }).not.toBeNull();
    const paused = await roundSnapshot(page);
    // the planet kept spinning until the pause; everything else is as the 3 throws left it
    expect({ ...paused, rot: 0 }, 'backgrounding changes nothing in the round').toEqual({ ...before, rot: 0 });

    // ---- iOS kills the web view; the player opens the app again
    await page.reload();
    await page.waitForFunction(() => {
      const a = (window as any).__app;
      return a?.screen === 'level' && !!a.scene;
    });
    const card = page.locator(OPEN_MODAL).filter({ hasText: 'Welcome back — your planet is waiting' });
    await expect(card, 'the welcome-back pause card').toBeVisible();
    await expect(card.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__app.scene.paused), 'the resumed round waits for the player').toBe(true);
    const after = await roundSnapshot(page);
    expect(after, 'the exact round is restored (the planet even faces the same way)').toEqual(paused);
    await snap(page, info, guard, 'j7-welcome-back');

    // ---- resume and play the round out
    await card.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.waitForFunction(() => (window as any).__app.scene.canAim());
    expect(await page.evaluate(() => document.querySelectorAll('.overlay .scrim:not(.out)').length), 'no card left over').toBe(0);
    const left = after.throwsLeft;
    for (let k = 0; k < left; k++) await throwAt(page, (k * 5 + 1) % 24);
    // the round ends: results (a win) or the end card; take its first choice like a child would
    const end = page.locator(`${OPEN_MODAL}:has(.end-stars), ${OPEN_MODAL}:has(.end-title)`).last();
    await expect(end, 'the round ends').toBeVisible({ timeout: ROUND_WAIT });
    await end.locator('button').first().click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__app.p.savedRound ?? null), { message: 'finishing clears the saved round' })
      .toBeNull();
    await page.evaluate(() => (window as any).__app.saveNow());
    expect(await storedSavedRound(page), 'and it is gone from storage').toBeNull();

    // A relaunch never brings the finished round back. (After a loss the game restarts the planet at once;
    // unloading the page checkpoints that fresh round, so its welcome-back card may show with 0 throws made.)
    const next = await page.evaluate(() => {
      const a = (window as any).__app;
      return {
        screen: a.screen as string,
        planet: (a.scene?.L?.n ?? null) as number | null,
        throwsUsed: (a.scene?.throwsUsed ?? null) as number | null,
      };
    });
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__app?.p && !!document.querySelector('.host > .screen'));
    await settle(page);
    const welcome = page.locator(OPEN_MODAL).filter({ hasText: 'Welcome back — your planet is waiting' });
    if (next.screen === 'level') {
      if (await welcome.count()) {
        const fresh = await roundSnapshot(page);
        expect(fresh.throwsUsed, 'only the new, untouched round can come back').toBe(0);
        info.annotations.push({
          type: 'J7-relaunch',
          description: `the round ended in a loss; planet ${next.planet} restarted and its fresh round (0 throws) was checkpointed on unload`,
        });
      }
    } else await expect(welcome, `no welcome-back card after finishing (was on "${next.screen}")`).toHaveCount(0);
    info.annotations.push({
      type: 'J7',
      description: `planet ${after.planet}: ${after.throwsLeft} throws left, score ${after.score}, queue ${after.qi} (${after.cur} → ${after.next}) restored`,
    });
    expectNoErrors(guard);
  });
});
