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
  await clickText(page, /PLAY/); await wait(1200);
  await shot(page, 'i01-prelevel-24');
  console.log('PRE:', (await txt(page)).replace(/\n+/g,' | ').slice(-400));
  await clickText(page, /Launch/); await wait(2500);
  await shot(page, 'i02-level24-start');
  console.log('L24:', (await txt(page)).replace(/\n+/g,' | '));
  const info = await page.evaluate(() => { const s = window.__app.scene; return { L: s.launch, cur: s.cur, level: s.L && { n: s.L.n, twist: s.L.twist, throws: s.L.throws, goals: s.L.goals, stars: s.L.stars || s.L.targets }, keys: Object.keys(s.L) }; });
  console.log(JSON.stringify(info));
  const L = info.L;
  const angles = [[12,95],[-25,100],[35,90],[0,110],[-40,85],[20,105]];
  for (let i = 0; i < 6; i++) {
    const st = await page.evaluate(() => ({ screen: window.__app.screen, modal: !!document.querySelector('.modal') }));
    if (st.screen !== 'level' || st.modal) break;
    if (i % 2 === 1) { await page.mouse.click(273, 588); await wait(300); }
    await drag(page, { x: L.x, y: L.y }, { x: L.x + angles[i][0], y: L.y + angles[i][1] });
    await wait(600);
    if (i === 1) await shot(page, 'i03-level24-flight');
    await wait(2600);
    if (i === 2) await shot(page, 'i04-level24-mid');
  }
  await shot(page, 'i05-level24-later');
  console.log('AFTER:', (await txt(page)).replace(/\n+/g,' | ').slice(0,500));
  // pause
  await page.evaluate(() => { const m = document.querySelector('.modal'); });
  console.log(logs.join('\n'));
  await b.close();
})();
