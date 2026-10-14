import type { App } from '../app';
import type { Kind } from '../../core/world';
import { KINDS } from '../../core/world';
import { LAB_MAX } from '../../core/labperks';
import { labLevel, labCost, canLevelLab, levelLab, formState, setForm, perkTaught, labPlot } from '../../meta/labs';
import { LAB_NAME, LAB_LEVEL, LAB_FORM, LAB_TEXT } from '../../meta/labcopy';
import { MAT_EMOJI, type Mat } from '../../meta/constellations';
import { flings, RECORD_STEPS, recordStars } from '../../meta/records';
import { projectileCanvas } from '../art/projectiles';
import { h, btn, fmt, toast } from '../dom';
import { t } from '../../i18n';
import { sfx } from '../audio';
import { showLabLevelUp } from '../flows/labmoments';
import { whenText } from '../../meta/dates';
import { getLang } from '../../i18n';

const ELEMENT_ICON: Record<Kind, string> = { rock: '⛰️', ice: '💧', seed: '🌱', magma: '🔥', storm: '☁️', sun: '☀️' };
function essenceHint(mat: Mat): string {
  switch (mat) {
    case 'stone':
      return t('Grow more mountain lands for stone');
    case 'frost':
      return t('Grow more frozen lands for frost');
    case 'leaf':
      return t('Grow more green lands for leaf');
    case 'ember':
      return t('Grow more warm lands for ember');
    case 'dew':
      return t('Grow more watery lands for dew');
  }
}

function essenceProgress(mat: Mat, have: number, need: number): string {
  const vars = { have: fmt(have), need, icon: MAT_EMOJI[mat] };
  switch (mat) {
    case 'stone':
      return t('{have} of {need} {icon} stone', vars);
    case 'frost':
      return t('{have} of {need} {icon} frost', vars);
    case 'leaf':
      return t('{have} of {need} {icon} leaf', vars);
    case 'ember':
      return t('{have} of {need} {icon} ember', vars);
    case 'dew':
      return t('{have} of {need} {icon} dew', vars);
  }
}

function pips(label: string, base: number, bonus: number) {
  return h(
    'div',
    {
      class: 'lab-stat',
      'aria-label': t('{stat} {value} of {max}', { stat: t(label), value: base + bonus, max: Math.max(4, base + bonus) }),
    },
    h('span', null, t(label)),
    h(
      'span',
      { class: 'lab-stat-pips', 'aria-hidden': 'true' },
      ...Array.from({ length: Math.max(4, base + bonus) }, (_, i) =>
        h('i', { class: i < base ? 'filled' : i < base + bonus ? 'gold' : '' }),
      ),
    ),
  );
}

function formSwitch(label: string, on: boolean, toggle: () => void) {
  const button = btn(label, 'ghost lab-form-switch', toggle);
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-checked', String(on));
  button.setAttribute('aria-label', label);
  return button;
}

/** A built Lab uses the saved profile level, never the plot building level. */
export function labCard(app: App, kind: Kind, refresh: () => void): HTMLElement {
  const p = app.p;
  const lv = labLevel(p, kind);
  const plot = labPlot(p, kind);
  const building = plot >= 0 && !!p.home.plots[plot]?.done && p.home.plots[plot]!.done! > Date.now();
  const check = !perkTaught(p, kind, Math.min(LAB_MAX, labLevel(p, kind) + 1) as 2 | 3 | 4 | 5) ? 'untaught' : canLevelLab(p, kind);
  const form = formState(p, kind);
  const next = Math.min(LAB_MAX, lv + 1) as 2 | 3 | 4 | 5;
  const cost = lv < LAB_MAX && check !== 'untaught' ? labCost(kind, next) : null;
  const formTaught = perkTaught(p, kind, kind === 'magma' || kind === 'storm' ? 4 : 3);
  const ready =
    building && p.home.plots[plot]?.done
      ? t('{name} is being built · ready at {time}', {
          name: t(LAB_NAME[kind]),
          time: whenText(p.home.plots[plot]!.done!, Date.now(), getLang()),
        })
      : null;
  const record = flings(p, kind);
  return h(
    'div',
    { class: 'hw-lab-card', style: `--lab-color:${KINDS[kind].color}` },
    h(
      'div',
      { class: 'hw-head' },
      projectileCanvas(kind, 56),
      h(
        'div',
        null,
        h('div', { class: 'hw-title' }, t(LAB_NAME[kind]), ' ', h('small', null, t('Lv {n}', { n: lv }))),
        h('small', null, ELEMENT_ICON[kind], ' ', t(KINDS[kind].stats.element)),
        h('p', { class: 'muted' }, t(KINDS[kind].stats.job)),
        h(
          'small',
          { class: 'rec' },
          t('Record {stars} · {n} flung', {
            stars: '★'.repeat(recordStars(record)) + '☆'.repeat(RECORD_STEPS.length - recordStars(record)),
            n: fmt(record),
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'lab-stats' },
      pips('Power', KINDS[kind].stats.power, lv >= 2 ? 1 : 0),
      pips('Reach', KINDS[kind].stats.reach, lv >= 5 && kind !== 'storm' && kind !== 'sun' ? 1 : 0),
    ),
    h('div', { class: 'sec-title' }, t(LAB_TEXT.next)),
    h('p', null, lv === 1 ? t(KINDS[kind].stats.job) : t(LAB_LEVEL[kind][lv as 2 | 3 | 4 | 5])),
    h(
      'div',
      { class: 'lab-ladder' },
      ...([2, 3, 4, 5] as const).map((n) =>
        h(
          'div',
          { class: `lab-rung ${n <= lv ? 'got' : n === lv + 1 ? 'next' : 'locked'}` },
          h('b', null, n <= lv ? '✓ ' : '', t('Lv {n}', { n })),
          h('span', null, n > lv && !perkTaught(p, kind, n) ? t(LAB_TEXT.later) : t(LAB_LEVEL[kind][n])),
        ),
      ),
    ),
    ready ? h('p', { class: 'hw-timer', 'aria-live': 'polite' }, ready) : null,
    lv < LAB_MAX
      ? h(
          'div',
          { class: 'lab-buy' },
          check === 'untaught'
            ? h('p', { class: 'muted' }, t(LAB_TEXT.later))
            : check === 'cap'
              ? h('p', { class: 'muted' }, t(LAB_TEXT.ring, { n: lv }))
              : check === 'nobuilding'
                ? h('p', { class: 'muted' }, t(LAB_TEXT.needBuilding))
                : cost
                  ? h(
                      'div',
                      null,
                      h('p', null, t(LAB_TEXT.labCost, { dust: fmt(cost.dust), icon: MAT_EMOJI[cost.essence], amount: cost.amount })),
                      h('small', null, essenceProgress(cost.essence, p.mats[cost.essence] ?? 0, cost.amount)),
                      h(
                        'div',
                        {
                          class: 'lab-have',
                          role: 'meter',
                          'aria-valuenow': Math.min(p.mats[cost.essence] ?? 0, cost.amount),
                          'aria-valuemin': 0,
                          'aria-valuemax': cost.amount,
                        },
                        h('i', { style: `width:${Math.min(100, ((p.mats[cost.essence] ?? 0) / cost.amount) * 100)}%` }),
                      ),
                      btn(t(LAB_TEXT.level), check === 'ok' && !building ? 'primary wide' : 'ghost wide dim', () => {
                        if (building) return toast(ready ?? t(LAB_TEXT.ready, { time: '' }));
                        const result = levelLab(p, kind);
                        if (result !== 'ok') {
                          sfx.error();
                          return toast(
                            result === 'essence' ? essenceHint(cost.essence) : t(result === 'dust' ? LAB_TEXT.needDust : LAB_TEXT.later),
                          );
                        }
                        app.save();
                        refresh();
                        showLabLevelUp(app, kind, lv + 1);
                      }),
                    )
                  : null,
        )
      : null,
    h(
      'div',
      { class: 'lab-form' },
      h('div', { class: 'sec-title' }, t(LAB_TEXT.form)),
      h(
        'div',
        { class: form.earned ? 'lab-form-found' : 'lab-form-shadow' },
        form.earned ? projectileCanvas(kind, 38) : '◇',
        h('b', null, form.earned ? t(LAB_FORM[kind].name) : '?'),
      ),
      h('p', null, formTaught ? t(LAB_FORM[kind].line) : t(LAB_TEXT.later)),
      formTaught ? h('small', null, t(LAB_FORM[kind].feat), ` ${form.progress}/${form.goal}`) : null,
      form.usable
        ? formSwitch(
            t('{form}: {state}', { form: t(LAB_FORM[kind].name), state: t(form.on ? LAB_TEXT.on : LAB_TEXT.off) }),
            form.on,
            () => {
              setForm(p, kind, !form.on);
              app.save();
              refresh();
            },
          )
        : h('p', { class: 'muted' }, t(lv < 5 ? LAB_TEXT.formNeedsLevel : LAB_TEXT.formNeedsFeat)),
    ),
  );
}
