import type { Point } from '../shell';

/**
 * Lupene vejárom ako lotos — tak sú na schválenej obrazovke.
 * Vejár sa rozprestiera nahor a do strán, dole nemieri žiadny:
 * tam býva ruka a zakrývala by si vlastný cieľ.
 */
export const ANGLES = [-158, -122, -58, -22];

/** Stred kvetu nesedí v strede plochy — lupene z neho vybiehajú nahor. */
export const ORIGIN_Y = 0.78;

/** Tvar obálky lupeňa: najširší je v 58 % dĺžky, nie v polovici. */
const PEAK_A = 1.4;
const PEAK_B = 1.0;
const BULGE_NORM =
  (PEAK_A / (PEAK_A + PEAK_B)) ** PEAK_A * (PEAK_B / (PEAK_A + PEAK_B)) ** PEAK_B;

/**
 * Lupeň ako list: vybieha zo stredu, rozšíri sa a končí špicom.
 * Vracia mnohouholník, nie Path2D — tvar sa tým dá overiť testom
 * a zásah prsta sa počíta tou istou geometriou, akú hráč vidí.
 */
export function petalPolygon(
  cx: number, cy: number, angleDeg: number, r: number, width = 0.31, n = 34,
): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  const per = { x: -Math.sin(a), y: Math.cos(a) };
  const w = r * width;

  const at = (t: number, side: 1 | -1): Point => {
    // Obálka listu: špicatá v strede kvetu aj na konci, najširšia za
    // polovicou dĺžky. Lupene sa vo vejári prekrývajú, tak ako v dizajne —
    // o tom, komu ťuknutie patrí, preto rozhoduje poradie vykresľovania.
    const bulge = (t ** PEAK_A * (1 - t) ** PEAK_B) / BULGE_NORM;
    const d = r * t;
    return {
      x: cx + dir.x * d + per.x * w * bulge * side,
      y: cy + dir.y * d + per.y * w * bulge * side,
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
  for (let i = petals.length - 1; i >= 0; i--) if (pointInPolygon(p, petals[i])) return i;
  return -1;
}
