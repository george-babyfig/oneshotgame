import type { RoundMode } from '../core/modifiers';
import type { RoundEventLog } from './help';
import type { Profile } from './profile';
import type { Mat } from './constellations';
import { MAT_EMOJI, MATS } from './constellations';
import { essenceFocus } from './labs';
import { LAB_FORM, LAB_GUARD_NAME, LAB_NAME, LAB_TEXT, ESSENCE_NAME } from './labcopy';
import { t } from '../i18n';
import { LAUNCHERS, isLaunchRosterId, type LauncherId } from '../core/launchers';

export type LauncherHelpCredit = { id: LauncherId; reason: 'reached' | 'life' | 'creatures' | 'charge' };

/** Credit an observed gain, a saved creature, or a shot the Sling could not land. */
export function launcherHelpReason(
  actual: { before: number; after: number; lost: readonly unknown[]; novaGain: number },
  sling: { after: number; lost: readonly unknown[]; novaGain: number },
  slingSector: number | null | undefined,
): LauncherHelpCredit['reason'] | null {
  if (slingSector === null && actual.after > actual.before) return 'reached';
  if (actual.lost.length < sling.lost.length) return 'creatures';
  if (actual.after > sling.after) return 'life';
  if (actual.novaGain > sling.novaGain) return 'charge';
  return null;
}

export function launcherActuallyHelped(
  actual: { before: number; after: number; lost: readonly unknown[]; novaGain: number },
  sling: { after: number; lost: readonly unknown[]; novaGain: number },
  slingSector: number | null | undefined,
): boolean {
  return launcherHelpReason(actual, sling, slingSector) !== null;
}

/** One concrete contribution, in the order the Homeworld guide promises. */
export function helpedLine(_p: Profile, log: RoundEventLog, mode: RoundMode): string | null {
  if (mode !== 'campaign' && mode !== 'voyage' && mode !== 'zen') return null;
  const guard = log.lab.find((e) => e.type === 'guard');
  if (guard?.type === 'guard') return t(LAB_TEXT.guardHelped, { perk: t(LAB_GUARD_NAME[guard.perk]) });
  if (log.troubles.some((e) => e.buddy)) return t(LAB_TEXT.buddyHelped);
  const form = log.lab.find((e) => e.type === 'form');
  if (form?.type === 'form') return t(LAB_TEXT.formHelped, { form: t(LAB_FORM[form.kind].name) });
  const power = log.lab.find((e) => e.type === 'power');
  if (power?.type === 'power') return t(LAB_TEXT.powerHelped, { name: t(LAB_NAME[power.kind]) });
  const launcher = (log as RoundEventLog & { launcher?: LauncherHelpCredit }).launcher;
  if (launcher && launcher.id !== 'sling' && isLaunchRosterId(launcher.id)) {
    if (launcher.reason === 'creatures') return t('{name} kept more creatures safe.', { name: t(LAUNCHERS[launcher.id].name) });
    if (launcher.reason === 'charge') return t('{name} added more Supernova charge.', { name: t(LAUNCHERS[launcher.id].name) });
    if (launcher.reason === 'life')
      return launcher.id === 'thumper'
        ? t("Thumper's wide landing grew more life.")
        : t('{name} grew more life.', { name: t(LAUNCHERS[launcher.id].name) });
    return launcher.id === 'skipper'
      ? t("Skipper's bounce reached the planet.")
      : t('{name} reached the planet.', { name: t(LAUNCHERS[launcher.id].name) });
  }
  return null;
}

export function essenceLine(p: Profile, drops: Partial<Record<Mat, number>>): string | null {
  const focus = essenceFocus(p, drops);
  if (!focus) return null;
  const main = t(LAB_TEXT.essenceLine, {
    n: focus.amount,
    icon: MAT_EMOJI[focus.mat],
    colour: t(ESSENCE_NAME[focus.mat]),
    lab: focus.lab ? t(LAB_NAME[focus.lab]) : t(LAB_TEXT.pouch),
  });
  const others = MATS.filter((m) => m !== focus.mat && (drops[m] ?? 0) > 0).map((m) =>
    t(LAB_TEXT.otherEssence, { icon: MAT_EMOJI[m], n: drops[m] ?? 0 }),
  );
  return [main, ...others].join(' · ');
}
