// J1 — First session: fresh install to planet 6 and the Homeworld (ROADMAP-v2 7.7, M3 "The first ten minutes").
// Runs in every language of the LOCALE matrix plus a pseudo-locale ~40% longer; the heavier M3
// acceptance checks (wasted throws, extra-large text) run in English.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  expectNoErrors,
  freshInstall,
  layoutViolations,
  localesToRun,
  modalsSeen,
  pageText,
  settle,
  snap,
  tap,
  tr,
  usePseudo,
  waitScreen,
  watchErrors,
  tabSel,
  type Guard,
  type LocaleId,
} from './helpers';

// M4 ("One clear Home") replaced the side rails with five bottom tabs: Home must now pass at 320×568
// with no expected failures (the M3 KNOWN_HOME_320 list is gone).

/** M3 acceptance: install to first fling in 15 s or less; the title beat lasts 5 s or less. */
const FIRST_FLING_MS = 15_000;
const TITLE_MS = 5_000;

const level = (page: Page) => page.evaluate(() => (window as any).__app.p.level as number);
const scenePlanet = (page: Page) => page.evaluate(() => (window as any).__app.scene?.L?.n as number | undefined);
const waitPlanet = (page: Page, n: number) => page.waitForFunction((k) => (window as any).__app.scene?.L?.n === k, n);

/** Session 1 must show no prices, offers, gem spending or system-style prompts. */
async function expectKidSafe(page: Page, loc: LocaleId, where: string) {
  const text = await pageText(page);
  expect.soft(text, `${where}: no price text`).not.toMatch(/[$€£¥]|US\$|R\$/);
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
  await expect.soft(page.locator('.offer, .buy-real, .pack'), `${where}: no offers or packs`).toHaveCount(0);
  await expect.soft(page.locator('.pill.gems .plus'), `${where}: the gem pill does not link to the Shop`).toHaveCount(0);
  const nav = await page.locator('.main-tabs .main-tab').allInnerTexts();
  expect
    .soft(
      nav.filter((s) => s.includes(tr(loc, 'Shop'))),
      `${where}: no Shop in the tabs`,
    )
    .toEqual([]);
}

/**
 * Close whatever sheet is on top by its last button (the "Show me / OK / Close" one).
 * Returns the titles of the sheets it closed, so journeys can count intro cards.
 */
async function closeSheets(page: Page, info: TestInfo, guard: Guard, where: string, max = 4) {
  const closed: string[] = [];
  for (let i = 0; i < max; i++) {
    await settle(page);
    const top = page.locator(OPEN_MODAL).last();
    if (!(await top.count())) break;
    const title = await top.evaluate((el) => (el.querySelector('.m-title, .end-title')?.textContent ?? '').trim() || '(untitled)');
    info.annotations.push({ type: 'interstitial', description: `${where}: ${title}` });
    closed.push(title);
    await snap(page, info, guard, `${where}-sheet${i + 1}`);
    await expect.soft(top.locator('button', { hasText: 'Reset progress' }), 'never tap a destructive button').toHaveCount(0);
    const buttons = top.locator('button');
    if (await buttons.count()) await buttons.last().click();
    else {
      // a card without a button closes with a tap outside it
      info.annotations.push({ type: 'no-close-button', description: `${where}: "${title}" has no button; closes on a tap outside` });
      await page.mouse.click(4, 4);
    }
  }
  return closed;
}

/** The round's results sheet (won): the one with stars and the Galaxy / Next buttons. */
const resultsSheet = (page: Page) =>
  page
    .locator(OPEN_MODAL)
    .filter({ has: page.locator('.end-stars') })
    .filter({ has: page.locator('.row') });

/**
 * Play planet n to 3 stars and tap "Next ▶". Returns the intro cards seen during the round.
 * M3: Next opens planets 2, 4 and 5 directly, and leads Home after planets 2 and 5.
 */
async function playPlanet(page: Page, info: TestInfo, guard: Guard, loc: LocaleId, n: number) {
  await waitPlanet(page, n);
  await expect(page.locator(`${OPEN_MODAL}.pre`), 'session 1 skips the pre-level sheet').toHaveCount(0);
  // an intro card (Coach 2.0, e.g. "Magma") may cover the HUD: read it, then tap through it like a player
  const intros = await closeSheets(page, info, guard, `level-${n}`);
  await snap(page, info, guard, `level-${n}`);
  await expectKidSafe(page, loc, `level ${n}`);
  // Goals start at planet 6 (GOALS_FROM)
  await expect(page.locator('.hud .goals:not(.hidden)')).toHaveCount(0);
  // drive the round to a 3-star ending instead of aiming
  await page.evaluate(() => (window as any).__app.scene.finish(3));
  const results = resultsSheet(page);
  await expect(results).toBeVisible();
  await expect(results.locator('.end-stars .on')).toHaveCount(3);
  if (n === 1) {
    // the purpose moment on the first win
    await expect(results).toHaveClass(/first-win/);
    await expect(results).toContainText(tr(loc, 'Your planet now makes stardust for you.'));
  }
  await snap(page, info, guard, `results-${n}`);
  await expectKidSafe(page, loc, `results ${n}`);
  await expect(results.getByRole('button', { name: tr(loc, 'Galaxy'), exact: true })).toBeVisible();
  await results.getByRole('button', { name: tr(loc, 'Next ▶'), exact: true }).click();
  await afterNext(page, info, guard, n);
  expect(await level(page)).toBe(n + 1);
  return intros;
}

/**
 * M3: in session 1, Next leads Home after planets 2 and 5 (the first Home view; the Homeworld beat) and
 * straight into the next planet otherwise. If Next skips Home, that is recorded as a failure and the
 * journey goes Home the way a player would (the results' Galaxy button does the same) so the rest still runs.
 */
async function afterNext(page: Page, info: TestInfo, guard: Guard, n: number) {
  await page.waitForFunction((k) => {
    const a = (window as any).__app;
    return a.screen === 'home' || a.scene?.L?.n === k;
  }, n + 1);
  if (n !== 2 && n !== 5) {
    await waitPlanet(page, n + 1);
    if (await page.locator('.level-info').count())
      info.annotations.push({ type: 'level-info', description: `planet ${n + 1}: the planet details overlay shows in session 1` });
    return;
  }
  const where = await page.evaluate(() => (window as any).__app.screen as string);
  expect.soft(where, `M3: Next after planet ${n} leads Home in session 1 (went to planet ${n + 1} instead)`).toBe('home');
  if (where === 'home') return;
  info.annotations.push({ type: 'regression', description: `Next after planet ${n} opened planet ${n + 1} instead of Home` });
  await snap(page, info, guard, `next-after-${n}-skips-home`);
  await page.evaluate(() => (window as any).__app.showHome());
  await waitScreen(page, 'home');
}

async function atHome(page: Page, info: TestInfo, guard: Guard, loc: LocaleId, suffix = '') {
  await waitScreen(page, 'home');
  const n = await level(page);
  const sheets = await closeSheets(page, info, guard, `home-${n}${suffix}`);
  await snap(page, info, guard, `home-${n}${suffix}`);
  await expectKidSafe(page, loc, `home before planet ${n}`);
  // Homeworld unlocks when planet 5 is reached (HOME_UNLOCK_LEVEL): its tab is locked before then (M4)
  await expect(page.locator(tabSel('homeworld'))).toHaveCount(1);
  expect(
    await page.locator(tabSel('homeworld')).evaluate((b) => b.classList.contains('locked')),
    `Homeworld tab locked before planet 5 (planet ${n})`,
  ).toBe(n < 5);
  // the Star Calendar is a Home chip from planet 21, Voyage from 20, Festival from 34
  await expect(page.locator('.calendar-chip, .voyage-btn, .fest-chip')).toHaveCount(0);
  return sheets;
}

/** Tap PLAY on Home: planets 1-5 of session 1 open straight into the round. */
async function play(page: Page, n: number) {
  await tap(page, '.btn.play');
  await waitPlanet(page, n);
}

for (const loc of localesToRun()) {
  test.describe(`J1 first session [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test(`fresh install → title → planets 1-5 → Homeworld → planet 6 goals [${loc}]`, async ({ page }, info) => {
      const guard = watchErrors(page);
      // Let the title beat auto-advance: the slowest path to the first fling.
      const install = await freshInstall(page, { title: 'wait' });

      // M3 3.1: a title beat on first launch, 5 s or less, then straight into planet 1.
      expect(install.titleShown, 'the title beat shows on a fresh install').toBe(true);
      expect(install.titleMs, 'title beat ≤ 5 s').toBeLessThanOrEqual(TITLE_MS);
      // M3 acceptance (a): install to first fling in 15 s or less.
      expect(install.flingReadyMs, 'first fling possible within 15 s of page load').not.toBeNull();
      expect(install.flingReadyMs!, 'first fling possible within 15 s of page load').toBeLessThanOrEqual(FIRST_FLING_MS);
      info.annotations.push({
        type: 'first-fling-ms',
        description: `${install.flingReadyMs} ms from navigation start (title beat on screen ${install.titleMs} ms)`,
      });
      console.log(`[J1 ${loc} ${info.project.name}] first fling ready at ${install.flingReadyMs} ms; title ${install.titleMs} ms`);

      // The game follows the device language on a fresh install.
      const lang = loc === 'pseudo' ? 'en' : loc;
      await expect(page.locator('html')).toHaveAttribute('lang', lang);

      // Planet 1 (the tutorial) starts straight away: no Home, no pop-ups first.
      await waitScreen(page, 'level');
      expect(await scenePlanet(page)).toBe(1);
      // M3 3.2: the star tip shows at throw 0 on planet 1
      const tipLoc: LocaleId = loc === 'pseudo' ? 'en' : loc;
      const tip = page.locator('.hud .coach.star-tip.show');
      await expect(tip).toBeVisible();
      await expect(tip).toContainText(tr(tipLoc, 'Fill the bar past a ★ to finish the planet.'));
      // …and the first fling really goes: aim at a land and release.
      const used = await page.evaluate(async () => {
        const w = window as any;
        w.__scene.fire(w.__scene.aimAt(0));
        while (w.__app.scene.shot) await new Promise((r) => setTimeout(r, 30));
        return w.__app.scene.throwsUsed as number;
      });
      expect(used, 'the first fling left the launcher').toBe(1);

      if (loc === 'pseudo') await usePseudo(page);
      await expect(page.locator('.hud')).toBeVisible();
      if (loc === 'pseudo') await expect(page.locator('.hud')).toContainText('[');
      else await expect(page.locator('.hud')).toContainText(tr(loc, 'throws'));
      if (loc === 'pseudo') await expect(tip).toContainText(tr(loc, 'Fill the bar past a ★ to finish the planet.'));

      const intros: string[] = [];
      intros.push(...(await playPlanet(page, info, guard, loc, 1)));
      intros.push(...(await playPlanet(page, info, guard, loc, 2)));

      // (b) the first Home view comes after planet 2, with 0 interrupting pop-ups before it
      await waitScreen(page, 'home');
      const beforeHome = (await modalsSeen(page)).filter((m) => !m.afterHome && m.kind === 'popup');
      expect(beforeHome, '0 interrupting pop-ups before the first Home view').toEqual([]);
      intros.push(...(await atHome(page, info, guard, loc)));

      await play(page, 3);
      intros.push(...(await playPlanet(page, info, guard, loc, 3)));
      intros.push(...(await playPlanet(page, info, guard, loc, 4)));
      intros.push(...(await playPlanet(page, info, guard, loc, 5)));

      // (e) after planet 5, Next leads Home and the Homeworld intro card appears
      await waitScreen(page, 'home');
      const card = page.locator(OPEN_MODAL).last();
      await expect(card).toBeVisible();
      await expect(card.locator('.m-title')).toHaveText(tr(loc, 'Your Homeworld is ready'));
      await snap(page, info, guard, 'home-6-homeworld-intro');
      await expectKidSafe(page, loc, 'Homeworld intro');
      intros.push(await card.locator('.m-title').innerText());
      await card.getByRole('button', { name: tr(loc, 'Show me'), exact: true }).click();

      // (d) the Homeworld at planet 5: no prices, gem prompts or offers
      await waitScreen(page, 'homeworld');
      intros.push(...(await closeSheets(page, info, guard, 'homeworld')));
      await snap(page, info, guard, 'homeworld');
      await expectKidSafe(page, loc, 'homeworld');
      // "Show me" opened the Homeworld tab; the Play tab leads Home (M4)
      await tap(page, tabSel('home'));
      intros.push(...(await atHome(page, info, guard, loc, '-back')));

      // at most one interrupting Home pop-up in this app open (the governor)
      const homePopups = (await modalsSeen(page)).filter((m) => m.kind === 'popup' && m.screen === 'home');
      expect(homePopups.length, `≤ 1 interrupting Home pop-up per app open: ${JSON.stringify(homePopups)}`).toBeLessThanOrEqual(1);

      // Planet 6: the first planet with goals (GOALS_FROM), straight from PLAY in session 1
      await play(page, 6);
      await expect(page.locator(`${OPEN_MODAL}.pre`)).toHaveCount(0);
      intros.push(...(await closeSheets(page, info, guard, 'level-6')));
      await expect(page.locator('.hud .goals:not(.hidden)')).toBeVisible();
      expect(await page.locator('.hud .goals .goal').count()).toBeGreaterThan(0);
      await snap(page, info, guard, 'level-6');
      await expectKidSafe(page, loc, 'level 6');

      // Count the intro cards (Coach 2.0) and every sheet the session showed.
      const all = await modalsSeen(page);
      info.annotations.push({ type: 'intro-cards', description: `${intros.length}: ${intros.join(' | ')}` });
      info.annotations.push({
        type: 'modals',
        description: all.map((m) => `${m.kind}@${m.screen}/${m.planet ?? m.level}: ${m.title}`).join(' | '),
      });
      expect(all.filter((m) => m.title === tr(loc, 'Out of throws'))).toEqual([]);
      // Coach 2.0: at most one intro card per round
      const perPlanet = new Map<number, number>();
      for (const m of all.filter((x) => x.kind === 'popup' && x.screen === 'level'))
        perPlanet.set(m.planet ?? 0, (perPlanet.get(m.planet ?? 0) ?? 0) + 1);
      expect
        .soft(
          [...perPlanet].filter(([, c]) => c > 1),
          'at most one intro card per round',
        )
        .toEqual([]);
      expectNoErrors(guard);
    });
  });
}

test.describe('J1 M3 acceptance [en]', () => {
  test.use({ locale: 'en-US' });

  test('(c) planets 1-3 cannot be failed: every throw wasted, the Keeper helps and the planet still finishes', async ({ page }, info) => {
    test.setTimeout(120_000);
    const guard = watchErrors(page);
    await freshInstall(page);

    /** Fling every throw away from the planet until the round's end sheet shows. */
    const wasteAll = () =>
      page.evaluate(async () => {
        const w = window as any;
        const s = w.__app.scene;
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const giftsSeen: string[] = [];
        let fired = 0;
        const t0 = performance.now();
        while (!s.ended && !s.modalOpen?.el?.querySelector('.end-stars') && performance.now() - t0 < 60_000) {
          if (s.canAim()) {
            // straight down, away from the planet: a miss (what window.__scene.fire does, on the live scene;
            // the __scene hook itself is deleted when the previous planet's scene is destroyed)
            s.fire(0, 4000);
            fired++;
          }
          const tip = s.coachEl.textContent ?? '';
          if (s.coachEl.classList.contains('show') && tip && giftsSeen[giftsSeen.length - 1] !== tip) giftsSeen.push(tip);
          await sleep(40);
        }
        return { fired, gifts: s.practiceGifts as number, throwsUsed: s.throwsUsed as number, landed: s.throwsUsed - fired };
      });

    for (const n of [1, 2, 3]) {
      await waitPlanet(page, n);
      await closeSheets(page, info, guard, `waste-${n}`);
      const start = await page.evaluate(() => (window as any).__app.scene.throwsLeft as number);
      const r = await wasteAll();
      info.annotations.push({ type: 'wasted', description: `planet ${n}: ${JSON.stringify({ start, ...r })}` });
      // the Keeper gave 3 more throws twice, then helped the planet to 1 star
      expect(r.gifts, `planet ${n}: the Keeper's 3 more throws, twice`).toBe(2);
      expect(r.fired, `planet ${n}: every throw was flung away`).toBe(start + 6);
      const end = page.locator(OPEN_MODAL).filter({ has: page.locator('.end-title') });
      await expect(end).toBeVisible();
      await expect(end.locator('.end-title')).toHaveText('Planet complete!');
      await expect(end.locator('.end-title')).not.toHaveClass(/lost/);
      await expect(end.locator('.end-stars .on')).toHaveCount(1);
      await snap(page, info, guard, `waste-${n}-end`);
      await expectKidSafe(page, 'en', `planet ${n} after wasted throws`);
      await end.getByRole('button', { name: 'Collect', exact: true }).click();
      const results = resultsSheet(page);
      await expect(results).toBeVisible();
      await expect(results.locator('.end-stars .on')).toHaveCount(1);
      await results.getByRole('button', { name: 'Next ▶', exact: true }).click();
      if (n === 2) {
        await afterNext(page, info, guard, 2);
        await closeSheets(page, info, guard, 'home-3');
        await play(page, 3);
      }
    }
    // Planet 4 is a normal planet: wasting it ends in "Out of throws" — but with no 💎 continue in session 1.
    await waitPlanet(page, 4);
    await closeSheets(page, info, guard, 'waste-4');
    const r4 = await wasteAll();
    expect(r4.gifts, 'planet 4: no practice help').toBe(0);
    const lost = page.locator(OPEN_MODAL).filter({ has: page.locator('.end-title.lost') });
    await expect(lost.locator('.end-title')).toHaveText('Out of throws');
    await snap(page, info, guard, 'waste-4-end');
    await expectKidSafe(page, 'en', 'planet 4 out of throws');
    const titles = (await modalsSeen(page)).map((m) => `${m.planet}:${m.title}`);
    expect(
      titles.filter((t) => /^[123]:Out of throws/.test(t)),
      'no "Out of throws" on planets 1-3',
    ).toEqual([]);
    expectNoErrors(guard);
  });

  test('(f) Extra large text at 320×568: PLAY and the bottom nav are reachable; Settings labels stay ≥ 60 px', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const guard = watchErrors(page);
    await freshInstall(page);
    await reachPlanet6Home(page);

    // choose Extra large in Settings, like a parent would
    await tap(page, `.topbar button[aria-label="Settings"]`);
    const settings = page.locator(OPEN_MODAL).filter({ has: page.locator('select[aria-label="Text size"]') });
    await expect(settings).toBeVisible();
    await settings.locator('select[aria-label="Text size"]').selectOption('extra-large');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim())).toBe('1.36');
    await settle(page);

    // every text label in Settings keeps at least ~60 px of width (or fits on one line)
    const narrow = await settings.evaluate((box) => {
      const out: { text: string; width: number; lines: number }[] = [];
      for (const el of box.querySelectorAll('*')) {
        if ((el as HTMLElement).offsetParent === null) continue;
        for (const n of el.childNodes) {
          const text = n.nodeType === Node.TEXT_NODE ? (n.textContent ?? '').trim() : '';
          if (!text) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const width = Math.round(range.getBoundingClientRect().width);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
          // squeezed: wrapped onto several lines, or cut, inside a column under 60 px
          const cut = (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1;
          if (width < 60 && (lines > 1 || cut)) out.push({ text, width, lines });
        }
      }
      return out;
    });
    await snap(page, info, guard, 'settings-xl');
    await info.attach('settings-xl-labels.json', { body: JSON.stringify(narrow, null, 2), contentType: 'application/json' });
    expect.soft(narrow, 'Settings labels narrower than 60 px at Extra large, 320×568').toEqual([]);
    // close Settings with a tap outside the sheet (its last button is "Reset progress")
    await page
      .locator('.overlay .scrim:not(.out)')
      .last()
      .click({ position: { x: 2, y: 2 } });
    await expect(settings).toHaveCount(0);

    // Home: PLAY and every bottom-nav button can be reached (scrolling allowed) and take the tap
    await waitScreen(page, 'home');
    await settle(page);
    await snap(page, info, guard, 'home-xl');
    const targets = [page.locator('.btn.play'), ...(await page.locator('.main-tabs .main-tab').all())];
    expect(targets.length).toBeGreaterThan(1);
    for (const target of targets) {
      const name = (await target.innerText()).replace(/\s+/g, ' ').trim();
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect(box, `${name}: laid out`).not.toBeNull();
      expect.soft(box!.x >= -1 && box!.x + box!.width <= 321, `${name}: inside the 320 px width (${JSON.stringify(box)})`).toBe(true);
      expect.soft(box!.y >= -1 && box!.y + box!.height <= 569, `${name}: on screen after scrolling (${JSON.stringify(box)})`).toBe(true);
      // Playwright's actionability check: visible, stable, enabled and not covered by another element
      await target.click({ trial: true, timeout: 5_000 });
    }
    const file = info.outputPath('home-xl-reachable.png');
    await page.screenshot({ path: file, fullPage: true });
    await info.attach('home-xl-reachable', { path: file, contentType: 'image/png' });
    expectNoErrors(guard);
  });
});

/** Win planets 1-5 (reduce motion skips the fly-away), so Home has its galaxy, vault and Homeworld button. */
async function reachPlanet6Home(page: Page) {
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
    a.showHome(true);
  });
  expect(await level(page)).toBe(6);
  await waitScreen(page, 'home');
  await settle(page);
}

// M4: the side rails are gone; Home must have nothing clipped or off screen at every size, 320×568 included.
test.describe('J1 Home layout at the narrowest width', () => {
  test.use({ locale: 'en-US' });
  test('Home after planet 5: nothing clipped or off screen', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await reachPlanet6Home(page);
    const bad = (await layoutViolations(page)).filter((v) => v.kind !== 'tap-target');
    await info.attach('home-layout.json', { body: JSON.stringify(bad, null, 2), contentType: 'application/json' });
    const file = info.outputPath('home-after-planet-5.png');
    await page.screenshot({ path: file });
    await info.attach('home-after-planet-5', { path: file, contentType: 'image/png' });
    expectNoErrors(guard);
    expect.soft(bad, 'Home layout (no expected failures since M4)').toEqual([]);
  });
});
