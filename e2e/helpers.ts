// Shared helpers for the Playwright journeys (ROADMAP-v2 section 7.7).
// The game is driven through `window.__app` (see docs/handoff/03-architecture.md).
import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { earlierRoundIntroIds } from '../src/meta/coach';

// ------------------------------------------------------------------ locales

export type LocaleId = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'pseudo';
/** Browser locale per game language (src/i18n.ts detects the language from navigator.language). */
export const BROWSER_LOCALE: Record<LocaleId, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ja: 'ja-JP',
  // The in-app pseudo language starts from an English browser locale.
  pseudo: 'en-US',
};
export const ALL_LOCALES: LocaleId[] = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'pseudo'];

/** Fix wall time before creating a profile so Vault fuel and build timers are deterministic. */
export async function installJourneyClock(page: Page, at = '2026-10-06T12:00:00.000Z') {
  await page.clock.install({ time: new Date(at) });
}

/** `LOCALE=ja,pseudo npx playwright test` narrows the matrix. */
export function localesToRun(): LocaleId[] {
  const env = process.env.LOCALE?.trim();
  if (!env) return ALL_LOCALES;
  const want = env.split(',').map((s) => s.trim()) as LocaleId[];
  return ALL_LOCALES.filter((l) => want.includes(l));
}

const localeFile = (name: string) => fileURLToPath(new URL(`../src/locales/${name}.json`, import.meta.url));
const dictCache: Partial<Record<string, Record<string, string>>> = {};
function dict(name: string): Record<string, string> {
  return (dictCache[name] ??= JSON.parse(readFileSync(localeFile(name), 'utf8')));
}

/** Every English key the game translates. */
export function englishKeys(): string[] {
  return JSON.parse(readFileSync(localeFile('_keys'), 'utf8'));
}

/** Match the dev-only pseudo language in src/i18n.ts for journey assertions. */
export function pseudo(s: string): string {
  const map: Record<string, string> = {
    a: 'å',
    b: 'ƀ',
    d: 'đ',
    e: 'ë',
    f: 'ƒ',
    g: 'ğ',
    h: 'ħ',
    i: 'ï',
    j: 'ĵ',
    k: 'ķ',
    l: 'ļ',
    m: 'ɱ',
    o: 'ö',
    p: 'ƥ',
    q: 'ʠ',
    r: 'ř',
    s: 'š',
    t: 'ŧ',
    u: 'ü',
    v: 'ṽ',
    w: 'ŵ',
    x: 'ẋ',
    y: 'ý',
    z: 'ž',
    c: 'ç',
    n: 'ñ',
  };
  const parts = s.split(/(\{[^{}]+\})/g);
  const letters = parts.map((part) => (part.startsWith('{') && part.endsWith('}') ? '' : part)).join('');
  const expanded = parts
    .map((part) =>
      part.startsWith('{') && part.endsWith('}')
        ? part
        : part.replace(/[a-z]/gi, (char) => {
            const accent = map[char.toLowerCase()];
            return char === char.toUpperCase() ? accent.toUpperCase() : accent;
          }),
    )
    .join('');
  return `[${expanded} ${'~'.repeat(Math.max(1, Math.ceil(letters.length * 0.4)))}]`;
}

/** What the game shows for an English key in a given locale (falls back to English like src/i18n.ts). */
export function tr(locale: LocaleId, key: string, vars: Record<string, string | number> = {}): string {
  let s = locale === 'pseudo' ? pseudo(key) : locale === 'en' ? key : (dict(locale)[key] ?? key);
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// ------------------------------------------------------------------ app lifecycle

export interface Guard {
  errors: string[];
}

/**
 * Collect page errors and console errors. Call `expectNoErrors` at the end of a test
 * (and it is checked on every `snap`).
 */
export function watchErrors(page: Page): Guard {
  const guard: Guard = { errors: [] };
  page.on('pageerror', (e) => guard.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') guard.errors.push(`console.error: ${m.text()}`);
  });
  return guard;
}

export function expectNoErrors(guard: Guard) {
  expect(guard.errors, 'page errors / console errors').toEqual([]);
}

/** One modal that appeared during a journey (recorded in the page by `freshInstall`). */
export interface ModalSeen {
  /** ms since navigation start */
  t: number;
  screen: string;
  level: number;
  planet: number | null;
  /** Home had been shown before this modal appeared. */
  afterHome: boolean;
  /** 'results' = a round's end/results sheet (part of the flow); 'popup' = anything that interrupts. */
  kind: 'results' | 'popup';
  title: string;
  cls: string;
}

export interface Install {
  /** The first-launch title beat (".first-title") appeared. */
  titleShown: boolean;
  /** How long the title beat stayed on screen, in ms (0 if it never showed). */
  titleMs: number;
  /** ms from navigation start until planet 1 accepted a fling (null if the app opened on Home). */
  flingReadyMs: number | null;
}

/**
 * Fresh install: clear storage once before the app's first script runs, keep the
 * Vite HMR socket closed (developers editing src/ must not reload the page mid-journey),
 * and freeze CSS animations so buttons are stable and boxes measure at rest.
 *
 * The first launch opens on the title beat (M3 3.1). `title: 'tap'` (default) taps "Tap to start"
 * like an eager child; `title: 'wait'` lets it auto-advance (~4.5 s) to time the first fling.
 * Every modal the page opens is logged (see `modalsSeen`).
 */
export async function freshInstall(page: Page, opts: { pseudo?: boolean; title?: 'tap' | 'wait' } = {}): Promise<Install> {
  await page.routeWebSocket(/^wss?:\/\//, () => {
    /* mocked, never connected: no hot reloads during a journey */
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__e2e_fresh')) {
      localStorage.clear();
      sessionStorage.setItem('__e2e_fresh', '1');
    }
    const still = () => {
      const s = document.createElement('style');
      s.textContent =
        '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important}';
      document.head.append(s);
    };
    if (document.head) still();
    else document.addEventListener('DOMContentLoaded', still);
    // Log every modal (and the first Home view) so journeys can count interruptions.
    const w = window as any;
    // Import an app module as the SAME instance the app runs: after Vite invalidates a file (e.g. a
    // translator saving src/locales), the app's imports carry "?t=…" and a bare "/src/…" import would
    // load a second, unmounted copy. Reuse the URL the page actually loaded.
    performance.setResourceTimingBufferSize?.(10_000);
    w.__e2eImport = (path: string) => {
      const loaded = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((n) => new URL(n).pathname === path)
        .pop();
      return import(/* @vite-ignore */ loaded ?? path);
    };
    w.__e2eModals = [];
    w.__e2eHomeAt = null;
    w.__e2eTitle = { shownAt: null, goneAt: null };
    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.removedNodes)
          if (n instanceof HTMLElement && n.matches('.first-title') && w.__e2eTitle.goneAt === null)
            w.__e2eTitle.goneAt = Math.round(performance.now());
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          if (n.matches('.first-title') && w.__e2eTitle.shownAt === null) w.__e2eTitle.shownAt = Math.round(performance.now());
          if (n.matches('.screen.home') && w.__e2eHomeAt === null) w.__e2eHomeAt = performance.now();
          const box = n.matches('.scrim') ? n.querySelector('.modal') : null;
          if (!box) continue;
          const a = w.__app;
          w.__e2eModals.push({
            t: Math.round(performance.now()),
            screen: a?.screen ?? '',
            level: a?.p?.level ?? 0,
            planet: a?.scene?.L?.n ?? null,
            afterHome: w.__e2eHomeAt !== null,
            kind: box.querySelector('.end-stars') ? 'results' : 'popup',
            title: (box.querySelector('.m-title, .end-title')?.textContent ?? box.textContent ?? '').trim().slice(0, 60),
            cls: box.className,
          });
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await page.waitForFunction(() => {
    const a = (window as any).__app;
    // the first screen is mounted (App.screen starts as 'home' before init mounts anything)
    return !!a?.p && !!document.querySelector('.host > .screen');
  });
  const titleShown = await page.evaluate(() => (window as any).__app.screen === 'title');
  if (titleShown) {
    await expect(page.locator('.first-title')).toBeVisible();
    if (opts.title !== 'wait') await page.locator('.first-title button').click();
  }
  await page.waitForFunction(() => {
    const a = (window as any).__app;
    return (a.screen === 'home' && !!document.querySelector('.host > .screen.home')) || !!a.scene;
  });
  const titleMs = titleShown
    ? await page.evaluate(() => {
        const t = (window as any).__e2eTitle;
        return (t.goneAt ?? Math.round(performance.now())) - (t.shownAt ?? 0);
      })
    : 0;
  let flingReadyMs: number | null = null;
  if (await page.evaluate(() => !!(window as any).__app.scene)) {
    await expect(page.locator('.game-canvas')).toBeVisible();
    flingReadyMs = await page.evaluate(async () => {
      const a = (window as any).__app;
      while (!(a.scene?.canAim() && (window as any).__scene)) await new Promise((r) => requestAnimationFrame(r));
      return Math.round(performance.now());
    });
  }
  if (opts.pseudo) await usePseudo(page);
  return { titleShown, titleMs, flingReadyMs };
}

/** Switch to the dev-only pseudo language and restart planet 1 in it. */
export async function usePseudo(page: Page) {
  await page.waitForFunction(() => !!(window as any).__i18n);
  await page.evaluate(() => {
    const a = (window as any).__app;
    a.p.settings.lang = 'pseudo';
    (window as any).__i18n.setLang('pseudo');
    a.startLevel(1, { tutorial: true });
  });
}

/** Every modal logged since the page loaded. */
export function modalsSeen(page: Page): Promise<ModalSeen[]> {
  return page.evaluate(() => (window as any).__e2eModals as ModalSeen[]);
}

/** Read from the App instance (serializable values only). */
export function app<T>(page: Page, fn: (a: any) => T): Promise<T> {
  return page.evaluate(`(${fn.toString()})(window.__app)`) as Promise<T>;
}

export const OPEN_MODAL = '.overlay .scrim:not(.out) .modal';

export async function waitScreen(page: Page, name: string) {
  await page.waitForFunction((n) => (window as any).__app?.screen === n, name);
}

/** Wait for closing modals and screen entrance animations to leave the DOM. */
export async function settle(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('.overlay .scrim.out') && document.getAnimations().every((a) => a.playState !== 'running'),
  );
}

/** Tap an element the way a finger would (touch projects) or click it. */
export async function tap(page: Page, selector: string) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible' });
  await loc.click();
}

// ------------------------------------------------------------------ layout assertions (7.7)

export interface Violation {
  kind: 'offscreen' | 'clipped' | 'cutoff' | 'tap-target';
  what: string;
  detail: string;
}

/** Runs in the page: find layout violations on the current screen and any open sheet. */
function collectViolations(): Violation[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out: Violation[] = [];
  const describe = (el: Element) => {
    const txt = ((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    const self = `${el.tagName.toLowerCase()}${cls} "${txt}"`;
    // name the tap target a label belongs to, so known issues can match "side-btn" etc.
    const host = el.matches('button, [role=button], a[href]') ? null : el.closest('button, [role=button], a[href]');
    if (!host) return self;
    const hc = typeof host.className === 'string' && host.className ? '.' + host.className.trim().split(/\s+/).join('.') : '';
    return `${self} in ${host.tagName.toLowerCase()}${hc}`;
  };
  const shown = (el: Element) => {
    const anyEl = el as any;
    if (typeof anyEl.checkVisibility === 'function' && !anyEl.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const scrollParent = (el: Element) => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1))
        return a;
    }
    return null;
  };
  const hasOwnText = (el: Element) =>
    [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);

  // The top sheet covers the screen: check it alone when one is open.
  const scrims = [...document.querySelectorAll('.overlay .scrim:not(.out)')];
  const roots: Element[] = scrims.length ? [scrims[scrims.length - 1]] : [document.querySelector('.host')!].filter(Boolean);
  const seen = new Set<Element>();
  for (const root of roots) {
    const els = [...root.querySelectorAll('*')].filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      if (el instanceof HTMLCanvasElement || el.closest('svg')) return false;
      return el.matches('button, [role=button], a[href]') || hasOwnText(el);
    });
    for (const el of els) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      // visually hidden screen-reader text (.sr-only live regions) is meant to be 1 px
      if (el.matches('.sr-only') || el.closest('.sr-only') || (r.width <= 2 && r.height <= 2)) continue;
      const isButton = el.matches('button, [role=button], a[href]');
      const sp = scrollParent(el);
      // 1. nothing outside the viewport (vertical overflow is fine inside a scroller)
      const offX = r.left < -1 || r.right > vw + 1;
      const offY = !sp && (r.top < -1 || r.bottom > vh + 1);
      if (offX || offY)
        out.push({
          kind: 'offscreen',
          what: describe(el),
          detail: `box ${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} in ${vw}×${vh}`,
        });
      // 1b. clipped by an ancestor that hides overflow (and is not a scroller)
      // Content inside a scroller is reached by scrolling: stop at the scroller itself (its own hidden
      // axis still counts), so a PLAY button scrolled below the fold is not "clipped" by the screen.
      for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
        if (sp && a === sp.parentElement) break;
        const cs = getComputedStyle(a);
        const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
        const hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
        if (!hidesX && !hidesY) continue;
        const ar = a.getBoundingClientRect();
        const cutX = hidesX && (r.left < ar.left - 1 || r.right > ar.right + 1);
        const cutY = hidesY && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1);
        if (cutX || cutY) {
          out.push({
            kind: 'clipped',
            what: describe(el),
            detail: `cut by ${describe(a).split(' "')[0]} (${cutX ? 'x' : ''}${cutY ? 'y' : ''}) box ${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} vs ${Math.round(ar.left)},${Math.round(ar.top)} → ${Math.round(ar.right)},${Math.round(ar.bottom)}`,
          });
          break;
        }
      }
      // 2. no label cut off
      const cs = getComputedStyle(el);
      if (cs.display !== 'inline' && hasOwnText(el) && el.clientWidth > 0) {
        // overflow:visible text may spill a pixel or two (letter-spacing, sub-pixel fonts); hidden overflow may not
        const hides = cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
        if (el.scrollWidth > el.clientWidth + (hides ? 1 : 4))
          out.push({ kind: 'cutoff', what: describe(el), detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}` });
        else if (cs.overflowY !== 'visible' && !/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1)
          out.push({ kind: 'cutoff', what: describe(el), detail: `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}` });
      }
      // 3. tap targets at least 44 px
      if (isButton && (r.width < 43.5 || r.height < 43.5))
        out.push({ kind: 'tap-target', what: describe(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}` });
    }
  }
  return out;
}

/** A layout problem that is already known and scheduled; it is annotated instead of failing. */
export interface KnownIssue {
  /** Screen names this applies to, e.g. /^home/. */
  screen: RegExp;
  kind: Violation['kind'];
  match: RegExp;
  /** Only at viewports this narrow or narrower. */
  maxWidth?: number;
  note: string;
}

/**
 * Tap targets under 44 px are collected and reported (attachment + annotation) rather than
 * failing the journey; set E2E_STRICT_TAP=1 to make them fail.
 */
const STRICT_TAP = process.env.E2E_STRICT_TAP === '1';

export interface LayoutOpts {
  known?: KnownIssue[];
}

export async function layoutViolations(page: Page) {
  return page.evaluate(collectViolations);
}

/** Screenshot the current screen into the test's output folder and assert the 7.7 layout rules. */
export async function snap(page: Page, info: TestInfo, guard: Guard, screen: string, opts: LayoutOpts = {}) {
  await settle(page);
  const idx = String(info.attachments.filter((a) => a.contentType === 'image/png').length + 1).padStart(2, '0');
  const file = info.outputPath(`${idx}-${screen}.png`);
  await page.screenshot({ path: file });
  await info.attach(`${idx}-${screen}`, { path: file, contentType: 'image/png' });

  const width = page.viewportSize()?.width ?? 0;
  const all = await layoutViolations(page);
  const known = (opts.known ?? []).filter((k) => k.screen.test(screen) && (!k.maxWidth || width <= k.maxWidth));
  const isKnown = (v: Violation) => known.find((k) => k.kind === v.kind && k.match.test(v.what));
  const expected = all.filter(isKnown);
  const taps = all.filter((v) => v.kind === 'tap-target' && !isKnown(v));
  const hard = all.filter((v) => !isKnown(v) && (v.kind !== 'tap-target' || STRICT_TAP));
  if (expected.length)
    info.annotations.push({
      type: 'known-issue',
      description: `${screen}: ${[...new Set(known.map((k) => k.note))].join('; ')} → ${expected.map((v) => `${v.kind} ${v.what} (${v.detail})`).join(' | ')}`,
    });
  if (taps.length)
    info.annotations.push({
      type: 'tap-target<44',
      description: `${screen}: ${taps.map((v) => `${v.what} ${v.detail}`).join(' | ')}`,
    });
  if (all.length)
    await info.attach(`${idx}-${screen}-layout.json`, { body: JSON.stringify(all, null, 2), contentType: 'application/json' });
  expect.soft(hard, `layout on "${screen}" at ${width}px`).toEqual([]);
  expect.soft(guard.errors, `errors by "${screen}"`).toEqual([]);
}

/** Visible text of the whole page (screen + sheets + toasts). */
export function pageText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}

/** Kid-safe checks shared by later journeys. */
export async function expectKidSafe(page: Page, loc: LocaleId = 'en') {
  const text = await pageText(page);
  expect.soft(text).not.toMatch(/[$€£¥]|US\$|R\$/);
  expect.soft(text).not.toContain('Heat');
  for (const key of ['OFFER', 'Want a nudge?', 'Rate Comet Garden', 'To rate the game, please answer:', 'Ask a grown-up'])
    expect.soft(text).not.toContain(tr(loc, key));
  const gemButtons = await page.$$eval('button', (buttons) =>
    buttons
      .filter((b) => (b as HTMLElement).offsetParent !== null && (b as HTMLElement).innerText.includes('💎'))
      .map((b) => (b as HTMLElement).innerText),
  );
  expect.soft(gemButtons).toHaveLength(0);
  await expect.soft(page.locator('.gate-q, .offer, .buy-real, .pack')).toHaveCount(0);
  await expect.soft(page.locator('.pill.gems .plus')).toHaveCount(0);
  const tabs = await page.locator('.main-tabs .main-tab').allInnerTexts();
  expect.soft(tabs.filter((s) => s.includes(tr(loc, 'Shop')))).toEqual([]);
}

// ------------------------------------------------------------------ M4 navigation

/** The five bottom tabs (M4 4.1); `data-tab` ids. */
export const TABS = ['home', 'missions', 'homeworld', 'collection', 'styles'] as const;
export type TabId = (typeof TABS)[number];
export const tabSel = (id: TabId) => `.main-tabs .main-tab[data-tab="${id}"]`;

export interface MidGameOpts {
  /** Campaign level (p.level). Default 45: every mode, Voyage, Festival, Calendar and the Star Atlas are open. */
  level?: number;
  /** Leave things to claim: chapter chests unopened, every Wish done, a visitor gift, a mail gift. */
  claimables?: boolean;
}

/**
 * A mid-game player (after `freshInstall`): planets 1-5 won for real (so the galaxy has planets),
 * then the profile moved to `level`, a returning session, the Passport named. Lands on Play, quietly.
 */
export async function midGame(page: Page, opts: MidGameOpts = {}) {
  const level = opts.level ?? 45;
  const earlierRoundIntros = earlierRoundIntroIds(level);
  await page.evaluate(
    async ({ level, claimables, earlierRoundIntros }) => {
      const a = (window as any).__app;
      a.p.settings.reduceMotion = true;
      for (let n = 1; n <= 5; n++) {
        a.startLevel(n, { tutorial: n === 1 });
        a.scene.finish(3);
        await new Promise((r) => setTimeout(r, 50));
      }
      a.p.settings.reduceMotion = false;
      const p = a.p;
      p.tutorial = true;
      p.level = level;
      for (const id of earlierRoundIntros) if (!p.mailSeen.includes(`coach-${id}`)) p.mailSeen.push(`coach-${id}`);
      const savedIntros = JSON.parse(localStorage.getItem('pp.coach.intros') ?? '[]') as string[];
      localStorage.setItem('pp.coach.intros', JSON.stringify([...new Set([...savedIntros, ...earlierRoundIntros])]));
      p.passport.set = true;
      p.meta.sessions = 3;
      p.dust = 5000;
      p.gems = 200;
      const cleared = Math.floor((level - 1) / 10);
      p.chapters = claimables ? [] : Array.from({ length: cleared }, (_, i) => i + 1);
      // creatures met along the way (Wishes are voiced by creatures you have seen)
      for (const id of ['otter', 'turtle', 'bear', 'butterfly', 'whale']) if (!p.seen.includes(id)) p.seen.push(id);
      p.quests = { day: '', list: [], bonusClaimed: false };
      a.showMissions(); // deals today's three Wishes
      if (claimables) {
        for (const card of p.quests.list) card.progress = card.goal;
        p.visitors.push({ species: 'otter', dust: 10, gems: 0, memento: null });
      }
      a.save();
      a.selectTab('home');
    },
    { level, claimables: !!opts.claimables, earlierRoundIntros },
  );
  await waitScreen(page, 'home');
  await settle(page);
}

/** Reach the planet-5 Homeworld with the first-hour state still untouched. */
export async function planetFiveHomeworld(page: Page, opts: { reduceMotion?: boolean } = {}) {
  await midGame(page, { level: 6 });
  await page.evaluate((reduceMotion) => {
    const a = (window as any).__app;
    a.p.settings.reduceMotion = reduceMotion;
    a.p.home.firstHour = 0;
    a.p.home.intro = false;
    a.p.home.labFreeUsed = false;
    a.p.home.plots = a.p.home.plots.map(() => null);
    a.p.home.debris = [];
    a.p.home.residents = [];
    a.save();
    a.selectTab('homeworld');
  }, !!opts.reduceMotion);
  await waitScreen(page, 'homeworld');
}

/** Mid-game fixture for the Bay journey; Swoop is earned and Zip still shows its channel. */
export async function launcherBayReady(page: Page) {
  await midGame(page, { level: 64 });
  await page.evaluate(() => {
    const a = (window as any).__app;
    const p = a.p;
    p.home.firstHour = 2;
    p.home.intro = true;
    p.home.level = 2;
    p.home.plots[0] = { type: 'launch_bay', lv: 2, since: Date.now() };
    p.chapters = [1, 2, 3, 4, 5, 6];
    p.launcher.flings.swoop = 120;
    p.dust = 5000;
    p.mats.dew = 20;
    a.save();
    a.showHomeworld();
  });
  await waitScreen(page, 'homeworld');
}

export const screenName = (page: Page) => page.evaluate(() => (window as any).__app.screen as string);

/**
 * Close whatever sheets sit on top like a player backing out: a tap outside the sheet, or (for a sheet
 * that must be answered) its last button. Never taps a destructive button.
 */
export async function dismissSheets(page: Page, max = 4) {
  const titles: string[] = [];
  const open = page.locator(OPEN_MODAL);
  for (let i = 0; i < max; i++) {
    await settle(page);
    const count = await open.count();
    if (!count) break;
    const top = open.last();
    titles.push(
      await top.evaluate((el) => (el.querySelector('.m-title, .end-title, b')?.textContent ?? '').trim().slice(0, 60) || '(untitled)'),
    );
    await page.mouse.click(3, 3); // a tap outside the sheet
    await settle(page);
    if ((await open.count()) < count) continue;
    const last = top.locator('button:not(.danger)').last();
    if (await last.count()) await last.click();
  }
  await settle(page);
  return titles;
}

/** A finger swipe from the left edge of the screen (M4 4.2), at a height clear of the tab bar. */
export async function swipeFromLeftEdge(page: Page) {
  const vh = page.viewportSize()?.height ?? 568;
  const y = Math.round(vh * 0.42);
  await page.mouse.move(4, y);
  await page.mouse.down();
  for (let x = 20; x <= 180; x += 20) await page.mouse.move(x, y + 2);
  await page.mouse.up();
}

/** Visible tap targets and numeric badges on the current screen (not counting sheets). */
export function countTargets(page: Page) {
  return page.evaluate(() => {
    const shown = (el: Element) => {
      const anyEl = el as any;
      if (typeof anyEl.checkVisibility === 'function' && !anyEl.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const host = document.querySelector('.host')!;
    const label = (el: Element) =>
      `${el.className} "${((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
    const targets = [...host.querySelectorAll('button, a[href], [role=button]')].filter(shown).map(label);
    const badges = [...host.querySelectorAll('.nb, .badge')]
      .filter(shown)
      .map((b) => ({ where: label(b.parentElement!), text: (b.textContent ?? '').trim() }));
    return { targets, badges, numericBadges: badges.filter((b) => /\d/.test(b.text)) };
  });
}

// ------------------------------------------------------------------ M5 Grown-ups and Gate v2

export const GATE = `${OPEN_MODAL}.gate-v2`;

/** Gate v2 is open: its challenge digits (the DEV hook `window.__gate.answer()`). */
export async function gateAnswer(page: Page): Promise<string> {
  await expect(page.locator(GATE)).toBeVisible();
  const answer = await page.evaluate(() => (window as any).__gate?.answer() as string | null);
  expect(answer, 'window.__gate.answer() gives the challenge digits').toMatch(/^\d{3}$/);
  return answer!;
}

/** Tap digits on the shuffled keypad (keys are labelled by their digit). */
export async function typeGate(page: Page, digits: string) {
  const gate = page.locator(GATE);
  for (const d of digits) await gate.locator(`.gate-v2-keypad button[aria-label="${d}"]`).click();
}

/** Press and hold "Hold to continue" for `ms` (the gate needs 1.5 s). */
export async function holdGate(page: Page, ms = 1_700) {
  const confirm = page.locator(GATE).locator('.gate-v2-confirm');
  await expect(confirm).toBeEnabled();
  await confirm.scrollIntoViewIfNeeded();
  const box = (await confirm.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Answer Gate v2 like a grown-up: read the words (the dev hook), type the digits, hold. */
export async function passGate(page: Page) {
  const answer = await gateAnswer(page);
  await typeGate(page, answer);
  await holdGate(page);
  await expect(page.locator(GATE)).toHaveCount(0);
}

/** A wrong three-digit answer (any number but the right one). */
export function wrongAnswer(answer: string) {
  return String(answer === '999' ? 998 : Number(answer) + 1);
}

/** Settings (top bar gear) → Grown-ups → Gate v2 → the Grown-ups area (App.screen 'shop'). */
export async function openGrownups(page: Page, loc: LocaleId = 'en', via: 'settings' | 'styles' = 'settings') {
  if (via === 'settings') {
    await page.locator(`.topbar button[aria-label="${tr(loc, 'Settings')}"]`).click();
    await page
      .locator(OPEN_MODAL)
      .getByRole('button', { name: tr(loc, 'Grown-ups'), exact: true })
      .click();
  } else {
    await page.locator(tabSel('styles')).click();
    await waitScreen(page, 'styles');
    await dismissSheets(page);
    await page.locator('.host .grownups-link').click();
  }
  await passGate(page);
  await waitScreen(page, 'shop');
  await expect(page.locator('.host .screen.grownups')).toBeVisible();
  await settle(page);
}

/**
 * Everything a child can read on the current screen and any open sheet: visible text plus
 * aria-label / title / alt / placeholder of visible elements.
 */
export function readableText(page: Page) {
  return page.evaluate(() => {
    const parts = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label],[title],[alt],[placeholder]')) {
      const anyEl = el as any;
      if (typeof anyEl.checkVisibility === 'function' && !anyEl.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        continue;
      for (const a of ['aria-label', 'title', 'alt', 'placeholder']) {
        const v = el.getAttribute(a);
        if (v) parts.push(v);
      }
    }
    return parts.join('\n');
  });
}
