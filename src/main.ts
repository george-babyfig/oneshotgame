import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import { App } from './ui/app';

document.addEventListener('gesturestart', (e) => e.preventDefault());
const app = new App(document.getElementById('app')!);

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
window.addEventListener('error', (e) => recover(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => console.warn('unhandled rejection', e.reason));
app.init().catch((e) => console.error(e));
if (import.meta.env.DEV) (window as unknown as { __app: App }).__app = app;
