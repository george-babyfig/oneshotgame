// Records every music theme to a WAV file with the game's own synth settings,
// and prints peak/average loudness so themes can be compared by ear and by number.
// Usage: npm run dev (in another terminal), then: node resources/render-music.cjs [outDir] [seconds]
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const URL = process.env.DEV_URL || 'http://127.0.0.1:5173/';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'pocket-planet-music');
const SECONDS = Number(process.argv[3] || 24);

function wav(pcm) {
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0);
  hdr.writeUInt32LE(36 + pcm.length, 4);
  hdr.write('WAVE', 8);
  hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20); // PCM
  hdr.writeUInt16LE(1, 22); // mono
  hdr.writeUInt32LE(44100, 24);
  hdr.writeUInt32LE(88200, 28);
  hdr.writeUInt16LE(2, 32);
  hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36);
  hdr.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([hdr, pcm]);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(URL);
  const res = await page.evaluate(async (DUR) => {
    const { THEMES } = await import('/src/ui/audio.ts');
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const out = {};
    for (const name of Object.keys(THEMES)) {
      const sr = 44100;
      const c = new OfflineAudioContext(1, sr * DUR, sr);
      // same chain as audio.ts ensure(): master 0.8 -> compressor; music bus at its playing level 0.3
      const master = c.createGain();
      master.gain.value = 0.8;
      master.connect(c.createDynamicsCompressor()).connect(c.destination);
      const bus = c.createGain();
      bus.gain.value = 0.3;
      bus.connect(master);
      const tone = (freq, dur, type, vol, t) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      // mirrors startMusic() in audio.ts; keep the two in step
      const th = THEMES[name];
      let next = 0.1;
      let bar = 0;
      while (next < DUR) {
        const ch = th.chords[bar % th.chords.length];
        const w = next;
        ch.forEach((n) => tone(midi(n), th.len * 1.05, 'sine', 0.026, w));
        tone(midi(ch[0] - 24), th.len, 'triangle', 0.04, w);
        const steps = Math.max(1, Math.floor(th.len / th.step));
        for (let k = 0; k < steps; k++) {
          const note = ch[th.arp[(k + bar) % th.arp.length] % ch.length] + 12;
          tone(midi(note), Math.min(0.9, th.step * 1.6), th.wave, th.wave === 'square' ? 0.008 : 0.016, w + k * th.step + 0.05);
        }
        if (th.bells && bar % 2 === 0) tone(midi(ch[3] + 24), 1.6, 'sine', 0.012, w + th.len * 0.5);
        if (th.pulse) for (let k = 0; k < 4; k++) tone(midi(ch[0] - 12), 0.12, 'triangle', 0.035, w + k * (th.len / 4));
        next += th.len;
        bar++;
      }
      const d = (await c.startRendering()).getChannelData(0);
      let peak = 0;
      let sum = 0;
      const from = sr * 2; // skip the fade-in
      for (let i = from; i < d.length; i++) {
        peak = Math.max(peak, Math.abs(d[i]));
        sum += d[i] * d[i];
      }
      // the in-game level is quiet, so recordings get the same x4 gain (relative loudness is kept)
      const pcm = new Int16Array(d.length);
      for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, Math.round(d[i] * 4 * 32767)));
      let s = '';
      const u8 = new Uint8Array(pcm.buffer);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      out[name] = { peakDb: 20 * Math.log10(peak), rmsDb: 10 * Math.log10(sum / (d.length - from)), b64: btoa(s) };
    }
    return out;
  }, SECONDS);
  for (const [name, r] of Object.entries(res)) {
    fs.writeFileSync(path.join(OUT, `${name}.wav`), wav(Buffer.from(r.b64, 'base64')));
    console.log(`${name.padEnd(9)} peak ${r.peakDb.toFixed(1).padStart(6)} dB   average ${r.rmsDb.toFixed(1).padStart(6)} dB`);
  }
  console.log(`\nWrote ${Object.keys(res).length} WAV files to ${OUT}`);
  await browser.close();
})();
