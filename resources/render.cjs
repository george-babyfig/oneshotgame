// Renders icon.html -> icon.png (1024x1024). Needs Playwright (npx playwright install chromium).
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.goto('file://' + path.join(__dirname, 'icon.html'));
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'icon.png') });
  await b.close();
})();
