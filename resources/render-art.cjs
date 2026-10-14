// Renders the app icon and launch splash with the game's own art code.
// Usage: npm run dev (in another terminal), then: node resources/render-art.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const URL = process.env.DEV_URL || 'http://127.0.0.1:5173/';

async function render(page, size, kind) {
  return page.evaluate(
    async ({ size, kind }) => {
      const { renderPlanet } = await import('/src/ui/art/planet.ts');
      const { drawCreature } = await import('/src/ui/art/critters.ts');
      const W = await import('/src/core/world.ts');
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const S = size / 1024;
      // deep space background
      const bg = g.createRadialGradient(size * 0.5, size * 0.45, 0, size * 0.5, size * 0.5, size * 0.75);
      bg.addColorStop(0, '#3a2a8a');
      bg.addColorStop(0.55, '#1a1450');
      bg.addColorStop(1, '#0b0a24');
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
      let seed = 3;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < (kind === 'icon' ? 70 : 260); i++) {
        g.globalAlpha = 0.3 + rnd() * 0.7;
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(rnd() * size, rnd() * size, (0.8 + rnd() * 2.2) * S * (kind === 'icon' ? 1.6 : 1), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      const { drawProps } = await import('/src/ui/art/props.ts');
      const R = kind === 'icon' ? 290 * S : 260 * S;
      const cx = size / 2;
      const cy = kind === 'icon' ? size * 0.61 : size * 0.54;
      // atmosphere
      const atm = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5);
      atm.addColorStop(0, 'rgba(110,200,255,0.55)');
      atm.addColorStop(1, 'rgba(110,200,255,0)');
      g.fillStyle = atm;
      g.beginPath();
      g.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      g.fill();
      // ocean sphere
      g.save();
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.clip();
      const sea = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      sea.addColorStop(0, '#5fb8ff');
      sea.addColorStop(1, '#1f5fc8');
      g.fillStyle = sea;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
      // continents
      const blob = (x, y, r, col, edge) => {
        g.fillStyle = edge;
        g.beginPath();
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const rr = r * (1 + 0.18 * Math.sin(a * 3 + x) + 0.1 * Math.cos(a * 5 + y));
          g[k ? 'lineTo' : 'moveTo'](cx + x * R + Math.cos(a) * rr * R, cy + y * R + Math.sin(a) * rr * R);
        }
        g.fill();
        g.fillStyle = col;
        g.beginPath();
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const rr = r * 0.9 * (1 + 0.18 * Math.sin(a * 3 + x) + 0.1 * Math.cos(a * 5 + y));
          g[k ? 'lineTo' : 'moveTo'](cx + x * R + Math.cos(a) * rr * R, cy + y * R + Math.sin(a) * rr * R);
        }
        g.fill();
      };
      blob(-0.35, -0.35, 0.42, '#4fc46a', '#e6d08a');
      blob(0.45, 0.1, 0.33, '#36a857', '#e6d08a');
      blob(-0.25, 0.5, 0.28, '#8fd65a', '#e6d08a');
      blob(0.1, -0.85, 0.35, '#4fc46a', '#e6d08a');
      // shading
      const sh = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,0.25)');
      sh.addColorStop(0.55, 'rgba(255,255,255,0)');
      sh.addColorStop(1, 'rgba(10,5,40,0.55)');
      g.fillStyle = sh;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.restore();
      // trees along the top horizon
      for (const [a, biome] of [
        [-2.05, 'forest'],
        [-1.8, 'meadow'],
        [-1.35, 'jungle'],
        [-1.1, 'forest'],
      ]) {
        g.save();
        g.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        g.rotate(a + Math.PI / 2);
        drawProps(g, biome, R * 0.1, a * 10, 1);
        g.restore();
      }
      // rim light
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = R * 0.025;
      g.beginPath();
      g.arc(cx, cy, R * 0.985, Math.PI * 1.08, Math.PI * 1.5);
      g.stroke();
      // hero bunny on top
      drawCreature(g, 'bunny', cx, cy - R * 0.97, 0, R * 0.72, 0.4);
      if (kind === 'splash') {
        drawCreature(g, 'fish', cx + R * 0.95, cy + R * 0.2, Math.PI / 2 - 0.25, R * 0.3, 1.2);
        drawCreature(g, 'bear', cx - R * 0.98, cy + R * 0.05, -Math.PI / 2 + 0.1, R * 0.3, 2.1);
      }
      if (kind === 'icon') {
        // Canvas PNGs are RGBA even when every pixel is opaque; encode RGB for App Store validation.
        const bytes = g.getImageData(0, 0, size, size).data;
        let raw = '';
        for (let i = 0; i < bytes.length; i += 32768) raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
        return btoa(raw);
      }
      return c.toDataURL('image/png');
    },
    { size, kind },
  );
}

function rgbPng(rgba, size) {
  const scanlines = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = row + 1 + x * 3;
      scanlines[dst] = rgba[src];
      scanlines[dst + 1] = rgba[src + 1];
      scanlines[dst + 2] = rgba[src + 2];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  const chunk = (name, data) => {
    const type = Buffer.from(name);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    let crc = 0xffffffff;
    for (const byte of Buffer.concat([type, data])) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, type, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2; // PNG truecolor, no alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  await page.goto(URL);
  await page.waitForTimeout(600);
  const save = (url, file) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  const root = path.join(__dirname, '..');
  const icon = rgbPng(Buffer.from(await render(page, 1024, 'icon'), 'base64'), 1024);
  fs.writeFileSync(path.join(__dirname, 'icon.png'), icon);
  fs.writeFileSync(path.join(root, 'public/icon.png'), icon);
  fs.writeFileSync(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), icon);
  const splash = await render(page, 2732, 'splash');
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    save(splash, path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset', f));
  await b.close();
  console.log('rendered icon and splash');
})();
