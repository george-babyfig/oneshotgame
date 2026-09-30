// All sounds are synthesised with WebAudio — no audio files to ship.
import type { Kind } from '../core/world';
import { OBJECT_FEEL } from './feel';
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
  sky: (kind: 'bonk' | 'boing' | 'fizz' | 'gust' | 'mist') => {
    if (kind === 'bonk') tone(260, 0.16, 'sine', 0.055, 0, 175);
    else if (kind === 'boing') tone(420, 0.23, 'sine', 0.047, 0, 660);
    else if (kind === 'fizz') {
      noise(0.2, 0.025, 2200);
      tone(770, 0.19, 'sine', 0.035, 0, 500);
    } else if (kind === 'mist') tone(560, 0.24, 'sine', 0.025, 0, 610);
    else noise(0.23, 0.018, 1300);
  },
  click: () => tone(880, 0.05, 'triangle', 0.1),
  sheet: () => tone(520, 0.1, 'sine', 0.045, 0, 740),
  toast: () => tone(740, 0.08, 'sine', 0.035, 0, 880),
  page: () => tone(460, 0.09, 'triangle', 0.035, 0, 620),
  zoom: () => tone(340, 0.16, 'sine', 0.07, 0, 700),
  countTick: () => tone(920, 0.035, 'sine', 0.025),
  rewardFlight: () => tone(660, 0.25, 'sine', 0.06, 0, 1100),
  rewardArrive: () => tone(1180, 0.1, 'triangle', 0.06),
  burst: () => tone(990, 0.12, 'sine', 0.05, 0, 1450),
  shake: () => tone(130, 0.11, 'sine', 0.065),
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
  objectLaunch: (kind: Kind) => {
    const sound = OBJECT_FEEL[kind].launch;
    if (sound === 'thud') tone(160, 0.18, 'sine', 0.12, 0, 85);
    else if (sound === 'chime') tone(880, 0.24, 'sine', 0.07, 0, 1320);
    else if (sound === 'pop') tone(520, 0.12, 'triangle', 0.1, 0, 740);
    else if (sound === 'rumble') noise(0.3, 0.18, 300, 0.5, 0, 'lowpass');
    else if (sound === 'patter') noise(0.24, 0.12, 2600, 0.4);
    else [0, 7, 12].forEach((step, i) => tone(semi(660, step), 0.15, 'sine', 0.05, i * 0.04));
  },
  objectImpact: (kind: Kind) => {
    const sound = OBJECT_FEEL[kind].impact;
    if (sound === 'thud') {
      tone(95, 0.35, 'sine', 0.35, 0, 42);
      noise(0.3, 0.35, 400, 0.8, 0, 'lowpass');
    } else if (sound === 'chime') [0, 7, 12].forEach((step, i) => tone(semi(1046, step), 0.4, 'sine', 0.09, i * 0.05));
    else if (sound === 'pop') tone(420, 0.2, 'triangle', 0.12, 0, 660);
    else if (sound === 'rumble') {
      tone(70, 0.45, 'sawtooth', 0.17, 0, 42);
      noise(0.4, 0.2, 360, 0.5, 0, 'lowpass');
    } else if (sound === 'patter') [0, 0.07, 0.14].forEach((when) => noise(0.2, 0.13, 2500, 0.6, when));
    else [0, 4, 7, 12].forEach((step, i) => tone(semi(784, step), 0.22, 'triangle', 0.08, i * 0.04));
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
  levelUp: () => {
    [0, 4, 7, 12].forEach((s, i) => tone(semi(392, s), 0.16, 'triangle', 0.09, i * 0.06));
    noise(0.25, 0.08, 5000, 1.5, 0.2);
  },
  chest: () => {
    noise(0.25, 0.3, 700, 0.8, 0, 'lowpass');
    [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(semi(523, s), 0.35, 'triangle', 0.09, 0.2 + i * 0.07));
  },
  whoosh: () => noise(0.3, 0.15, 1800, 0.7, 0, 'bandpass'),
  combo: (n: number) => [0, 4, 7].forEach((s, i) => tone(semi(523, s + Math.min(n, 8) * 2), 0.18, 'square', 0.05, i * 0.05)),
  reaction: (kind: 'fusion' | 'clash') => {
    if (kind === 'fusion') {
      noise(0.28, 0.1, 2400, 0.5);
      [0, 4, 7].forEach((step, i) => tone(semi(659, step), 0.28, 'sine', 0.07, i * 0.055));
    } else {
      tone(440, 0.22, 'sine', 0.07, 0, 370);
      tone(330, 0.26, 'triangle', 0.035, 0.09);
    }
  },
  comboStep: (step: number) => {
    const notes = [0, 2, 4, 7, 12];
    const note = notes[Math.min(Math.max(step, 2), 4)];
    tone(semi(659, note), 0.36, 'sine', 0.085);
    if (step >= 4) tone(semi(659, 16), 0.48, 'sine', 0.055, 0.09);
  },
};

// Generative ambient music. Each theme is a chord loop plus a gentle arpeggio;
// the home screen, each chapter and each mode get their own.
interface Theme {
  chords: number[][];
  len: number; // seconds per chord
  arp: number[]; // chord-tone indices, one per step
  step: number; // seconds per arp step
  wave: OscillatorType;
  bells?: boolean;
  pulse?: boolean;
}

export const THEMES: Record<string, Theme> = {
  home: {
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 67],
    ],
    len: 3.2,
    arp: [0, 2, 3],
    step: 1.05,
    wave: 'sine',
  },
  dawn: {
    chords: [
      [60, 64, 67, 72],
      [65, 69, 72, 76],
      [62, 65, 69, 74],
      [67, 71, 74, 79],
    ],
    len: 3,
    arp: [0, 1, 2, 3, 2, 1],
    step: 0.5,
    wave: 'triangle',
  },
  cinder: {
    chords: [
      [57, 60, 64, 67],
      [55, 59, 62, 66],
      [53, 57, 60, 64],
      [52, 55, 59, 62],
    ],
    len: 3.4,
    arp: [0, 2, 1, 3],
    step: 0.85,
    wave: 'triangle',
  },
  tide: {
    chords: [
      [62, 66, 69, 73],
      [64, 68, 71, 74],
      [62, 66, 69, 73],
      [59, 62, 66, 69],
    ],
    len: 3.6,
    arp: [3, 2, 1, 0, 1, 2],
    step: 0.6,
    wave: 'sine',
    bells: true,
  },
  frost: {
    chords: [
      [57, 60, 64, 69],
      [53, 57, 60, 65],
      [55, 58, 62, 67],
      [52, 56, 59, 64],
    ],
    len: 4,
    arp: [3, 1, 2],
    step: 1.3,
    wave: 'sine',
    bells: true,
  },
  verdant: {
    chords: [
      [60, 62, 67, 69],
      [57, 60, 64, 67],
      [62, 65, 69, 72],
      [55, 60, 62, 67],
    ],
    len: 3,
    arp: [0, 1, 2, 3, 1, 2],
    step: 0.5,
    wave: 'triangle',
  },
  storm: {
    chords: [
      [62, 67, 69, 74],
      [60, 65, 67, 72],
      [58, 63, 65, 70],
      [60, 65, 67, 72],
    ],
    len: 3.2,
    arp: [0, 3, 1, 2],
    step: 0.4,
    wave: 'triangle',
  },
  rush: {
    chords: [
      [57, 60, 64, 69],
      [60, 64, 67, 72],
      [55, 59, 62, 67],
      [53, 57, 60, 65],
    ],
    len: 1.8,
    arp: [0, 1, 2, 3, 2, 1, 0, 2],
    step: 0.225,
    wave: 'square',
    pulse: true,
  },
  zen: {
    chords: [
      [60, 67, 72, 76],
      [57, 64, 69, 72],
      [53, 60, 65, 69],
      [55, 62, 67, 71],
    ],
    len: 5,
    arp: [3, 2],
    step: 2.2,
    wave: 'sine',
    bells: true,
  },
  // bouncy major loop with bells for the home screen while a festival runs
  festival: {
    chords: [
      [60, 64, 67, 72],
      [65, 69, 72, 77],
      [67, 71, 74, 79],
      [65, 69, 72, 77],
    ],
    len: 2.4,
    arp: [0, 2, 1, 3, 2, 1],
    step: 0.3,
    wave: 'triangle',
    bells: true,
  },
  // rolling sea-shanty feel for the Weekly Voyage
  voyage: {
    chords: [
      [57, 60, 64, 69],
      [62, 65, 69, 74],
      [55, 59, 62, 67],
      [57, 60, 64, 69],
    ],
    len: 2.7,
    arp: [0, 1, 2, 1, 2, 3],
    step: 0.45,
    wave: 'triangle',
    bells: true,
  },
};
const CHAPTER_THEMES = ['dawn', 'cinder', 'tide', 'frost', 'verdant', 'storm'];
let theme: Theme = THEMES.home;

/** Switch music theme; takes effect at the next chord. */
export function setMusicTheme(name: string) {
  theme = THEMES[name] ?? THEMES.home;
}
export function chapterTheme(chapter: number) {
  return CHAPTER_THEMES[(chapter - 1) % CHAPTER_THEMES.length];
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function startMusic() {
  const c = ensure();
  if (!c || !musicBus) return;
  musicBus.gain.setTargetAtTime(0.3, c.currentTime, 2);
  let bar = 0;
  let next = c.currentTime + 0.1;
  const tick = () => {
    if (!ctx) return;
    while (next < ctx.currentTime + 4) {
      const th = theme;
      const ch = th.chords[bar % th.chords.length];
      const w = next - ctx.currentTime;
      ch.forEach((n) => tone(midi(n), th.len * 1.05, 'sine', 0.026, w, undefined, musicBus));
      tone(midi(ch[0] - 24), th.len, 'triangle', 0.04, w, undefined, musicBus);
      const steps = Math.max(1, Math.floor(th.len / th.step));
      for (let k = 0; k < steps; k++) {
        const note = ch[th.arp[(k + bar) % th.arp.length] % ch.length] + 12;
        tone(
          midi(note),
          Math.min(0.9, th.step * 1.6),
          th.wave,
          th.wave === 'square' ? 0.008 : 0.016,
          w + k * th.step + 0.05,
          undefined,
          musicBus,
        );
      }
      if (th.bells && bar % 2 === 0) tone(midi(ch[3] + 24), 1.6, 'sine', 0.012, w + th.len * 0.5, undefined, musicBus);
      if (th.pulse) for (let k = 0; k < 4; k++) tone(midi(ch[0] - 12), 0.12, 'triangle', 0.035, w + k * (th.len / 4), undefined, musicBus);
      next += th.len;
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
