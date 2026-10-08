import { state, go } from './machine';

/**
 * Návrat na úvodnú obrazovku po nečinnosti.
 * Platí odkiaľkoľvek — človek odíde uprostred čohokoľvek a tablet sa upratá sám.
 */
let timer: number | null = null;

const EVENTS = ['pointerdown', 'pointermove', 'keydown'] as const;

export function startIdleWatch() {
  const bump = () => schedule();
  EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
  schedule();
  return () => {
    EVENTS.forEach((e) => window.removeEventListener(e, bump));
    if (timer !== null) clearTimeout(timer);
  };
}

function schedule() {
  if (timer !== null) clearTimeout(timer);
  if (state.state === 'attract') return;          // na úvodnej niet čoho sa vracať
  const ms = state.state === 'result'
    ? state.config.resultTimeoutMs
    : state.config.idleTimeoutMs;
  timer = window.setTimeout(() => go('attract'), ms);
}

/** Výsledková obrazovka sa vracia aj bez dotyku. */
export function scheduleReturn(ms: number) {
  if (timer !== null) clearTimeout(timer);
  timer = window.setTimeout(() => go('attract'), ms);
}
