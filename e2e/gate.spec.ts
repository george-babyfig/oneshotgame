// Gate v2 layout (ROADMAP-v2 M5 5.3, 6.6): at 320×568 with Extra-large text, in all 6 languages,
// the number words are fully visible (the longest number in each language: German writes one long word),
// every keypad key and button is at least 44 px, and nothing is clipped. Then the gate still works.
import { expect, test, type Page } from '@playwright/test';
import { numberToWords, type NumberWordLang } from '../src/i18n/numberWords';
import {
  BROWSER_LOCALE,
  GATE,
  OPEN_MODAL,
  expectNoErrors,
  freshInstall,
  holdGate,
  snap,
  tr,
  typeGate,
  waitScreen,
  watchErrors,
} from './helpers';

const LANGS: NumberWordLang[] = ['en', 'es', 'fr', 'de', 'pt', 'ja'];

/** The numbers whose words are longest overall and have the longest single word. */
function hardestNumbers(lang: NumberWordLang): number[] {
  const all = Array.from({ length: 900 }, (_, i) => i + 100);
  const longest = (score: (s: string) => number) =>
    all.reduce((best, n) => (score(numberToWords(n, lang)) > score(numberToWords(best, lang)) ? n : best));
  return [...new Set([longest((s) => s.length), longest((s) => Math.max(...s.split(/\s/).map((w) => w.length)))])];
}

/** Open Settings → Grown-ups with Math.random pinned so the gate asks for `n`. */
async function openGateFor(page: Page, lang: NumberWordLang, n: number) {
  await page.locator(`.topbar button[aria-label="${tr(lang, 'Settings')}"]`).click();
  const settings = page.locator(OPEN_MODAL);
  await expect(settings).toBeVisible();
  await page.evaluate(
    (v) => {
      const w = window as any;
      w.__realRandom ??= Math.random;
      Math.random = () => v;
    },
    (n - 100 + 0.5) / 900,
  );
  await settings.getByRole('button', { name: tr(lang, 'Grown-ups'), exact: true }).click();
  await expect(page.locator(GATE)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    Math.random = w.__realRandom;
  });
}

for (const lang of LANGS) {
  test.describe(`Gate v2 layout at 320×568, Extra-large text [${lang}]`, () => {
    test.use({ locale: BROWSER_LOCALE[lang], viewport: { width: 320, height: 568 }, screen: { width: 320, height: 568 } });

    test(`number words fully visible, keys ≥ 44 px, nothing clipped [${lang}]`, async ({ page }, info) => {
      test.skip(info.project.name === 'chromium-390x844', 'runs at 320×568 in chromium-320x568 and webkit');
      const guard = watchErrors(page);
      await freshInstall(page);
      await page.evaluate(async () => {
        const a = (window as any).__app;
        a.p.tutorial = true;
        a.p.level = 11;
        a.p.chapters = [1];
        a.p.passport.set = true;
        a.p.meta.sessions = 2;
        a.p.settings.textSize = 'extra-large';
        const { setTextSize } = await import('/src/ui/flows/settings.ts' as string);
        setTextSize('extra-large');
        a.save();
        a.showHome(true);
      });
      await waitScreen(page, 'home');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim())).toBe('1.36');

      for (const n of hardestNumbers(lang)) {
        const words = numberToWords(n, lang);
        await openGateFor(page, lang, n);
        const gate = page.locator(GATE);
        expect(await page.evaluate(() => (window as any).__gate.answer()), `the gate asks for ${n}`).toBe(String(n));
        await expect(gate.locator('.gate-v2-words')).toHaveText(words);
        await snap(page, info, guard, `gate-${lang}-${n}`);

        const m = await gate.evaluate((box) => {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const rect = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
          };
          const w = box.querySelector('.gate-v2-words') as HTMLElement;
          const range = document.createRange();
          range.selectNodeContents(w);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
          const text = rect(range);
          return {
            vw,
            vh,
            box: rect(box),
            words: rect(w),
            text,
            lines,
            wordsCut: w.scrollWidth > w.clientWidth + 1 || w.scrollHeight > w.clientHeight + 1,
            fontPx: parseFloat(getComputedStyle(w).fontSize),
            keys: [...box.querySelectorAll('.gate-v2-keypad button, .gate-v2-confirm, .gate-v2-cancel')].map((b) => ({
              label: b.getAttribute('aria-label') || (b as HTMLElement).innerText.trim(),
              ...rect(b),
            })),
            modalScrolls: box.scrollHeight > box.clientHeight + 1,
          };
        });
        info.annotations.push({
          type: 'gate-words',
          description: `${lang} ${n} "${words}": ${m.lines} line(s) at ${m.fontPx}px, words box ${Math.round(m.words.w)}×${Math.round(m.words.h)}; gate ${Math.round(m.box.w)}×${Math.round(m.box.h)}${m.modalScrolls ? ' (scrolls)' : ''}`,
        });
        // the words: inside the viewport and the sheet, not cut
        const inside = (r: typeof m.text, o: { l: number; t: number; r: number; b: number }) =>
          r.l >= o.l - 1 && r.r <= o.r + 1 && r.t >= o.t - 1 && r.b <= o.b + 1;
        expect.soft(inside(m.text, { l: 0, t: 0, r: m.vw, b: m.vh }), `${lang} ${n}: words inside the screen`).toBe(true);
        expect.soft(inside(m.text, m.box), `${lang} ${n}: words inside the gate sheet`).toBe(true);
        expect.soft(m.wordsCut, `${lang} ${n}: words not cut off`).toBe(false);
        // the gate sheet itself fits the screen
        expect.soft(inside(m.box, { l: 0, t: 0, r: m.vw, b: m.vh }), `${lang} ${n}: the gate sheet fits 320×568`).toBe(true);
        // 10 digits + erase, Hold to continue, Cancel: all at least 44 × 44
        expect(m.keys.length).toBe(13);
        const small = m.keys.filter((k) => k.w < 43.5 || k.h < 43.5).map((k) => `${k.label} ${Math.round(k.w)}×${Math.round(k.h)}`);
        expect.soft(small, `${lang} ${n}: gate keys under 44 px`).toEqual([]);
        // every key and button fits on screen (scrolling inside the sheet allowed)
        const off = m.keys.filter((k) => k.l < -1 || k.r > m.vw + 1).map((k) => k.label);
        expect.soft(off, `${lang} ${n}: keys off screen sideways`).toEqual([]);
        // (snap above already failed on anything clipped, cut off or off screen; keep evidence of the buttons)
        const confirm = gate.locator('.gate-v2-confirm');
        await confirm.scrollIntoViewIfNeeded();
        const shot = info.outputPath(`gate-${lang}-${n}-buttons.png`);
        await gate.locator('.gate-v2-keypad, .gate-v2-confirm').last().screenshot({ path: shot });
        await info.attach(`gate-${lang}-${n}-buttons`, { path: shot, contentType: 'image/png' });

        // …and it still works at this size: type the digits, hold, land in Grown-ups
        await typeGate(page, String(n));
        await holdGate(page);
        await expect(gate).toHaveCount(0);
        await waitScreen(page, 'shop');
        await page.evaluate(() => (window as any).__app.selectTab('home'));
        await waitScreen(page, 'home');
      }
      expectNoErrors(guard);
    });
  });
}
