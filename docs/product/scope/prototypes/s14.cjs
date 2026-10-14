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
  for (const n of [29, 30]) {
    await page.evaluate((n) => window.__app.preLevel(n), n); await wait(1200);
    await shot(page, `j0${n === 29 ? 1 : 2}-prelevel-${n}`);
    console.log('PRE ' + n + ':', (await txt(page)).replace(/\n+/g,' | ').split('BOOSTERS')[0].slice(-400));
    await page.evaluate(() => { const m = document.querySelector('.modal'); }); 
    await page.mouse.click(195, 20); await wait(500);
  }
  // Start boss level 30 and play a bit
  await page.evaluate(() => window.__app.startLevel(30)); await wait(2500);
  await shot(page, 'j03-boss-30-start');
  console.log('BOSS:', (await txt(page)).replace(/\n+/g,' | '));
  const L = await page.evaluate(() => window.__app.scene.launch);
  for (let i = 0; i < 3; i++) { await drag(page, { x: L.x, y: L.y }, { x: L.x + [10,-30,30][i], y: L.y + 100 }); await wait(3000); }
  await shot(page, 'j04-boss-after3');
  // exhaust throws for a fail modal
  await page.evaluate(() => { const s = window.__app.scene; });
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => ({ screen: window.__app.screen, modal: !!document.querySelector('.modal') }));
    if (st.modal || st.screen !== 'level') break;
    await drag(page, { x: L.x, y: L.y }, { x: L.x + ((i*17)%80)-40, y: L.y + 95 }); await wait(2300);
  }
  await wait(1500);
  await shot(page, 'j05-boss-fail');
  console.log('FAIL:', (await txt(page)).replace(/\n+/g,' | ').slice(-400));
  console.log(logs.join('\n'));
  await b.close();
})();
