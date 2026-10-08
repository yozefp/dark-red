/** Identifikátory hier — zodpovedajú názvom v konfigurácii. */
export type GameId = 'draw' | 'push' | 'memorize' | 'release';

/** Stavy priebehu. Prechody sú definované v machine.ts. */
export type AppState =
  | 'attract'    // nikto pri tablete
  | 'code'       // zadanie týždenného kódu
  | 'tutorial'   // pravidlo + animovaná ukážka
  | 'playing'    // beží hra
  | 'result';    // výsledok, potom späť na attract

export interface Config {
  week: string;
  code: string;
  game: GameId;
  difficulty: 'easy' | 'standard' | 'hard';
  rounds: number;
  idleTimeoutMs: number;
  resultTimeoutMs: number;
}

/** Jedno kolo jednej hry. */
export interface RoundResult {
  round: number;
  passed: boolean;
  /** 0..1 — na výsledkovej obrazovke sa zobrazuje ako percento */
  score: number;
  /** krátka veta pre hráča, napr. „chýbalo 0,3 %" */
  detail?: string;
}

export interface GameSummary {
  gameId: GameId;
  rounds: RoundResult[];
  passed: boolean;
  /** surový vstup na neskoršie ladenie, ak beží záznam */
  trace?: unknown;
}

export interface RoundConfig {
  round: number;        // 1..n
  totalRounds: number;
  difficulty: Config['difficulty'];
  /** ladiace prepísanie z vývojového panela */
  overrides?: Record<string, number>;
}

/**
 * Každá hra implementuje toto a nič viac.
 * Shell o vnútri hry nevie — vďaka tomu sa dá vyvíjať aj testovať samostatne.
 */
export interface GameModule {
  id: GameId;
  /** čitateľný názov pre vývojový panel */
  label: string;
  mount(root: HTMLElement, cfg: RoundConfig): void;
  /** hra zavolá, keď kolo skončí */
  onRoundEnd?: (r: RoundResult) => void;
  destroy(): void;
}
