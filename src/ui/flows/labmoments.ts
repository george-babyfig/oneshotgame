import type { App } from '../app';
import type { Kind } from '../../core/world';
import { LAB_NAME, LAB_LEVEL, LAB_FORM, LAB_TEXT } from '../../meta/labcopy';
import { t } from '../../i18n';
import { h, btn, modal } from '../dom';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { haptic } from '../haptics';
import { sfx } from '../audio';
import { projectileCanvas } from '../art/projectiles';
import { critterCanvas } from '../art/critters';
import { formState } from '../../meta/labs';

function moment(app: App, kind: Kind, title: string, detail: string) {
  const m = modal(
    [
      h('div', { class: 'lab-moment-icon' }, projectileCanvas(kind, 72)),
      h('div', { class: 'm-title' }, title),
      h('p', null, detail),
      btn(t('Continue'), 'primary wide', () => {
        show.skip();
        m.close();
      }),
    ],
    { cls: 'lab-moment' },
  );
  const show = celebrate('homeworld', {
    root: m.el,
    reduceMotion: effectiveReduceMotion(app.p),
    duration: 1500,
    beats: [
      {
        at: 200,
        play: (instant) => {
          if (!instant) {
            sfx.levelUp();
            haptic.success();
          }
        },
      },
    ],
  });
}

export function showLabLevelUp(app: App, kind: Kind, level: number): void {
  moment(app, kind, t(LAB_TEXT.levelMoment, { name: t(LAB_NAME[kind]), n: level }), t(LAB_LEVEL[kind][level as 2 | 3 | 4 | 5]));
}

export function showFormReveal(app: App, kind: Kind): void {
  const usable = formState(app.p, kind).usable;
  moment(
    app,
    kind,
    usable ? t(LAB_TEXT.formMoment, { form: t(LAB_FORM[kind].name) }) : t('{form} is earned!', { form: t(LAB_FORM[kind].name) }),
    usable ? t('Switch it on in your Lab.') : t('Reach Lab level 5 to switch it on in your Lab.'),
  );
}

export function showFirstFriend(app: App, species: string): void {
  const m = modal(
    [
      h('div', { class: 'lab-friend-ship' }, '🛸', critterCanvas(species, 64)),
      h('div', { class: 'm-title' }, t(LAB_TEXT.friendMoment)),
      h('p', null, t(LAB_TEXT.firstDone)),
      btn(t('Continue'), 'primary wide', () => {
        show.skip();
        m.close();
      }),
    ],
    { cls: 'lab-moment' },
  );
  const show = celebrate('homeworld', {
    root: m.el,
    reduceMotion: effectiveReduceMotion(app.p),
    duration: 1500,
    beats: [
      {
        at: 200,
        play: (instant) => {
          if (!instant) {
            sfx.creature(true);
            haptic.success();
          }
        },
      },
    ],
  });
}
