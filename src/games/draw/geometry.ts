/** Čistá geometria — žiadny DOM, testovateľné samostatne. */

export interface Point { x: number; y: number }

/** Súradnicový priestor hry. Všetky tolerancie sú v týchto jednotkách,
 *  takže obtiažnosť je rovnaká na každom displeji. */
export const VIEW = 600;

/**
 * Obrys loga IQOS — zaoblený trojuholník.
 * Kontrolné body ležia na dotyčnici vo vrchole, preto sú rohy hladké.
 * k = 0.7698 by dalo presnú kružnicu; 0.52 dáva trojuholníkový charakter.
 */
export function iqosPath(cx: number, cy: number, r: number, k = 0.52): string {
  const a = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
  const p = a.map((t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)] as const);
  const tan = a.map((t) => [-Math.sin(t), Math.cos(t)] as const);
  let d = `M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, K = r * k;
    d += ` C ${(p[i][0] + tan[i][0] * K).toFixed(2)} ${(p[i][1] + tan[i][1] * K).toFixed(2)},`
       + ` ${(p[j][0] - tan[j][0] * K).toFixed(2)} ${(p[j][1] - tan[j][1] * K).toFixed(2)},`
       + ` ${p[j][0].toFixed(2)} ${p[j][1].toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Kubická Bézierova krivka v bode t. */
function bez(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
           y: a * p0.y + b * c1.y + c * c2.y + d * p1.y };
}

/**
 * Rovnomerné vzorkovanie dráhy bez SVG — aby sa dalo počítať aj v teste,
 * kde getPointAtLength nie je k dispozícii.
 */
export function samplePath(cx: number, cy: number, r: number, n: number, k = 0.52): Point[] {
  const a = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
  const p = a.map((t) => ({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }));
  const tan = a.map((t) => ({ x: -Math.sin(t), y: Math.cos(t) }));
  const K = r * k;

  // hustá vzorka každého segmentu, potom prevzorkovanie na rovnakú dĺžku
  const dense: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    const c1 = { x: p[i].x + tan[i].x * K, y: p[i].y + tan[i].y * K };
    const c2 = { x: p[j].x - tan[j].x * K, y: p[j].y - tan[j].y * K };
    const steps = 400;
    for (let s = 0; s < steps; s++) dense.push(bez(p[i], c1, c2, p[j], s / steps));
  }
  dense.push(dense[0]);

  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dist(dense[i - 1], dense[i]));
  const total = cum[cum.length - 1];

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const target = (total * i) / n;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid; }
    out.push(dense[lo]);
  }
  return out;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(pts: Point[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L + dist(pts[pts.length - 1], pts[0]);
}
