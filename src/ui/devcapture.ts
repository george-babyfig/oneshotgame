/**
 * Dev-only switches for the App Store capture script (store/tools/scrapbook-capture.mjs).
 *
 * Production never reads them: every access sits behind `import.meta.env.DEV`, which Vite folds to `false`
 * in a build, so the shipped game always caps canvases at 2× and always shows the full new-creature card.
 */

declare global {
  interface Window {
    /** Store capture mode: the new-creature card drops its gem reward and rarity word. */
    __marketing?: boolean;
    /** Store capture mode: lifts the canvas pixel-ratio cap (2) so 3× store frames are sharp. */
    __maxDpr?: number;
  }
}

/** True only in a dev build whose page set `window.__marketing = true`. */
export function marketingMode(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' && window.__marketing === true;
}

/** The canvas pixel ratio: the device's, capped at 2 (a dev capture may lift the cap with `window.__maxDpr`). */
export function canvasDpr(): number {
  const cap = import.meta.env.DEV && typeof window.__maxDpr === 'number' && window.__maxDpr > 0 ? window.__maxDpr : 2;
  return Math.min(cap, window.devicePixelRatio || 1);
}
