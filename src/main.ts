import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import { App } from './ui/app';

document.addEventListener('gesturestart', (e) => e.preventDefault());
const app = new App(document.getElementById('app')!);
app.init().catch((e) => console.error(e));
(window as unknown as { __app: App }).__app = app;
