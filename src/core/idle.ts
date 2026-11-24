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
  // výsledkovka sa vracia sama (Result.vue) — výhra po 30 s, prehra po 15 s;
  // dotyk na nej ten čas nesmie skrátiť ani predĺžiť
  if (state.state === 'result') return;
  const ms = state.config.idleTimeoutMs;
  timer = window.setTimeout(() => go('attract'), ms);
}
