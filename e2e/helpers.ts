// Shared helpers for the Playwright journeys (ROADMAP-v2 section 7.7).
// The game is driven through `window.__app` (see docs/handoff/03-architecture.md).
import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
      if (el.matches('.sr-only') || (r.width <= 2 && r.height <= 2)) continue;
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
      for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
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
