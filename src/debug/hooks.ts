import type { Point } from '@/games/draw/geometry';
import type { Sample } from '@/core/input';
import { traceAlong } from './trace';

/**
 * Ladiaca vrstva. Je zapnutá len vo vývoji alebo s ?debug=1 — v predajni
 * sa teda nedá omylom otvoriť a do produkčného balíka sa nedostane nič,
 * čo by zmenilo priebeh hry.
 */
export const DEBUG =
  import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

/** Čo o sebe hra prezradí, aby sa dala merať a riadiť zvonku. */
export interface GameProbe {
  id: string;
  /** poradie kola — mení sa pri každom novom module */
  round: number;
  /** rozmer vnútornej súradnicovej siete hry */
  view: number;
  /** dráha, ktorú má hráč obkresliť (len DRAW) */
  path?: Point[];
  /** aktuálne skóre 0..1 */
  score: () => number;
  /** prehrá zaznamenanú sériu dotykov — ladenie aj E2E bez reálneho prsta */
  replay: (samples: Sample[]) => void;
  /** vnútro hry pre ladenie a testy — každá hra vracia niečo iné */
  info?: () => Record<string, unknown>;
}

let probe: GameProbe | null = null;
const recorded: Sample[] = [];

export function publishProbe(p: GameProbe): void {
  if (!DEBUG) return;
  probe = p;
}
export function clearProbe(): void { probe = null; }

/** Zaznamenáva skutočné dotyky z tabletu — pozri `__tdr.dump()`. */
export function recordSample(s: Sample): void {
  if (!DEBUG) return;
  recorded.push(s);
  if (recorded.length > 20_000) recorded.splice(0, 10_000);
}

if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__tdr = {
    get probe() { return probe; },
    /** JSON so záznamom ťahu — v konzole tabletu: copy(__tdr.dump()) */
    dump: () => JSON.stringify(recorded),
    clear: () => recorded.splice(0, recorded.length),
    replay: (s: Sample[]) => probe?.replay(s),
    /** syntetický ťah po dráhe — rovnaký generátor používa panel aj E2E */
    trace: traceAlong,
  };
}
