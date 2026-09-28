const { open, shot, txt, drag } = require('./lib.cjs');
(async () => {
  const { b, page, logs } = await open();
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2000);
  // find launcher
  const info = await page.evaluate(() => { const s = window.__app.scene; return { launch: s.launch, w: innerWidth, h: innerHeight, cv: s.canvas.getBoundingClientRect().toJSON() }; });
  console.log(JSON.stringify(info));
  const L = info.launch; const r = info.cv;
  const from = { x: r.left + L.x, y: r.top + L.y };
  await drag(page, from, { x: from.x + 10, y: from.y + 90 });
  await page.waitForTimeout(400);
  await shot(page, 'a03-first-fling-flight');
  await page.waitForTimeout(1800);
  await shot(page, 'a04-first-fling-landed');
  console.log(await txt(page));
  console.log(logs.join('\n'));
  await b.close();
})();
