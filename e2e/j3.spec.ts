// J3 — Purchases with the mock store (ROADMAP-v2 7.7): the parental gate fails closed,
// a pass grants exactly once, and a replayed transaction is ignored.
// Dev builds use the mock store in src/meta/iap.ts, which grants after ~300 ms.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { OPEN_MODAL, expectNoErrors, freshInstall, settle, snap, tabSel, tap, waitScreen, watchErrors, type Guard } from './helpers';

test.use({ locale: 'en-US' });

interface Wallet {
  gems: number;
  tx: string[];
  starter: boolean;
  pass: boolean;
  boosters: Record<string, number>;
}
const wallet = (page: Page) =>
  page.evaluate((): Wallet => {
    const p = (window as any).__app.p;
    return { gems: p.gems, tx: [...p.processedTx], starter: p.starter, pass: p.pass, boosters: { ...p.boosters } };
  });

/** Sample through the mock store delay; a changed wallet stays failed for the full window. */
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

/** A player who has finished chapter 1 and opened its chest, standing in the Shop. */
async function openShop(page: Page, guard: Guard, info?: TestInfo) {
  await freshInstall(page);
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.tutorial = true;
    a.p.level = 11; // chapter 1 (planets 1-10) cleared
    a.p.chapters = [1]; // …and its chest opened: the Shop's one-time offers are now live
    a.p.passport.set = true;
    a.p.meta.sessions = 2; // a returning player: session 1 never shows the Shop (M3)
    a.showHome(true); // quiet: no automatic Home pop-ups
  });
  await waitScreen(page, 'home');
  // an intro card (Coach 2.0) may still sit on Home: count it, then close it like a player
  const intros = page.locator(OPEN_MODAL);
  if (await intros.count()) {
    info?.annotations.push({ type: 'intro-card', description: `Home: ${await intros.first().innerText()}` });
    await intros.locator('button').last().click();
    await settle(page);
  }
  // M4: the Shop moved off the Home nav; a player reaches it from the Styles tab
  await tap(page, tabSel('styles'));
  await waitScreen(page, 'styles');
  await page.locator('.host').getByRole('button', { name: 'Shop', exact: true }).click();
  await waitScreen(page, 'shop');
  await settle(page);
  expect(guard.errors).toEqual([]);
}

/** Read "a × b = ?" and return the right and a wrong choice. */
async function gateChoices(page: Page) {
  const gate = page.locator(OPEN_MODAL).filter({ has: page.locator('.gate-q') });
  await expect(gate).toBeVisible();
  const q = await gate.locator('.gate-q').innerText();
  const m = q.match(/(\d+)\s*[×x*]\s*(\d+)/);
  expect(m, `gate question "${q}"`).not.toBeNull();
  const answer = Number(m![1]) * Number(m![2]);
  const buttons = gate.locator('.gate-a button');
  await expect(buttons).toHaveCount(4);
  const labels = await buttons.allInnerTexts();
  const right = labels.findIndex((l) => Number(l) === answer);
  const wrong = labels.findIndex((l) => Number(l) !== answer);
  expect(right, `the right answer ${answer} is offered in ${labels}`).toBeGreaterThanOrEqual(0);
  return { gate, right: buttons.nth(right), wrong: buttons.nth(wrong), answer };
}

test.describe('J3 purchases (mock store)', () => {
  test('Shop opens after the chapter-1 chest, with the Starter Pack offer', async ({ page }, info) => {
    const guard = watchErrors(page);
    await openShop(page, guard, info);
    await expect(page.locator('.offer').first()).toBeVisible();
    await expect(page.locator('.pack')).toHaveCount(4);
    await snap(page, info, guard, 'shop');
    expectNoErrors(guard);
  });

  test('gate: a wrong answer or Cancel means no purchase', async ({ page }, info) => {
    const guard = watchErrors(page);
    await openShop(page, guard, info);
    const before = await wallet(page);

    await tap(page, '.pack');
    const { gate, wrong } = await gateChoices(page);
    await snap(page, info, guard, 'gate');
    await wrong.click();
    await expect(gate).toBeHidden();
    await expectStableWallet(page, before, 'wrong answer: currency and ownership unchanged');

    await tap(page, '.pack');
    const again = await gateChoices(page);
    await again.gate.locator('button', { hasText: 'Cancel' }).click();
    await expect(again.gate).toBeHidden();
    await expectStableWallet(page, before, 'cancel: currency and ownership unchanged');
    await expect(page.locator('.toast.good')).toHaveCount(0);
    expectNoErrors(guard);
  });

  test('gate: the right answer grants exactly once; a replayed transaction is ignored', async ({ page }, info) => {
    const guard = watchErrors(page);
    await openShop(page, guard, info);
    const before = await wallet(page);

    await tap(page, '.pack'); // Handful of Gems: 80
    const { gate, right } = await gateChoices(page);
    await right.click();
    await expect(gate).toBeHidden();
    await expect.poll(async () => (await wallet(page)).gems).toBe(before.gems + 80);
    const after = await wallet(page);
    expect(after.gems, 'granted once').toBe(before.gems + 80);
    expect(after.tx.length, 'one transaction recorded').toBe(before.tx.length + 1);
    await expectStableWallet(page, after, 'purchase grants once');
    await snap(page, info, guard, 'shop-after-purchase');

    // StoreKit can redeliver a finished transaction (transactionUpdated, restore, relaunch): same txId → nothing.
    const txId = after.tx[after.tx.length - 1];
    await page.evaluate((tx) => {
      const a = (window as any).__app;
      a.grant('com.pocketplanet.game.gems80', tx);
      a.grant('com.pocketplanet.game.gems80', tx);
    }, txId);
    await expectStableWallet(page, after, 'replayed transaction ignored');

    // Two taps on Buy before the gate shows open one gate, not two purchases.
    await page.evaluate(() => {
      const a = (window as any).__app;
      a.buy('gems_s');
      a.buy('gems_s');
    });
    await expect(page.locator('.gate-q')).toHaveCount(1);
    await (await gateChoices(page)).right.click();
    await expect.poll(async () => (await wallet(page)).gems).toBe(after.gems + 80);
    const second = await wallet(page);
    expect(second.gems, 'a second, separate purchase grants once more (consumable)').toBe(after.gems + 80);
    expect(second.tx.length).toBe(after.tx.length + 1);
    await expectStableWallet(page, second, 'second purchase grants once');
    expectNoErrors(guard);
  });

  test('Starter Pack (one-time): grants once, then cannot be bought again', async ({ page }, info) => {
    const guard = watchErrors(page);
    await openShop(page, guard, info);
    const before = await wallet(page);
    expect(before.starter).toBe(false);

    await tap(page, '.offer .buy-real');
    const { gate, right } = await gateChoices(page);
    await right.click();
    await expect(gate).toBeHidden();
    await expect.poll(async () => (await wallet(page)).starter).toBe(true);
    const after = await wallet(page);
    expect(after.gems).toBe(before.gems + 300);
    for (const k of Object.keys(before.boosters)) expect(after.boosters[k], `booster ${k}`).toBe(before.boosters[k] + 5);
    expect(after.tx.length).toBe(before.tx.length + 1);
    await expectStableWallet(page, after, 'Starter Pack grants once');
    // the offer is gone from the Shop
    await expect(page.locator('.offer:not(.pass)')).toHaveCount(0);
    await snap(page, info, guard, 'shop-after-starter');

    // buying it again does nothing: no gate, no grant
    await page.evaluate(() => (window as any).__app.buy('starter'));
    await expect(page.locator('.gate-q')).toHaveCount(0);
    // …and a replay of its transaction (or a restore under a new id) grants nothing more
    await page.evaluate((tx) => (window as any).__app.grant('com.pocketplanet.game.starter', tx), after.tx[after.tx.length - 1]);
    await page.evaluate(() => (window as any).__app.grant('com.pocketplanet.game.starter', `restored-${Date.now()}`));
    const end = await wallet(page);
    expect(end.gems, 'no second Starter Pack grant, even under a new transaction id').toBe(after.gems);
    expect(end.boosters).toEqual(after.boosters);
    // the restore under a new id is recorded as processed (end.tx grows), but nothing more is granted
    await expectStableWallet(page, end, 'Starter Pack remains owned without another grant');
    expectNoErrors(guard);
  });

  test('Ask to Buy: pending, then approved or declined', async () => {
    test.skip(
      true,
      'The mock store (src/meta/iap.ts) cannot return a pending purchase. Needs a mock that resolves { pending: true } and later fires init(onTx); covered by the StoreKit matrix in the Simulator.',
    );
  });
});
