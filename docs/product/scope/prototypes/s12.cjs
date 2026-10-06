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
  // Homeworld: dismiss the intro by tapping scrim
  await nav(page, 'Homeworld'); await wait(1500);
  console.log('intro dismissed by scrim tap:', await page.evaluate(() => { const s = document.querySelector('.scrim, .modal-scrim, .overlay'); return s ? s.className : 'no-scrim'; }));
  await page.mouse.click(195, 40); await wait(1200);
  await shot(page, 'h01-homeworld-after-intro');
  console.log('modal left?', await page.evaluate(() => !!document.querySelector('.modal')));
  // tap an empty plot: center-bottom region of planet
  await page.mouse.click(195, 330); await wait(1000);
  await shot(page, 'h02-homeworld-tap-plot');
  console.log((await txt(page)).replace(/\n+/g,' | ').slice(0, 500));
  // upgrades scrolled
  await page.evaluate(() => window.__app.showHome(true)); await wait(600);
  await nav(page, 'Upgrades'); await wait(1200);
  const total = await page.evaluate(() => { const sc = document.querySelector('.scroll'); return sc ? [sc.scrollHeight, sc.clientHeight] : null; });
  console.log('upgrades scroll', total);
  await page.evaluate(() => { const sc = document.querySelector('.scroll'); sc.scrollTop = 1600; }); await wait(600);
  await shot(page, 'h03-upgrades-lower');
  await page.evaluate(() => { const sc = document.querySelector('.scroll'); sc.scrollTop = sc.scrollHeight; }); await wait(600);
  await shot(page, 'h04-upgrades-bottom');
  console.log((await txt(page)).replace(/\n+/g,' | ').slice(-700));
  // shop scrolled
  await page.evaluate(() => window.__app.showHome(true)); await wait(600);
  await nav(page, 'Shop'); await wait(1200);
  console.log('shop scroll', await page.evaluate(() => { const sc = document.querySelector('.scroll'); return [sc.scrollHeight, sc.clientHeight]; }));
  await page.evaluate(() => { const sc = document.querySelector('.scroll'); sc.scrollTop = 900; }); await wait(600);
  await shot(page, 'h05-shop-mid');
  await page.evaluate(() => { const sc = document.querySelector('.scroll'); sc.scrollTop = sc.scrollHeight; }); await wait(600);
  await shot(page, 'h06-shop-bottom');
  // Try a buy to see parental gate
  await page.evaluate(() => { const sc = document.querySelector('.scroll'); sc.scrollTop = 0; }); await wait(400);
  await page.mouse.click(195, 288); await wait(1200);
  await shot(page, 'h07-shop-buy-gate');
  console.log('after buy click:', (await txt(page)).replace(/\n+/g,' | ').slice(0, 400));
  console.log(logs.join('\n'));
  await b.close();
})();
