const { open, shot, txt, clickText, nav, drag } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page, logs } = await open({ viewport: { width: 320, height: 568 } });
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1500);
  const wait = (ms=1300) => page.waitForTimeout(ms);
  await shot(page, 'k01-se-mid-home');
  // side-btn clipping check
  console.log('CLIP', JSON.stringify(await page.evaluate(() => { const wrap = document.querySelector('.galaxy-wrap').getBoundingClientRect(); return [...document.querySelectorAll('.side-btn')].map(b => { const r = b.getBoundingClientRect(); return { l: b.querySelector('.nl').innerText, top: Math.round(r.top), bottom: Math.round(r.bottom), wrapBottom: Math.round(wrap.bottom), clipped: r.bottom > wrap.bottom + 1 }; }); })));
  await page.evaluate(() => window.__app.preLevel(29)); await wait(1200);
  await shot(page, 'k02-se-prelevel-29');
  console.log('MODAL fits?', JSON.stringify(await page.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, sh: m.scrollHeight, ch: m.clientHeight }; })));
  await page.mouse.click(160, 8); await wait(500);
  await page.evaluate(() => window.__app.startLevel(29)); await wait(2500);
  await shot(page, 'k03-se-level-29');
  console.log('L29:', (await txt(page)).replace(/\n+/g,' | '));
  const L = await page.evaluate(() => window.__app.scene.launch);
  console.log('launcher', L, 'swap btn?');
  console.log(logs.join('\n'));
  await b.close();
})();
