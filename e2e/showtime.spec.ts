// M6.5 "Showtime" (ROADMAP-v2 §8 M6.5): the motion kit, the living Home, celebrations, living creatures,
// the Keeper avatar creator and the chapter backdrops.
//
// 1. Screenshots mid-way through and at the end of each animation (Home, a sheet popping in, results with
//    3 stars and a new creature, a chapter chest, the Lifebook, the "You" page, planets 3/15/33/55 with their
//    chapter backdrop). Every celebration is timed from the DOM (`data-celebration` set → `celebrate-done`):
//    at most 2 s (first-ever reveals 4 s), and a tap skips it straight to its final state.
// 2. The avatar creator at 320×568 in every language: nothing clipped, controls ≥ 44 px, "Mix it up" changes
//    the Keeper, Done saves and a reload keeps it.
// 3. Reduce Motion (the Settings switch): no transform animation longer than ~200 ms, the galaxy is still.
// 4. Frame times (Chromium, 390×844): Home and a round on planet 24 while aiming, unthrottled and at 4× CPU.
// 5. Readability: the backdrop must not lower the contrast in a ring just outside the planet (3/33/55).
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BROWSER_LOCALE,
  OPEN_MODAL,
  dismissSheets,
  expectNoErrors,
  freshInstall,
  layoutViolations,
  localesToRun,
  midGame,
  settle,
  snap,
  tabSel,
  tr,
  waitScreen,
  watchErrors,
  type LocaleId,
} from './helpers';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W390 = ['chromium-390x844', 'webkit-390x844'];
const only = (info: TestInfo, projects: string[], why: string) => test.skip(!projects.includes(info.project.name), why);
/** Slow CI runners draw fewer frames: the same conditions, more patience. */
const WAIT = process.env.CI ? 45_000 : 15_000;

// ------------------------------------------------------------------ page instrumentation

interface Celebration {
  kind: string;
  start: number;
  end: number | null;
  /** 'attr' = timed from the moment celebrate() tagged its root; 'inserted' = the root joined the page later. */
  how: 'attr' | 'inserted';
}

/** Log every celebration: when `celebrate()` tags its root and when it adds `celebrate-done`. */
async function trackCelebrations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__celebs = [] as Celebration[];
    const byEl = new WeakMap<Element, Celebration>();
    const start = (el: HTMLElement, how: Celebration['how']) => {
      if (byEl.has(el)) return;
      const entry: Celebration = { kind: el.dataset.celebration ?? '', start: performance.now(), end: null, how };
      byEl.set(el, entry);
      w.__celebs.push(entry);
    };
    const check = (el: Element) => {
      const entry = byEl.get(el);
      if (entry && entry.end === null && el.classList.contains('celebrate-done')) entry.end = performance.now();
    };
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes') {
          const el = m.target as HTMLElement;
          if (m.attributeName === 'data-celebration' && el.dataset.celebration) start(el, 'attr');
          check(el);
        } else
          for (const n of m.addedNodes) {
            if (!(n instanceof HTMLElement)) continue;
            for (const el of [n, ...n.querySelectorAll<HTMLElement>('[data-celebration]')])
              if (el.dataset.celebration) {
                start(el, 'inserted');
                check(el);
              }
          }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-celebration', 'class'] });
  });
}

const celebrations = (page: Page) => page.evaluate(() => (window as any).__celebs as Celebration[]);

/** Wait for the `index`-th celebration of `kind` to start. */
async function celebrationStarted(page: Page, kind: string, index: number) {
  await page.waitForFunction(({ kind, index }) => (window as any).__celebs.filter((c: any) => c.kind === kind).length > index, {
    kind,
    index,
  });
}

/** Wait for it to finish; its length in ms. */
async function celebrationMs(page: Page, kind: string, index: number) {
  const c = await page.waitForFunction(
    ({ kind, index }) => {
      const c = (window as any).__celebs.filter((x: any) => x.kind === kind)[index];
      return c && c.end !== null ? c : null;
    },
    { kind, index },
    { timeout: WAIT },
  );
  const v = (await c.jsonValue()) as Celebration;
  return { ms: Math.round(v.end! - v.start), how: v.how };
}

/** ms since the `index`-th celebration of `kind` started. */
const sinceStart = (page: Page, kind: string, index: number) =>
  page.evaluate(
    ({ kind, index }) => Math.round(performance.now() - (window as any).__celebs.filter((x: any) => x.kind === kind)[index].start),
    { kind, index },
  );

/** Remove the journeys' animation freeze (helpers.freshInstall) so real timings run. */
async function unfreeze(page: Page) {
  const removed = await page.evaluate(() => {
    const styles = [...document.querySelectorAll('style')].filter((s) =>
      (s.textContent ?? '').includes('animation-duration:1ms!important'),
    );
    styles.forEach((s) => s.remove());
    return styles.length;
  });
  expect(removed, 'the e2e animation freeze was found and lifted').toBeGreaterThan(0);
}

async function shot(page: Page, info: TestInfo, name: string) {
  const file = info.outputPath(`${name}.png`);
  await page.screenshot({ path: file });
  await info.attach(name, { path: file, contentType: 'image/png' });
}

/** A tap with a finger at the centre of the first match (no actionability wait: it must land mid-animation). */
async function fingerTap(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} is on screen to tap`).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  return page.evaluate(() => performance.now());
}

// ------------------------------------------------------------------ rounds

/** Close any card on the round and wait until a fling is possible. */
async function readyToAim(page: Page) {
  await page.waitForFunction(
    () => {
      const s = (window as any).__app.scene;
      if (!s) return false;
      if (s.modalOpen && !s.ended) s.modalOpen.close();
      return s.canAim() && !!(window as any).__scene && s.last > 0;
    },
    null,
    { timeout: WAIT },
  );
}

async function startRound(page: Page, n: number) {
  await page.evaluate((n) => (window as any).__app.startLevel(n, { tutorial: n === 1 }), n);
  await page.waitForFunction((n) => (window as any).__app.scene?.L?.n === n, n);
  await readyToAim(page);
}

async function throwAt(page: Page, sector: number) {
  await readyToAim(page);
  await page.evaluate((sector) => {
    const w = window as any;
    w.__scene.fire(w.__scene.aimAt(sector));
  }, sector);
  await page.waitForFunction(() => !(window as any).__app.scene.shot, null, { timeout: WAIT });
}

/**
 * Make sure this round discovers a creature the player has never seen. Real throws first; if none
 * brought a newcomer, the round announces one through its own discovery path (src/ui/hud.ts `announce`).
 */
async function discoverCreature(page: Page, throws: number[]) {
  const seen0 = await page.evaluate(() => [...(window as any).__app.p.seen] as string[]);
  for (const sector of throws) {
    if (await page.evaluate(() => (window as any).__app.scene.ended || (window as any).__app.scene.throwsLeft <= 1)) break;
    await throwAt(page, sector);
  }
  const fresh = await page.evaluate((seen0) => (window as any).__app.p.seen.filter((id: string) => !seen0.includes(id)), seen0);
  if (fresh.length) return { id: fresh[0] as string, how: 'thrown' };
  const id = await page.evaluate(async () => {
    const w = window as any;
    const hud = await w.__e2eImport('/src/ui/hud.ts');
    const world = await w.__e2eImport('/src/core/world.ts');
    const s = w.__app.scene;
    const sp = world.SPECIES.find((x: any) => !s.o.seen.has(x.id) && !w.__app.p.seen.includes(x.id));
    hud.announce(s, sp.id, 0, true);
    return sp.id as string;
  });
  return { id, how: 'announced' };
}

const RESULTS = `${OPEN_MODAL}:has(.end-stars)`;

// ------------------------------------------------------------------ 1. celebrations and screens

test.describe('M6.5 Showtime: celebrations [en]', () => {
  test.use({ locale: 'en-US' });

  test('round canvas keeps its layout width through the entry zoom', async ({ page }, info) => {
    only(info, ['chromium-390x844'], 'canvas layout at 390×844');
    await freshInstall(page);
    await midGame(page, { level: 30 });
    await page.evaluate(() => (window as any).__app.startLevel(26));
    await waitScreen(page, 'level');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          width: (window as any).__scene?.w,
          client: document.querySelector<HTMLCanvasElement>('.game-canvas')?.clientWidth,
        })),
      )
      .toEqual({ width: 390, client: 390 });
  });

  test('first-ever win: 3 stars stamp, the new creature is revealed from its silhouette (≤ 4 s)', async ({ page }, info) => {
    only(info, W390, 'celebrations at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await trackCelebrations(page);
    await freshInstall(page);
    expect(await page.evaluate(() => (window as any).__app.p.stats.wins), 'a brand-new player').toBe(0);
    const found = await discoverCreature(page, [2, 8]);
    info.annotations.push({ type: 'creature', description: `first-ever reveal: ${found.id} (${found.how})` });
    await page.evaluate(() => (window as any).__app.scene.finish(3));
    await celebrationStarted(page, 'results', 0);
    const results = page.locator(RESULTS);
    await expect(results).toHaveClass(/first-win/);
    await page.waitForTimeout(700);
    const midAt = await sinceStart(page, 'results', 0);
    await shot(page, info, `results-first-win-mid-${midAt}ms`);
    const { ms, how } = await celebrationMs(page, 'results', 0);
    info.annotations.push({ type: 'celebration', description: `results (first-ever win): ${ms} ms (${how})` });
    expect(ms, 'the first-ever results show ends within 4 s').toBeLessThanOrEqual(4_000);
    await expect(results.locator('.end-stars .celebrate-star.stamped')).toHaveCount(3);
    await expect(results.locator('.celebrate-creature.revealed')).toBeVisible();
    await settle(page);
    await shot(page, info, 'results-first-win-end');
    expectNoErrors(guard);
  });

  test('results: 3 stars + new creature (≤ 2 s); a tap skips the next show to its end', async ({ page }, info) => {
    only(info, W390, 'celebrations at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await trackCelebrations(page);
    await freshInstall(page);
    await midGame(page, { level: 45 });
    const base = (await celebrations(page)).filter((c) => c.kind === 'results').length;

    // a full show
    await startRound(page, 45);
    const found = await discoverCreature(page, [3, 11]);
    info.annotations.push({ type: 'creature', description: `reveal: ${found.id} (${found.how})` });
    await page.evaluate(() => (window as any).__app.scene.finish(3));
    await celebrationStarted(page, 'results', base);
    const results = page.locator(RESULTS);
    await expect(results).not.toHaveClass(/first-win/);
    await page.waitForTimeout(500);
    const midAt = await sinceStart(page, 'results', base);
    await shot(page, info, `results-3stars-creature-mid-${midAt}ms`);
    const full = await celebrationMs(page, 'results', base);
    info.annotations.push({ type: 'celebration', description: `results with a new creature: ${full.ms} ms (${full.how})` });
    expect(full.ms, 'the results show ends within 2 s').toBeLessThanOrEqual(2_000);
    await expect(results.locator('.end-stars .celebrate-star.stamped')).toHaveCount(3);
    await expect(results.locator('.celebrate-creature.revealed')).toBeVisible();
    await settle(page);
    await shot(page, info, 'results-3stars-creature-end');
    await results.getByRole('button', { name: 'Galaxy', exact: true }).click();
    await waitScreen(page, 'home');
    await settle(page);

    // the next one, tapped right away
    await startRound(page, 46);
    await discoverCreature(page, [5]);
    const rewards = await page.evaluate(() => ({ dust: (window as any).__app.p.dust }));
    await page.evaluate(() => (window as any).__app.scene.finish(3));
    await celebrationStarted(page, 'results', base + 1);
    await page.waitForTimeout(150);
    const tapAt = await fingerTap(page, `${RESULTS} .m-title`);
    const skipped = await celebrationMs(page, 'results', base + 1);
    const doneAfterTap = await page.evaluate(
      ({ base, tapAt }) => Math.round((window as any).__celebs.filter((c: any) => c.kind === 'results')[base + 1].end - tapAt),
      { base, tapAt },
    );
    info.annotations.push({
      type: 'celebration',
      description: `results skipped by a tap: ${skipped.ms} ms in total, done ${doneAfterTap} ms after the tap`,
    });
    expect(skipped.ms, 'a tap ends the show early').toBeLessThan(full.ms);
    expect(doneAfterTap, 'the show ends on the tap').toBeLessThanOrEqual(100);
    // the final state, nothing lost: every star, the creature, the full rewards
    await expect(results.locator('.end-stars .celebrate-star.stamped')).toHaveCount(3);
    await expect(results.locator('.celebrate-creature.revealed')).toBeVisible();
    const gained = await page.evaluate((d) => (window as any).__app.p.dust - d, rewards.dust);
    expect(gained, 'the round paid stardust').toBeGreaterThan(0);
    await expect(results.locator('.rewards b').first()).toHaveText(/^✨ [\d,]+$/);
    await expect(results.locator('.rewards b').first()).not.toHaveText('✨ 0');
    await settle(page);
    await shot(page, info, 'results-skipped-by-tap');
    expectNoErrors(guard);
  });

  test('chapter chest: the first opens item by item (≤ 4 s), the next is skipped by a tap', async ({ page }, info) => {
    only(info, W390, 'celebrations at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await trackCelebrations(page);
    await freshInstall(page);
    await midGame(page, { level: 45, claimables: true });
    await page.evaluate(() => (window as any).__app.showStarMap());
    await waitScreen(page, 'map');
    await dismissSheets(page);

    await page.locator('.host .chest-btn').first().click();
    await celebrationStarted(page, 'chest', 0);
    const sheet = page.locator(`${OPEN_MODAL}:has(.celebrate-chest)`);
    await page.waitForTimeout(550);
    const midAt = await sinceStart(page, 'chest', 0);
    await shot(page, info, `chest-first-mid-${midAt}ms`);
    const first = await celebrationMs(page, 'chest', 0);
    info.annotations.push({ type: 'celebration', description: `first chapter chest: ${first.ms} ms (${first.how})` });
    expect(first.ms, 'the first-ever chest ends within 4 s').toBeLessThanOrEqual(4_000);
    await expect(sheet.locator('.celebrate-chest.opened')).toHaveCount(1);
    const items = await sheet.locator('.celebrate-item').count();
    expect(items, 'the chest shows its contents').toBeGreaterThan(0);
    await expect(sheet.locator('.celebrate-item.shown')).toHaveCount(items);
    await settle(page);
    await shot(page, info, 'chest-first-end');
    await sheet.getByRole('button', { name: 'Awesome', exact: true }).click();
    await settle(page);

    await page.locator('.host .chest-btn').first().click();
    await celebrationStarted(page, 'chest', 1);
    await page.waitForTimeout(120);
    const tapAt = await fingerTap(page, `${OPEN_MODAL}:has(.celebrate-chest) .m-title`);
    const second = await celebrationMs(page, 'chest', 1);
    const doneAfterTap = await page.evaluate(
      (tapAt) => Math.round((window as any).__celebs.filter((c: any) => c.kind === 'chest')[1].end - tapAt),
      tapAt,
    );
    info.annotations.push({
      type: 'celebration',
      description: `second chest skipped by a tap: ${second.ms} ms, done ${doneAfterTap} ms after the tap`,
    });
    expect(doneAfterTap, 'the chest show ends on the tap').toBeLessThanOrEqual(100);
    const sheet2 = page.locator(`${OPEN_MODAL}:has(.celebrate-chest)`);
    await expect(sheet2.locator('.celebrate-chest.opened')).toHaveCount(1);
    const items2 = await sheet2.locator('.celebrate-item').count();
    await expect(sheet2.locator('.celebrate-item.shown'), 'every item is shown after a skip').toHaveCount(items2);
    await settle(page);
    await shot(page, info, 'chest-second-skipped');
    expectNoErrors(guard);
  });

  test('Passport title unfurls (≤ 2 s, skippable) and the festival costume curtain opens (≤ 2 s)', async ({ page }, info) => {
    only(info, W390, 'celebrations at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await trackCelebrations(page);
    await freshInstall(page);
    await midGame(page, { level: 45 });

    await page.evaluate(() => (window as any).__app.showPassport());
    await waitScreen(page, 'passport');
    await celebrationStarted(page, 'passport', 0);
    const pass = await celebrationMs(page, 'passport', 0);
    info.annotations.push({ type: 'celebration', description: `Passport title unfurl: ${pass.ms} ms (${pass.how})` });
    expect(pass.ms).toBeLessThanOrEqual(2_000);
    await expect(page.locator('.host .pp-title.unfurled')).toHaveCount(1);
    await settle(page);
    await shot(page, info, 'passport-title-end');

    await page.evaluate(() => (window as any).__app.showHome());
    await waitScreen(page, 'home');
    await settle(page);
    await page.evaluate(() => (window as any).__app.showPassport());
    await celebrationStarted(page, 'passport', 1);
    const tapAt = await fingerTap(page, '.host .pp-title');
    await celebrationMs(page, 'passport', 1);
    const doneAfterTap = await page.evaluate(
      (tapAt) => Math.round((window as any).__celebs.filter((c: any) => c.kind === 'passport')[1].end - tapAt),
      tapAt,
    );
    info.annotations.push({ type: 'celebration', description: `Passport unfurl skipped: done ${doneAfterTap} ms after the tap` });
    expect(doneAfterTap).toBeLessThanOrEqual(100);
    await expect(page.locator('.host .pp-title.unfurled')).toHaveCount(1);
    await dismissSheets(page);

    // festival: spot enough costumed critters, then claim tiers until the costume curtain plays
    await page.evaluate(() => (window as any).__app.showHome());
    await waitScreen(page, 'home');
    await settle(page);
    const festivalOpen = await page.evaluate(async () => {
      const w = window as any;
      const fest = await w.__e2eImport('/src/meta/festivals.ts');
      if (!fest.festivalActive(w.__app.p)) return false;
      fest.ensureFestival(w.__app.p);
      w.__app.p.festival.spotted = 9999;
      w.__app.festival();
      return true;
    });
    expect(festivalOpen, 'the festival is open at level 45').toBe(true);
    const festSheet = page.locator(OPEN_MODAL).last();
    for (let i = 0; i < 8; i++) {
      if ((await celebrations(page)).some((c) => c.kind === 'costume')) break;
      const claim = festSheet.getByRole('button', { name: 'Claim', exact: true }).first();
      if (!(await claim.count())) break;
      await claim.click();
    }
    await celebrationStarted(page, 'costume', 0);
    await page.waitForTimeout(300);
    await shot(page, info, 'festival-curtain-mid');
    const costume = await celebrationMs(page, 'costume', 0);
    info.annotations.push({ type: 'celebration', description: `festival costume curtain: ${costume.ms} ms (${costume.how})` });
    expect(costume.ms).toBeLessThanOrEqual(2_000);
    await expect(page.locator('.celebrate-curtain.open')).toHaveCount(1);
    await settle(page);
    await shot(page, info, 'festival-curtain-end');
    expectNoErrors(guard);
  });

  test('Home comes alive, a sheet pops in, the Lifebook: all 36 creatures animate', async ({ page }, info) => {
    only(info, W390, 'screens at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 45 });

    // Home: the galaxy moves (planets orbit, the Keeper waves)
    const galaxy = page.locator('.host canvas.galaxy');
    await expect(galaxy).toBeVisible();
    const frameA = await galaxy.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await shot(page, info, 'home-mid');
    await page.waitForTimeout(1_500);
    const frameB = await galaxy.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    expect(frameB !== frameA, 'the galaxy on Home animates').toBe(true);
    await expect(page.locator('.host .menu-particles i').first()).toBeAttached();
    await snap(page, info, guard, 'home-end');

    // a sheet pops in with the motion kit's spring (scale .84 → 1, 360 ms), not bare
    await page.locator('.topbar button[aria-label="Settings"]').click();
    const box = page.locator(OPEN_MODAL).last();
    const pop = await box.evaluate((el) =>
      el.getAnimations().map((a) => ({
        frames: (a.effect as KeyframeEffect).getKeyframes().map((k) => String(k.transform ?? '')),
        ms: Number(a.effect?.getTiming().duration),
      })),
    );
    await shot(page, info, 'sheet-popin-mid');
    expect(
      pop.some((a) => a.frames.some((f) => f.includes('scale(0.84)')) && a.ms === 360),
      JSON.stringify(pop),
    ).toBe(true);
    await settle(page);
    await shot(page, info, 'sheet-popin-end');
    await dismissSheets(page);

    // Lifebook: every creature met; each portrait moves while on screen
    const total = await page.evaluate(async () => {
      const w = window as any;
      const world = await w.__e2eImport('/src/core/world.ts');
      for (const s of world.SPECIES) if (!w.__app.p.seen.includes(s.id)) w.__app.p.seen.push(s.id);
      w.__app.showLifebook();
      return world.SPECIES.length as number;
    });
    await waitScreen(page, 'lifebook');
    await settle(page);
    await shot(page, info, 'lifebook');
    const portraits = page.locator('.host .lb .lbe canvas');
    await expect(portraits).toHaveCount(total);
    const still: string[] = [];
    for (let i = 0; i < total; i++) {
      const c = portraits.nth(i);
      await c.scrollIntoViewIfNeeded();
      const a = await c.evaluate((el: HTMLCanvasElement) => el.toDataURL());
      await page.waitForTimeout(220);
      const b = await c.evaluate((el: HTMLCanvasElement) => el.toDataURL());
      if (a === b) still.push((await c.evaluate((el) => el.closest('.lb')?.querySelector('.lbn')?.textContent)) ?? `#${i}`);
    }
    info.annotations.push({
      type: 'lifebook',
      description: `${total - still.length}/${total} portraits animate; still: ${still.join(', ') || '-'}`,
    });
    expect(still, 'every creature in the Lifebook animates').toEqual([]);
    await page.locator('.host .lb').first().click();
    await settle(page);
    await page.waitForTimeout(250);
    await shot(page, info, 'lifebook-card-wave');
    await dismissSheets(page);
    expectNoErrors(guard);
  });

  test('chapter backdrops behind planets 3, 15, 33 and 55; readable rim (contrast ring)', async ({ page }, info) => {
    only(info, W390, 'screens at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 60 });
    const report: string[] = [];
    for (const n of [3, 15, 33, 55]) {
      await page.evaluate((n) => (window as any).__app.startLevel(n), n);
      await page.waitForFunction((n) => (window as any).__app.scene?.L?.n === n, n);
      if (n === 3) {
        await page.waitForTimeout(150);
        await shot(page, info, 'planet-03-zoom-mid');
      }
      await readyToAim(page);
      await settle(page);
      await page.waitForTimeout(400);
      await shot(page, info, `planet-${String(n).padStart(2, '0')}-backdrop`);
      if (n === 15 || info.project.name !== 'chromium-390x844') continue;
      const ring = await rimContrast(page);
      report.push(
        `planet ${n} (chapter ${ring.chapter}): min ${ring.withBackdrop.min.toFixed(2)}:1 (p10 ${ring.withBackdrop.p10.toFixed(2)}, median ${ring.withBackdrop.median.toFixed(2)}) with the backdrop vs min ${ring.without.min.toFixed(2)}:1 (p10 ${ring.without.p10.toFixed(2)}) without; ring luminance +${ring.ringLumaShift.mean.toFixed(4)} mean / +${ring.ringLumaShift.max.toFixed(4)} max; ${ring.anglesLower}/${ring.angles} angles lose contrast, worst ${ring.worstDrop.toFixed(1)}%`,
      );
      // the backdrop must not lower the worst-case contrast at the rim (a 2% allowance for anti-aliasing noise);
      // the per-angle and 10th-percentile changes are reported above
      expect
        .soft(ring.withBackdrop.min, `planet ${n}: minimum rim contrast with the backdrop`)
        .toBeGreaterThanOrEqual(ring.without.min * 0.98);
    }
    if (report.length) info.annotations.push({ type: 'rim-contrast', description: report.join(' | ') });
    expectNoErrors(guard);
  });
});

/**
 * Relative-luminance contrast between the planet's lands (a band inside the rim) and the sky in a ring just
 * outside it (1.10-1.22 R), angle by angle, for the same frame drawn with and without the chapter backdrop.
 */
function rimContrast(page: Page) {
  return page.evaluate(async () => {
    const w = window as any;
    const fx = await w.__e2eImport('/src/ui/fx.ts');
    const s = w.__app.scene;
    const c: HTMLCanvasElement = s.canvas;
    const k = c.width / s.w;
    const lin = (v: number) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const wasPaused = s.paused;
    s.paused = true; // freeze round time between the two draws
    const grab = () => {
      s.draw();
      const img = s.g.getImageData(0, 0, c.width, c.height);
      return (x: number, y: number) => {
        const px = Math.round(x * k);
        const py = Math.round(y * k);
        const i = (py * c.width + px) * 4;
        return 0.2126 * lin(img.data[i]) + 0.7152 * lin(img.data[i + 1]) + 0.0722 * lin(img.data[i + 2]);
      };
    };
    const withBackdrop = grab();
    s.drawPlanet = function () {
      return fx.drawPlanet(this);
    };
    const without = grab();
    delete s.drawPlanet;
    s.draw();
    s.paused = wasPaused;
    const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const at = (lum: (x: number, y: number) => number, a: number, rs: number[]) =>
      median(rs.map((r) => lum(s.cx + Math.cos(a) * r * s.R, s.cy + Math.sin(a) * r * s.R)));
    const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const inside = [0.7, 0.76, 0.82, 0.88];
    const outside = [1.1, 1.14, 1.18, 1.22];
    const rows: { with: number; without: number; shift: number }[] = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const a = (deg * Math.PI) / 180;
      const land = at(withBackdrop, a, inside);
      const ringWith = at(withBackdrop, a, outside);
      const ringWithout = at(without, a, outside);
      rows.push({ with: ratio(land, ringWith), without: ratio(at(without, a, inside), ringWithout), shift: ringWith - ringWithout });
    }
    const stats = (v: number[]) => {
      const sorted = [...v].sort((x, y) => x - y);
      return { min: sorted[0], p10: sorted[Math.floor(sorted.length * 0.1)], median: sorted[Math.floor(sorted.length / 2)] };
    };
    const drops = rows.map((r) => (r.without - r.with) / r.without);
    return {
      chapter: s.chapterNumber as number,
      angles: rows.length,
      withBackdrop: stats(rows.map((r) => r.with)),
      without: stats(rows.map((r) => r.without)),
      ringLumaShift: { mean: rows.reduce((t, r) => t + r.shift, 0) / rows.length, max: Math.max(...rows.map((r) => r.shift)) },
      anglesLower: drops.filter((d) => d > 0.02).length,
      worstDrop: Math.max(0, ...drops) * 100,
    };
  });
}

// ------------------------------------------------------------------ 2. the avatar creator, every language

const keysFile = (name: string) => fileURLToPath(new URL(`../src/locales/${name}.json`, import.meta.url));
const AVATAR_GROUPS = ['Face', 'Skin tone', 'Hair', 'Hair colour', 'Eyes', 'Expression'];

for (const loc of localesToRun()) {
  test.describe(`M6.5 avatar creator at 320×568 [${loc}]`, () => {
    test.use({ locale: BROWSER_LOCALE[loc] });

    test('fits, ≥ 44 px controls, Mix it up changes it, Done saves across a reload', async ({ page }, info) => {
      only(info, ['chromium-320x568'], 'the avatar creator is checked at 320×568');
      const guard = watchErrors(page);
      await freshInstall(page, { pseudo: loc === 'pseudo' });
      await midGame(page, { level: 45 });
      await openYou(page, loc);
      await snap(page, info, guard, `you-${loc}`);

      // nothing off screen, clipped or cut inside the creator (a sideways-scrolling row counts as off screen,
      // like everywhere else in the journeys: a child at 320 px does not see what is past the edge)
      const bad = (await layoutViolations(page)).filter((v) => v.kind !== 'tap-target' && /avatar/.test(v.what));
      expect.soft(bad, `avatar creator layout at 320×568 [${loc}]`).toEqual([]);
      // every control of the creator (and the tab that opens it) is at least 44×44
      const youTab = tr(loc, 'You');
      const small = await page.evaluate((youTab) => {
        const controls = [
          ...document.querySelectorAll('.host .avatar-panel button'),
          ...[...document.querySelectorAll('.host .tabs .tab')].filter((b) => b.textContent?.trim() === youTab),
        ];
        return controls
          .map((b) => ({
            what: `${b.className} "${(b.textContent || b.getAttribute('aria-label') || '').trim()}"`,
            r: b.getBoundingClientRect(),
          }))
          .filter(({ r }) => r.width < 44 || r.height < 44)
          .map(({ what, r }) => `${what} ${r.width.toFixed(1)}×${r.height.toFixed(1)}`);
      }, youTab);
      expect.soft(small, 'avatar controls are at least 44×44').toEqual([]);

      // every group label is translated (a key in this language's dictionary)
      if (loc !== 'en' && loc !== 'pseudo') {
        const dictionary = JSON.parse(readFileSync(keysFile(loc), 'utf8')) as Record<string, string>;
        const missing = AVATAR_GROUPS.filter((k) => !dictionary[k]);
        expect.soft(missing, `avatar group labels without a ${loc} translation (shown in English)`).toEqual([]);
      }
      const labels = await page.locator('.host .avatar-group > b').allInnerTexts();
      expect(labels).toEqual(AVATAR_GROUPS.map((k) => tr(loc, k)));

      // Mix it up changes the choice
      const before = await chosen(page);
      let after = before;
      for (let i = 0; i < 4 && JSON.stringify(after) === JSON.stringify(before); i++) {
        await page.locator('.host .avatar-actions button').first().click();
        after = await chosen(page);
      }
      expect(after, 'Mix it up picks a different Keeper').not.toEqual(before);
      expect(
        Object.values(after).every((v) => v !== null),
        'one option chosen in each group',
      ).toBe(true);
      await shot(page, info, `you-${loc}-mixed`);

      // Done saves; a reload keeps it
      await page.locator('.host .avatar-actions button.primary').click();
      await page.waitForFunction((want) => JSON.stringify((window as any).__app.p.avatar) === want, JSON.stringify(after));
      await page.waitForTimeout(500);
      await page.reload();
      await page.waitForFunction(() => !!(window as any).__app?.p && !!document.querySelector('.host > .screen'));
      expect(await page.evaluate(() => (window as any).__app.p.avatar), 'the Keeper survives a reload').toEqual(after);
      await dismissSheets(page);
      await openYou(page, loc);
      expect(await chosen(page), 'the creator opens on the saved Keeper').toEqual(after);
      expectNoErrors(guard);
    });
  });
}

async function openYou(page: Page, loc: LocaleId) {
  await page.locator(tabSel('styles')).click();
  await waitScreen(page, 'styles');
  await dismissSheets(page);
  await page
    .locator('.host .tabs')
    .getByRole('button', { name: tr(loc, 'You'), exact: true })
    .click();
  await expect(page.locator('.host .avatar-panel')).toBeVisible();
  await settle(page);
}

/** The option chosen in each group, as the profile stores it. */
function chosen(page: Page) {
  return page.evaluate(async () => {
    const cos = await (window as any).__e2eImport('/src/meta/cosmetics.ts');
    const keys = ['face', 'skin', 'hair', 'hairColor', 'eyes', 'expression'];
    const out: Record<string, number | string | null> = {};
    document.querySelectorAll('.host .avatar-group').forEach((g, gi) => {
      const i = [...g.querySelectorAll('.avatar-option')].findIndex((b) => b.classList.contains('on'));
      out[keys[gi]] = i < 0 ? null : keys[gi] === 'expression' ? cos.EXPRESSIONS[i] : i;
    });
    return out;
  });
}

// ------------------------------------------------------------------ 3. Reduce Motion

test.describe('M6.5 Reduce Motion [en]', () => {
  test.use({ locale: 'en-US' });

  test('the Settings switch: a sheet, Home and a results show only fade; the galaxy is still', async ({ page }, info) => {
    only(info, W390, 'Reduce Motion at 390×844 (chromium and webkit)');
    const guard = watchErrors(page);
    await trackCelebrations(page);
    await freshInstall(page);
    await midGame(page, { level: 45 });
    await unfreeze(page);

    await page.locator('.topbar button[aria-label="Settings"]').click();
    const toggle = page.locator(OPEN_MODAL).getByRole('switch', { name: 'Reduce motion' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await page.mouse.click(3, 3);
    await page.waitForTimeout(400);

    await startAnimationLog(page);
    // a sheet
    await page.locator('.topbar button[aria-label="Settings"]').click();
    await page.waitForTimeout(600);
    await page.mouse.click(3, 3);
    await page.waitForTimeout(400);
    // Home, arrived at through a tab change
    await page.locator(tabSel('missions')).click();
    await waitScreen(page, 'missions');
    await page.waitForTimeout(500);
    await dismissSheetsQuick(page);
    await page.locator(tabSel('home')).click();
    await waitScreen(page, 'home');
    await page.waitForTimeout(700);
    const galaxy = page.locator('.host canvas.galaxy');
    const g1 = await galaxy.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page.waitForTimeout(1_200);
    const g2 = await galaxy.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    expect(g2 === g1, 'with Reduce Motion the galaxy does not orbit (a still picture)').toBe(true);
    await shot(page, info, 'reduce-motion-home');
    // a results show
    const base = (await celebrations(page)).filter((c) => c.kind === 'results').length;
    await startRound(page, 45);
    await discoverCreature(page, []);
    await page.evaluate(() => (window as any).__app.scene.finish(3));
    await celebrationStarted(page, 'results', base);
    const res = await celebrationMs(page, 'results', base);
    info.annotations.push({ type: 'reduce-motion', description: `results show with Reduce Motion: ${res.ms} ms` });
    expect(res.ms, 'the calm results show is short').toBeLessThanOrEqual(400);
    await page.waitForTimeout(800);
    await shot(page, info, 'reduce-motion-results');
    await expect(page.locator(`${RESULTS} .end-stars .celebrate-star.stamped`)).toHaveCount(3);

    const log = await stopAnimationLog(page);
    const moving = log.filter((a) => a.transform && a.ms > 200);
    info.annotations.push({
      type: 'reduce-motion',
      description: `${log.length} animations seen; longest: ${[...log]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 5)
        .map((a) => `${a.what} ${a.name} ${a.ms}ms${a.transform ? ' (transform)' : ''}`)
        .join(' | ')}`,
    });
    expect(moving, 'no transform animation longer than 200 ms with Reduce Motion').toEqual([]);
    expectNoErrors(guard);
  });
});

async function dismissSheetsQuick(page: Page) {
  for (let i = 0; i < 3 && (await page.locator(OPEN_MODAL).count()); i++) {
    await page.mouse.click(3, 3);
    await page.waitForTimeout(250);
  }
}

interface AnimSeen {
  what: string;
  name: string;
  ms: number;
  transform: boolean;
}

/** Every animation that runs (CSS animations and transitions, Web Animations), sampled each frame. */
async function startAnimationLog(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    const seen = new WeakSet<Animation>();
    w.__animLog = [] as AnimSeen[];
    w.__animLogOn = true;
    const identity = (v: string) => !v || v === 'none' || /^(scale\(1\)|translate[XY]?\(0(px)?\)|rotate\(0(deg)?\)|\s)+$/.test(v);
    const tick = () => {
      for (const a of document.getAnimations()) {
        if (seen.has(a) || a.playState !== 'running') continue;
        seen.add(a);
        const effect = a.effect as KeyframeEffect | null;
        const frames = effect?.getKeyframes() ?? [];
        const transform = frames.some((f) =>
          ['transform', 'translate', 'scale', 'rotate'].some((p) => typeof f[p] === 'string' && !identity(String(f[p]))),
        );
        const target = effect?.target as Element | null;
        const name =
          (a as any).animationName ?? ((a as any).transitionProperty ? `transition:${(a as any).transitionProperty}` : 'animate()');
        w.__animLog.push({
          what: target ? `${target.tagName.toLowerCase()}.${String(target.className).trim().split(/\s+/).join('.')}` : '?',
          name,
          ms: Math.round(Number(effect?.getComputedTiming().activeDuration ?? 0)),
          transform,
        });
      }
      if (w.__animLogOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function stopAnimationLog(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.__animLogOn = false;
    return w.__animLog as AnimSeen[];
  });
}

// ------------------------------------------------------------------ 4. frame times

interface Frames {
  n: number;
  p50: number;
  p95: number;
  max: number;
}

/** rAF-to-rAF intervals for `ms` (the first interval is dropped). */
function recordFrames(page: Page, ms: number) {
  return page.evaluate(
    (ms) =>
      new Promise<Frames>((resolve) => {
        const d: number[] = [];
        let last = 0;
        let t0 = 0;
        const f = (now: number) => {
          if (!t0) t0 = now;
          else d.push(now - last);
          last = now;
          if (now - t0 < ms) requestAnimationFrame(f);
          else {
            const s = d.slice(1).sort((a, b) => a - b);
            const q = (p: number) => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
            resolve({ n: s.length, p50: q(0.5), p95: q(0.95), max: +s[s.length - 1].toFixed(1) });
          }
        };
        requestAnimationFrame(f);
      }),
    ms,
  );
}

/** Hold a pull on the launcher and move it about (aiming) while frames are recorded. */
async function aimWhileRecording(page: Page, ms: number) {
  const { x, y } = await page.evaluate(() => {
    const s = (window as any).__app.scene;
    const r = s.canvas.getBoundingClientRect();
    return { x: r.left + s.launch.x, y: r.top + s.launch.y };
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  const frames = recordFrames(page, ms);
  const t0 = Date.now();
  let aiming = false;
  for (let i = 0; Date.now() - t0 < ms; i++) {
    const a = i * 0.25;
    await page.mouse.move(x + Math.cos(a) * 30, y + 40 + Math.sin(a) * 15);
    if (i === 3) aiming = await page.evaluate(() => (window as any).__app.scene.aimPointer !== null);
    await page.waitForTimeout(50);
  }
  const out = await frames;
  // let go well away from a throw: back on the launcher (a pull too short to fling)
  await page.mouse.move(x, y);
  await page.mouse.up();
  return { ...out, aiming };
}

test.describe('M6.5 frame times [en]', () => {
  test.use({ locale: 'en-US' });

  test('Home and planet 24 while aiming, 5 s each, unthrottled and at 4× CPU', async ({ page }, info) => {
    only(info, ['chromium-390x844'], 'CPU throttling needs Chromium (CDP)');
    test.setTimeout(120_000);
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 30 });
    await unfreeze(page);
    const cdp = await page.context().newCDPSession(page);
    const rows: string[] = [];
    const results: Record<string, Frames & { aiming?: boolean }> = {};
    for (const rate of [1, 4]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.evaluate(() => (window as any).__app.showHome());
      await waitScreen(page, 'home');
      await page.waitForTimeout(800);
      const home = await recordFrames(page, 5_000);
      results[`home@${rate}x`] = home;
      await startRound(page, 24);
      await page.waitForTimeout(600);
      const round = await aimWhileRecording(page, 5_000);
      results[`planet24-aiming@${rate}x`] = round;
      expect(round.aiming, 'the pull was held on the launcher (aiming)').toBe(true);
      await page.evaluate(() => {
        const s = (window as any).__app.scene;
        s.aimFrom = s.aimTo = null;
      });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    for (const [k, v] of Object.entries(results)) rows.push(`${k}: p50 ${v.p50} ms, p95 ${v.p95} ms, max ${v.max} ms (${v.n} frames)`);
    info.annotations.push({ type: 'frame-times', description: rows.join(' | ') });
    await info.attach('frame-times.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    // target: p95 ≤ 16.7 ms unthrottled (a 60 Hz frame; +0.5 ms for rAF timestamp jitter)
    // Shared CI runners have no GPU and software-render the canvas: report the numbers there, gate them locally.
    if (!process.env.CI) {
      expect.soft(results['home@1x'].p95, 'Home p95 frame time (unthrottled)').toBeLessThanOrEqual(17.2);
      expect.soft(results['planet24-aiming@1x'].p95, 'planet 24 aiming p95 frame time (unthrottled)').toBeLessThanOrEqual(17.2);
    }
    expectNoErrors(guard);
  });
});
