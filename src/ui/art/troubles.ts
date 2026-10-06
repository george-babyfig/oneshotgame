import { SECTORS, type Planet } from '../../core/world';
import {
  firebreakBy,
  troubleTarget,
  type GuardContext,
  type TroubleEvent,
  type TroubleForecast,
  type TroubleState,
} from '../../core/troubles';

export const troubleTargetShape = (id: TroubleState['id'], blocked: boolean): string =>
  blocked ? '▣' : id === 'vent' ? '◆' : id === 'vine' ? '▲' : '●';

export function protectedWallSectors(planet: Planet, id: TroubleState['id'], forecasts: TroubleForecast[], guard?: GuardContext): number[] {
  return Array.from({ length: SECTORS }, (_, sector) => sector).filter(
    (sector) =>
      !!firebreakBy(planet, sector, id, guard) || forecasts.some((beat) => beat.id === id && beat.sector === sector && !!beat.blockedBy),
  );
}

/** A due preview event wins over the next target on the resulting planet. */
export function previewTroubleTarget(planet: Planet, trouble: TroubleState, events: TroubleEvent[] = []): number | null {
  const event = events.find((entry) => entry.id === trouble.id);
  return event?.kind === 'settled' ? null : (event?.sector ?? troubleTarget(planet, trouble));
}

/** Sources, forecast arrows and protected walls share the planet's sector geometry. */
export function drawTroubles(
  g: CanvasRenderingContext2D,
  planet: Planet,
  troubles: TroubleState[],
  cx: number,
  cy: number,
  radius: number,
  rot: number,
  time: number,
  reduceMotion: boolean,
  targetPlanet: Planet = planet,
  previewEvents: TroubleEvent[] = [],
  forecasts: TroubleForecast[] = [],
  guard?: GuardContext,
  targetGuard: GuardContext = guard ?? { lab: {} },
): void {
  const step = (Math.PI * 2) / SECTORS;
  const point = (sector: number, reach: number) => {
    const angle = rot + (sector + 0.5) * step;
    return [cx + Math.cos(angle) * radius * reach, cy + Math.sin(angle) * radius * reach] as const;
  };
  g.save();
  for (const trouble of troubles) {
    if (trouble.id === 'vine') {
      for (const sector of trouble.tangled ?? []) {
        const angle = rot + (sector + 0.5) * step;
        g.save();
        g.strokeStyle = '#183c32';
        g.lineWidth = Math.max(7, radius * 0.085);
        g.setLineDash([7, 4]);
        g.beginPath();
        g.arc(cx, cy, radius * 0.89, angle - step * 0.43, angle + step * 0.43);
        g.stroke();
        g.setLineDash([]);
        const [vx, vy] = point(sector, 0.88);
        g.fillStyle = '#f5ffe0';
        g.strokeStyle = '#17342d';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(vx, vy, Math.max(8, radius * 0.075), 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#17342d';
        g.font = `${Math.max(12, Math.round(radius * 0.12))}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('✿', vx, vy);
        g.restore();
      }
    }
    const [sx, sy] = point(trouble.source, 1.12);
    const color = trouble.settled ? '#84dfac' : trouble.id === 'vent' ? '#ffad72' : trouble.id === 'vine' ? '#8bd773' : '#b8e7ff';
    g.fillStyle = color;
    g.strokeStyle = '#203342';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(sx, sy, radius * 0.105, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#17302f';
    g.font = `${Math.round(radius * 0.13)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(trouble.settled ? '✓' : trouble.id === 'vent' ? '♨' : trouble.id === 'vine' ? '✿' : '❄', sx, sy + 1);
    if (trouble.settled) continue;
    const target = previewTroubleTarget(targetPlanet, trouble, previewEvents);
    if (target !== null) {
      const [tx, ty] = point(target, 0.95);
      g.save();
      g.strokeStyle = firebreakBy(targetPlanet, target, trouble.id, targetGuard) ? '#b8f5d3' : color;
      g.lineWidth = 2.5;
      g.setLineDash([3, 5]);
      g.lineDashOffset = reduceMotion ? 0 : -time * 10;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(tx, ty);
      g.stroke();
      g.restore();
      const blocked =
        !!firebreakBy(targetPlanet, target, trouble.id, targetGuard) ||
        !!forecasts.find((beat) => beat.id === trouble.id && beat.sector === target)?.blockedBy;
      g.fillStyle = '#17302f';
      g.beginPath();
      g.arc(tx, ty, Math.max(10, radius * 0.085), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `${Math.max(13, Math.round(radius * 0.12))}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(troubleTargetShape(trouble.id, blocked), tx, ty + 1);
    }
    for (const sector of protectedWallSectors(planet, trouble.id, forecasts, guard)) {
      const [x, y] = point(sector, 1.04);
      g.fillStyle = '#a4e8cf';
      g.strokeStyle = '#173f3b';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(x - 5, y - 6, 10, 12, 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(x - 3, y - 2);
      g.lineTo(x + 3, y - 2);
      g.stroke();
    }
  }
  g.restore();
}
