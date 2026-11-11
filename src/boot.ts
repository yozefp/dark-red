/** Aplikácia s hrami — attract, kód, hra, výsledok. Načíta ju main.ts. */
import { createApp } from 'vue';
import App from './App.vue';
import './ui/style.css';
import { reportError } from './core/machine';

const app = createApp(App);

// nikdy biela obrazovka — chyba sa zapíše a aplikácia pokračuje
app.config.errorHandler = (err) => { console.error(err); reportError(err); };
window.addEventListener('error', (e) => reportError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason));

app.mount('#app');

/**
 * Obrazovka nesmie zhasnúť, kým je hra otvorená. Inak by pripnutý Lenovo
 * po časovom limite zhasol a odomykal sa PIN-om — a možnosti pre vývojárov
 * (Nevypínať obrazovku) na niektorých kusoch nie sú. Prehliadač zámok pustí,
 * keď sa stránka skryje, preto sa po návrate a po dotyku vyžiada znova.
 * V iframe výberu hier zámok drží stránka výberu, tu sa žiadosť odmietne.
 */
let awake: WakeLockSentinel | null = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  if (awake && !awake.released) return;
  try { awake = await navigator.wakeLock.request('screen'); } catch { /* nepodporované alebo zakázané */ }
}
keepAwake();
document.addEventListener('visibilitychange', keepAwake);
window.addEventListener('pointerdown', keepAwake, { passive: true });
