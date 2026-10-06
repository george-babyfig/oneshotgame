import { sfx } from './audio';
import { haptic } from './haptics';
import { getLang, t } from '../i18n';
import { MOTION, popIn, popOut, prefersReducedMotion } from './motion';

type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, unknown> | null,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style') el.style.cssText = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Child) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : String(c));
  };
  kids.forEach(add);
  return el;
}

export function btn(label: Child, cls: string, onClick: () => void): HTMLButtonElement {
  const b = h('button', { class: `btn ${cls}`, type: 'button' }, label);
  b.addEventListener('click', () => {
    if (b.disabled) return;
    sfx.click();
    if (b.classList.contains('primary')) haptic.light();
    onClick();
  });
  return b;
}

export const fmt = (n: number) => Math.floor(n).toLocaleString(getLang());
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let overlay: HTMLElement;
let toasts: HTMLElement;
export function mountOverlays(root: HTMLElement) {
  overlay = h('div', { class: 'overlay' });
  toasts = h('div', { class: 'toasts', 'aria-live': 'polite', 'aria-atomic': 'false' });
  root.append(overlay, toasts);
}

export interface Modal {
  el: HTMLElement;
  close: () => void;
}

/** Abort hooks of open modals, run when navigation wipes them (see closeModals). */
const aborts = new Set<() => void>();

/**
 * `onAbort` runs only if the modal is wiped by navigation rather than closed
 * (use it to settle promises, e.g. the parental gate), so nothing is left hanging.
 */
export function modal(content: Child[], opts: { cls?: string; dismiss?: boolean; onClose?: () => void; onAbort?: () => void } = {}): Modal {
  const box = h('div', { class: `modal ${opts.cls ?? ''}` }, ...content);
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const title = box.querySelector<HTMLElement>('.m-title, .end-title, .confirm, h1, h2');
  if (title) {
    title.id ||= `modal-title-${Math.random().toString(36).slice(2)}`;
    box.setAttribute('aria-labelledby', title.id);
  } else box.setAttribute('aria-label', t('Dialog'));
  box.tabIndex = -1;
  const scrim = h('div', { class: 'scrim' }, box);
  let done = false;
  const abort = () => {
    if (done) return;
    done = true;
    opts.onAbort?.();
    opener?.focus();
  };
  if (opts.onAbort) aborts.add(abort);
  const close = () => {
    if (done) return;
    done = true;
    aborts.delete(abort);
    void popOut(box);
    scrim.classList.add('out');
    scrim.style.pointerEvents = 'none';
    setTimeout(() => scrim.remove(), prefersReducedMotion() ? MOTION.calm : MOTION.popOut);
    opts.onClose?.();
    opener?.focus();
  };
  if (opts.dismiss !== false) scrim.addEventListener('click', (e) => e.target === scrim && close());
  overlay.append(scrim);
  popIn(box);
  (box.querySelector<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]') ?? box).focus();
  return { el: box, close };
}

export function closeModals() {
  const pending = [...aborts];
  aborts.clear();
  pending.forEach((f) => f());
  overlay.replaceChildren();
}

export function confirmBox(text: string, yes: string, no = t('Cancel')): Promise<boolean> {
  return new Promise((res) => {
    let answered = false;
    const m = modal(
      [
        h('p', { class: 'confirm' }, text),
        h(
          'div',
          { class: 'row' },
          btn(no, 'ghost', () => {
            answered = true;
            m.close();
            res(false);
          }),
          btn(yes, 'primary', () => {
            answered = true;
            m.close();
            res(true);
          }),
        ),
      ],
      { onClose: () => !answered && res(false), onAbort: () => !answered && res(false) },
    );
  });
}

export function toast(text: string, kind = '') {
  const el = h('div', { class: `toast ${kind}` }, text);
  toasts.append(el);
  sfx.toast();
  haptic.tick();
  while (toasts.children.length > 3) toasts.firstElementChild?.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), prefersReducedMotion() ? MOTION.calm : MOTION.toast);
  }, 2400);
}
