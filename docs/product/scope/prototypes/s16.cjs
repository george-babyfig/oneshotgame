const { open, shot, txt, clickText, nav, drag } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page, logs } = await open();
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1500);
  const wait = (ms=1300) => page.waitForTimeout(ms);
  await page.evaluate(() => { const a = window.__app; a.p.rank = 5; a.save(); a.showHome(true); }); await wait(800);
  await nav(page, 'Modes'); await wait(1200);
  await shot(page, 'l01-modes-unlocked');
  console.log('MODES:', (await txt(page)).replace(/\n+/g,' | ').split('Modes |').pop().slice(0, 700));
  // open each mode
  const modeBtns = await page.evaluate(() => [...document.querySelectorAll('.modal button')].filter(b => b.offsetParent).map(b => b.innerText.replace(/\n/g,' / ')));
  console.log(JSON.stringify(modeBtns));
  // Try Zen Garden
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('.modal button')].find(b => /Zen/.test(b.innerText)); if (b) { b.click(); return true; } return false; });
  await wait(2500);
  await shot(page, 'l02-zen');
  console.log('ZEN:', clicked, (await txt(page)).replace(/\n+/g,' | ').slice(0, 400));
  console.log(logs.join('\n'));
  await b.close();
})();
