import { dist, pathLength, type Point } from './geometry';
import type { Sample } from '@/core/input';

/**
 * Skórovanie hry DRAW. ČISTÁ FUNKCIA.
 *
 * Žiadny canvas, žiadny DOM, žiadny čas. Vďaka tomu sa dá:
 *  — testovať bez prehliadača
 *  — prehrať na ťahoch zaznamenaných z reálneho tabletu
 *  — vykresľovanie môže zaostávať a výsledok to neovplyvní
 */

export interface DrawConfig {
  /** polomer tolerancie v jednotkách VIEW */
  tolerance: number;
  /** prah na postup, 0..1 */
  pass: number;
  /** váha trestu za vzdialenosť prejdenú mimo dráhy */
  penalty: number;
}

export const DIFFICULTY: Record<string, number[]> = {
  easy:     [34, 26, 20],
  standard: [26, 18, 12],
  hard:     [20, 13, 9],
};

export interface DrawScore {
  /** podiel dráhy, cez ktorý hráč prešiel v tolerancii */
  coverage: number;
  /** presnosť z priemernej odchýlky prsta od dráhy */
  precision: number;
  /** priemerná odchýlka v jednotkách VIEW */
  meanDeviation: number;
  /** trest za vybočenie */
  penalty: number;
  /** výsledok 0..1 */
  score: number;
  /** ktoré body dráhy boli pokryté — pre vykreslenie */
  covered: boolean[];
  /** úseky mimo dráhy — pre vykreslenie červenej stopy */
  offSegments: [Point, Point][];
}

/**
 * Hľadanie najbližšieho bodu dráhy v okne okolo poslednej zhody.
 * Dráha je uzavretá, takže sa index zalamuje.
 */
function nearest(path: Point[], p: Point, from: number, window = 35) {
  let bi = from, bd = Infinity;
  for (let k = -window; k <= window; k++) {
    const i = (from + k + path.length) % path.length;
    const d = dist(path[i], p);
    if (d < bd) { bd = d; bi = i; }
  }
  return { index: bi, distance: bd };
}

export function scoreDraw(samples: Sample[], path: Point[], cfg: DrawConfig): DrawScore {
  const covered = new Array(path.length).fill(false);
  const offSegments: [Point, Point][] = [];
  const total = pathLength(path);
  let sumDev = 0, nDev = 0, offLen = 0, idx = 0;

  for (let i = 0; i < samples.length; i++) {
    const cur: Point = { x: samples[i].x, y: samples[i].y };
    const near = nearest(path, cur, idx);

    // odchýlka sa orezáva — veľké vybočenie rieši trest, nie priemer
    sumDev += Math.min(near.distance, cfg.tolerance * 2);
    nDev++;

    if (i > 0) {
      const prev: Point = { x: samples[i - 1].x, y: samples[i - 1].y };
      if (near.distance > cfg.tolerance) {
        offSegments.push([prev, cur]);
        offLen += dist(prev, cur);
      }
      // interpolácia medzi vzorkami — riedke vzorkovanie na lacnom
      // digitizéri tým prestáva hráča trestať
      const d = dist(prev, cur);
      const steps = Math.max(1, Math.ceil(d / 4));
      for (let s = 0; s <= steps; s++) {
        const q: Point = {
          x: prev.x + (cur.x - prev.x) * (s / steps),
          y: prev.y + (cur.y - prev.y) * (s / steps),
        };
        const n = nearest(path, q, idx);
        if (n.distance <= cfg.tolerance) { covered[n.index] = true; idx = n.index; }
      }
    } else {
      if (near.distance <= cfg.tolerance) { covered[near.index] = true; idx = near.index; }
    }
  }

  const coverage = covered.filter(Boolean).length / path.length;
  const meanDeviation = nDev ? sumDev / nDev : cfg.tolerance;
  const r = Math.min(1, meanDeviation / cfg.tolerance);
  const precision = Math.max(0, 1 - r * r);
  const penalty = Math.min(0.6, (offLen / total) * cfg.penalty);
  const score = Math.max(0, coverage * precision - penalty);

  return { coverage, precision, meanDeviation, penalty, score, covered, offSegments };
}

export function configFor(difficulty: string, round: number): DrawConfig {
  const tol = (DIFFICULTY[difficulty] ?? DIFFICULTY.standard)[round - 1] ?? 12;
  return { tolerance: tol, pass: 0.85, penalty: 1.0 };
}
