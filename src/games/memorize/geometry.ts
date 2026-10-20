import type { Point } from '../shell';

/**
 * Štyri listy okolo stredu, po 90°, pootočené tak, aby žiadny nemieril
 * kolmo dole — tam býva ruka a zakrývala by si vlastný cieľ.
 * Tak sú lupene rozložené na schválenej obrazovke.
 */
export const ANGLES = [-140, -50, 40, 130];

/** Stred kvetu. Odmerané z predlohy — nesedí v strede plochy. */
export const ORIGIN_Y = 0.52;
export const CENTER_X = 0.58;

/**
 * Poradie vykresľovania. Lupene sa výrazne prekrývajú, tak ako v predlohe,
 * takže navrchu je ten, ktorý sa kreslí ako posledný — a práve jemu patrí
 * ťuknutie do prekrytia.
 */
export const DRAW_ORDER = [0, 1, 2, 3];

/**
 * Obrys lupeňa, odmeraný zo schválenej obrazovky.
 *
 * Tvar sa nedal rozumne popísať vzorcom — je asymetrický a ostrý len pri
 * stopke, takže každý pokus o krivku vyzeral inak než predloha. Body sú
 * preto vytiahnuté priamo z nej: rozsvietený lupeň sa izoloval podľa farby,
 * obrys sa doplnil o časť zakrytú susedom a znormalizoval tak, že stopka
 * leží v počiatku a špica v [1, 0]. Mierku aj otočenie dodá až hra.
 */
const LEAF: readonly (readonly [number, number])[] = [
  [0.000,0.000], [0.035,-0.028], [0.070,-0.056], [0.106,-0.083],
  [0.143,-0.108], [0.180,-0.133], [0.219,-0.156], [0.258,-0.178],
  [0.298,-0.198], [0.338,-0.218], [0.379,-0.236], [0.421,-0.252],
  [0.463,-0.267], [0.507,-0.279], [0.551,-0.284], [0.595,-0.279],
  [0.638,-0.265], [0.679,-0.248], [0.720,-0.229], [0.761,-0.211],
  [0.802,-0.193], [0.843,-0.174], [0.884,-0.156], [0.924,-0.136],
  [0.961,-0.111], [0.986,-0.074], [0.996,-0.031], [0.998,0.014],
  [0.996,0.059], [0.992,0.104], [0.985,0.148], [0.975,0.192],
  [0.962,0.234], [0.939,0.273], [0.903,0.298], [0.859,0.310],
  [0.815,0.315], [0.770,0.317], [0.725,0.316], [0.681,0.314],
  [0.636,0.308], [0.592,0.301], [0.548,0.292], [0.504,0.281],
  [0.461,0.268], [0.419,0.254], [0.377,0.238], [0.336,0.220],
  [0.295,0.201], [0.256,0.180], [0.216,0.158], [0.178,0.135],
  [0.140,0.111], [0.103,0.085], [0.067,0.059], [0.032,0.031],
] as const;

/**
 * Najväčší dosah lupeňa od stredu kvetu, v násobkoch jeho dĺžky.
 * Obrys siaha po osi na 1 a do boku ešte o kus, takže sa z toho dá
 * presne dopočítať, aký veľký kvet sa na plátno zmestí.
 */
export const REACH = (() => {
  let m = 0;
  for (const [x, y] of LEAF) m = Math.max(m, Math.hypot(x, y));
  return m;
})();

/**
 * Lupeň v danom smere a veľkosti. Vracia mnohouholník, nie Path2D —
 * zásah prsta sa tým počíta tou istou geometriou, akú hráč vidí.
 */
export function petalPolygon(
  cx: number, cy: number, angleDeg: number, r: number, width = 1,
): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  return LEAF.map(([x, y]) => {
    const px = x * r, py = y * r * width;
    return { x: cx + px * ca - py * sa, y: cy + px * sa + py * ca };
  });
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
