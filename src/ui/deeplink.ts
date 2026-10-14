import { App as NativeApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { Profile } from '../meta/profile';
import { unlocked } from '../meta/unlocks';

type LinkApp = { p: Profile; screen: string; readonly linkBusy?: boolean; showHome(quiet?: boolean): void; showRoad(): void };
export type LinkNative = {
  addListener(event: 'appUrlOpen', listener: (data: { url: string }) => void): Promise<PluginListenerHandle>;
};

/** Only the documented internal route is accepted, including its optional trailing slash. */
export function isRoadLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'cometgarden:' &&
      url.hostname === 'road' &&
      (url.pathname === '' || url.pathname === '/') &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function routeRoadLink(app: LinkApp, url: string, blocked = false): boolean {
  if (!isRoadLink(url)) return false;
  // Preserve the first lesson, an interrupted round and any open gate or purchase sheet.
  if (!app.p || !app.p.tutorial || app.p.meta.sessions <= 1 || app.screen === 'level' || app.linkBusy || blocked) return false;
  if (unlocked(app.p, 'star_road')) app.showRoad();
  else app.showHome(true);
  return true;
}

function modalBlocksLink(): boolean {
  return !!document.querySelector('.overlay .scrim:not(.out) .modal');
}
function homePopupPending(): boolean {
  const modals = [...document.querySelectorAll('.overlay .scrim:not(.out) .modal')];
  return modals.length > 0 && modals.every((modal) => modal.matches('.home-popup, .away-card'));
}

/** Attach before init. iOS retains cold appUrlOpen delivery until this listener consumes it. */
export function installDeepLinks(
  app: LinkApp,
  ready: Promise<boolean>,
  native: LinkNative | undefined = Capacitor.isNativePlatform() ? NativeApp : undefined,
  blocked = modalBlocksLink,
  defer = homePopupPending,
): () => void {
  if (!native) return () => {};
  let disposed = false;
  let listener: PluginListenerHandle | undefined;
  let queued: string | undefined;
  let observer: MutationObserver | undefined;
  const clear = () => {
    queued = undefined;
    observer?.disconnect();
    observer = undefined;
  };
  const flush = () => {
    if (disposed || !queued) return;
    if (app.linkBusy || app.screen === 'level') return clear();
    if (blocked() && defer()) return;
    const url = queued;
    clear();
    routeRoadLink(app, url, blocked());
  };
  const handle = async (url: string) => {
    if (!isRoadLink(url) || !(await ready) || disposed) return;
    if (!app.p?.tutorial || app.p.meta.sessions <= 1 || app.screen === 'level' || app.linkBusy) return;
    if (blocked()) {
      // Defer only Home's automatic cards. Gates and purchase sheets never become pending navigation.
      if (app.screen !== 'home' || !defer()) return;
      queued = url;
      if (!observer) {
        observer = new MutationObserver(flush);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      }
      return;
    }
    clear();
    routeRoadLink(app, url);
  };
  // getLaunchUrl is intentionally unused: its lastURL survives WebView reloads and is stale.
  void native
    .addListener('appUrlOpen', ({ url }) => {
      void handle(url);
    })
    .then(async (value) => {
      listener = value;
      if (disposed) await value.remove();
    })
    .catch(() => {
      /* Unsupported native delivery must never block play. */
    });
  return () => {
    disposed = true;
    clear();
    void listener?.remove();
  };
}
