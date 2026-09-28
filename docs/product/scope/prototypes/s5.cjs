const { open, shot, txt, drag } = require('./lib.cjs');
const clickText = async (page, re) => { const ok = await page.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button')].filter(b=>b.offsetParent && r.test(b.innerText)); if(!b.length) return false; b[b.length-1].click(); return true; }, re.source); return ok; };
(async () => {
  const { b, page, logs } = await open();
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2000);
  const L = await page.evaluate(() => window.__app.scene.launch);
  await drag(page, { x: L.x, y: L.y }, { x: L.x + 10, y: L.y + 90 }); await page.waitForTimeout(3000);
  await page.evaluate(() => window.__app.scene.finish(3));
  await page.waitForTimeout(3500);
  console.log('next clicked', await clickText(page, /Next/));
  await page.waitForTimeout(2500);
  await shot(page, 'b03-level2-start');
  console.log('L2:', (await txt(page)).replace(/\n+/g,' | '));
  // real throws in L2
  const L2 = await page.evaluate(() => window.__app.scene.launch);
  for (const a of [[15,95],[-20,100],[5,110]]) { await drag(page, { x: L2.x, y: L2.y }, { x: L2.x + a[0], y: L2.y + a[1] }); await page.waitForTimeout(3000); }
  await shot(page, 'b04-level2-mid');
  await page.evaluate(() => window.__app.scene.finish(2));
  await page.waitForTimeout(3500);
  await shot(page, 'b05-l2-results');
  console.log('R2:', (await txt(page)).replace(/\n+/g,' | ').slice(-500));
  console.log('galaxy clicked', await clickText(page, /^Galaxy/));
  await page.waitForTimeout(2500);
  await shot(page, 'b06-home-after-2');
  console.log('HOME1:', (await txt(page)).replace(/\n+/g,' | '));
  console.log(logs.join('\n'));
  await b.close();
})();
