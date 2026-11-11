/**
 * Hlavná adresa bez parametrov ukáže výber hier (public/erik/picker.js) —
 * odtiaľ sa pridáva na plochu tabletu. S parametrom (?predajna=1, ?ukazka=1,
 * ?debug=1, …) sa spustí aplikácia s hrami. Tá sa načíta dynamicky, aby jej
 * štýly nezasahovali do výberu hier.
 */
const home = location.pathname === '/' && !location.search;

if (home) {
  const s = document.createElement('script');
  s.src = '/erik/picker.js';
  document.head.append(s);
} else {
  import('./boot');
}

// Offline vrstva. Vo vývoji by len prekážala — service worker by podával
// staré súbory namiesto tých, ktoré sa práve menia.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error(e));
  });
}
