// All sounds are synthesised with WebAudio — no audio files to ship.
let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let soundOn = true;
let musicOn = true;
let musicTimer: number | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  // "ambient" respects the iPhone silent switch and mixes with the user's music.
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'ambient';
  } catch {
    /* ignore */
  }
  ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = soundOn ? 1 : 0;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c?.state === 'suspended') c.resume().catch(() => {});
  if (musicOn && musicTimer === null) startMusic();
}

export function setAudio(sound: boolean, music: boolean) {
  soundOn = sound;
  musicOn = music;
  if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(sound ? 1 : 0, ctx.currentTime, 0.02);
  if (music) {
    if (ctx && musicTimer === null) startMusic();
  } else stopMusic();
}

export function pauseAudio(p: boolean) {
  if (p) ctx?.suspend().catch(() => {});
  else ctx?.resume().catch(() => {});
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slide?: number, bus = sfxBus) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, q = 1, when = 0, type: BiquadFilterType = 'bandpass') {
  if (!ctx || !sfxBus || !noiseBuf) return;
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.2);
  src.stop(t + dur + 0.05);
}

const semi = (base: number, n: number) => base * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export const sfx = {
  click: () => tone(880, 0.05, 'triangle', 0.1),
  stretch: (k: number) => tone(200 + k * 300, 0.04, 'sine', 0.04),
  launch: () => {
    noise(0.35, 0.25, 1200, 0.6, 0, 'highpass');
    tone(300, 0.3, 'sine', 0.1, 0, 900);
  },
  impact: (kind: string) => {
    tone(70, 0.35, 'sine', 0.5, 0, 35);
    if (kind === 'rock') noise(0.3, 0.5, 400, 0.8, 0, 'lowpass');
    if (kind === 'ice') [0, 7, 12].forEach((s, i) => tone(semi(1318, s), 0.3, 'sine', 0.07, i * 0.03));
    if (kind === 'magma') noise(0.6, 0.35, 900, 0.4);
    if (kind === 'seed') [0, 4, 7].forEach((s, i) => tone(semi(660, s), 0.18, 'triangle', 0.08, i * 0.05));
    if (kind === 'storm') noise(0.8, 0.25, 3000, 0.3);
    if (kind === 'sun') [0, 4, 7, 12].forEach((s, i) => tone(semi(523, s), 0.4, 'triangle', 0.08, i * 0.04));
  },
  miss: () => tone(400, 0.4, 'sine', 0.08, 0, 120),
  bloom: (step: number) => tone(semi(523, PENTA[Math.min(step, PENTA.length - 1)]), 0.25, 'triangle', 0.1),
  creature: (rare: boolean) => {
    const seq = rare ? [0, 4, 7, 12, 16, 19, 24] : [0, 7, 12];
    seq.forEach((s, i) => tone(semi(659, s), 0.22, 'square', 0.05, i * 0.07));
    tone(semi(330, 0), 0.6, 'triangle', 0.08, 0.05);
  },
  star: (i: number) => {
    tone(semi(784, i * 4), 0.4, 'triangle', 0.12);
    noise(0.2, 0.1, 6000, 2);
  },
  win: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(semi(523, s), 0.3, 'triangle', 0.1, i * 0.08)),
  lose: () => [0, -3, -7].forEach((s, i) => tone(semi(392, s), 0.4, 'triangle', 0.1, i * 0.18)),
  coin: () => {
    tone(1318, 0.07, 'square', 0.05);
    tone(1760, 0.14, 'square', 0.05, 0.06);
  },
  gem: () => [0, 12, 19, 24].forEach((s, i) => tone(semi(880, s), 0.14, 'sine', 0.08, i * 0.05)),
  error: () => tone(160, 0.2, 'square', 0.06),
};

// Slow, spacey pad loop.
const CHORDS = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 67],
];
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function startMusic() {
  const c = ensure();
  if (!c || !musicBus) return;
  musicBus.gain.setTargetAtTime(0.3, c.currentTime, 2);
  let bar = 0;
  const len = 3.2;
  let next = c.currentTime + 0.1;
  const tick = () => {
    if (!ctx) return;
    while (next < ctx.currentTime + len * 1.5) {
      const ch = CHORDS[bar % CHORDS.length];
      const w = next - ctx.currentTime;
      ch.forEach((n) => tone(midi(n), len * 1.05, 'sine', 0.03, w, undefined, musicBus));
      tone(midi(ch[0] - 24), len, 'triangle', 0.04, w, undefined, musicBus);
      for (let k = 0; k < 3; k++) tone(midi(ch[(k + bar) % 4] + 12), 0.8, 'sine', 0.015, w + k * 1.05 + 0.4, undefined, musicBus);
      next += len;
      bar++;
    }
  };
  tick();
  musicTimer = window.setInterval(tick, 900);
}

function stopMusic() {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
}
