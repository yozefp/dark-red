import type { Point } from '../shell';

/**
 * Bodovanie hry RELEASE. Čistá matematika — let aj vyhodnotenie sa dajú
 * overiť testom bez plátna.
 *
 * Ťah dozadu určuje smer aj silu. Smer je vidieť vopred ako bodkovaný lúč,
 * silu ukazuje pruh — dolet si hráč musí odhadnúť sám. V tom je hra:
 * prvý hod učí, druhý a tretí opravujú.
 */

export const THROWS = 3;
/** Prepočet vnútorných jednotiek na milimetre pre výsledkovú obrazovku. */
export const MM_PER_UNIT = 0.42;

/** Povolená vzdialenosť od stredu (vnútorné jednotky), po kolách. */
export const DIFFICULTY: Record<string, number[]> = {
  easy:     [44, 32, 26],
  standard: [36, 25, 19],
  hard:     [26, 18, 14],
};

export interface ReleaseConfig {
  /** do tejto vzdialenosti od stredu je hod úspešný */
  tolerance: number;
  /** najdlhší možný ťah dozadu */
  maxPull: number;
  /** koľko jednotiek doletu pripadne na jednotku ťahu */
  rangeK: number;
  throws: number;
}

export function configFor(difficulty: string, round: number): ReleaseConfig {
  const t = DIFFICULTY[difficulty] ?? DIFFICULTY.standard;
  return {
    tolerance: t[Math.min(round, t.length) - 1],
    // Záložná hodnota; hra si ju prepočíta podľa vzdialenosti terča.
    maxPull: 160,
    rangeK: 2.35,
    throws: THROWS,
  };
}

/**
 * Strop ťahu. Odvodzuje sa od vzdialenosti terča, nie z pevného čísla:
 * pruh SILA tak pri správnom hode ukáže vždy okolo 65 % bez ohľadu na to,
 * aký tvar má obrazovka — a to je dôležité, keď budú tablety rôzne.
 * Pevná hodnota by na vyššej obrazovke znamenala, že sa terč nedá dohodiť.
 */
export function maxPullFor(distance: number, rangeK: number): number {
  return (distance / rangeK) * 1.55;
}

export interface Shot {
  /** kam dopadol */
  point: Point;
  /** 0..1 — na pruh sily */
  power: number;
  /** vzdialenosť od stredu terča */
  distance: number;
}

/** Ťah dozadu → sila 0..1. Dlhší ťah ako maxPull už nepridá. */
export function pullPower(anchor: Point, drag: Point, cfg: ReleaseConfig): number {
  const len = Math.hypot(anchor.x - drag.x, anchor.y - drag.y);
  return Math.min(1, len / cfg.maxPull);
}

/**
 * Kam hod dopadne. Let je priamy — bez tiaže, aby bol predvídateľný
 * a hráč vedel, prečo minul. Náhoda v hre nie je žiadna.
 */
export function landing(anchor: Point, drag: Point, cfg: ReleaseConfig): Point {
  const dx = anchor.x - drag.x, dy = anchor.y - drag.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ...anchor };
  const range = Math.min(len, cfg.maxPull) * cfg.rangeK;
  return { x: anchor.x + (dx / len) * range, y: anchor.y + (dy / len) * range };
}

export function shoot(anchor: Point, drag: Point, target: Point, cfg: ReleaseConfig): Shot {
  const point = landing(anchor, drag, cfg);
  return {
    point,
    power: pullPower(anchor, drag, cfg),
    distance: Math.hypot(point.x - target.x, point.y - target.y),
  };
}

export interface ReleaseScore {
  /** najlepší z hodov — ten sa ukazuje na výsledku */
  best: number;
  score: number;
  passed: boolean;
}

/** Z troch hodov platí najlepší — tri pokusy majú hráča povzbudiť, nie potrestať. */
export function scoreRelease(shots: Shot[], cfg: ReleaseConfig): ReleaseScore {
  if (!shots.length) return { best: Infinity, score: 0, passed: false };
  const best = Math.min(...shots.map((s) => s.distance));
  const score = Math.max(0, 1 - best / (cfg.tolerance * 2));
  return { best, score, passed: best <= cfg.tolerance };
}

export const toMm = (units: number): number => Math.round(units * MM_PER_UNIT);
