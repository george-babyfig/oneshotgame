const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const D = __dirname;
async function open(opts = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext(opts.viewport ? { viewport: opts.viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: devices['iPhone 14'].userAgent } : { ...devices['iPhone 14'] });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type()==='error'||m.type()==='warning') logs.push(m.type()+': '+m.text()); });
  page.on('pageerror', e => logs.push('PAGEERR '+e.message));
  return { b, ctx, page, logs };
}
const shot = (page, name) => page.screenshot({ path: D + '/' + name + '.png' });
const txt = (page, sel = 'body') => page.evaluate((s) => (document.querySelector(s) || document.body).innerText, sel);
async function drag(page, from, to, steps = 10) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
  await page.mouse.up();
}
module.exports = { open, shot, txt, drag, D };
module.exports.clickText = async (page, re) => await page.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button')].filter(b=>b.offsetParent && r.test(b.innerText)); if(!b.length) return false; b[b.length-1].click(); return true; }, re.source);
module.exports.nav = async (page, label) => await page.evaluate((l) => { const b = [...document.querySelectorAll('.nav-btn')].find(b => b.querySelector('.nl') && b.querySelector('.nl').innerText.trim().startsWith(l)); if (!b) return false; b.click(); return true; }, label);
module.exports.closeModal = async (page) => await page.evaluate(() => { if (window.closeModals) window.closeModals(); const m = document.querySelector('.modal'); if (!m) return false; const sc = document.querySelector('.scrim'); const cl = [...m.querySelectorAll('button')].find(b=>/close|back|done|ok|got it|later|✕|×/i.test(b.innerText)); if (cl) { cl.click(); return 'btn:'+cl.innerText; } return 'none'; });
