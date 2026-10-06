import type { RoundMode } from '../core/modifiers';
import type { RoundEventLog } from './help';
import type { Profile } from './profile';
import type { Mat } from './constellations';
import { MAT_EMOJI, MATS } from './constellations';
import { essenceFocus } from './labs';
import { LAB_FORM, LAB_GUARD_NAME, LAB_NAME, LAB_TEXT, ESSENCE_NAME } from './labcopy';
import { t } from '../i18n';

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
