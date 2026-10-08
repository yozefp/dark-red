import { reactive, readonly } from 'vue';
import type { AppState, Config, GameSummary, RoundResult } from './types';
import { FALLBACK } from './config';

/**
 * Stavový automat celého priebehu.
 *
 *   attract → code → tutorial → playing → result → attract
 *
 * Z ktoréhokoľvek stavu sa po nečinnosti vracia na attract a maže stav.
 * Prechody sú na jednom mieste, aby sa nedali obísť a dali sa otestovať.
 */

const ALLOWED: Record<AppState, AppState[]> = {
  attract:  ['code'],
  code:     ['tutorial', 'attract'],
  tutorial: ['playing', 'attract'],
  playing:  ['result', 'attract'],
  result:   ['attract'],
};

export interface MachineState {
  state: AppState;
  config: Config;
  /** kolá odohrané v aktuálnom hraní */
  rounds: RoundResult[];
  /** posledný dokončený súhrn — pre výsledkovú obrazovku */
  summary: GameSummary | null;
  /** chyba, ktorá sa zachytila a nezhodila aplikáciu */
  lastError: string | null;
}

const s = reactive<MachineState>({
  state: 'attract',
  config: FALLBACK,
  rounds: [],
  summary: null,
  lastError: null,
});

export const state = readonly(s);

type Listener = (to: AppState, from: AppState) => void;
const listeners = new Set<Listener>();
export function onTransition(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function can(to: AppState): boolean {
  return ALLOWED[s.state].includes(to);
}

/** Vráti true, ak prechod prebehol. Neplatné prechody sa ticho ignorujú. */
export function go(to: AppState): boolean {
  if (!can(to)) return false;
  const from = s.state;
  s.state = to;
  if (to === 'attract') reset();
  listeners.forEach((fn) => fn(to, from));
  return true;
}

export function setConfig(c: Config) { s.config = c; }

export function addRound(r: RoundResult) { s.rounds.push(r); }

export function finish(): GameSummary {
  const summary: GameSummary = {
    gameId: s.config.game,
    rounds: [...s.rounds],
    passed: s.rounds.length > 0 && s.rounds.every((r) => r.passed),
  };
  s.summary = summary;
  return summary;
}

export function reportError(e: unknown) {
  s.lastError = e instanceof Error ? e.message : String(e);
}

function reset() {
  s.rounds = [];
  // summary zámerne necháme — výsledková obrazovka ho už nepotrebuje,
  // ale vývojový panel ho vie zobraziť po návrate
}

/** Len pre testy. */
export function __reset(to: AppState = 'attract') {
  s.state = to; s.rounds = []; s.summary = null; s.lastError = null;
}
