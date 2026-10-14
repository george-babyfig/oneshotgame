import { expect, test } from '@playwright/test';
import { OPEN_MODAL, dismissSheets, freshInstall, localesToRun, midGame, tr, useJourneyViewport, waitScreen } from './helpers';

// Exercise main.ts's real native listener/launch wiring through a local Capacitor bridge.
// Native Simulator URL delivery is also required by docs/qa/release-train.md.
for (const locale of localesToRun()) {
  test.describe(`M14 Road deep link ${locale}`, () => {
    test.use({ locale: locale === 'pseudo' ? 'en' : locale === 'pt' ? 'pt-BR' : locale });
    test.beforeEach(async ({ page }) => {
      await useJourneyViewport(page);
      await page.addInitScript(() => {
        const w = window as any;
        const nativeNow = Date.now.bind(Date);
        const clockShift = Number(localStorage.getItem('__m14_clock_shift') ?? 0);
        Date.now = () => nativeNow() + clockShift;
        const listeners: Record<string, (data: any) => void> = {};
        w.CapacitorCustomPlatform = { name: 'ios' };
        w.Capacitor = {
          PluginHeaders: [
            {
              name: 'App',
              methods: [
                { name: 'addListener', rtype: 'callback' },
                { name: 'removeListener', rtype: 'promise' },
                { name: 'getLaunchUrl', rtype: 'promise' },
              ],
            },
          ],
          nativeCallback: (_plugin: string, _method: string, options: any, callback: (data: any) => void) => {
            listeners[options.eventName] = callback;
            if (options.eventName === 'appUrlOpen') {
              // iOS retains cold delivery until the first listener, and consumes it only once.
              const url = localStorage.getItem('__m14_launch_url');
              localStorage.removeItem('__m14_launch_url');
              if (url) queueMicrotask(() => callback({ url }));
            }
            return Promise.resolve(options.eventName);
          },
          nativePromise: (_plugin: string, method: string, options: any) => {
            if (method === 'removeListener') delete listeners[options.eventName];
            if (method === 'getLaunchUrl') {
              w.__launchReads = (w.__launchReads ?? 0) + 1;
              return Promise.resolve({ url: 'cometgarden://road' }); // Deliberately stale across WebView reloads.
            }
            return Promise.resolve({});
          },
        };
        w.__nativeLinks = {
          emit: (url: string) => listeners.appUrlOpen?.({ url }),
          resume: () => listeners.resume?.({}),
          listening: () => !!listeners.appUrlOpen,
        };
      });
    });
    test('cold and warm launch route only an unlocked returning player to Road', async ({ page }) => {
      await freshInstall(page, { pseudo: locale === 'pseudo' });
      await midGame(page);
      await dismissSheets(page);
      await page.waitForFunction(() => (window as any).__nativeLinks.listening());
      await page.evaluate(() => {
        const a = (window as any).__app;
        a.p.meta.lastSeen = Date.now() - 5 * 3600_000;
        (window as any).__nativeLinks.resume();
        (window as any).__nativeLinks.emit('cometgarden://road');
      });
      await expect(page.locator(`${OPEN_MODAL}.away-card`)).toBeVisible();
      await waitScreen(page, 'home');
      await page
        .locator(`${OPEN_MODAL}.away-card`)
        .getByRole('button', { name: tr(locale, 'Collect all'), exact: true })
        .click();
      await waitScreen(page, 'road');
      await expect(page.locator('.gate-v2')).toHaveCount(0);
      await page.evaluate(async () => {
        const a = (window as any).__app;
        a.showHome(true);
        await a.saveNow();
        localStorage.setItem('__m14_clock_shift', String(5 * 3600_000));
        localStorage.setItem('__m14_launch_url', 'cometgarden://road');
      });
      await page.reload();
      await expect(page.locator(`${OPEN_MODAL}.away-card`)).toBeVisible();
      await waitScreen(page, 'home');
      await page
        .locator(`${OPEN_MODAL}.away-card`)
        .getByRole('button', { name: tr(locale, 'Collect all'), exact: true })
        .click();
      await waitScreen(page, 'road');
      await expect(page.locator('.gate-v2')).toHaveCount(0);
      await expect(page.locator('.shop')).toHaveCount(0);
      await page.evaluate(async () => {
        const a = (window as any).__app;
        a.showHome(true);
        await a.saveNow();
      });
      await page.reload(); // Memory-pressure WebView reload: getLaunchUrl still holds the old URL.
      await waitScreen(page, 'home');
      await page.waitForFunction(() => (window as any).__nativeLinks.listening());
      expect(await page.evaluate(() => (window as any).__launchReads ?? 0)).toBe(0);
    });
    test('locks, first session, active gates and purchase routes remain protected', async ({ page }) => {
      await freshInstall(page, { pseudo: locale === 'pseudo' });
      await page.waitForFunction(() => (window as any).__nativeLinks.listening());
      await page.evaluate(() => (window as any).__nativeLinks.emit('cometgarden://road'));
      await waitScreen(page, 'level');
      await midGame(page, { level: 21 });
      await dismissSheets(page);
      await page.evaluate(() => (window as any).__nativeLinks.emit('cometgarden://road'));
      await waitScreen(page, 'home');
      await expect(page.locator('.toasts')).not.toContainText(tr(locale, 'Your Road is in Missions'));
      await expect(page.locator('.gate-v2')).toHaveCount(0);
      await page.evaluate(() => {
        (window as any).__app.p.level = 45;
      });
      await page.evaluate(async () => {
        // The pending gate must survive warm delivery; never resolve it by navigating.
        const { parentalGate } = await import('/src/ui/flows/gate.ts');
        void parentalGate('grownups');
      });
      await expect(page.locator('.gate-v2')).toBeVisible();
      await page.evaluate(() => (window as any).__nativeLinks.emit('cometgarden://road'));
      await expect(page.locator('.gate-v2')).toBeVisible();
      await page.locator('.gate-v2-cancel').click();
      await page.evaluate(() => (window as any).__nativeLinks.emit('cometgarden://road?buy=1'));
      await waitScreen(page, 'home');
      await expect(page.locator('.gate-v2')).toHaveCount(0);
      await expect(page.locator('.shop')).toHaveCount(0);
    });
  });
}
