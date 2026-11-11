/**
 * Výber hier — ukážka štyroch hier bez kódu. Používa ho hlavná adresa (/)
 * aj /erik/. Hra beží v iframe s ?ukazka=1: bez kódu a bez ladiaceho panela.
 *
 * V prehliadači je hra v ráme tabletu (1180×820 bodov) zmenšená do okna;
 * nainštalovaná na tablete vyplní celú plochu pod výberom.
 *
 * Nastavenie cez data-* na <script>:
 *   data-pin="1"   pýta PIN (len /erik/ — aby ju neotvoril náhodný návštevník)
 *   data-hash="1"  vybraná hra sa píše do adresy (#draw), aby sa dala poslať
 */
(function () {
  const me = document.currentScript;
  const usePin = me?.dataset.pin === '1';
  const useHash = me?.dataset.hash === '1';
  const GAMES = ['draw', 'push', 'memorize', 'release'];

  const css = `
:root{
  --bg:#120807; --text:#F0E6E2; --muted:#A08A82; --dim:#6B5450;
  --amber:#E8A33D; --line:#3E1E1A;
  --tab-w:1180px; --tab-h:820px; --bezel:26px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:radial-gradient(ellipse at 50% 60%,#2A1310,var(--bg) 70%);color:var(--text);
  font:15px/1.4 -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;
  display:flex;flex-direction:column;align-items:center;overflow:hidden}
#app{display:none}

.top{width:100%;max-width:1280px;padding:18px 16px 0;display:flex;flex-wrap:wrap;
  align-items:center;justify-content:space-between;gap:12px 24px}
.brand{letter-spacing:.24em;font-size:13px;white-space:nowrap}
.brand b{color:var(--amber);font-weight:600;margin-left:6px}
.pick{display:flex;flex-wrap:wrap;gap:8px}
.pick button{font:inherit;font-size:13px;letter-spacing:.16em;color:var(--muted);
  background:none;border:1px solid var(--line);border-radius:999px;padding:9px 18px;cursor:pointer;
  transition:color .15s,border-color .15s,background .15s}
.pick button:hover{color:var(--text);border-color:#6B3A32}
.pick button[aria-pressed="true"]{color:#1A0E0C;background:var(--amber);border-color:var(--amber)}

.stage{flex:1 1 auto;width:100%;min-height:0;display:flex;align-items:center;justify-content:center;
  padding:16px}
/* rám má pevný rozmer v bodoch tabletu; zmenšuje sa celý cez transform */
.tablet{position:relative;flex:0 0 auto;
  width:calc(var(--tab-w) + 2 * var(--bezel));height:calc(var(--tab-h) + 2 * var(--bezel));
  padding:var(--bezel);border-radius:56px;background:#0B0B0C;
  box-shadow:0 0 0 2px #2C2C2E,0 0 0 9px #18181A,0 40px 120px rgba(0,0,0,.7);
  transform-origin:center center}
.tablet::before{content:'';position:absolute;top:calc(var(--bezel) / 2 - 4px);left:50%;
  width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#1F2226}
.screen{width:100%;height:100%;border-radius:30px;overflow:hidden;background:#000}
.screen iframe{display:block;width:var(--tab-w);height:var(--tab-h);border:0}

/* Nainštalovaná na skutočnom tablete: rám by bol tablet v tablete. */
@media (display-mode: fullscreen), (display-mode: standalone){
  .top{padding:8px 16px}
  .stage{padding:0}
  .tablet{width:100%;height:100%;padding:0;border-radius:0;box-shadow:none;transform:none!important}
  .tablet::before{display:none}
  .screen{border-radius:0}
  .screen iframe{width:100%;height:100%}
}

/* PIN — len aby ukážku neotvoril náhodný návštevník, nie skutočné zabezpečenie */
.lock{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:16px;background:var(--bg)}
.lock[hidden]{display:none}
.lock input{font:inherit;font-size:28px;letter-spacing:.5em;text-align:center;width:200px;
  padding:12px 0 12px .5em;color:var(--text);background:none;border:1px solid var(--line);border-radius:12px}
.lock input:focus{outline:none;border-color:var(--amber)}
.lock p{color:var(--muted);letter-spacing:.16em;font-size:13px}
.lock.bad input{border-color:#C0392B}`;

  const html = `
  <form class="lock" id="lock" hidden>
    <div class="brand">TEREA<b>DARK RED</b></div>
    <input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN">
    <p>ZADAJTE PIN</p>
  </form>
  <div class="top">
    <div class="brand">TEREA<b>DARK RED</b><b style="color:#E02A26">TEST 2</b></div>
    <div class="pick" role="group" aria-label="Výber hry">
      <button data-game="draw">DRAW</button>
      <button data-game="push">PUSH</button>
      <button data-game="memorize">MEMORIZE</button>
      <button data-game="release">RELEASE</button>
    </div>
  </div>
  <div class="stage">
    <div class="tablet" id="tablet">
      <div class="screen"><iframe id="game" title="Hra na tablete" allow="fullscreen"></iframe></div>
    </div>
  </div>`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  document.body.insertAdjacentHTML('beforeend', html);

  const frame = document.getElementById('game');
  const tablet = document.getElementById('tablet');
  const buttons = document.querySelectorAll('.pick button');

  // Ťuknutie na tú istú hru ju spustí odznova. Kolá a obtiažnosť sú
  // ako v predajni; kód sa preskočí, úvodná obrazovka ostáva.
  function play(game) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.game === game)));
    frame.src = `/?ukazka=1&nocode=1&rounds=3&game=${game}&t=${Date.now()}`;
    if (useHash) try { history.replaceState(null, '', `#${game}`); } catch (e) { /* nevadí */ }
  }
  buttons.forEach((b) => b.addEventListener('click', () => play(b.dataset.game)));

  const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;

  // celý tablet sa zmestí do voľného miesta, nikdy sa nezväčší nad skutočnú veľkosť
  function fit() {
    if (installed()) return;
    const stage = tablet.parentElement.getBoundingClientRect();
    const w = tablet.offsetWidth + 20, h = tablet.offsetHeight + 20;
    const k = Math.min(1, (stage.width - 32) / w, (stage.height - 32) / h);
    tablet.style.transform = `scale(${Math.max(0.1, k)})`;
  }
  window.addEventListener('resize', fit);
  fit();

  function start() {
    const first = useHash ? location.hash.slice(1) : '';
    play(GAMES.includes(first) ? first : 'draw');
    watchForUpdate();
  }

  /**
   * Aktualizácia na diaľku, rovnaké pravidlá ako v aplikácii (src/core/update.ts):
   * nová verzia sa načíta, len keď je hra na úvodnej obrazovke a 5 minút
   * sa tabletu nikto nedotkol.
   */
  function watchForUpdate() {
    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
    if (!sw) return;
    let pending = false;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    window.addEventListener('pointerdown', bump, { passive: true });
    // dotyky v hre sa k stránke nedostanú — počúvame priamo v iframe
    frame.addEventListener('load', () => {
      try { frame.contentWindow.addEventListener('pointerdown', bump, { passive: true }); } catch (e) { /* nevadí */ }
    });
    let known = Boolean(sw.controller);
    sw.addEventListener('controllerchange', () => { if (known) pending = true; else known = true; });
    setInterval(async () => {
      try { await (await sw.getRegistration())?.update(); } catch (e) { /* bez siete */ }
    }, 10 * 60_000);
    setInterval(() => {
      let onAttract = false;
      try { onAttract = Boolean(frame.contentDocument?.querySelector('[data-t="attract"]')); } catch (e) { /* nevadí */ }
      if (pending && onAttract && Date.now() - last >= 5 * 60_000) location.reload();
    }, 30_000);
  }

  /**
   * Obrazovka nesmie zhasnúť, kým je hra otvorená. Inak by pripnutý Lenovo
   * po časovom limite zhasol a odomykal sa PIN-om — a možnosti pre vývojárov
   * (Nevypínať obrazovku) na niektorých kusoch nie sú. Prehliadač zámok pustí,
   * keď sa stránka skryje, preto sa po návrate a po dotyku vyžiada znova.
   */
  let awake = null;
  async function keepAwake() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (awake && !awake.released) return;
    try { awake = await navigator.wakeLock.request('screen'); } catch (e) { /* nepodporované alebo zakázané */ }
  }
  keepAwake();
  document.addEventListener('visibilitychange', keepAwake);
  window.addEventListener('pointerdown', keepAwake, { passive: true });

  if (!usePin) { start(); return; }

  // V zdroji je len odtlačok PIN-u, nie PIN sám. Po správnom zadaní si ho
  // zariadenie zapamätá, aby sa na tablete nezadával pri každom spustení.
  const PIN_HASH = '4259fd93fdbcef45ecb146d72962bbafcd11eeccb34ed7393d1485fdd04bc619';
  const KEY = 'tdr-erik-pin';
  const lock = document.getElementById('lock');
  const pin = document.getElementById('pin');

  async function sha256(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* súkromné okno */ }
  if (saved === PIN_HASH) { start(); return; }

  lock.hidden = false;
  pin.focus();
  pin.addEventListener('input', async () => {
    lock.classList.remove('bad');
    if (pin.value.length < 4) return;
    if (await sha256(pin.value) === PIN_HASH) {
      try { localStorage.setItem(KEY, PIN_HASH); } catch (e) { /* nevadí */ }
      lock.hidden = true;
      start();
    } else {
      lock.classList.add('bad');
      pin.value = '';
    }
  });
  lock.addEventListener('submit', (e) => e.preventDefault());
})();
