const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page } = await open({ viewport: { width: 320, height: 568 } });
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  const lv = await page.evaluate(async () => {
    const L = await import('/src/core/levels.ts'); const W = await import('/src/core/world.ts');
    const out = {};
    for (const n of [1,2,3,4,5,6,8,10,15,20,30,50]) { const l = L.makeLevel(n); out[n] = { throws: l.throws, stars: l.stars, twist: l.twist, diff: l.difficulty, goals: l.goals.length }; }
    out.kinds = Object.values(W.KINDS).map(k => [k.id, k.unlock]);
    return out;
  });
  console.log(JSON.stringify(lv));
  // German
  await clickText(page, /Stamp day/); await page.waitForTimeout(1200);
  for (const lang of ['de', 'fr', 'ja']) {
    await page.evaluate((lang) => { const a = window.__app; a.p.settings.lang = lang; a.applySettings(); a.save(); a.showHome(true); }, lang);
    await page.waitForTimeout(900);
    await shot(page, 'n01-se-home-' + lang);
    const over = await page.evaluate(() => [...document.querySelectorAll('.nav-btn .nl, .btn, .pill, .fest-chip, .season-chip')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.innerText.replace(/\n/g,' ').slice(0,30) + ' sw' + e.scrollWidth + '/cw' + e.clientWidth));
    console.log(lang, 'overflowing:', JSON.stringify(over));
    console.log(lang, (await txt(page)).replace(/\n+/g,' | ').slice(0, 300));
  }
  await b.close();
})();
