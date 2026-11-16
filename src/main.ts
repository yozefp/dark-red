/**
 * Hlavná adresa je aplikácia s kódom — z nej sú tablety pridané na plochu
 * (od 16. 11. 2026, predtým tu bol výber hier). Výber všetkých hier je na
 * /vecierok/ a /erik/ (public/erik/picker.js). Aplikácia sa načíta dynamicky,
 * aby jej štýly nezasahovali do výberu hier.
 */
import('./boot');

// Offline vrstva. Vo vývoji by len prekážala — service worker by podával
// staré súbory namiesto tých, ktoré sa práve menia.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error(e));
  });
}
