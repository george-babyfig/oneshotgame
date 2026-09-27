import { sfx } from './audio';
import { haptic } from './haptics';
import { t } from '../i18n';

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
    haptic.light();
    onClick();
  });
  return b;
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let overlay: HTMLElement;
let toasts: HTMLElement;
export function mountOverlays(root: HTMLElement) {
  overlay = h('div', { class: 'overlay' });
  toasts = h('div', { class: 'toasts' });
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
  const scrim = h('div', { class: 'scrim' }, box);
  let done = false;
  const abort = () => {
    if (done) return;
    done = true;
    opts.onAbort?.();
  };
  if (opts.onAbort) aborts.add(abort);
  const close = () => {
    if (done) return;
    done = true;
    aborts.delete(abort);
    scrim.classList.add('out');
    scrim.style.pointerEvents = 'none';
    setTimeout(() => scrim.remove(), 200);
    opts.onClose?.();
  };
  if (opts.dismiss !== false) scrim.addEventListener('click', (e) => e.target === scrim && close());
  overlay.append(scrim);
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
  while (toasts.children.length > 3) toasts.firstElementChild?.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2400);
}
