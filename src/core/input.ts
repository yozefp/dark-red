/**
 * Zjednotenie vstupu.
 *
 * Pointer Events pribudli až v Safari 13 — na starších iPadoch ich niet.
 * Ostatok aplikácie pracuje výhradne s typom Sample a o tomto nevie.
 *
 * Hra sleduje vždy len jeden prst — ten, ktorý sa dotkol ako prvý.
 * V predajni sa ľudia o obrazovku opierajú a bez toho by položená dlaň
 * prerušila ťah v DRAW alebo pustila meter v PUSH, hoci prvý prst drží ďalej.
 */
export interface Sample {
  x: number;
  y: number;
  /** ms, z rovnakej časovej osi ako performance.now() */
  t: number;
}

export interface PointerSource {
  onDown: (s: Sample, target: EventTarget | null) => void;
  onMove: (samples: Sample[]) => void;
  onUp: (s: Sample) => void;
}

const hasPointer = typeof window !== 'undefined' && 'PointerEvent' in window;

export function attachPointer(el: HTMLElement, src: PointerSource): () => void {
  const rect = () => el.getBoundingClientRect();
  const toSample = (cx: number, cy: number, t: number): Sample => {
    const r = rect();
    return { x: cx - r.left, y: cy - r.top, t };
  };

  /** id prsta, ktorý hru práve ovláda; ostatné dotyky sa ignorujú */
  let active: number | null = null;

  if (hasPointer) {
    const down = (e: PointerEvent) => {
      if (active !== null) return;
      active = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      src.onDown(toSample(e.clientX, e.clientY, e.timeStamp), e.target);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      // bez coalesced vypadávajú body pri rýchlom ťahu a skóre je nespravodlivé
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      src.onMove(evs.map((ev) => toSample(ev.clientX, ev.clientY, ev.timeStamp)));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      src.onUp(toSample(e.clientX, e.clientY, e.timeStamp));
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }

  /** nájde medzi dotykmi ten, ktorý hru ovláda */
  const mine = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) if (t.identifier === active) return t;
    return null;
  };
  const down = (e: TouchEvent) => {
    e.preventDefault();
    if (active !== null) return;
    const t = e.changedTouches[0];
    active = t.identifier;
    src.onDown(toSample(t.clientX, t.clientY, e.timeStamp), document.elementFromPoint(t.clientX, t.clientY));
  };
  const move = (e: TouchEvent) => {
    e.preventDefault();
    const t = mine(e);
    if (t) src.onMove([toSample(t.clientX, t.clientY, e.timeStamp)]);
  };
  const up = (e: TouchEvent) => {
    e.preventDefault();
    const t = mine(e);
    if (!t) return;
    active = null;
    src.onUp(toSample(t.clientX, t.clientY, e.timeStamp));
  };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up, { passive: false });
  window.addEventListener('touchcancel', up, { passive: false });
  return () => {
    el.removeEventListener('touchstart', down);
    el.removeEventListener('touchmove', move);
    window.removeEventListener('touchend', up);
    window.removeEventListener('touchcancel', up);
  };
}

/** Potlačenie systémových gest — CSS samo nestačí. */
export function suppressBrowserGestures() {
  (['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange'] as const)
    .forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 320) e.preventDefault();   // priblíženie dvojťuknutím
    lastTap = now;
  }, { passive: false });
}
