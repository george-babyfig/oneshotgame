const { open, shot, txt, drag, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
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
  await clickText(page, /Next/); await page.waitForTimeout(2000);
  await page.evaluate(() => window.__app.scene.finish(2));
  await page.waitForTimeout(3500);
  await clickText(page, /^Galaxy/); await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1800);
  // save this fresh-2-levels profile for reuse
  const prof = await page.evaluate(() => { window.__app.saveNow(); return localStorage.getItem('pp.profile'); });
  fs.writeFileSync(__dirname + '/fresh2.json', prof);
  const wait = (ms=900) => page.waitForTimeout(ms);
  const home = async () => { await page.evaluate(() => window.__app.showHome(true)); await wait(700); };
  const shots = [
    ['Quests', 'c01-fresh-quests', async () => { await nav(page, 'Quests'); }],
    ['Star Road', 'c02-fresh-road', async () => { await nav(page, 'Star Road'); }],
    ['Rank', 'c03-fresh-rank', async () => { await nav(page, 'Rank'); }],
    ['Inbox', 'c04-fresh-inbox', async () => { await nav(page, 'Inbox'); }],
    ['Modes', 'c05-fresh-modes', async () => { await nav(page, 'Modes'); }],
    ['Star Map', 'c06-fresh-starmap', async () => { await nav(page, 'Star Map'); }],
    ['Lifebook', 'c07-fresh-lifebook', async () => { await nav(page, 'Lifebook'); }],
    ['Upgrades', 'c08-fresh-upgrades', async () => { await nav(page, 'Upgrades'); }],
    ['Shop', 'c09-fresh-shop', async () => { await nav(page, 'Shop'); }],
  ];
  for (const [name, file, fn] of shots) {
    await home();
    await fn(); await wait(1200);
    await shot(page, file);
    const t = (await txt(page)).replace(/\n+/g,' | ');
    console.log('== ' + name + ' [' + (await page.evaluate(() => window.__app.screen)) + ']', t.slice(0, 700));
  }
  // play button -> prelevel
  await home();
  await clickText(page, /PLAY/); await wait(1500);
  await shot(page, 'c10-fresh-prelevel');
  console.log('== PRELEVEL', (await txt(page)).replace(/\n+/g,' | ').slice(0, 500));
  console.log(logs.join('\n'));
  await b.close();
})();
