/**
 * Bodovanie hry PUSH. Čistá funkcia bez DOM — dá sa overiť testom
 * a doladiť bez spúšťania hry.
 *
 * Hráč drží prst a meter od nuly stále zrýchľuje — začne pomaly a nikde
 * nebrzdí, ani na stovke, ani pri 110. Na stovke sa len prekreslí
 * stupnica. Trafiť treba pásmo okolo 110 %. Na 120 kolo skončí samo.
 */

export const TARGET = 110;
export const BURN = 120;

/**
 * Polovičná šírka výherného pásma: vyhráva sa medzi 105 a 115, v každom
 * kole aj obtiažnosti rovnako (Jozef, 20. 10.). Obtiažnosť robí rýchlosť.
 */
export const BAND = 5;

/**
 * Rýchlosť metra pri 110 po kolách, % za sekundu. S pevným pásmom dáva
 * čas, počas ktorého je meter v pásme — na štandarde 0,40 s, 0,29 s
 * a 0,21 s. Prvé kolo prejde takmer každý, tretie rozhoduje.
 */
export const DIFFICULTY: Record<string, number[]> = {
  easy:     [22, 28, 38],
  standard: [25, 34, 48],
  hard:     [30, 42, 60],
};

export interface PushConfig {
  /** stred cieľového pásma */
  target: number;
  /** polovičná šírka pásma — vnútri je kolo splnené */
  band: number;
  /** tu kolo skončí samo */
  burn: number;
  /** rýchlosť na začiatku, % za sekundu */
  rateStart: number;
  /** rýchlosť v momente, keď meter míňa cieľ — ona robí kolo ťažkým */
  rateAtTarget: number;
}

/** Rýchlosť na začiatku, % za sekundu — rozbieha sa pomaly. */
export const RATE_START = 12;

export interface PushScore {
  /** 0..1 pre výsledkovú obrazovku */
  score: number;
  passed: boolean;
  /** o koľko percent vedľa stredu */
  offset: number;
  /** meter došiel na 120 */
  burnt: boolean;
  /** pustenie pod pásmom, vrátane pred stovkou */
  early: boolean;
  /** pustenie nad pásmom, vrátane 120 */
  late: boolean;
}

export function configFor(difficulty: string, round: number): PushConfig {
  const speeds = DIFFICULTY[difficulty] ?? DIFFICULTY.standard;
  return {
    target: TARGET, band: BAND, burn: BURN,
    rateStart: RATE_START, rateAtTarget: speeds[Math.min(round, speeds.length) - 1],
  };
}

/**
 * Rýchlosť pri danej hodnote, % za sekundu. Zrýchlenie je v čase stále,
 * takže štvorec rýchlosti rastie s hodnotou lineárne — meter sa plynulo
 * rozbieha od začiatku až za 120 a nikde nespomalí.
 */
export function rateAt(value: number, cfg: PushConfig): number {
  const a = (cfg.rateAtTarget ** 2 - cfg.rateStart ** 2) / (2 * cfg.target);
  return Math.sqrt(cfg.rateStart ** 2 + 2 * a * Math.max(0, value));
}

/** Posunie meter o uplynulý čas. Oddelené od snímkovania, nech je priebeh
 *  rovnaký na pomalom aj rýchlom tablete. */
export function advance(value: number, dtMs: number, cfg: PushConfig): number {
  // dlhý snímok sa krája, aby zrýchľovanie pôsobilo spojito a nie skokom
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
    return { score: 0, passed: false, offset: value - cfg.target, burnt: true, early: false, late: true };
  }
  if (value < 100) {
    return { score: 0, passed: false, offset: cfg.target - value, burnt: false, early: true, late: false };
  }
  const offset = Math.abs(value - cfg.target);
  const passed = offset <= cfg.band;
  // na okraji pásma je skóre presne 0,5 — ďalej lineárne klesá k nule
  const score = Math.max(0, 1 - offset / (cfg.band * 2));
  return {
    score, passed, offset, burnt: false,
    early: !passed && value < cfg.target, late: !passed && value > cfg.target,
  };
}
