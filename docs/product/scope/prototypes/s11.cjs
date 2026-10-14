const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page, logs } = await open();
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await clickText(page, /Stamp day/); await page.waitForTimeout(1500);
  const wait = (ms=1300) => page.waitForTimeout(ms);
  const home = async () => { await page.evaluate(() => window.__app.showHome(true)); await wait(800); };
  const summ = async (name) => { const scr = await page.evaluate(() => window.__app.screen); const t = (await txt(page)).replace(/\n+/g,' | '); console.log('== ' + name + ' [' + scr + '] len=' + t.length + ' :: ' + t.slice(0, 600)); };
  const steps = [
    ['Star Map', 'g01-starmap', async () => { await nav(page, 'Star Map'); }],
    ['Homeworld', 'g02-homeworld', async () => { await nav(page, 'Homeworld'); }],
    ['Voyage', 'g03-voyage', async () => { await nav(page, 'Voyage'); }],
    ['Event', 'g04-event', async () => { await nav(page, 'Event'); }],
    ['Quests', 'g05-quests', async () => { await nav(page, 'Quests'); }],
    ['Star Road', 'g06-road', async () => { await nav(page, 'Star Road'); }],
    ['Rank', 'g07-rank', async () => { await nav(page, 'Rank'); }],
    ['Inbox', 'g08-inbox', async () => { await nav(page, 'Inbox'); }],
    ['Modes', 'g09-modes', async () => { await nav(page, 'Modes'); }],
    ['Lifebook', 'g10-lifebook', async () => { await nav(page, 'Lifebook'); }],
    ['Upgrades', 'g11-upgrades', async () => { await nav(page, 'Upgrades'); }],
    ['Shop', 'g12-shop', async () => { await nav(page, 'Shop'); }],
    ['Festival', 'g13-festival', async () => { await page.evaluate(() => document.querySelector('.fest-chip').click()); }],
    ['Passport', 'g14-passport', async () => { await page.evaluate(() => document.querySelector('.avatar').click()); }],
  ];
  for (const [name, file, fn] of steps) {
    await home(); await fn(); await wait(1500); await shot(page, file); await summ(name);
  }
  // Workshop via passport
  await home(); await page.evaluate(() => document.querySelector('.avatar').click()); await wait(1200);
  console.log('workshop click', await clickText(page, /Workshop/)); await wait(1500);
  await shot(page, 'g15-workshop'); await summ('Workshop');
  // Album via Lifebook
  await home(); await nav(page, 'Lifebook'); await wait(1000);
  console.log('album click', await page.evaluate(() => { const a = document.querySelector('.album-link'); if (a) { a.click(); return true; } return false; })); await wait(1500);
  await shot(page, 'g16-album'); await summ('Album');
  // Settings
  await home(); await page.evaluate(() => document.querySelector('.topbar button.icon').click()); await wait(1200);
  await shot(page, 'g17-settings'); await summ('Settings');
  // Cosmic pass
  await home(); await page.evaluate(() => window.__app.showPass()); await wait(1200);
  await shot(page, 'g18-pass'); await summ('Pass');
  // Star atlas (sky)
  await page.evaluate(() => window.__app.showSky()); await wait(1200);
  await shot(page, 'g19-sky'); await summ('Sky');
  console.log(logs.join('\n'));
  await b.close();
})();
