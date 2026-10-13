/**
 * Bodovanie hry PUSH. Čistá funkcia bez DOM — dá sa overiť testom
 * a doladiť bez spúšťania hry.
 *
 * Hráč drží prst, meter ide rýchlo do 100 %, tam narazí na strop,
 * stupnica sa prekreslí a ďalej lezie pomaly. Trafiť treba pásmo
 * okolo 110 %. Nad hranicou spálenia je kolo stratené okamžite.
 */

export const TARGET = 110;
export const BURN = 120;

/** Polovičná šírka cieľového pásma v percentách, po kolách. */
export const DIFFICULTY: Record<string, number[]> = {
  easy:     [6.0, 5.0, 4.0],
  standard: [4.5, 3.5, 2.5],
  hard:     [3.0, 2.2, 1.6],
};

export interface PushConfig {
  /** stred cieľového pásma */
  target: number;
  /** polovičná šírka pásma — vnútri je kolo splnené */
  band: number;
  /** nad touto hodnotou je spálené */
  burn: number;
  /** rýchlosť nabíjania do stropu, % za sekundu */
  rateBelow: number;
  /** rýchlosť nabíjania tesne nad stropom, % za sekundu */
  rateAbove: number;
}

export interface PushScore {
  /** 0..1 pre výsledkovú obrazovku */
  score: number;
  passed: boolean;
  /** o koľko percent vedľa stredu */
  offset: number;
  burnt: boolean;
  /** pustil pred prerazením stropu */
  early: boolean;
}

export function configFor(difficulty: string, round: number): PushConfig {
  const bands = DIFFICULTY[difficulty] ?? DIFFICULTY.standard;
  const band = bands[Math.min(round, bands.length) - 1];
  // s rastúcim kolom aj mierne rýchlejší posun nad stropom — menej času na reakciu
  const rateAbove = 5.2 + (round - 1) * 0.9;
  return { target: TARGET, band, burn: BURN, rateBelow: 78, rateAbove };
}

/**
 * Nad stropom kladie meter odpor — čím vyššie, tým pomalšie.
 * Vracia percentá za sekundu pri danej hodnote.
 */
export function rateAt(value: number, cfg: PushConfig): number {
  if (value < 100) return cfg.rateBelow;
  const resist = Math.max(0.35, 1 - (value - 100) / 45);
  return cfg.rateAbove * resist;
}

/** Posunie meter o uplynulý čas. Oddelené od snímkovania, nech je priebeh
 *  rovnaký na pomalom aj rýchlom tablete. */
export function advance(value: number, dtMs: number, cfg: PushConfig): number {
  // dlhý snímok sa krája, aby odpor pôsobil spojito a nie skokom
  let v = value;
  let left = Math.min(dtMs, 250);
  while (left > 0) {
    const step = Math.min(left, 16);
    v += rateAt(v, cfg) * (step / 1000);
    left -= step;
  }
  return v;
}

export function scorePush(value: number, cfg: PushConfig): PushScore {
  if (value > cfg.burn) {
    return { score: 0, passed: false, offset: value - cfg.target, burnt: true, early: false };
  }
  if (value < 100) {
    return { score: 0, passed: false, offset: cfg.target - value, burnt: false, early: true };
  }
  const offset = Math.abs(value - cfg.target);
  // na okraji pásma je skóre presne 0,5 — ďalej lineárne klesá k nule
  const score = Math.max(0, 1 - offset / (cfg.band * 2));
  return { score, passed: offset <= cfg.band, offset, burnt: false, early: false };
}
