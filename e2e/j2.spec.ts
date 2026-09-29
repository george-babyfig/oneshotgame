// J2 — Every tab and screen, with Back returning to the right place (ROADMAP-v2 7.7, M4 "One clear Home").
// A mid-game player (planet 45: every mode, Voyage, Festival, Calendar and the Star Atlas open) visits the
// five tabs and every screen reachable from them. Back (the button and a left-edge swipe) must return to
// the screen it came from, never jumping Home. M4 acceptance: ≤ 12 tap targets on Home, ≤ 3 numeric badges,
// Styles and the Star Atlas ≤ 2 taps from Home, the next throw 1 tap from results, and 0 clipped controls
// at 320×568 on Home and every tab in 6 languages + pseudo.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  TABS,
  countTargets,
  dismissSheets,
  expectNoErrors,
  freshInstall,
  localesToRun,
  midGame,
  screenName,
  settle,
  snap,
  swipeFromLeftEdge,
  tabSel,
  tr,
  waitScreen,
  watchErrors,
  type Guard,
  type LocaleId,
  type TabId,
} from './helpers';

/** M4 acceptance limits. */
const HOME_TARGETS_MAX = 12;
const HOME_BADGES_MAX = 3;

/** The screen each tab mounts (App.screen). */
const TAB_SCREEN: Record<TabId, string> = {
  home: 'home',
  missions: 'missions',
  homeworld: 'homeworld',
  collection: 'collection',
  styles: 'styles',
};

const backButton = (page: Page, loc: LocaleId = 'en') => page.locator(`.topbar button[aria-label="${tr(loc, 'Back')}"]`);

/** Tap a bottom tab and wait for its screen (closing a first-visit card such as the Homeworld welcome). */
async function openTab(page: Page, id: TabId) {
  await page.locator(tabSel(id)).click();
  await waitScreen(page, TAB_SCREEN[id]);
  return dismissSheets(page);
}

/** Tap something that opens a screen; wait for it and close any first-visit card. */
async function go(page: Page, info: TestInfo, guard: Guard, action: () => Promise<void>, screen: string, label = screen) {
  const from = await screenName(page);
  await action();
  await waitScreen(page, screen);
  const sheets = await dismissSheets(page);
  if (sheets.length) info.annotations.push({ type: 'first-visit-sheet', description: `${label}: ${sheets.join(' | ')}` });
  await snap(page, info, guard, label);
  await expect(backButton(page), `${label}: a Back button (came from ${from})`).toHaveCount(1);
}

/**
 * Go back with the Back button or a left-edge swipe and check we land on `expected`
 * (and not, say, Home).
 */
async function goBack(page: Page, info: TestInfo, via: 'button' | 'swipe', expected: string, from: string) {
  if (via === 'button') await backButton(page).click();
  else await swipeFromLeftEdge(page);
  await page.waitForFunction((f) => (window as any).__app.screen !== f, from, { timeout: 5_000 }).catch(() => {});
  const now = await screenName(page);
  info.annotations.push({ type: 'back', description: `${from} --${via}--> ${now} (expected ${expected})` });
  expect.soft(now, `Back (${via}) from ${from} returns to ${expected}`).toBe(expected);
  if (now !== expected) {
    // recover so the rest of the journey still runs
    await page
      .evaluate((s) => {
        const a = (window as any).__app;
        if (['home', 'missions', 'homeworld', 'collection', 'styles'].includes(s)) a.selectTab(s);
        else a.renderScreen(s);
      }, expected)
      .catch(() => {});
  }
  await settle(page);
}

/** Open a sheet from a screen, snap it, close it, and check we are still on that screen. */
async function sheet(page: Page, info: TestInfo, guard: Guard, open: () => Promise<void>, label: string) {
  const screen = await screenName(page);
  await open();
  const opened = await page
    .locator(OPEN_MODAL)
    .last()
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(
      () => true,
      () => false,
    );
  expect.soft(opened, `${label}: the tap opens its sheet (a dead tap otherwise)`).toBe(true);
  if (!opened) {
    await snap(page, info, guard, `${label}-dead-tap`);
    return;
  }
  await snap(page, info, guard, label);
  await dismissSheets(page);
  await expect(page.locator(OPEN_MODAL)).toHaveCount(0);
  expect.soft(await screenName(page), `closing ${label} stays on ${screen}`).toBe(screen);
}

const entry = (page: Page, cls: string, name: string) => page.locator(`.host ${cls}`).filter({ hasText: name }).first();

test.describe('J2 every tab and screen [en]', () => {
  test.use({ locale: 'en-US' });

  test('Home: ≤ 12 tap targets and ≤ 3 numeric badges, even with everything claimable', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { claimables: true });
    await snap(page, info, guard, 'home-claimables');
    const home = await countTargets(page);
    await info.attach('home-targets.json', { body: JSON.stringify(home, null, 2), contentType: 'application/json' });
    info.annotations.push({
      type: 'home-targets',
      description: `${home.targets.length} targets; ${home.numericBadges.length} numeric badges (${home.badges.map((b) => `${b.where}=${b.text}`).join(', ')})`,
    });
    console.log(`[J2 ${info.project.name}] Home: ${home.targets.length} targets, ${home.numericBadges.length} numeric badges`);
    expect.soft(home.targets.length, `Home tap targets: ${home.targets.join(' | ')}`).toBeLessThanOrEqual(HOME_TARGETS_MAX);
    expect.soft(home.numericBadges.length, 'numeric badges on Home').toBeLessThanOrEqual(HOME_BADGES_MAX);
    // one numeric badge style only (M4 4.4): every badge is a number
    expect
      .soft(
        home.badges.filter((b) => !/^\d+$/.test(b.text)),
        'badges are numeric',
      )
      .toEqual([]);
    // the five tabs, in order
    expect(await page.locator('.main-tabs .main-tab').evaluateAll((els) => els.map((e) => e.getAttribute('data-tab')))).toEqual([...TABS]);
    // one Next Up card, one PLAY
    await expect(page.locator('.host .next-up-card')).toHaveCount(1);
    await expect(page.locator('.host .btn.play')).toHaveCount(1);
    // badges only for claimable things: with nothing to claim, Home shows no badge on Missions or Collection
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.chapters = [1, 2, 3, 4];
      for (const card of a.p.quests.list) card.claimed = true;
      a.selectTab('home');
    });
    await settle(page);
    const quiet = await countTargets(page);
    expect
      .soft(
        quiet.numericBadges.filter((b) => /missions|collection|styles/.test(b.where)),
        'no badge when nothing is claimable',
      )
      .toEqual([]);
    expectNoErrors(guard);
  });

  test('Styles and the Star Atlas are ≤ 2 taps from Home', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page);
    let taps = 0;
    await page.locator(tabSel('styles')).click();
    taps++;
    await waitScreen(page, 'styles');
    expect(taps, 'Styles taps from Home').toBeLessThanOrEqual(2);
    await snap(page, info, guard, 'styles-from-home');

    await page.locator(tabSel('home')).click();
    await waitScreen(page, 'home');
    taps = 0;
    await page.locator(tabSel('collection')).click();
    taps++;
    await waitScreen(page, 'collection');
    await entry(page, 'button', 'Star Atlas').click();
    taps++;
    await waitScreen(page, 'sky');
    expect(taps, 'Star Atlas taps from Home').toBeLessThanOrEqual(2);
    await dismissSheets(page);
    await snap(page, info, guard, 'atlas-from-home');
    expectNoErrors(guard);
  });

  test('the next throw is 1 tap from results; the planet details overlay goes with the first fling', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page);
    await page.locator('.host .btn.play').click();
    await page.waitForFunction(() => (window as any).__app.scene?.L?.n === 45);
    await dismissSheets(page);
    await page.evaluate(() => (window as any).__app.scene.finish(3));
    const results = page
      .locator(OPEN_MODAL)
      .filter({ has: page.locator('.end-stars') })
      .filter({ has: page.locator('.row') });
    await expect(results).toBeVisible();
    await snap(page, info, guard, 'results-45');
    // ONE tap
    await results.getByRole('button', { name: 'Next ▶', exact: true }).click();
    await page.waitForFunction(() => (window as any).__app.scene?.L?.n === 46);
    await settle(page);
    // nothing to tap between results and the throw: no sheet, and the launcher is ready
    await expect(page.locator(OPEN_MODAL), 'no sheet between results and the next throw').toHaveCount(0);
    const ready = await page.evaluate(async () => {
      const a = (window as any).__app;
      const t0 = performance.now();
      while (!(a.scene?.canAim() && (window as any).__scene) && performance.now() - t0 < 5_000)
        await new Promise((r) => requestAnimationFrame(r));
      return !!a.scene?.canAim();
    });
    expect(ready, 'planet 46 accepts a fling right after Next').toBe(true);
    // the pre-level info is an overlay on the live round
    await expect(page.locator('.level-info'), 'planet details shown as an overlay').toBeVisible();
    await snap(page, info, guard, 'level-46-info');
    const used = await page.evaluate(async () => {
      const w = window as any;
      w.__scene.fire(w.__scene.aimAt(0));
      while (w.__app.scene.shot) await new Promise((r) => setTimeout(r, 30));
      return w.__app.scene.throwsUsed as number;
    });
    expect(used, 'the fling left the launcher').toBe(1);
    await expect(page.locator('.level-info'), 'the first fling dismisses the details').toHaveCount(0);
    expectNoErrors(guard);
  });

  test('every tab and screen: Back (button and left-edge swipe) returns to the right place', async ({ page }, info) => {
    test.setTimeout(150_000);
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { claimables: true });

    // ---- Play (Home): a root; no Back, and a swipe does nothing
    await snap(page, info, guard, 'home');
    await expect(backButton(page), 'Home has no Back').toHaveCount(0);
    await swipeFromLeftEdge(page);
    await settle(page);
    expect(await screenName(page), 'a swipe on Home stays Home').toBe('home');

    // Settings (sheet) → Field Guide → Back → Home
    await sheet(page, info, guard, () => page.locator('.topbar button[aria-label="Settings"]').click(), 'home-settings');
    await page.locator('.topbar button[aria-label="Settings"]').click();
    await go(
      page,
      info,
      guard,
      () => page.locator(OPEN_MODAL).getByRole('button', { name: 'Field Guide', exact: true }).click(),
      'fieldguide',
      'settings-fieldguide',
    );
    await goBack(page, info, 'button', 'home', 'fieldguide');

    // More ways to play: all four modes open at planet 45
    await sheet(
      page,
      info,
      guard,
      async () => {
        await page.locator('.host .more-play').click();
        const modes = page.locator(OPEN_MODAL);
        await expect(modes).toBeVisible();
        for (const name of ['Daily Planet', 'Zen Garden', 'Meteor Rush', 'Challenge a Friend']) await expect(modes).toContainText(name);
      },
      'home-modes',
    );

    // ---- Missions
    await openTab(page, 'missions');
    await snap(page, info, guard, 'missions');
    await expect(backButton(page), 'a tab root has no Back').toHaveCount(0);
    // Wishes: three creature-voiced asks
    await expect(page.locator('.host .wishes-panel .wish')).toHaveCount(3);
    // Star Road → Back; Star Road → Pass → Back → Back (a two-deep stack)
    await go(page, info, guard, () => entry(page, '.mission-entry', 'Star Road').click(), 'road', 'road');
    await goBack(page, info, 'button', 'missions', 'road');
    await go(page, info, guard, () => entry(page, '.mission-entry', 'Star Road').click(), 'road', 'road-2');
    if (await page.locator('.host .pass-cta').count()) {
      await go(page, info, guard, () => page.locator('.host .pass-cta').first().click(), 'pass', 'road-pass');
      await goBack(page, info, 'swipe', 'road', 'pass');
    } else info.annotations.push({ type: 'skipped-step', description: 'Star Road shows no Cosmic Pass link' });
    await goBack(page, info, 'swipe', 'missions', 'road');
    // Star Map (chapter chests ready) → Back
    await go(page, info, guard, () => entry(page, '.mission-entry', 'Star Map').click(), 'map', 'starmap');
    await goBack(page, info, 'button', 'missions', 'map');
    // Weekly Voyage → swipe back
    await go(page, info, guard, () => entry(page, '.mission-entry', 'Weekly Voyage').click(), 'voyage', 'voyage');
    await goBack(page, info, 'swipe', 'missions', 'voyage');
    // Calendar, Inbox, Event and Festival are sheets over Missions
    await sheet(page, info, guard, () => entry(page, '.mission-entry', 'Star Calendar').click(), 'missions-calendar');
    await sheet(page, info, guard, () => entry(page, '.mission-entry', 'Inbox').click(), 'missions-inbox');
    if (await entry(page, '.mission-entry', 'Event').count())
      await sheet(page, info, guard, () => entry(page, '.mission-entry', 'Event').click(), 'missions-event');
    await sheet(page, info, guard, () => entry(page, '.mission-entry', 'Festival').click(), 'missions-festival');
    // top-bar shortcuts on a tab: stardust → Upgrades, Passport, gems → Shop
    await go(page, info, guard, () => page.locator('.topbar button.pill.dust').click(), 'upgrades', 'missions-upgrades');
    await goBack(page, info, 'button', 'missions', 'upgrades');
    await go(page, info, guard, () => page.locator('.topbar button.avatar').click(), 'passport', 'missions-passport');
    await goBack(page, info, 'swipe', 'missions', 'passport');
    // (the gem pill links to the Shop once a chapter chest has been opened)
    await page.evaluate(() => (window as any).__app.p.chapters.push(1));
    await openTab(page, 'missions');
    await go(page, info, guard, () => page.locator('.topbar button.pill.gems').click(), 'shop', 'missions-shop');
    await goBack(page, info, 'button', 'missions', 'shop');

    // ---- Homeworld
    await openTab(page, 'homeworld');
    await snap(page, info, guard, 'homeworld');
    await expect(backButton(page), 'a tab root has no Back').toHaveCount(0);
    const atlas = page.locator('.host button').filter({ hasText: 'Star Atlas' });
    if (await atlas.count()) {
      await go(page, info, guard, () => atlas.first().click(), 'sky', 'homeworld-atlas');
      await goBack(page, info, 'button', 'homeworld', 'sky');
    } else
      info.annotations.push({
        type: 'skipped-step',
        description: 'Homeworld panel shows no Star Atlas button without a selected building',
      });

    // ---- Collection
    await openTab(page, 'collection');
    await snap(page, info, guard, 'collection');
    await go(page, info, guard, () => entry(page, 'button', 'Lifebook').click(), 'lifebook', 'lifebook');
    await goBack(page, info, 'button', 'collection', 'lifebook');
    await go(page, info, guard, () => entry(page, 'button', 'Sticker Album').click(), 'album', 'album');
    await goBack(page, info, 'swipe', 'collection', 'album');
    await go(page, info, guard, () => entry(page, 'button', 'Star Atlas').click(), 'sky', 'atlas');
    await goBack(page, info, 'button', 'collection', 'sky');
    await go(page, info, guard, () => entry(page, 'button', 'Field Guide').click(), 'fieldguide', 'fieldguide');
    for (const pageName of ['Objects', 'Creatures']) {
      await page.locator('.host .guide-tabs button').filter({ hasText: pageName }).click();
      await settle(page);
      await snap(page, info, guard, `fieldguide-${pageName.toLowerCase()}`);
    }
    // Field Guide → Open Lifebook → Back → Field Guide → Back → Collection (page switches are not stack steps)
    await go(
      page,
      info,
      guard,
      () => page.locator('.host button').filter({ hasText: 'Open Lifebook' }).click(),
      'lifebook',
      'fieldguide-lifebook',
    );
    await goBack(page, info, 'button', 'fieldguide', 'lifebook');
    await goBack(page, info, 'swipe', 'collection', 'fieldguide');

    // ---- Styles
    await openTab(page, 'styles');
    await snap(page, info, guard, 'styles');
    await go(
      page,
      info,
      guard,
      () => page.locator('.host').getByRole('button', { name: 'Shop', exact: true }).click(),
      'shop',
      'styles-shop',
    );
    await goBack(page, info, 'button', 'styles', 'shop');

    // ---- sub-screens cover the tab bar (Back is the way out); a tab switch starts a fresh stack
    await openTab(page, 'missions');
    await go(page, info, guard, () => entry(page, '.mission-entry', 'Star Road').click(), 'road', 'road-3');
    await expect(page.locator('.main-tabs'), 'a pushed screen has no tab bar').toHaveCount(0);
    await goBack(page, info, 'button', 'missions', 'road');
    await openTab(page, 'collection');
    await expect(backButton(page), 'switching tabs clears the Back stack').toHaveCount(0);
    await swipeFromLeftEdge(page);
    await settle(page);
    expect(await screenName(page), 'a swipe on a tab root stays put').toBe('collection');

    // ---- the Star Map from Play's galaxy (the galaxy planets are canvas hit areas: the app hook)
    await openTab(page, 'home');
    await page.evaluate(() => (window as any).__app.showStarMap());
    await waitScreen(page, 'map');
    await snap(page, info, guard, 'home-starmap');
    await goBack(page, info, 'swipe', 'home', 'map');
    expectNoErrors(guard);
  });
});

// 0 clipped controls on Home and every tab, in every language (M4 acceptance: 320×568 in 6 languages).
for (const loc of localesToRun()) {
  test.describe(`J2 tabs layout [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test(`Home and every tab: nothing clipped, cut off or off screen [${loc}]`, async ({ page }, info) => {
      const guard = watchErrors(page);
      await freshInstall(page);
      if (loc === 'pseudo')
        await page.evaluate(() => {
          const a = (window as any).__app;
          a.p.settings.lang = 'pseudo';
          (window as any).__i18n.setLang('pseudo');
        });
      await midGame(page, { claimables: true });
      await expect(page.locator(tabSel('missions'))).toContainText(tr(loc, 'Missions'));
      await snap(page, info, guard, `home-${loc}`);
      for (const id of TABS.slice(1)) {
        await openTab(page, id);
        await snap(page, info, guard, `${id}-${loc}`);
      }
      // the new Field Guide (from Collection)
      await openTab(page, 'collection');
      await page.locator('.host .scroll button').last().click();
      await waitScreen(page, 'fieldguide');
      await snap(page, info, guard, `fieldguide-${loc}`);
      // Back to Collection (sub-screens have no tab bar), then Home again
      await backButton(page, loc).click();
      await waitScreen(page, 'collection');
      await openTab(page, 'home');
      await snap(page, info, guard, `home-again-${loc}`);
      expectNoErrors(guard);
    });
  });
}
