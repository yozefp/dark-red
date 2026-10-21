import { C } from '@/ui/tokens';
import { TRACE_ARROW, type Point } from './geometry';
import type { Stage } from '../shell';
import type { DrawScore } from './scoring';

/**
 * Vykresľovanie hry DRAW. Oddelené od skórovania — ak zaostane,
 * výsledok to neovplyvní.
 *
 * Farby aj hrúbky sú z dizajnérskeho exportu (HRA 4 TRACE). Hrúbky sú
 * v pixeloch exportu a násobia sa `k` z `traceLayout` — inak by na inom
 * rozlíšení vyšli inak hrubé ako v dizajne.
 *
 * Funkcie nižšie zdieľa hra, ukážka na tutoriáli aj výsledková obrazovka,
 * nech sa nemôžu rozísť.
 */

export const TRACE_STYLE = {
  /** matná dráha, kadiaľ sa ešte nešlo */
  track: 'rgba(244,232,226,.2)', trackW: 2,
  /** prejdená časť — prechod zľava zdola doprava hore */
  stops: ['#D8232A', '#FF4A1C', '#FFB627'], lineW: 10,
  start: '#FFB627', startFill: '#16080C', startR: 22, startDotR: 8,
  ring: '#FFE2A0', ringFill: 'rgba(255,241,201,.2)', ringR: 25,
  off: 'rgba(216,35,42,.75)',
} as const;

export function tracePolyline(ctx: CanvasRenderingContext2D, path: Point[], closed = true) {
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (closed) ctx.closePath();
}

/** Prechod ťahu. V exporte ide cez ohraničenie obrysu po uhlopriečke. */
export function traceGradient(ctx: CanvasRenderingContext2D, path: Point[]): CanvasGradient {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of path) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const g = ctx.createLinearGradient(x0, y1, x1, y0);
  g.addColorStop(0, TRACE_STYLE.stops[0]);
  g.addColorStop(0.55, TRACE_STYLE.stops[1]);
  g.addColorStop(1, TRACE_STYLE.stops[2]);
  return g;
}

export function drawTrack(ctx: CanvasRenderingContext2D, path: Point[], k: number) {
  tracePolyline(ctx, path);
  ctx.strokeStyle = TRACE_STYLE.track; ctx.lineWidth = TRACE_STYLE.trackW * k; ctx.stroke();
}

/** Štartovací krúžok a šípka smeru vedľa neho. */
export function drawStart(ctx: CanvasRenderingContext2D, s: Point, k: number) {
  const S = TRACE_STYLE;
  ctx.beginPath(); ctx.arc(s.x, s.y, S.startR * k, 0, Math.PI * 2);
  ctx.fillStyle = S.startFill; ctx.fill();
  ctx.strokeStyle = S.start; ctx.lineWidth = 2 * k; ctx.stroke();
  ctx.beginPath(); ctx.arc(s.x, s.y, S.startDotR * k, 0, Math.PI * 2);
  ctx.fillStyle = S.start; ctx.fill();

  const at = (p: Point) => [s.x + p.x * k, s.y + p.y * k] as const;
  const { tail, tip, barbs } = TRACE_ARROW;
  ctx.beginPath();
  ctx.moveTo(...at(tail)); ctx.lineTo(...at(tip));
  ctx.moveTo(...at(barbs[0])); ctx.lineTo(...at(tip)); ctx.lineTo(...at(barbs[1]));
  ctx.strokeStyle = S.start; ctx.lineWidth = 2 * k; ctx.stroke();
}

/** Krúžok pod prstom. Mimo línie sčervenie. */
export function drawFinger(ctx: CanvasRenderingContext2D, p: Point, k: number, off = false) {
  ctx.beginPath(); ctx.arc(p.x, p.y, TRACE_STYLE.ringR * k, 0, Math.PI * 2);
  ctx.fillStyle = off ? 'rgba(216,35,42,.22)' : TRACE_STYLE.ringFill; ctx.fill();
  ctx.strokeStyle = off ? C.red : TRACE_STYLE.ring; ctx.lineWidth = 2 * k; ctx.stroke();
}

export class DrawRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private base!: HTMLCanvasElement;
  private covPath: Path2D | null = null;
  private offPath = new Path2D();
  private adapt = 1;
  private frame = 0;
  private lastFrameAt = 0;

  constructor(private stage: Stage, private path: Point[], private k: number) {
    this.ctx = stage.ctx;
    this.canvas = stage.canvas;
    this.buildBase();
  }

  private get scale() { return this.stage.scale; }

  resize() {
    if (this.stage.fit()) this.buildBase();
  }

  /** Matná dráha + štartovací krúžok so šípkou — raz za kolo. */
  private buildBase() {
    const x = this.stage.offscreen();
    x.lineCap = 'round'; x.lineJoin = 'round';
    drawTrack(x, this.path, this.k);
    this.base = x.canvas as HTMLCanvasElement;
  }

  reset() {
    this.covPath = null;
    this.offPath = new Path2D();
    this.adapt = 1; this.frame = 0;
  }

  /** Prestaví cesty podľa skóre. Volá sa len keď sa niečo zmenilo. */
  update(score: DrawScore) {
    const p = new Path2D();
    for (let i = 0; i < this.path.length - 1; i++) {
      if (score.covered[i] && score.covered[i + 1]) {
        p.moveTo(this.path[i].x, this.path[i].y);
        p.lineTo(this.path[i + 1].x, this.path[i + 1].y);
      }
    }
    this.covPath = p;

    const o = new Path2D();
    for (const [a, b] of score.offSegments) { o.moveTo(a.x, a.y); o.lineTo(b.x, b.y); }
    this.offPath = o;
  }

  /** Vráti true, ak sa v tomto snímku kreslilo. */
  render(finger: Point | null, isOff: boolean, now: number): boolean {
    // pri slabom zariadení kreslíme každý druhý snímok — skóre sa tým nemení
    if (this.lastFrameAt) {
      const dt = now - this.lastFrameAt;
      if (dt > 22) this.adapt = 2;
      else if (this.frame > 30 && dt < 15) this.adapt = 1;
    }
    this.lastFrameAt = now; this.frame++;
    if (this.frame % this.adapt !== 0) return false;

    const ctx = this.ctx, k = this.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.strokeStyle = TRACE_STYLE.off; ctx.lineWidth = 4 * k; ctx.stroke(this.offPath);

    if (this.covPath) {
      ctx.strokeStyle = traceGradient(ctx, this.path);
      ctx.lineWidth = TRACE_STYLE.lineW * k;
      ctx.stroke(this.covPath);
    }

    // štart ide nad ťah, ako v exporte
    drawStart(ctx, this.path[0], k);
    if (finger) drawFinger(ctx, finger, k, isOff);
    return true;
  }

  /** Celý tvar rozžiarený alebo tlmený — pre výsledkovú obrazovku. */
  renderFinal(won: boolean) {
    const ctx = this.ctx, k = this.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    tracePolyline(ctx, this.path);
    if (won) {
      ctx.strokeStyle = traceGradient(ctx, this.path); ctx.lineWidth = TRACE_STYLE.lineW * k;
    } else {
      ctx.strokeStyle = C.maroon; ctx.lineWidth = 7 * k;
    }
    ctx.stroke();
  }

  get fps() { return this.lastFrameAt ? Math.round(1000 / Math.max(1, performance.now() - this.lastFrameAt)) : 0; }
  get skipping() { return this.adapt > 1; }
}
