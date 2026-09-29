import { ledger } from '../../meta/ledger';
import { saveProfile, type Profile } from '../../meta/profile';
import { detectLang, t } from '../../i18n';
import { numberToWords, type NumberWordLang } from '../../i18n/numberWords';
import { h, modal } from '../dom';

export type GateReason = 'buy' | 'share' | 'rate' | 'reminders' | 'gamecenter' | 'link' | 'grownups';
export interface GateChallenge {
  number: number;
  pausedUntil: number;
}

const PAUSE_MS = 30_000;
const HOLD_MS = 1_500;

export function createChallenge(rnd = Math.random, pausedUntil = 0): GateChallenge {
  return { number: 100 + Math.floor(Math.min(0.999999999, Math.max(0, rnd())) * 900), pausedUntil };
}

export function checkChallenge(challenge: GateChallenge, input: string, now = Date.now(), rnd = Math.random) {
  if (now < challenge.pausedUntil) return { passed: false, challenge };
  if (input === String(challenge.number)) return { passed: true, challenge };
  const next = createChallenge(rnd, now + PAUSE_MS);
  if (next.number === challenge.number) next.number = next.number === 999 ? 100 : next.number + 1;
  return { passed: false, challenge: next };
}

export function shuffleDigits(rnd = Math.random): number[] {
  const digits = Array.from({ length: 10 }, (_, i) => i);
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.min(0.999999999, Math.max(0, rnd())) * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

export async function hashParentPin(pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) throw new Error('Parent PIN must contain four digits');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyParentPin(pin: string, hash: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin) || !/^[0-9a-f]{64}$/.test(hash) || typeof crypto === 'undefined' || !crypto.subtle) return false;
  return (await hashParentPin(pin)) === hash;
}

type PinSettings = Profile['settings'] & { parentPin?: string };

function activeProfile(): Profile {
  const app = (window as unknown as { __app?: { p?: Profile } }).__app;
  if (!app?.p) throw new Error('Profile is unavailable');
  return app.p;
}

function pinOf(p: Profile): string {
  return (p.settings as PinSettings).parentPin || '';
}

export async function setParentPin(pin: string, profile = activeProfile()): Promise<void> {
  (profile.settings as PinSettings).parentPin = await hashParentPin(pin);
  await saveProfile(profile);
}

export async function clearParentPin(profile = activeProfile()): Promise<void> {
  (profile.settings as PinSettings).parentPin = '';
  await saveProfile(profile);
}

function reasonText(reason: GateReason): string {
  switch (reason) {
    case 'buy':
      return t('To continue to the App Store, please answer:');
    case 'share':
      return t('Sharing is for grown-ups. Please answer:');
    case 'rate':
      return t('To rate the game, please answer:');
    case 'reminders':
      return t('To turn on reminders, please answer:');
    case 'gamecenter':
      return t('To sign in to Game Center, please answer:');
    case 'link':
      return t('To leave the game, please answer:');
    case 'grownups':
      return t('To open Grown-ups, please answer:');
  }
}

function deviceNumberLang(): NumberWordLang {
  const lang = detectLang();
  return lang === 'pseudo' ? 'en' : lang;
}

function speakPrompt(): void {
  if (typeof window === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  const p = (window as unknown as { __app?: { p?: Profile } }).__app?.p;
  if (!p?.settings.sound || !window.speechSynthesis) return;
  try {
    const utterance = new SpeechSynthesisUtterance(t('Please hand the phone to a grown-up.'));
    utterance.lang = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ja: 'ja-JP' }[deviceNumberLang()];
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech is optional.
  }
}

export function parentalGate(reason: GateReason = 'buy', rnd = Math.random): Promise<boolean> {
  ledger.count('gate_shown');
  const profile = (window as unknown as { __app?: { p?: Profile } }).__app?.p;
  const storedPin = profile ? pinOf(profile) : '';
  let usePin = /^[0-9a-f]{64}$/.test(storedPin) && typeof crypto !== 'undefined' && !!crypto.subtle;
  let clearPinOnPass = false;
  let challenge = createChallenge(rnd, profile?.settings.gatePausedUntil ?? 0);
  let input = '';
  let done = false;
  let holding = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let pauseTimer: ReturnType<typeof setInterval> | undefined;
  const devHook = { answer: () => (done || usePin ? null : String(challenge.number)) };
  if (import.meta.env.DEV) window.__gate = devHook;

  return new Promise((resolve) => {
    const prompt = h('p', { class: 'gate-v2-prompt', id: 'gate-v2-prompt' }, reasonText(reason));
    const words = h('div', { class: 'gate-v2-words' });
    const entry = h('output', { class: 'gate-v2-entry', 'aria-live': 'polite' });
    const wait = h('p', { class: 'gate-v2-wait', 'aria-live': 'polite' });
    const keypad = h('div', { class: 'gate-v2-keypad' });
    const confirm = h('button', { class: 'btn primary gate-v2-confirm', type: 'button' }, t('Hold to continue'));

    const stopHold = () => {
      holding = false;
      confirm.classList.remove('holding');
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = undefined;
    };
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (import.meta.env.DEV && window.__gate === devHook) delete window.__gate;
      stopHold();
      if (pauseTimer) clearInterval(pauseTimer);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // Speech is optional.
      }
      ledger.count(ok ? 'gate_passed' : 'gate_failed');
      m.close();
      resolve(ok);
    };
    const render = () => {
      const remaining = Math.ceil((challenge.pausedUntil - Date.now()) / 1000);
      const paused = remaining > 0;
      words.textContent = usePin
        ? t('Enter your parent PIN.')
        : numberToWords(challenge.number, deviceNumberLang()).replace(/hundert(?=.)/, 'hundert\u200b');
      entry.textContent = usePin ? '•'.repeat(input.length).padEnd(4, '○') : input.padEnd(3, '○');
      wait.textContent = paused ? t('Wait {n} seconds, then try again.', { n: remaining }) : '';
      keypad.querySelectorAll('button').forEach((key) => ((key as HTMLButtonElement).disabled = paused));
      confirm.disabled = paused || input.length !== (usePin ? 4 : 3);
    };
    const wrong = () => {
      challenge = createChallenge(rnd, Date.now() + PAUSE_MS);
      if (profile) {
        profile.settings.gatePausedUntil = challenge.pausedUntil;
        void saveProfile(profile);
      }
      input = '';
      buildKeypad();
      render();
    };
    const submit = async () => {
      if (done || confirm.disabled || Date.now() < challenge.pausedUntil) return;
      confirm.disabled = true;
      if (usePin) {
        if (await verifyParentPin(input, storedPin)) finish(true);
        else wrong();
      } else {
        const result = checkChallenge(challenge, input, Date.now(), rnd);
        if (result.passed) {
          if (clearPinOnPass && profile) await clearParentPin(profile);
          finish(true);
        } else {
          challenge = result.challenge;
          if (profile) {
            profile.settings.gatePausedUntil = challenge.pausedUntil;
            void saveProfile(profile);
          }
          input = '';
          buildKeypad();
          render();
        }
      }
    };
    const startHold = () => {
      if (done || confirm.disabled || holding) return;
      holding = true;
      confirm.classList.add('holding');
      holdTimer = setTimeout(() => {
        if (holding) void submit();
        stopHold();
      }, HOLD_MS);
    };
    const buildKeypad = () => {
      keypad.replaceChildren();
      for (const digit of shuffleDigits(rnd)) {
        const key = h('button', { class: 'btn ghost', type: 'button', 'aria-label': String(digit) }, String(digit));
        key.addEventListener('click', () => {
          if (Date.now() < challenge.pausedUntil || input.length >= (usePin ? 4 : 3)) return;
          input += digit;
          render();
        });
        keypad.append(key);
      }
      const erase = h('button', { class: 'btn ghost gate-v2-erase', type: 'button', 'aria-label': t('Delete digit') }, '⌫');
      erase.addEventListener('click', () => {
        input = input.slice(0, -1);
        render();
      });
      keypad.append(erase);
    };
    buildKeypad();
    confirm.addEventListener('pointerdown', startHold);
    confirm.addEventListener('pointerup', stopHold);
    confirm.addEventListener('pointercancel', stopHold);
    confirm.addEventListener('pointerleave', stopHold);
    confirm.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        startHold();
      }
    });
    confirm.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        stopHold();
      }
    });
    const cancel = h('button', { class: 'btn ghost gate-v2-cancel', type: 'button' }, t('Cancel'));
    cancel.addEventListener('click', () => finish(false));
    const m = modal(
      [
        h('div', { class: 'm-title', id: 'gate-v2-title' }, t('Ask a grown-up')),
        prompt,
        words,
        entry,
        wait,
        keypad,
        confirm,
        usePin
          ? h(
              'button',
              {
                class: 'btn ghost',
                type: 'button',
                onclick: () => {
                  usePin = false;
                  clearPinOnPass = true;
                  input = '';
                  challenge = createChallenge(rnd, profile?.settings.gatePausedUntil ?? 0);
                  buildKeypad();
                  render();
                },
              },
              t('Forgot PIN?'),
            )
          : null,
        h('p', { class: 'gate-v2-note muted' }, t('Ask to Buy and the Apple ID password protect purchases.')),
        cancel,
      ],
      { cls: 'gate-v2', onClose: () => finish(false), onAbort: () => finish(false) },
    );
    m.el.setAttribute('role', 'dialog');
    m.el.setAttribute('aria-modal', 'true');
    m.el.setAttribute('aria-labelledby', 'gate-v2-title');
    m.el.setAttribute('aria-describedby', 'gate-v2-prompt');
    pauseTimer = setInterval(render, 250);
    render();
    speakPrompt();
  });
}

declare global {
  interface Window {
    __gate?: { answer(): string | null };
  }
}
