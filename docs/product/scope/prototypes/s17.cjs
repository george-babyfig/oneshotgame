const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  for (const [w,h,tag] of [[390,664,'iphone14vp'],[390,844,'iphone14full']]) {
    const { b, ctx, page } = await open({ viewport: { width: w, height: h } });
    await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(2500);
    await clickText(page, /Stamp day/); await page.waitForTimeout(1200);
    await page.evaluate(() => { const a = window.__app; a.p.piggy = 90; a.save(); a.showHome(true); });
    await page.waitForTimeout(900);
    await shot(page, 'm01-home-piggy-' + tag);
    console.log(tag, JSON.stringify(await page.evaluate(() => { const wrap = document.querySelector('.galaxy-wrap').getBoundingClientRect(); return { wrapH: Math.round(wrap.height), btns: [...document.querySelectorAll('.side-btn')].map(b => { const r = b.getBoundingClientRect(); return [b.querySelector('.nl').innerText, Math.round(r.bottom - wrap.bottom)]; }) }; })));
    await b.close();
  }
})();
