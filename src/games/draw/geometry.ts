/** Čistá geometria — žiadny DOM, testovateľné samostatne. */

import { VIEW, type Point } from '../shell';

export type { Point };
/** Tolerancie sú v jednotkách tejto siete, takže obtiažnosť je rovnaká
 *  na každom displeji. Sieť je spoločná pre všetky hry. */
export { VIEW };

/** Zaoblenie rohov obrysu. Overené proti schválenému vizuálu. */
export const K_SHAPE = 0.40;

/**
 * Obrys loga IQOS — zaoblený trojuholník.
 * Kontrolné body ležia na dotyčnici vo vrchole, preto sú rohy hladké.
 * k = 0.7698 by dalo presnú kružnicu; 0.40 sedí na schválený vizuál —
 * dlhé takmer rovné strany a výrazne zaoblené rohy.
 */
export function iqosPath(cx: number, cy: number, r: number, k = K_SHAPE): string {
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

/**
 * Obrys hry DRAW z dizajnérskeho exportu (HRA 4 TRACE — 2. HRA V POLOVICI,
 * rámec 1280×800). Nič sa neodhaduje: je to rovnostranný trojuholník
 * s rohmi zaoblenými kružnicou — rovné strany, polomer rohu 118,3 a stredy
 * rohov 372,2 od seba. Rozmery sú v pixeloch exportu.
 *
 * RELEASE kreslí terč ešte starým `samplePath`; má vlastný export v poradí.
 */
export const TRACE = (() => {
  const corner = 118.3, side = 372.2;
  return { corner, side, width: side + 2 * corner, height: (side * Math.sqrt(3)) / 2 + 2 * corner };
})();

/**
 * Štart je v strede ľavého dolného rohu (150° od jeho stredu) a ťah ide
 * hore po ľavej strane, ako v exporte. Šípka je v pixeloch exportu
 * vztiahnutá k štartu: chvost, hrot a dve ramená hrotu.
 */
const START_DEG = 150;
export const TRACE_ARROW = {
  tail: { x: -39.8, y: 16.3 }, tip: { x: -59.9, y: -50.8 },
  barbs: [{ x: -47.3, y: -40.0 }, { x: -64.5, y: -34.8 }],
};

/**
 * Plátno okolo obrysu v pixeloch exportu. Navyše je miesto na šípku vľavo
 * a na krúžok prsta, ktorý na okraji presahuje čiaru.
 */
const FRAME = { w: TRACE.width + 2 * 60, h: TRACE.height + 2 * 30 };
export const STAGE_ASPECT = FRAME.w / FRAME.h;

/**
 * Obrys rovnomerne navzorkovaný od štartu v smere ťahu, stred jeho
 * ohraničenia v (cx, cy), výška `h`.
 */
export function traceShape(cx: number, cy: number, h: number, n: number): Point[] {
  const k = h / TRACE.height;
  const r = TRACE.corner * k, s = TRACE.side * k;
  const topY = cy - h / 2 + r, baseY = topY + (s * Math.sqrt(3)) / 2;
  const bl = { x: cx - s / 2, y: baseY }, top = { x: cx, y: topY }, br = { x: cx + s / 2, y: baseY };
  const rad = (d: number) => (d * Math.PI) / 180;
  const on = (c: Point, d: number): Point => ({ x: c.x + r * Math.cos(rad(d)), y: c.y + r * Math.sin(rad(d)) });

  // Uhly rastú v smere ťahu. Medzi oblúkmi sú rovné strany dĺžky s.
  type Seg = { len: number; at: (u: number) => Point };
  const arc = (c: Point, a0: number, a1: number): Seg =>
    ({ len: r * rad(a1 - a0), at: (u) => on(c, a0 + (a1 - a0) * u) });
  const line = (a: Point, b: Point): Seg =>
    ({ len: dist(a, b), at: (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }) });
  const segs: Seg[] = [
    arc(bl, START_DEG, 210), line(on(bl, 210), on(top, 210)),
    arc(top, 210, 330), line(on(top, 330), on(br, 330)),
    arc(br, 330, 450), line(on(br, 90), on(bl, 90)),
    arc(bl, 90, START_DEG),
  ];

  const total = segs.reduce((a, g) => a + g.len, 0);
  const out: Point[] = [];
  let si = 0, before = 0;
  for (let i = 0; i < n; i++) {
    const d = (total * i) / n;
    while (si < segs.length - 1 && d > before + segs[si].len) before += segs[si++].len;
    out.push(segs[si].at((d - before) / segs[si].len));
  }
  return out;
}

/**
 * Obrys usadený do plochy vw×vh tak, ako ho export usadzuje do rámca.
 * `k` je počet jednotiek plochy na pixel exportu — podľa neho sa
 * prepočítajú hrúbky čiar, krúžky aj šípka.
 */
export function traceLayout(vw: number, vh: number, n: number): { path: Point[]; k: number } {
  const k = Math.min(vw / FRAME.w, vh / FRAME.h);
  return { k, path: traceShape(vw / 2, vh / 2, TRACE.height * k, n) };
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
export function samplePath(cx: number, cy: number, r: number, n: number, k = K_SHAPE): Point[] {
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
