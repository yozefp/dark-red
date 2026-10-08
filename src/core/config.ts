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

/** Validácia — konfigurácia prichádza zvonku, nesmie zhodiť aplikáciu. */
export function parseConfig(raw: unknown): Config {
  if (typeof raw !== 'object' || raw === null) return FALLBACK;
  const o = raw as Record<string, unknown>;
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

/**
 * Zdroj konfigurácie je za jednou funkciou, aby sa dal neskôr vymeniť
 * za Cloudflare KV bez zásahu do zvyšku aplikácie.
 */
export async function loadConfig(signal?: AbortSignal): Promise<Config> {
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
