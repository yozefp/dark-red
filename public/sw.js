/**
 * Offline vrstva. V predajni je wifi nespoľahlivá a tablet nesmie ukázať
 * prázdnu stránku len preto, že na pár sekúnd vypadlo pripojenie.
 *
 * Pravidlá sú tri:
 *   — konfigurácia ide najprv zo siete, aby týždenný kód platil hneď,
 *     a až keď sieť zlyhá, siahne sa po poslednej uloženej,
 *   — samotná stránka tiež najprv zo siete, nech sa nové nasadenie
 *     chytí pri najbližšom otvorení,
 *   — súbory s hashom v názve sa berú z cache, lebo sa nikdy nezmenia.
 */
/**
 * VERSION aj PRECACHE dopĺňa `tools/gen-sw.mjs` po zostavení — v zdroji
 * sú zástupné hodnoty, lebo názvy súborov nesú hash a vopred ich nepoznáme.
 * Bez toho by sa do cache dostala len kostra a tablet by offline ukázal
 * prázdnu stránku: pri prvej návšteve service worker ešte nebeží, takže
 * si súbory sám nezachytí.
 */
const VERSION = 'tdr-dev';
const PRECACHE = [];
const SHELL = [...new Set(['/', '/index.html', '/manifest.json', '/config.json', ...PRECACHE])];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // po jednom, nie addAll: jeden chýbajúci súbor nesmie zahodiť celú cache
    const r = await Promise.allSettled(SHELL.map((u) => c.add(u)));
    const failed = r.filter((x) => x.status === 'rejected').length;
    if (failed) console.warn(`sw: ${failed} z ${SHELL.length} súborov sa nepodarilo uložiť`);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Hľadanie v cache ignoruje hlavičku Vary. Server ju pri statických
 * súboroch posiela (napr. Vary: Origin) a uložená odpoveď by sa potom
 * nespárovala s požiadavkou, ktorú posiela <script crossorigin> —
 * tablet by offline nenašiel vlastné skripty.
 */
const look = (req) => caches.match(req, { ignoreVary: true });

async function networkFirst(req, fallback) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const c = await caches.open(VERSION);
      c.put(fallback ?? req, res.clone());
    }
    return res;
  } catch {
    const hit = await look(fallback ?? req);
    if (hit) return hit;
    throw new Error('offline a nič v cache');
  }
}

async function cacheFirst(req) {
  const hit = await look(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && req.url.startsWith(self.location.origin)) {
    const c = await caches.open(VERSION);
    c.put(req, res.clone());
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/config.json') {
    e.respondWith(networkFirst(new Request(req.url, { cache: 'no-store' }), '/config.json'));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html'));
    return;
  }
  e.respondWith(cacheFirst(req));
});
