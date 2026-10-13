import { reactive, watch } from 'vue';
import { DEBUG } from './hooks';

/**
 * Hodnoty, ktoré sa ladia na tablete. Prežijú obnovenie stránky, takže
 * sa dá nastaviť tolerancia, zavrieť kiosk, znova otvoriť a pokračovať.
 */
export interface Tuning {
  tolerance: number | null;   // null = použije sa hodnota z obtiažnosti
  pass: number | null;
  showHud: boolean;
}

const KEY = 'tdr.tuning';
const DEFAULTS: Tuning = { tolerance: null, pass: null, showHud: false };

function load(): Tuning {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Tuning>) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export const tuning = reactive<Tuning>(DEBUG ? load() : { ...DEFAULTS });

if (DEBUG) {
  watch(tuning, (t) => {
    try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* ignoruj */ }
  }, { deep: true });
}

export function resetTuning(): void { Object.assign(tuning, DEFAULTS); }

/** Prepíše sa len to, čo je naozaj nastavené — zvyšok rieši obtiažnosť. */
export function tuningOverrides(): { tolerance?: number; pass?: number } | undefined {
  if (!DEBUG) return undefined;
  const o: { tolerance?: number; pass?: number } = {};
  if (tuning.tolerance != null) o.tolerance = tuning.tolerance;
  if (tuning.pass != null) o.pass = tuning.pass;
  return Object.keys(o).length ? o : undefined;
}
