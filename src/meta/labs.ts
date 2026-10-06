import { KINDS, type Kind } from '../core/world';
import { FEAT_OF, LAB_MAX, LAB_TEACH, type FeatId } from '../core/labperks';
import { REACTIONS, type StepResult } from '../core/round';
import { TROUBLES } from '../core/troubles';
import type { RoundMode } from '../core/modifiers';
import type { Profile } from './profile';
import { BUILD_TIME, busyDrones, drones, type BuildCheck } from './homeworld';
import { LAB_BUILD_COST, LAB_COST, LAB_ESSENCE_COST } from './tuning';
import { balance, spend } from './wallet';
import { unlocked } from './unlocks';
import type { Mat } from './constellations';

export type LabCheck = 'ok' | 'max' | 'locked' | 'untaught' | 'cap' | 'nobuilding' | 'dust' | 'essence';
export const LAB_ESSENCE: Record<Kind, Mat> = { rock: 'stone', ice: 'frost', seed: 'leaf', magma: 'ember', storm: 'dew', sun: 'leaf' };
export const labLevel = (p: Profile, kind: Kind): number => Math.max(1, Math.min(LAB_MAX, p.lab?.[kind] ?? 1));
export function labLevels(p: Profile): Record<Kind, number> {
  return Object.fromEntries((Object.keys(KINDS) as Kind[]).map((kind) => [kind, labLevel(p, kind)])) as Record<Kind, number>;
}
export const labCap = (p: Profile): number => Math.min(LAB_MAX, p.home.ring + 1);
export function labCost(kind: Kind, toLevel: 2 | 3 | 4 | 5) {
  return { dust: LAB_COST[toLevel], essence: LAB_ESSENCE[kind], amount: LAB_ESSENCE_COST[toLevel] };
}
export function perkTaught(p: Profile, kind: Kind, level: 2 | 3 | 4 | 5): boolean {
  if (level === 2) return true;
  if (level === 5) return p.level > 9;
  const teach = LAB_TEACH[kind];
  return level === 3 ? teach.fusion.every((id) => p.level > REACTIONS[id].debut) : teach.guard.every((id) => p.level > TROUBLES[id].debut);
}
export function labPlot(p: Profile, kind: Kind): number {
  return p.home.plots.findIndex((b) => b?.type === 'lab' && b.kind === kind);
}
export function canLevelLab(p: Profile, kind: Kind): LabCheck {
  const lv = labLevel(p, kind);
  if (lv >= LAB_MAX) return 'max';
  if (!unlocked(p, kind)) return 'locked';
  if (labPlot(p, kind) < 0) return 'nobuilding';
  if (lv + 1 > labCap(p)) return 'cap';
  if (!perkTaught(p, kind, (lv + 1) as 2 | 3 | 4 | 5)) return 'untaught';
  const cost = labCost(kind, (lv + 1) as 2 | 3 | 4 | 5);
  if (p.dust < cost.dust) return 'dust';
  if (balance(p, cost.essence) < cost.amount) return 'essence';
  return 'ok';
}
export function levelLab(p: Profile, kind: Kind): LabCheck {
  const check = canLevelLab(p, kind);
  if (check !== 'ok') return check;
  const next = (labLevel(p, kind) + 1) as 2 | 3 | 4 | 5;
  const cost = labCost(kind, next);
  spend(p, 'dust', cost.dust, 'lab');
  spend(p, cost.essence, cost.amount, 'lab');
  p.lab = { ...p.lab, [kind]: next };
  return 'ok';
}
export function labBuildCost(p: Profile, kind: Kind): number {
  return labLevel(p, kind) > 1 || !p.home.labFreeUsed ? 0 : LAB_BUILD_COST;
}
export function canBuildLab(p: Profile, plot: number, kind: Kind, now = Date.now()): BuildCheck | 'locked' {
  if (!unlocked(p, kind) || p.level < 5) return 'locked';
  if (labPlot(p, kind) >= 0) return 'max';
  const h = p.home;
  if (now < (h.lastTick ?? 0)) return 'busy';
  if (plot < 0 || plot >= h.plots.length || h.plots[plot]) return 'occupied';
  if (h.debris.includes(plot)) return 'debris';
  if (busyDrones(h, now) >= drones(p)) return 'drones';
  if (p.dust < labBuildCost(p, kind)) return 'dust';
  return 'ok';
}
export function buildLab(p: Profile, plot: number, kind: Kind, now = Date.now()): BuildCheck | 'locked' {
  const check = canBuildLab(p, plot, kind, now);
  if (check !== 'ok') return check;
  const cost = labBuildCost(p, kind);
  if (cost) spend(p, 'dust', cost, 'build');
  if (labLevel(p, kind) === 1 && !p.home.labFreeUsed) p.home.labFreeUsed = true;
  p.home.plots[plot] = { type: 'lab', kind, lv: 1, since: now, done: now + BUILD_TIME[1] };
  return 'ok';
}
export function formState(p: Profile, kind: Kind) {
  const { feat, goal } = FEAT_OF[kind];
  const progress = Math.min(goal, p.feats[feat] ?? 0);
  const earned = progress >= goal;
  const usable = earned && labLevel(p, kind) >= 5;
  return { feat, progress, goal, earned, usable, on: usable && p.forms[kind] === true };
}
export function setForm(p: Profile, kind: Kind, on: boolean): boolean {
  if (!formState(p, kind).usable) return false;
  p.forms = { ...p.forms, [kind]: on };
  return true;
}
export function activeForms(p: Profile): Partial<Record<Kind, boolean>> {
  return Object.fromEntries((Object.keys(KINDS) as Kind[]).map((kind) => [kind, formState(p, kind).on]));
}
export function recordLabEvents(
  p: Profile,
  step: Pick<StepResult, 'reactions' | 'troubleEvents'> & { kind: Kind },
  mode: RoundMode,
): Kind[] {
  if (mode !== 'campaign' && mode !== 'voyage' && mode !== 'zen') return [];
  const increments: Partial<Record<FeatId, number>> = {};
  for (const event of step.reactions)
    if (event.id === 'glacier' || event.id === 'steam' || event.id === 'rainGarden' || event.id === 'wildflowers')
      increments[event.id] = (increments[event.id] ?? 0) + 1;
  if (step.kind === 'magma') {
    const n = step.troubleEvents.filter((e) => e.id === 'vine' && e.kind === 'settled' && e.clearedByThrow).length;
    if (n) increments.vineBurned = n;
  }
  if (step.kind === 'storm') {
    const n = step.troubleEvents.filter((e) => e.id === 'vent' && e.kind === 'settled' && e.clearedByThrow).length;
    if (n) increments.ventCooled = n;
  }
  for (const [feat, n] of Object.entries(increments)) p.feats[feat as FeatId] = (p.feats[feat as FeatId] ?? 0) + n;
  return (Object.keys(KINDS) as Kind[]).filter((kind) => {
    if (!formState(p, kind).earned || p.formsSeen.includes(kind)) return false;
    p.formsSeen.push(kind);
    return true;
  });
}
export function suggestedFirstLab(p: Profile): Kind {
  const candidates: Kind[] = [
    'rock',
    'seed',
    ...((p.mats.frost ?? 0) >= 10 ? ['ice' as const] : []),
    ...((p.mats.ember ?? 0) >= 10 ? ['magma' as const] : []),
  ];
  return candidates.filter((kind) => unlocked(p, kind)).sort((a, b) => (p.flings[b] ?? 0) - (p.flings[a] ?? 0))[0] ?? 'rock';
}
export function essenceFocus(p: Profile, drops: Partial<Record<Mat, number>>): { mat: Mat; amount: number; lab: Kind | null } | null {
  const choices = Object.entries(drops).filter(([, amount]) => (amount ?? 0) > 0) as [Mat, number][];
  if (!choices.length) return null;
  const kinds = Object.keys(KINDS) as Kind[];
  const prospects = choices.flatMap(([mat, amount]) =>
    kinds
      .filter((kind) => LAB_ESSENCE[kind] === mat && labPlot(p, kind) >= 0 && labLevel(p, kind) < 5)
      .map((lab) => ({
        mat,
        amount,
        lab,
        gap: Math.max(0, labCost(lab, (labLevel(p, lab) + 1) as 2 | 3 | 4 | 5).amount - balance(p, mat)),
      })),
  );
  prospects.sort((a, b) => a.gap - b.gap || Number(b.lab === 'seed') - Number(a.lab === 'seed') || b.amount - a.amount);
  if (prospects.length) {
    const { mat, amount, lab } = prospects[0];
    return { mat, amount, lab };
  }
  const [mat, amount] = choices.sort((a, b) => b[1] - a[1])[0];
  return { mat, amount, lab: null };
}
