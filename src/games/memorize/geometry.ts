import type { Point } from '../shell';

/**
 * Lupene vejárom ako lotos — tak sú na schválenej obrazovke.
 * Vejár sa rozprestiera nahor a do strán, dole nemieri žiadny:
 * tam býva ruka a zakrývala by si vlastný cieľ.
 */
export const ANGLES = [-158, -122, -58, -22];

/** Stred kvetu nesedí v strede plochy — lupene z neho vybiehajú nahor. */
export const ORIGIN_Y = 0.78;

/**
 * Poradie vykresľovania. Vonkajšie lupene idú dozadu, predné dva navrch —
 * inak by jeden okraj kvetu prekrýval druhý a tvar by vyzeral nakrivo.
 */
export const DRAW_ORDER = [0, 3, 1, 2];

/** Normalizácia obálky, aby najširšie miesto malo presne šírku `width`. */
const BULGE_NORM = (() => {
  let m = 0;
  for (let i = 1; i < 400; i++) m = Math.max(m, rawBulge(i / 400));
  return m;
})();

/**
 * Obálka lupeňa: špicatá pri stopke, najširšia za polovicou a na konci
 * zaoblená, nie zahrotená — tak vyzerajú lupene na schválenej obrazovke.
 * Odmocnina z (1 − t⁴) dáva na špici zvislú dotyčnicu, čo je tá oblosť.
 */
function rawBulge(t: number): number {
  // t^1.2 drží lupeň pri stopke úzky, odmocnina mu zaobľuje špicu;
  // spolu to dá polovičný uhol 27°, takže susedia vo vejári sa prekrývajú,
  // ale nezlievajú do jedného tvaru a dá sa ťuknúť na konkrétny
  return t ** 1.2 * Math.sqrt(Math.max(0, 1 - t ** 4));
}

/**
 * Lupeň ako list: vybieha zo stredu, rozšíri sa a končí špicom.
 * Vracia mnohouholník, nie Path2D — tvar sa tým dá overiť testom
 * a zásah prsta sa počíta tou istou geometriou, akú hráč vidí.
 */
export function petalPolygon(
  cx: number, cy: number, angleDeg: number, r: number, width = 0.36, n = 40,
): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  const per = { x: -Math.sin(a), y: Math.cos(a) };
  const w = r * width;

  const at = (t: number, side: 1 | -1): Point => {
    // Obálka listu: špicatá v strede kvetu aj na konci, najširšia za
    // polovicou dĺžky. Lupene sa vo vejári prekrývajú, tak ako v dizajne —
    // o tom, komu ťuknutie patrí, preto rozhoduje poradie vykresľovania.
    const bulge = rawBulge(t) / BULGE_NORM;
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
  for (let k = DRAW_ORDER.length - 1; k >= 0; k--) {
    const i = DRAW_ORDER[k];
    if (petals[i] && pointInPolygon(p, petals[i])) return i;
  }
  return -1;
}
