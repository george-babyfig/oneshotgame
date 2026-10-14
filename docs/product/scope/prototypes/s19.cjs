const { open, shot, txt, clickText } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/fresh2.json', 'utf8');
  const { b, ctx, page } = await open();
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1200);
  await page.evaluate(() => window.__app.showHome()); await page.waitForTimeout(1500);
  await shot(page, 'o01-passport-setup');
  console.log((await txt(page)).replace(/\n+/g,' | ').slice(-500));
  await b.close();
})();
