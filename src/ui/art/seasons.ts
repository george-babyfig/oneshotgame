// Seasonal weather drawn over scenes: snow, blossoms, fireflies, leaves, and
// meteor streaks during real meteor showers. Stateless: positions come from time.
import { SEASON_DRESSING, type Season } from '../../meta/seasons';
import type { FriendActivity } from '../../meta/friends';

type G = CanvasRenderingContext2D;
const fr = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => fr(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

export function drawSeason(g: G, w: number, h: number, time: number, season: Season, night = 0, count = 36) {
  g.save();
  for (let i = 0; i < count; i++) {
    const sp = 0.5 + rnd(i, 1) * 0.8;
    const x0 = rnd(i, 2) * w;
    switch (season) {
      case 'winter': {
        const y = fr(rnd(i, 3) + time * 0.05 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * sp + i) * 14;
        g.globalAlpha = 0.5 + rnd(i, 4) * 0.4;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x, y, 1.2 + rnd(i, 5) * 2.2, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'spring': {
        const y = fr(rnd(i, 3) + time * 0.035 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * 0.8 * sp + i) * 26;
        g.globalAlpha = 0.55;
        g.fillStyle = i % 3 ? '#ffc2dc' : '#ffe3ef';
        g.save();
        g.translate(x, y);
        g.rotate(time * sp + i);
        g.beginPath();
        g.ellipse(0, 0, 4, 2.4, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        break;
      }
      case 'autumn': {
        const y = fr(rnd(i, 3) + time * 0.03 * sp) * (h + 20) - 10;
        const x = x0 + Math.sin(time * 0.7 * sp + i) * 30;
        g.globalAlpha = 0.6;
        g.fillStyle = ['#ff8a3d', '#e0552f', '#ffc14a'][i % 3];
        g.save();
        g.translate(x, y);
        g.rotate(Math.sin(time * 2 + i) * 1.2);
        g.beginPath();
        g.moveTo(0, -5);
        g.quadraticCurveTo(5, 0, 0, 5);
        g.quadraticCurveTo(-5, 0, 0, -5);
        g.fill();
        g.restore();
        break;
      }
      case 'summer': {
        if (night < 0.3 || i > count * 0.6) break;
        const x = x0 + Math.sin(time * 0.6 * sp + i) * 20;
        const y = rnd(i, 3) * h * 0.9 + Math.cos(time * 0.5 * sp + i) * 16;
        const blink = Math.max(0, Math.sin(time * 2.2 * sp + i * 3));
        g.globalAlpha = blink * night;
        const gl = g.createRadialGradient(x, y, 0, x, y, 7);
        gl.addColorStop(0, 'rgba(230,255,140,0.95)');
        gl.addColorStop(1, 'rgba(230,255,140,0)');
        g.fillStyle = gl;
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.fill();
        break;
      }
    }
  }
  g.restore();
}

/** Homeworld-only weather layer; a zero time value is a complete still illustration. */
export function drawHomeworldWeather(g: G, w: number, h: number, kind: string, time: number, still: boolean) {
  if (kind === 'clear') return;
  const phase = still ? 0 : time;
  const count = kind === 'snow' ? 18 : kind === 'drizzle' ? 24 : kind === 'starry' ? 14 : 10;
  g.save();
  g.lineWidth = kind === 'drizzle' ? 1.5 : 1;
  for (let i = 0; i < count; i++) {
    const x = fr(rnd(i, 27) + (still ? 0 : phase * (kind === 'breezy' ? 0.025 : 0.04))) * w;
    const y = fr(rnd(i, 29) + (still ? 0 : phase * (0.03 + rnd(i, 31) * 0.02))) * h;
    g.globalAlpha = 0.35 + rnd(i, 33) * 0.35;
    if (kind === 'drizzle') {
      g.strokeStyle = '#b9d8f7';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 4, y + 12);
      g.stroke();
    } else if (kind === 'snow') {
      g.fillStyle = '#f5fbff';
      g.beginPath();
      g.arc(x, y, 1.4 + rnd(i, 35) * 1.8, 0, Math.PI * 2);
      g.fill();
    } else if (kind === 'starry') {
      g.fillStyle = '#fff5d5';
      g.beginPath();
      g.arc(x, y, 1.5 + rnd(i, 35), 0, Math.PI * 2);
      g.fill();
    } else if (kind === 'breezy') {
      g.strokeStyle = '#d8f5e9';
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 8, y - 4, x + 17, y);
      g.stroke();
    }
  }
  g.restore();
}

/** Static season trim is cheap enough to draw on the rotating rim. */
export function drawSeasonRim(g: G, cx: number, cy: number, radius: number, season: Season): void {
  const dressing = SEASON_DRESSING[season];
  g.save();
  g.strokeStyle = dressing.groundTint;
  g.globalAlpha = 0.58;
  g.lineWidth = season === 'winter' ? 5 : 3;
  g.beginPath();
  g.arc(cx, cy, radius - 2, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = dressing.groundTint;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16;
    const x = cx + Math.cos(a) * radius * 0.92;
    const y = cy + Math.sin(a) * radius * 0.92;
    g.beginPath();
    if (dressing.rim === 'snow') g.arc(x, y, 3, 0, Math.PI * 2);
    else if (dressing.rim === 'leaves') g.ellipse(x, y, 4, 2, a, 0, Math.PI * 2);
    else if (dressing.rim === 'petals') g.ellipse(x, y, 3, 2, a, 0, Math.PI * 2);
    else g.arc(x, y, 1.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A roof-level cue makes all four building dressings visible in still mode. */
export function drawSeasonTrim(g: G, x: number, y: number, size: number, season: Season): void {
  const dressing = SEASON_DRESSING[season];
  g.save();
  g.translate(x, y);
  g.strokeStyle = dressing.groundTint;
  g.fillStyle = dressing.buildings === 'lights' ? '#fff5a8' : dressing.groundTint;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-size * 0.25, -size * 0.46);
  g.quadraticCurveTo(0, -size * 0.56, size * 0.25, -size * 0.46);
  g.stroke();
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.arc(i * size * 0.19, -size * 0.5, dressing.buildings === 'wreaths' ? 2.5 : 1.7, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

const ACTIVITY_ICON: Partial<Record<FriendActivity, string>> = {
  stir: '✦',
  head_home: '⌂',
  walk_home: '➜',
  sleep: 'z',
  night_wander: '✦',
  sunbathe: '☀',
  splash: '∿',
  tend_flowers: '✿',
  climb: '▲',
  float: '◌',
  warm_lantern: '✦',
  fountain_bubbles: '◌',
  flower_picnic: '✿',
  stargaze: '★',
  landmark_rest: '♡',
  puddle_dance: '∿',
  snow_play: '❄',
  huddle: '❄',
  leaf_play: '🍂',
  petal_play: '🌸',
  signature: '✦',
};

export function drawFriendActivity(g: G, activity: FriendActivity, x: number, y: number, size: number): void {
  const icon = ACTIVITY_ICON[activity];
  if (!icon) return;
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${Math.max(11, Math.round(size * 0.38))}px system-ui`;
  g.fillStyle = activity === 'sleep' ? '#dbe9ff' : '#fff2c9';
  g.fillText(icon, x + size * 0.3, y - size * 0.62);
  g.restore();
}

/** Occasional meteor streaks across the sky (meteor-shower days, or night-time). */
export function drawMeteors(g: G, w: number, h: number, time: number, rate = 1) {
  g.save();
  for (let i = 0; i < 3 * rate; i++) {
    const period = 3.5 + i * 1.3;
    const k = fr((time + i * 1.7) / period);
    if (k > 0.18) continue;
    const u = k / 0.18;
    const cyc = Math.floor((time + i * 1.7) / period);
    const sx = rnd(cyc, i) * w * 1.2;
    const sy = rnd(cyc, i + 9) * h * 0.4;
    const x = sx - u * w * 0.35;
    const y = sy + u * h * 0.2;
    const gr = g.createLinearGradient(x, y, x + 60, y - 34);
    gr.addColorStop(0, `rgba(255,255,255,${1 - u})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 60, y - 34);
    g.stroke();
  }
  g.restore();
}
