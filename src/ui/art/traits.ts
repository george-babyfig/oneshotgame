import { TRAITS, type TraitId } from '../../core/world';
import { h } from '../dom';
import { t } from '../../i18n';

const COLORS: Record<TraitId, string> = {
  fireproof: '#ffad67',
  swimmer: '#83dcff',
  weedproof: '#a9e885',
  frostproof: '#c7e9ff',
  calm: '#e8ccff',
};

/** Text and shape stay visible even when colour is unavailable. */
export function traitBadge(trait: TraitId, compact = false) {
  const def = TRAITS[trait];
  return h(
    'span',
    { class: `trait-badge trait-${trait}`, style: `--trait-color:${COLORS[trait]}`, title: t(def.rule) },
    h('span', { 'aria-hidden': 'true' }, `⬡ ${def.icon}`),
    compact ? null : h('span', null, t(def.name)),
  );
}

export function drawTraitBadge(g: CanvasRenderingContext2D, x: number, y: number, trait: TraitId, size = 20) {
  g.save();
  g.fillStyle = '#182735';
  g.strokeStyle = COLORS[trait];
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const px = x + Math.cos(angle) * size * 0.55;
    const py = y + Math.sin(angle) * size * 0.55;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.font = `${Math.round(size * 0.65)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(TRAITS[trait].icon, x, y + 1);
  g.restore();
}

/** A soft shield with a small spark that contracts as t runs from 0 to 1. */
export function drawShieldPuff(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const progress = Math.max(0, Math.min(1, t));
  const radius = 10 + 22 * progress;
  g.save();
  g.globalAlpha = 1 - progress;
  g.fillStyle = 'rgba(169, 232, 255, 0.22)';
  g.strokeStyle = '#d6f7ff';
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x, y, 3 + 2 * (1 - progress), 0, Math.PI * 2);
  g.fill();
  g.restore();
}
