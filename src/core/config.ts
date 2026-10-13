import type { Config, GameId } from './types';

/** Použije sa, keď je konfigurácia nedostupná alebo nezmyselná. */
export const FALLBACK: Config = {
  week: 'fallback',
  code: '000000',
  game: 'draw',
  difficulty: 'standard',
  rounds: 3,
  idleTimeoutMs: 45_000,
  resultTimeoutMs: 15_000,
};

const GAMES: GameId[] = ['draw', 'push', 'memorize', 'release'];

/** Jeden týždeň kampane. Čo nie je uvedené, berie sa zo spoločného základu. */
export interface ScheduleEntry extends Partial<Config> {
  /** od tohto dňa platí, formát RRRR-MM-DD */
  from: string;
}

/**
 * Konfigurácia môže byť buď jeden plochý objekt, alebo rozvrh celej kampane.
 * Pri rozvrhu si tablet sám vyberie týždeň podľa dátumu, takže sa do neho
 * nemusí nikto týždenne hrabať — nasadí sa raz na začiatku.
 */
export interface ConfigFile extends Partial<Config> {
  schedule?: ScheduleEntry[];
}

/** Dnešok ako RRRR-MM-DD v miestnom čase. */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Vyberie platný záznam rozvrhu — posledný, ktorý už začal.
 * Kým kampaň nezačala, platí prvý; hodiny tabletu tak nerozhodujú o tom,
 * či sa vôbec dá hrať, len o tom, ktorý týždeň beží.
 */
export function pickEntry(schedule: ScheduleEntry[], day = today()): ScheduleEntry | null {
  const valid = schedule
    .filter((e) => typeof e?.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.from))
    .sort((a, b) => a.from.localeCompare(b.from));
  if (!valid.length) return null;
  let pick = valid[0];
  for (const e of valid) if (e.from <= day) pick = e;
  return pick;
}

/** Validácia — konfigurácia prichádza zvonku, nesmie zhodiť aplikáciu. */
export function parseConfig(raw: unknown, day = today()): Config {
  if (typeof raw !== 'object' || raw === null) return FALLBACK;
  let o = raw as Record<string, unknown>;

  if (Array.isArray((o as ConfigFile).schedule)) {
    const { schedule, ...base } = o as ConfigFile & Record<string, unknown>;
    const entry = pickEntry(schedule as ScheduleEntry[], day);
    o = { ...base, ...(entry ?? {}) } as Record<string, unknown>;
    if (entry && typeof o.week !== 'string') o.week = entry.from;
  }
  const num = (v: unknown, d: number, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

  return {
    week: typeof o.week === 'string' ? o.week : FALLBACK.week,
    code: /^\d{6}$/.test(String(o.code)) ? String(o.code) : FALLBACK.code,
    game: GAMES.includes(o.game as GameId) ? (o.game as GameId) : FALLBACK.game,
    difficulty:
      o.difficulty === 'easy' || o.difficulty === 'hard' ? o.difficulty : 'standard',
    rounds: num(o.rounds, FALLBACK.rounds, 1, 5),
    idleTimeoutMs: num(o.idleTimeoutMs, FALLBACK.idleTimeoutMs, 10_000, 300_000),
    resultTimeoutMs: num(o.resultTimeoutMs, FALLBACK.resultTimeoutMs, 3_000, 60_000),
  };
}

const CACHE_KEY = 'tdr.config';
const OVERRIDE_KEY = 'tdr.override';

/**
 * Lokálne prebitie konfigurácie na jednom zariadení — na ladenie a testovanie.
 * Platí výhradne s ?debug=1, takže zabudnuté nastavenie nemôže ovplyvniť
 * tablet v predajni: bez toho parametra sa číta len nasadená konfigurácia.
 */
export function getOverride(): Partial<Config> | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Config>) : null;
  } catch { return null; }
}
export function setOverride(o: Partial<Config> | null): void {
  try {
    if (o) localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
    else localStorage.removeItem(OVERRIDE_KEY);
  } catch { /* súkromný režim */ }
}

/**
 * Zdroj konfigurácie je za jednou funkciou, aby sa dal neskôr vymeniť
 * za Cloudflare KV bez zásahu do zvyšku aplikácie.
 */
export async function loadConfig(signal?: AbortSignal): Promise<Config> {
  return applyOverride(await fetchConfig(signal));
}

function applyOverride(cfg: Config): Config {
  const debug = new URLSearchParams(location.search).has('debug');
  const o = debug ? getOverride() : null;
  return o ? parseConfig({ ...cfg, ...o }) : cfg;
}

async function fetchConfig(signal?: AbortSignal): Promise<Config> {
  try {
    const res = await fetch(`/config.json?t=${Date.now()}`, { signal, cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const cfg = parseConfig(await res.json());
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch { /* súkromný režim */ }
    return cfg;
  } catch {
    // bez siete použijeme poslednú známu, inak zabudovanú
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return parseConfig(JSON.parse(cached));
    } catch { /* ignoruj */ }
    return FALLBACK;
  }
}
