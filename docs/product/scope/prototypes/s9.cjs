const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const { b, page, logs } = await open();
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1500);
  // plain spec profile
  await page.evaluate(() => { const a = window.__app; a.p.level = 24; a.p.tutorial = true; a.p.gems = 500; a.p.dust = 5000; a.save(); a.showHome(true); });
  await page.waitForTimeout(800);
  await shot(page, 'e00-mid-spec-only-home');
  const specOnly = await page.evaluate(() => { const a = window.__app; return a.saveNow().then(() => localStorage.getItem('pp.profile')); });
  fs.writeFileSync(__dirname + '/mid-spec.json', specOnly);
  // enriched realistic profile
  const rich = await page.evaluate(async () => {
    const a = window.__app; const p = a.p;
    const lv = await import('/src/core/levels.ts'); const w = await import('/src/core/world.ts');
    const cols = ['#5fa8d3', '#7bc86c', '#e8d18a', '#c9c9d6', '#e07a5f', '#2f9e8f'];
    for (let n = 1; n <= 23; n++) {
      const L = lv.makeLevel(n); const stars = n % 3 === 0 ? 2 : n % 5 === 0 ? 1 : 3;
      p.stars[n] = stars;
      p.galaxy.push({ n, name: L.name, hue: L.hue, stars, species: w.SPECIES.slice(0, 3 + (n % 4)).map(s => s.id), life: 90 + n * 9, colors: [cols[n % 6], cols[(n + 2) % 6], cols[(n + 4) % 6]] });
    }
    p.seen = w.SPECIES.slice(0, 15).map(s => s.id);
    p.stats.wins = 23; p.stats.threeStars = 13; p.lastCollect = Date.now() - 5 * 3600 * 1000;
    a.save(); a.showHome(true);
    await a.saveNow();
    return localStorage.getItem('pp.profile');
  });
  fs.writeFileSync(__dirname + '/mid.json', rich);
  await page.waitForTimeout(1000);
  await shot(page, 'e01-mid-rich-home');
  console.log((await txt(page)).replace(/\n+/g,' | '));
  console.log(logs.join('\n'));
  await b.close();
})();
