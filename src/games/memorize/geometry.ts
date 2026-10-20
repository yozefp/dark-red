import type { Point } from '../shell';

/**
 * Štyri listy okolo stredu, po 90°, pootočené tak, aby žiadny nemieril
 * kolmo dole — tam býva ruka a zakrývala by si vlastný cieľ.
 * Tak sú lupene rozložené na schválenej obrazovke.
 */
export const ANGLES = [-140, -50, 40, 130];

/** Lupene vybiehajú zo stredu plochy do štyroch strán. */
export const ORIGIN_Y = 0.5;

/**
 * Poradie vykresľovania. Lupene sa výrazne prekrývajú, tak ako v predlohe,
 * takže navrchu je ten, ktorý sa kreslí ako posledný — a práve jemu patrí
 * ťuknutie do prekrytia.
 */
export const DRAW_ORDER = [0, 1, 2, 3];

/**
 * Obálka lupeňa. Nula na oboch koncoch, takže list je zahrotený pri stopke
 * aj na špici — tak je to na schválenej obrazovke.
 *
 * Dve rôzne obálky robia list asymetrický: vonkajšia hrana je vypuklejšia
 * než vnútorná. Z toho vzniká ten vrtuľový pohyb kvetu; symetrický list
 * by vyzeral ako list stromu, nie ako lupeň.
 */
/** [mocnina pri stopke, mocnina pri špici, podiel šírky] pre vonkajšiu
 *  a vnútornú hranu. Vonkajšia je plnšia, vnútorná plochejšia. */
const OUTER = [1.6, 1.0, 1.0] as const;
const INNER = [2.1, 1.0, 0.58] as const;

const shape = (t: number, a: number, c: number) => t ** a * (1 - t) ** c;
/** vrchol obálky, aby najširšie miesto malo presne zadanú šírku */
const peak = (a: number, c: number) => shape(a / (a + c), a, c);

/**
 * Lupeň ako list: vybieha zo stredu, rozšíri sa a končí špicom.
 * Vracia mnohouholník, nie Path2D — tvar sa tým dá overiť testom
 * a zásah prsta sa počíta tou istou geometriou, akú hráč vidí.
 */
export function petalPolygon(
  cx: number, cy: number, angleDeg: number, r: number, width = 0.40, n = 44,
): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  const per = { x: -Math.sin(a), y: Math.cos(a) };
  const w = r * width;

  const at = (t: number, side: 1 | -1): Point => {
    const [a, c, k] = side === 1 ? OUTER : INNER;
    const b = (shape(t, a, c) / peak(a, c)) * k;
    const d = r * t;
    return {
      x: cx + dir.x * d + per.x * w * b * side,
      y: cy + dir.y * d + per.y * w * b * side,
    };
  };

  const out: Point[] = [];
  for (let i = 0; i <= n; i++) out.push(at(i / n, 1));
  for (let i = n - 1; i > 0; i--) out.push(at(i / n, -1));
  return out;
}

/** Zásah lupeňa. Paprskový test — funguje aj na nekonvexnom tvare. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Ktorý lupeň hráč trafil, alebo -1.
 * Vo vejári sa lupene prekrývajú, takže vyhráva ten, ktorý je navrchu —
 * teda ten, ktorý sa kreslí ako posledný. Hráč tak vždy trafí to,
 * na čo sa pozerá.
 */
export function hitPetal(p: Point, petals: Point[][]): number {
  for (let k = DRAW_ORDER.length - 1; k >= 0; k--) {
    const i = DRAW_ORDER[k];
    if (petals[i] && pointInPolygon(p, petals[i])) return i;
  }
  return -1;
}
