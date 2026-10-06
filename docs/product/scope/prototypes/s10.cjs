const { open, shot, txt, clickText, nav } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const prof = fs.readFileSync(__dirname + '/mid.json', 'utf8');
  const { b, ctx, page, logs } = await open();
  await ctx.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('pp.profile', p); } }, prof);
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(2500);
  await shot(page, 'f00-mid-launch');
  console.log('LAUNCH modals:', await page.evaluate(() => [...document.querySelectorAll('.modal')].map(m => m.innerText.replace(/\n+/g,' | ').slice(0,120))));
  // dismiss whatever modals sequentially
  for (let i = 0; i < 5; i++) {
    const has = await page.evaluate(() => !!document.querySelector('.modal'));
    if (!has) break;
    const label = await page.evaluate(() => { const m = document.querySelector('.modal'); const bs = [...m.querySelectorAll('button')].filter(b=>b.offsetParent); return bs.map(b=>b.innerText.replace(/\n/g,' ')); });
    console.log('modal', i, JSON.stringify(label));
    const ok = await clickText(page, /Stamp|Claim|Collect|Great|Thanks|OK|Close|Continue|Nice|Let's|Done|Later|Skip/i);
    await page.waitForTimeout(1200);
    await shot(page, 'f0' + (i+1) + '-mid-launch-step' + i);
  }
  console.log('HOME:', (await txt(page)).replace(/\n+/g,' | ').slice(0,300));
  console.log(logs.join('\n'));
  await b.close();
})();
