const { open, shot, txt, drag } = require('./lib.cjs');
(async () => {
  const { b, page, logs } = await open();
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2000);
  const L = await page.evaluate(() => window.__app.scene.launch);
  let n = 0;
  const angles = [[10,90],[-20,100],[30,90],[0,110],[-40,80],[20,100],[-10,95]];
  for (let i = 0; i < 12; i++) {
    const st = await page.evaluate(() => { const a = window.__app; return { screen: a.screen, modal: !!document.querySelector('.modal') }; });
    if (st.screen !== 'level' || st.modal) break;
    const a = angles[i % angles.length];
    // ~ every other throw try to swap the ammo first
    if (i === 2) { await page.mouse.click(273, 585); await page.waitForTimeout(200); }
    await drag(page, { x: L.x, y: L.y }, { x: L.x + a[0], y: L.y + a[1] });
    await page.waitForTimeout(2600);
    n++;
    if (i === 3) await shot(page, 'a05-level1-mid');
    console.log(i, await page.evaluate(() => { const s = window.__app.scene; return s ? JSON.stringify({thr: s.throwsLeft ?? null}) : 'noscene'; }));
  }
  await page.waitForTimeout(1500);
  await shot(page, 'a06-level1-end');
  console.log('T:', (await txt(page)).slice(0, 500));
  console.log(logs.join('\n'));
  await b.close();
})();
