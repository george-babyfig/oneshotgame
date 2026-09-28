// Playwright journeys (ROADMAP-v2 M1 item 1.8, section 7.7).
// Run: `npx playwright test` (reuses a dev server already on :5173, or starts one).
// Narrow the language matrix with LOCALE, e.g. `LOCALE=ja,pseudo npx playwright test e2e/j1.spec.ts`
// (languages: en es fr de pt ja pseudo; J1 runs every language, J3 runs in English).
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Phone-like context: touch, mobile viewport meta, retina.
const phone = (width: number, height: number) => ({
  viewport: { width, height },
  screen: { width, height },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 6,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium-320x568',
      use: { ...devices['iPhone SE'], browserName: 'chromium', defaultBrowserType: 'chromium', ...phone(320, 568) },
    },
    {
      name: 'chromium-390x844',
      use: { ...devices['iPhone 14'], browserName: 'chromium', defaultBrowserType: 'chromium', ...phone(390, 844) },
    },
    {
      name: 'webkit-390x844',
      use: { ...devices['iPhone 14'], browserName: 'webkit', defaultBrowserType: 'webkit', ...phone(390, 844) },
    },
  ],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
