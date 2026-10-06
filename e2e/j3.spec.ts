// J3 — Purchases in Grown-ups with the mock store (ROADMAP-v2 7.7, M5 and the checkout charter in 6.6):
// Gate v2 → contents sheet → store → receipt card. A wrong answer buys nothing and pauses the gate
// for 30 s, a pass grants exactly once, a replayed transaction is ignored, Ask to Buy waits for a
// grown-up (approve grants once, decline grants nothing) and a revoked look disappears quietly.
// Dev builds use the mock store in src/meta/iap.ts, driven by `window.__iap` (pending/approve/decline/
// revoke/replay); Gate v2 exposes its challenge digits as `window.__gate.answer()`.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  GATE,
  OPEN_MODAL,
  expectNoErrors,
  freshInstall,
  gateAnswer,
  holdGate,
  openGrownups,
  passGate,
  settle,
  snap,
  tabSel,
  typeGate,
  waitScreen,
  watchErrors,
  wrongAnswer,
  type Guard,
  type KnownIssue,
} from './helpers';

test.use({ locale: 'en-US' });

/** Gate v2 layout is asserted in e2e/gate.spec.ts; here it is annotated so J3 stays about purchases. */
const GATE_LAYOUT: KnownIssue[] = [
  {
    screen: /^gate/,
    kind: 'cutoff',
    match: /gate-v2-confirm/,
    maxWidth: 320,
    note: 'the "Hold to continue" label overflows its 44 px button at 320 px (see gate.spec.ts)',
  },
];

const GEMS80 = 'com.pocketplanet.game.gems80';
const STARTER = 'com.pocketplanet.game.startercrew';
const GEM_PRODUCTS = ['Handful of Gems', 'Pouch of Gems', 'Chest of Gems', 'Galaxy of Gems', 'Gem Piggy Bank'];

interface Wallet {
  gems: number;
  tx: string[];
  starter: boolean;
  pass: boolean;
  skins: string[];
  skin: string;
}
const wallet = (page: Page) =>
  page.evaluate((): Wallet => {
    const p = (window as any).__app.p;
    return { gems: p.gems, tx: [...p.processedTx], starter: p.starter, pass: p.pass, skins: [...p.skins], skin: p.skin };
  });

/** Sample for 2 s (well past the mock store); a changed wallet stays failed for the full window. */
async function expectStableWallet(page: Page, before: Wallet, label: string) {
  const start = Date.now();
  let changed = false;
  await expect
    .poll(
      async () => {
        if (JSON.stringify(await wallet(page)) !== JSON.stringify(before)) changed = true;
        return changed ? 'changed' : Date.now() - start >= 2_000 ? 'stable' : 'watching';
      },
      { message: label, timeout: 3_000, intervals: [50] },
    )
    .toBe('stable');
}

/** A returning player who has opened the chapter-1 chest (the shop is live), on a quiet Home. */
async function player(page: Page, info?: TestInfo) {
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.tutorial = true;
    a.p.level = 11;
    a.p.chapters = [1];
    a.p.passport.set = true;
    a.p.meta.sessions = 2;
    a.save();
    a.showHome(true);
  });
  await waitScreen(page, 'home');
  const intros = page.locator(OPEN_MODAL);
  if (await intros.count()) {
    info?.annotations.push({ type: 'intro-card', description: `Home: ${await intros.first().innerText()}` });
    await intros.locator('button').last().click();
    await settle(page);
  }
}

/** Fresh install → returning player → Settings → Grown-ups (through the gate). */
async function inGrownups(page: Page, guard: Guard, info?: TestInfo) {
  await freshInstall(page);
  await player(page, info);
  await openGrownups(page);
  expect(guard.errors).toEqual([]);
}

const productRow = (page: Page, title: string) => page.locator('.host .grownups-product').filter({ hasText: title }).first();
const contentsSheet = (page: Page) => page.locator(OPEN_MODAL).filter({ has: page.getByRole('button', { name: 'Buy', exact: true }) });
const receipt = (page: Page) => page.locator(OPEN_MODAL).filter({ hasText: 'Purchase complete' });
const toasts = (page: Page, text: string) => page.locator('.toast').filter({ hasText: text });

/** Settings → Grown-ups: the gate opens (while paused it cannot be passed). */
async function openGrownupsPaused(page: Page) {
  await page.evaluate(() => (window as any).__app.showHome(true));
  await waitScreen(page, 'home');
  await page.locator('.topbar button[aria-label="Settings"]').click();
  await page.locator(OPEN_MODAL).getByRole('button', { name: 'Grown-ups', exact: true }).click();
  await expect(page.locator(GATE)).toBeVisible();
}

/** Tap a product's price in Grown-ups and answer the gate; the contents sheet is then open. */
async function startBuying(page: Page, title: string) {
  await productRow(page, title).locator('.buy-real').click();
  await passGate(page);
  await expect(contentsSheet(page)).toBeVisible();
}

test.describe('J3 purchases in Grown-ups (mock store)', () => {
  test('Grown-ups is behind Gate v2 (from Settings and from Styles) and sells the gem packs and the Piggy Bank', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await player(page, info);
    // from Styles: Cancel on the gate leaves the child where they were
    await page.locator(tabSel('styles')).click();
    await waitScreen(page, 'styles');
    await page.locator('.host .grownups-link').click();
    await gateAnswer(page);
    await snap(page, info, guard, 'gate-from-styles', { known: GATE_LAYOUT });
    await page.locator(GATE).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator(GATE)).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__app.screen)).toBe('styles');

    await openGrownups(page, 'en', 'styles');
    await snap(page, info, guard, 'grownups');
    for (const title of [...GEM_PRODUCTS, 'Starter Crew']) await expect(productRow(page, title), title).toBeVisible();
    await expect(productRow(page, 'Handful of Gems').locator('.buy-real')).toHaveText('$0.99');
    // Restore and the help lines are one tap away (6.6 rule 5)
    await expect(page.locator('.host').getByRole('button', { name: 'Restore Purchases', exact: true })).toBeVisible();
    await expect(page.locator('.host')).toContainText('Ask to Buy');
    await expect(page.locator('.host')).toContainText('Screen Time');
    expectNoErrors(guard);
  });

  test('decision 45: on a fresh install a grown-up reaches the shop through the gate (App Review path)', async ({ page }, info) => {
    const guard = watchErrors(page);
    await freshInstall(page);
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.tutorial = true; // past the first planet's tutorial, nothing else played
      a.save();
      a.showHome(true);
    });
    await waitScreen(page, 'home');
    const intros = page.locator(OPEN_MODAL);
    while (await intros.count()) {
      await intros.first().locator('button').last().click();
      await settle(page);
    }
    expect(await page.evaluate(() => (window as any).__app.p.chapters.length), 'no chapter chest opened').toBe(0);
    await openGrownups(page);
    for (const title of GEM_PRODUCTS) await expect(productRow(page, title), title).toBeVisible();
    await snap(page, info, guard, 'grownups-first-launch');
    expectNoErrors(guard);
  });

  test('gem pack: gate → contents sheet → store → receipt; gems added exactly once; a replay is ignored', async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const before = await wallet(page);

    // Cancel on the contents sheet: nothing bought
    await startBuying(page, 'Handful of Gems');
    await contentsSheet(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expectStableWallet(page, before, 'cancel on the contents sheet: nothing bought');

    await startBuying(page, 'Handful of Gems');
    const sheet = contentsSheet(page);
    await expect(sheet).toContainText('80 gems');
    await expect(sheet).toContainText('$0.99');
    await expect(sheet).toContainText('Used up when spent');
    await expect(sheet).toContainText('Family Sharing: no');
    await snap(page, info, guard, 'contents-gems80');
    await sheet.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(receipt(page)).toBeVisible();
    await expect(receipt(page)).toContainText('80 gems added');
    await snap(page, info, guard, 'receipt-gems80');
    const after = await wallet(page);
    expect(after.gems, 'granted once').toBe(before.gems + 80);
    expect(after.tx.length, 'one transaction recorded').toBe(before.tx.length + 1);
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expect(receipt(page)).toHaveCount(0);
    await expectStableWallet(page, after, 'purchase grants once');
    // the purchase shows in the Purchases history
    await expect(page.locator('.host .grownups-section').filter({ hasText: 'Purchases' }).first()).toContainText('Handful of Gems');

    // StoreKit can redeliver a finished transaction (transactionUpdated, restore, relaunch): same txId → nothing
    const txId = after.tx[after.tx.length - 1];
    await page.evaluate(
      ([id, tx]) => {
        const w = window as any;
        w.__iap.replay(id, tx);
        w.__app.grant(id, tx);
      },
      [GEMS80, txId],
    );
    await expectStableWallet(page, after, 'replayed transaction ignored');
    await expect(receipt(page), 'no receipt for a replay').toHaveCount(0);

    // Two taps on a price before the gate shows open one gate, not two purchases.
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.buy('gems_s');
      a.buy('gems_s');
    });
    await expect(page.locator(GATE)).toHaveCount(1);
    await passGate(page);
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(receipt(page)).toBeVisible();
    const second = await wallet(page);
    expect(second.gems, 'a second, separate purchase grants once more (consumable)').toBe(after.gems + 80);
    expect(second.tx.length).toBe(after.tx.length + 1);
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectStableWallet(page, second, 'second purchase grants once');
    expectNoErrors(guard);
  });

  test('Starter Crew (one-time): contents, receipt says where it went, cannot be bought twice', async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const before = await wallet(page);
    expect(before.starter).toBe(false);

    await startBuying(page, 'Starter Crew');
    const sheet = contentsSheet(page);
    for (const item of ['Aurora atmosphere', 'Aurora Explorer suit', 'Aurora trail', 'Aurora Passport banner', '$2.99', 'Never expires'])
      await expect(sheet).toContainText(item);
    await expect(sheet).toContainText('Family Sharing: yes');
    await snap(page, info, guard, 'contents-starter');
    await sheet.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(receipt(page)).toBeVisible();
    // The receipt says where each look went (charter): Styles, the Homeworld paint sheet and Passport.
    for (const where of [
      'Aurora atmosphere, Aurora Explorer suit, Aurora hat, Aurora trail and Aurora launcher look are in Styles.',
      'Homeworld paint sheet',
      'Passport',
    ])
      await expect(receipt(page)).toContainText(where);
    await snap(page, info, guard, 'receipt-starter');
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    const after = await wallet(page);
    expect(after.starter).toBe(true);
    expect(after.skins).toContain('aurora');
    expect(after.gems, 'Starter Crew is looks only').toBe(before.gems);
    expect(after.tx.length).toBe(before.tx.length + 1);
    await expectStableWallet(page, after, 'Starter Crew grants once');
    await settle(page);
    await snap(page, info, guard, 'grownups-after-starter');

    // buying it again does nothing: the row says Owned (no price, no buy), and no gate opens
    const row = productRow(page, 'Starter Crew');
    await expect(row.locator('.buy-real')).toHaveText('Owned');
    await expect(row.locator('.buy-real')).toBeDisabled();
    await page.evaluate(() => (window as any).__app.buy('starter'));
    await expect(page.locator(GATE), 'no gate for an owned Starter Crew').toHaveCount(0);
    // …and a replay of its transaction (or a restore under a new id) grants nothing more
    await page.evaluate(([id, tx]) => (window as any).__iap.replay(id, tx), [STARTER, after.tx[after.tx.length - 1]]);
    await page.evaluate((id) => (window as any).__app.grant(id, `restored-${Date.now()}`), STARTER);
    const end = await wallet(page);
    expect(end.gems).toBe(after.gems);
    expect(end.starter).toBe(true);
    await expectStableWallet(page, end, 'Starter Crew remains owned without another grant');
    // …and it is not announced or recorded as a second purchase
    await settle(page);
    await expect(receipt(page), 'no second "Purchase complete" for an owned Starter Crew').toHaveCount(0);
    await page.evaluate(() => (window as any).__app.refresh());
    await settle(page);
    const history = await page
      .locator('.host .grownups-section')
      .filter({ has: page.locator('h2', { hasText: /^Purchases$/ }) })
      .locator('p')
      .filter({ hasText: 'Starter Crew' })
      .count();
    expect(history, 'Purchases history lists the one Starter Crew once').toBe(1);
    await expect(productRow(page, 'Starter Crew').locator('.buy-real')).toHaveText('Owned');
    expectNoErrors(guard);
  });

  test('a wrong gate answer buys nothing and pauses the gate for 30 s', async ({ page }, info) => {
    await page.clock.install();
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const before = await wallet(page);

    await productRow(page, 'Handful of Gems').locator('.buy-real').click();
    const answer = await gateAnswer(page);
    const keyOrder = () => page.locator(GATE).locator('.gate-v2-keypad button').allInnerTexts();
    const orderBefore = await keyOrder();
    await typeGate(page, wrongAnswer(answer));
    await holdGate(page);
    const gate = page.locator(GATE);
    expect(await keyOrder(), 'the keypad is reshuffled after a wrong answer').not.toEqual(orderBefore);
    await expect(gate.locator('.gate-v2-wait')).toHaveText(/^Wait (30|29) seconds, then try again\.$/);
    await expect(gate.locator('.gate-v2-keypad button').first()).toBeDisabled();
    await expect(gate.locator('.gate-v2-confirm')).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__gate.answer()), 'a new number after a wrong answer').not.toBe(answer);
    await snap(page, info, guard, 'gate-paused', { known: GATE_LAYOUT });
    await expect(contentsSheet(page)).toHaveCount(0);
    await expectStableWallet(page, before, 'wrong answer: no purchase');

    // Cancel and try again straight away: still paused
    await gate.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(gate).toHaveCount(0);
    await productRow(page, 'Handful of Gems').locator('.buy-real').click();
    await expect(gate.locator('.gate-v2-wait'), 'the pause survives closing the gate').toHaveText(/^Wait \d+ seconds/);
    await expect(gate.locator('.gate-v2-keypad button').first()).toBeDisabled();

    // …and a relaunch: the pause is saved with the profile
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__app?.p && !!document.querySelector('.host > .screen'));
    await openGrownupsPaused(page);
    await expect(gate.locator('.gate-v2-wait'), 'the pause survives a relaunch').toHaveText(/^Wait \d+ seconds/);
    await expect(gate.locator('.gate-v2-keypad button').first()).toBeDisabled();

    // 30 s later the keypad works again and the right answer goes through
    await page.clock.fastForward('00:31');
    await expect(gate.locator('.gate-v2-wait')).toHaveText('');
    await expect(gate.locator('.gate-v2-keypad button').first()).toBeEnabled();
    await passGate(page);
    await waitScreen(page, 'shop');
    await settle(page);
    await startBuying(page, 'Handful of Gems');
    await contentsSheet(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expectStableWallet(page, before, 'cancelled after the pause: still nothing bought');
    expectNoErrors(guard);
  });

  test("Ask to Buy: waiting for a grown-up's approval → approved → granted once, also after a reload", async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const before = await wallet(page);

    await page.evaluate(() => (window as any).__iap.pending());
    await startBuying(page, 'Handful of Gems');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(toasts(page, "Waiting for a grown-up's approval")).toBeVisible();
    await snap(page, info, guard, 'ask-to-buy-waiting');
    await expect(receipt(page)).toHaveCount(0);
    await expectStableWallet(page, before, 'pending: nothing granted yet');

    await page.evaluate(() => (window as any).__iap.approve());
    await expect(receipt(page)).toBeVisible();
    await expect(receipt(page)).toContainText('80 gems added');
    const after = await wallet(page);
    expect(after.gems, 'approved: granted once').toBe(before.gems + 80);
    expect(after.tx.length).toBe(before.tx.length + 1);
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    // a second approve (StoreKit redelivering) grants nothing
    await page.evaluate(() => (window as any).__iap.approve());
    await expectStableWallet(page, after, 'approve grants once');

    // relaunch: the grant was saved, nothing is granted again, and a redelivery is still ignored
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__app?.p && !!document.querySelector('.host > .screen'));
    await page.waitForFunction(() => !!(window as any).__iap);
    expect(await wallet(page), 'after a reload').toEqual(after);
    await page.evaluate(([id, tx]) => (window as any).__iap.replay(id, tx), [GEMS80, after.tx[after.tx.length - 1]]);
    await expectStableWallet(page, after, 'after a reload: redelivered transaction ignored');
    await expect(receipt(page)).toHaveCount(0);
    expectNoErrors(guard);
  });

  test('Ask to Buy: declined → nothing', async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const before = await wallet(page);
    await page.evaluate(() => (window as any).__iap.pending());
    await startBuying(page, 'Pouch of Gems');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(toasts(page, "Waiting for a grown-up's approval")).toBeVisible();
    await page.evaluate(() => {
      const iap = (window as any).__iap;
      iap.decline();
      iap.approve(); // nothing is waiting any more
    });
    await expectStableWallet(page, before, 'declined: nothing granted');
    await expect(receipt(page)).toHaveCount(0);
    expectNoErrors(guard);
  });

  test('Piggy Bank: Buy is disabled when empty; Ask to Buy shows "Stop waiting"; approval grants the saved gems once', async ({
    page,
  }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    const piggy = () => productRow(page, 'Gem Piggy Bank');
    await expect(piggy()).toContainText('Nothing saved yet');
    await expect(piggy().locator('.buy-real'), 'an empty Piggy Bank cannot be bought').toBeDisabled();

    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.piggy = 120;
      a.save();
      a.refresh();
    });
    await expect(piggy()).toContainText('120 gems saved');
    await expect(piggy().locator('.buy-real')).toBeEnabled();
    const before = await wallet(page);
    await page.evaluate(() => (window as any).__iap.pending());
    await startBuying(page, 'Gem Piggy Bank');
    await expect(contentsSheet(page)).toContainText('120 gems saved');
    await expect(contentsSheet(page)).toContainText('Used up when spent');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(toasts(page, "Waiting for a grown-up's approval")).toBeVisible();
    await expect(piggy()).toContainText("Waiting for a grown-up's approval");
    await expect(piggy().getByRole('button', { name: 'Stop waiting', exact: true })).toBeVisible();
    await expect(piggy().locator('.buy-real'), 'no second Piggy Bank purchase while one is waiting').toBeDisabled();
    await snap(page, info, guard, 'piggy-waiting');
    await expectStableWallet(page, before, 'pending Piggy Bank: nothing granted yet');

    await page.evaluate(() => (window as any).__iap.approve());
    await expect(receipt(page)).toBeVisible();
    await expect(receipt(page)).toContainText('120 gems added');
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    const after = await wallet(page);
    expect(after.gems).toBe(before.gems + 120);
    expect(await page.evaluate(() => (window as any).__app.p.piggy), 'the Piggy Bank is emptied').toBe(0);
    await page.evaluate(() => (window as any).__iap.approve());
    await expectStableWallet(page, after, 'Piggy Bank grants once');
    await page.evaluate(() => (window as any).__app.refresh());
    await settle(page);
    await expect(piggy().getByRole('button', { name: 'Stop waiting', exact: true })).toHaveCount(0);
    await expect(piggy().locator('.buy-real')).toBeDisabled();

    // Stop waiting: a parent gives up on an unanswered Ask to Buy
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.piggy = 60;
      a.save();
      a.refresh();
    });
    await page.evaluate(() => (window as any).__iap.pending());
    await startBuying(page, 'Gem Piggy Bank');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await piggy().getByRole('button', { name: 'Stop waiting', exact: true }).click();
    await expect(piggy()).toContainText('60 gems saved');
    await expect(piggy()).not.toContainText("Waiting for a grown-up's approval");
    await expect(piggy().locator('.buy-real')).toBeEnabled();
    await page.evaluate(() => (window as any).__iap.decline());
    expectNoErrors(guard);
  });

  test('a revoked (refunded) Starter Crew is removed quietly', async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    await startBuying(page, 'Starter Crew');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expect.poll(async () => (await wallet(page)).starter).toBe(true);

    // the child wears the Aurora look and is back in Styles
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.p.skin = 'aurora';
      a.p.look = { ...a.p.look, suit: 'suit_aurora', trail: 'tr_aurora_crew' };
      a.save();
      a.selectTab('styles');
    });
    await waitScreen(page, 'styles');
    await settle(page);
    const gemsBefore = (await wallet(page)).gems;
    await page.evaluate((id) => (window as any).__iap.revoke(id), STARTER);
    await expect.poll(async () => (await wallet(page)).starter).toBe(false);
    const after = await wallet(page);
    expect(after.skins).not.toContain('aurora');
    expect(after.skin, 'the Aurora atmosphere is taken off').toBe('classic');
    expect(after.gems, 'no gems taken or given').toBe(gemsBefore);
    // quietly: no sheet, no toast, the child stays where they are
    await settle(page);
    await expect(page.locator(OPEN_MODAL)).toHaveCount(0);
    await expect(page.locator('.toast:not(.out)')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__app.screen)).toBe('styles');
    await snap(page, info, guard, 'styles-after-revoke');
    // Grown-ups: What's new stays quiet for 7 days after a refund
    await openGrownups(page);
    await expect(page.locator('.host .grownups-section h2').filter({ hasText: "What's new" })).toHaveCount(0);
    expectNoErrors(guard);
  });
});

// Catalogue sweep: the same gate, pending, replay and revocation behavior applies to every SKU.
const LAUNCH_PRODUCTS = [
  ['gems_s', 'Handful of Gems', 'gems80', 80, true],
  ['gems_m', 'Pouch of Gems', 'gems500', 500, true],
  ['gems_l', 'Chest of Gems', 'gems1200', 1200, true],
  ['gems_xl', 'Galaxy of Gems', 'gems2800', 2800, true],
  ['piggy', 'Gem Piggy Bank', 'piggy', 40, true],
  ['starter', 'Starter Crew', 'startercrew', 0, false],
  ['pass', 'Cosmic Pass: Cosmic Road', 'road00', 0, false],
  ['theme_tidepool', 'Homeworld Theme: Tidepool', 'theme.tidepool', 0, false],
  ['theme_cometcandy', 'Homeworld Theme: Comet Candy', 'theme.cometcandy', 0, false],
  ['pack_crystalfrost', 'Planet Pack: Crystal Frost', 'pack.crystalfrost', 0, false],
  ['style_nebula', 'Style Single: Nebula Swirl', 'style.nebula', 0, false],
  ['style_firefly', 'Style Single: Firefly Sparks', 'style.firefly', 0, false],
] as const;

for (const [key, title, suffix, gems, consumable] of LAUNCH_PRODUCTS) {
  test(`J3 launch catalogue: ${title}`, async ({ page }, info) => {
    const guard = watchErrors(page);
    await inGrownups(page, guard, info);
    if (key === 'piggy') {
      await page.evaluate(() => {
        const app = (window as any).__app;
        app.p.piggy = 40;
        app.save();
        app.refresh();
      });
    }
    const id = `com.pocketplanet.game.${suffix}`;
    const before = await wallet(page);

    // Closing the gate before answering never opens a contents sheet or charges.
    await productRow(page, title).locator('.buy-real').click();
    await expect(page.locator(GATE)).toBeVisible();
    await page.locator(GATE).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(contentsSheet(page)).toHaveCount(0);
    expect(await wallet(page)).toEqual(before);

    await page.evaluate(() => (window as any).__iap.pending());
    await startBuying(page, title);
    await expect(contentsSheet(page)).toContainText(consumable ? 'Family Sharing: no' : 'Family Sharing: yes');
    await contentsSheet(page).getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(toasts(page, "Waiting for a grown-up's approval")).toBeVisible();
    expect(await wallet(page)).toEqual(before);
    await page.evaluate(() => (window as any).__iap.approve());
    await expect(receipt(page)).toBeVisible();
    const after = await wallet(page);
    if (key.startsWith('theme_')) await expect(receipt(page)).toContainText('Homeworld');
    if (key === 'pack_crystalfrost' || key.startsWith('style_')) await expect(receipt(page)).toContainText('Styles');
    expect(after.gems).toBe(before.gems + gems);
    expect(after.tx).toHaveLength(before.tx.length + 1);
    if (!consumable) {
      const owned = await page.evaluate((productId) => {
        const p = (window as any).__app.p;
        return productId.endsWith('startercrew')
          ? p.starter
          : productId.endsWith('road00')
            ? p.pass
            : p.meta.productEntitlements?.includes(productId);
      }, id);
      expect(owned).toBe(true);
    }
    await receipt(page).getByRole('button', { name: 'Done', exact: true }).click();
    await page.evaluate(([productId, txId]) => (window as any).__iap.replay(productId, txId), [id, after.tx[after.tx.length - 1]]);
    expect(await wallet(page)).toEqual(after);
    await expect(receipt(page)).toHaveCount(0);

    if (!consumable) {
      await page.evaluate((productId) => (window as any).__iap.revoke(productId), id);
      const revoked = await page.evaluate((productId) => {
        const p = (window as any).__app.p;
        return productId.endsWith('startercrew')
          ? !p.starter
          : productId.endsWith('road00')
            ? !p.pass
            : !p.meta.productEntitlements?.includes(productId);
      }, id);
      expect(revoked).toBe(true);
      expect((await wallet(page)).gems).toBe(after.gems);
      await expect(receipt(page)).toHaveCount(0);
    }
    expectNoErrors(guard);
  });
}

test('J3 fresh-install looks owner can open Styles before chapter 1', async ({ page }) => {
  await freshInstall(page);
  for (const suffix of [
    'startercrew',
    'road00',
    'theme.tidepool',
    'theme.cometcandy',
    'pack.crystalfrost',
    'style.nebula',
    'style.firefly',
  ]) {
    await page.evaluate((id) => {
      const app = (window as any).__app;
      app.p.tutorial = true;
      app.p.chapters = [];
      app.p.starter = id === 'startercrew';
      app.p.pass = id === 'road00';
      app.p.meta.productEntitlements = id === 'startercrew' || id === 'road00' ? [] : [`com.pocketplanet.game.${id}`];
      app.showStyles();
    }, suffix);
    await expect(page.locator('.host')).toContainText('Styles');
    await expect(page.locator('.host')).not.toContainText('Opens after chapter 1');
  }
});
