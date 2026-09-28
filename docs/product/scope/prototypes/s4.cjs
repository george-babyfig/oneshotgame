const { open, shot, txt, drag } = require('./lib.cjs');
(async () => {
  const { b, page, logs } = await open();
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2000);
  const L = await page.evaluate(() => window.__app.scene.launch);
  // two real throws
  await drag(page, { x: L.x, y: L.y }, { x: L.x + 10, y: L.y + 90 }); await page.waitForTimeout(3000);
  await drag(page, { x: L.x, y: L.y }, { x: L.x - 10, y: L.y + 100 }); await page.waitForTimeout(3000);
  await page.evaluate(() => window.__app.scene.finish(3));
  await page.waitForTimeout(1500);
  await shot(page, 'b01-l1-win-a');
  await page.waitForTimeout(2500);
  await shot(page, 'b02-l1-win-b');
  console.log('RESULTS TEXT:', (await txt(page)).replace(/\n+/g,' | '));
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.replace(/\n/g,' ')));
  console.log('BUTTONS', JSON.stringify(btns));
  console.log(logs.join('\n'));
  await b.close();
})();
