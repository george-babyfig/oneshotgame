// Render a shareable "postcard" of a planet and hand it to the share sheet.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SPECIES_BY_ID, type Planet } from '../core/world';
import { renderPlanet } from './art/planet';
import { drawCreature } from './art/critters';
import { shareText } from './share';
import { toast } from './dom';

export interface PostcardInfo {
  title: string;
  subtitle: string;
  stars: number;
  glow: string;
}

export function renderPostcard(planet: Planet, info: PostcardInfo): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, H * 0.8);
  bg.addColorStop(0, '#3a2a8a');
  bg.addColorStop(0.6, '#171248');
  bg.addColorStop(1, '#0b0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#fff';
  for (let i = 0; i < 160; i++) {
    g.globalAlpha = 0.3 + rnd() * 0.7;
    g.beginPath();
    g.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const R = 300;
  renderPlanet(g, planet, {
    cx: W / 2,
    cy: H * 0.52,
    R,
    rot: -Math.PI / 2,
    time: 1.2,
    glow: info.glow,
    lifeK: 0.9,
    creature: (gg, i, x, y, a) => {
      const sp = SPECIES_BY_ID[planet.sectors[i].species!];
      if (sp)
        drawCreature(gg, sp.id, x, y, a + Math.PI / 2, R * (sp.rarity === 'common' ? 0.2 : sp.rarity === 'uncommon' ? 0.24 : 0.3), 0.5 + i);
    },
  });
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '700 76px Fredoka, ui-rounded, system-ui, sans-serif';
  g.fillText(info.title, W / 2, 150);
  g.font = '500 40px Fredoka, ui-rounded, system-ui, sans-serif';
  g.fillStyle = '#c9c2ff';
  g.fillText(info.subtitle, W / 2, 210);
  g.font = '700 70px Fredoka, ui-rounded, system-ui, sans-serif';
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i < info.stars ? '#ffb13d' : '#3b3766';
    g.fillText('★', W / 2 + (i - 1) * 80, 1165);
  }
  g.font = '700 46px Fredoka, ui-rounded, system-ui, sans-serif';
  g.fillStyle = '#5ef2b0';
  g.fillText('Pocket Planet', W / 2, 1270);
  return c;
}

export async function sharePostcard(planet: Planet, info: PostcardInfo, text: string) {
  const canvas = renderPostcard(planet, info);
  const dataUrl = canvas.toDataURL('image/png');
  try {
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({
        path: `postcard-${Date.now()}.png`,
        data: dataUrl.split(',')[1],
        directory: Directory.Cache,
      });
      await Share.share({ title: 'Pocket Planet', text, files: [file.uri] });
      return;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const f = new File([blob], 'pocket-planet.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f], text });
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'pocket-planet.png';
    a.click();
    toast('Postcard saved', 'good');
  } catch (e) {
    if (!/cancel|abort/i.test(String((e as Error)?.message ?? e))) shareText(text);
  }
}
