const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page } = await open();
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1200);
  await page.evaluate(() => window.__app.showShop()); await page.waitForTimeout(800);
  console.log('buy click', await page.evaluate(() => { const b = document.querySelector('.buy-real'); if (!b) return 'none'; b.click(); return b.innerText; }));
  await page.waitForTimeout(1000);
  await shot(page, 'p01-buy-gate');
  console.log((await txt(page, '.modal')).replace(/\n+/g,' | ').slice(0, 400));
  await b.close();
})();
