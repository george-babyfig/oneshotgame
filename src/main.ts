import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import { App } from './ui/app';
import { prepareInitRecovery, profileLoadNotice, startFreshProfile } from './meta/profile';
import { installAudioResume } from './ui/audio';
import { t } from './i18n';
import { loadDiagnostics, recordDiagnostic } from './meta/diagnostics';

document.addEventListener('gesturestart', (e) => e.preventDefault());
const app = new App(document.getElementById('app')!);
installAudioResume();

function showRecovery(message: string) {
  const root = document.getElementById('app')!;
  root.replaceChildren();
  const panel = document.createElement('main');
  panel.className = 'screen page grownups';
  panel.setAttribute('role', 'alert');
  const title = document.createElement('h1');
  title.textContent = t('Your garden needs a moment');
  const detail = document.createElement('p');
  detail.textContent = message;
  const retry = document.createElement('button');
  retry.className = 'btn primary wide';
  retry.textContent = t('Try again');
  retry.onclick = () => location.reload();
  const fresh = document.createElement('button');
  fresh.className = 'btn ghost wide';
  fresh.textContent = t('Start fresh');
  fresh.onclick = async () => {
    try {
      await startFreshProfile();
      location.reload();
    } catch {
      detail.textContent = t('Your progress could not be cleared. Please try again.');
    }
  };
  panel.append(title, detail, retry, fresh);
  root.append(panel);
  retry.focus();
}

// Never leave the player stuck: log the error and fall back to the galaxy.
let lastCrash = 0;
function recover(e: unknown) {
  console.error(e);
  const now = Date.now();
  if (now - lastCrash < 3000 || !app.p) return;
  lastCrash = now;
  try {
    app.saveNow();
    if (app.screen !== 'home') app.showHome();
  } catch {
    /* nothing more we can do */
  }
}
window.addEventListener('error', (e) => {
  void recordDiagnostic(e.error ?? e.message);
  recover(e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  void recordDiagnostic(e.reason);
  console.warn('unhandled rejection');
});
// Diagnostics load alongside the app; startup never waits on them.
void loadDiagnostics();
app
  .init()
  .then(() => {
    const notice = profileLoadNotice();
    if (notice === 'newer') showRecovery(t('This progress was saved by a newer version. Update Comet Garden, then try again.'));
    else if (notice === 'read-only') showRecovery(t('Your saved progress could not be read. You can try again or start fresh.'));
    else if (notice === 'recovered') {
      const note = document.createElement('p');
      note.className = 'toast';
      note.setAttribute('role', 'status');
      note.textContent = t('Your garden was restored from a backup.');
      document.getElementById('app')!.append(note);
      setTimeout(() => note.remove(), 6000);
    }
  })
  .catch(async (e) => {
    await recordDiagnostic(e);
    console.error(e);
    await prepareInitRecovery();
    showRecovery(t('Your garden could not open. You can try again or start fresh.'));
  });
if (import.meta.env.DEV) (window as unknown as { __app: App }).__app = app;
