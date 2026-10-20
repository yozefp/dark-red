import type { Point } from '../shell';

/**
 * Tvar aj rozloženie lupeňov pochádzajú z dizajnérskeho exportu
 * (2.x Memorize — *.dc.html). Nič sa tu neodhaduje: krivka, uhly aj
 * poloha stredu sú prepísané z neho jedna k jednej.
 *
 * Export kreslí lupeň v rámci 960×600 takto:
 *   <g transform="translate(480 530) rotate(θ)">
 *     <path d="M0 60 C 165 10 140 -250 0 -330 C -140 -250 -165 10 0 60 Z">
 * Lupeň teda stojí zvisle, stopkou pod otočným bodom a špicom nahor,
 * a do kvetu sa poskladá štyrmi otočeniami.
 */

/** Otočenia lupeňov v stupňoch; 0° mieri nahor. Presne ako v exporte. */
export const ANGLES = [-78, -27, 27, 78];

/** Poradie vykresľovania — v exporte zľava doprava, pravý je navrchu. */
export const DRAW_ORDER = [0, 1, 2, 3];

/** Otočný bod kvetu ako podiel rámca 960×600 z exportu. */
export const PIVOT = { x: 480 / 960, y: 530 / 600 };

/** Dĺžka lupeňa od stopky po špicu vo vlastných jednotkách exportu. */
export const PETAL_LEN = 390;

/** Dĺžka lupeňa ako podiel výšky rámca — 390 zo 600. */
export const LEN_OF_FRAME = PETAL_LEN / 600;

function cubic(p0: Point, c1: Point, c2: Point, p3: Point, n: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    });
  }
  return out;
}

/** Obrys lupeňa vo vlastných jednotkách exportu, stopka v (0, 60). */
const LEAF: Point[] = [
  ...cubic({ x: 0, y: 60 }, { x: 165, y: 10 }, { x: 140, y: -250 }, { x: 0, y: -330 }, 30),
  ...cubic({ x: 0, y: -330 }, { x: -140, y: -250 }, { x: -165, y: 10 }, { x: 0, y: 60 }, 30),
];

/**
 * Rozmery celého kvetu v jednotkách exportu, vztiahnuté k otočnému bodu.
 * Lupene idú od stopky nahor, takže kvet nie je okolo pivota súmerný —
 * nadol siaha len o kúsok a nahor o celú dĺžku lupeňa. Bez toho by sa
 * veľkosť počítala z nesprávneho rozmeru a kvet by vyšiel drobný.
 */
export const FLOWER = (() => {
  let left = 0, right = 0, up = 0, down = 0;
  for (const deg of ANGLES) {
    const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (const { x, y } of LEAF) {
      const px = x * ca - y * sa, py = x * sa + y * ca;
      left = Math.min(left, px); right = Math.max(right, px);
      up = Math.min(up, py); down = Math.max(down, py);
    }
  }
  return { left, right, up, down, width: right - left, height: down - up };
})();

/**
 * Lupeň otočený o `rotDeg` okolo bodu (cx, cy), zväčšený tak, aby bol
 * dlhý `len`. Vracia mnohouholník, nie Path2D — zásah prsta sa tým počíta
 * tou istou geometriou, akú hráč vidí.
 */
export function petalPolygon(
  cx: number, cy: number, rotDeg: number, len: number,
): Point[] {
  const k = len / PETAL_LEN;
  const a = (rotDeg * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  return LEAF.map(({ x, y }) => ({
    x: cx + (x * ca - y * sa) * k,
    y: cy + (x * sa + y * ca) * k,
  }));
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
 * Pri stopke sa lupene prekrývajú, takže vyhráva ten navrchu — teda ten,
 * ktorý sa kreslí ako posledný. Hráč tak trafí to, na čo sa pozerá.
 */
export function hitPetal(p: Point, petals: Point[][]): number {
  for (let k = DRAW_ORDER.length - 1; k >= 0; k--) {
    const i = DRAW_ORDER[k];
    if (petals[i] && pointInPolygon(p, petals[i])) return i;
  }
  return -1;
}
