import { C } from '@/ui/tokens';
import { VIEW, type Point } from './geometry';
import type { DrawScore } from './scoring';

/**
 * Vykresľovanie hry DRAW. Oddelené od skórovania — ak zaostane,
 * výsledok to neovplyvní.
 *
 * Matná dráha sa predkresľuje raz do offscreen plátna, pretože sa
 * počas kola nemení. Per snímok sa potom robí len prekopírovanie
 * a dokreslenie prejdených úsekov.
 */

export interface Spark { x: number; y: number; vx: number; vy: number; r: number; t: number }

export class DrawRenderer {
  private ctx: CanvasRenderingContext2D;
  private base!: HTMLCanvasElement;
  private scale = 1;
  private covPath: Path2D | null = null;
  private offPath = new Path2D();
  private sparks: Spark[] = [];
  private adapt = 1;
  private frame = 0;
  private lastFrameAt = 0;

  constructor(private canvas: HTMLCanvasElement, private path: Point[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d kontext nedostupný');
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.scale = (r.width * dpr) / VIEW;
    this.buildBase();
  }

  /** Matná dráha + štartovací krúžok so šípkou — raz za kolo. */
  private buildBase() {
    const b = document.createElement('canvas');
    b.width = this.canvas.width; b.height = this.canvas.height;
    const x = b.getContext('2d')!;
    x.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    x.lineCap = 'round'; x.lineJoin = 'round';

    x.beginPath();
    this.path.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
    x.closePath();
    x.strokeStyle = C.line; x.lineWidth = 7; x.stroke();

    const s = this.path[0];
    x.beginPath(); x.arc(s.x, s.y, 15, 0, Math.PI * 2);
    x.strokeStyle = C.amber; x.lineWidth = 2.5; x.stroke();
    x.beginPath(); x.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
    x.fillStyle = C.amber; x.fill();
    // šípka naznačujúca smer
    x.beginPath();
    x.moveTo(s.x - 9, s.y + 26); x.lineTo(s.x - 2, s.y + 14); x.lineTo(s.x + 6, s.y + 24);
    x.strokeStyle = C.amber; x.lineWidth = 2; x.stroke();

    this.base = b;
  }

  reset() {
    this.covPath = null;
    this.offPath = new Path2D();
    this.sparks = [];
    this.adapt = 1; this.frame = 0;
  }

  addSpark(x: number, y: number, now: number) {
    if (Math.random() > 0.55) return;
    const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 2.4;
    this.sparks.push({
      x: x + (Math.random() - 0.5) * 7, y: y + (Math.random() - 0.5) * 7,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.9,
      r: 3.2 + Math.random() * 2.6, t: now,
    });
    if (this.sparks.length > 22) this.sparks.shift();
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
    if (this.frame % this.adapt !== 0 && this.sparks.length === 0) return false;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(200,52,62,.75)'; ctx.lineWidth = 4; ctx.stroke(this.offPath);

    if (this.covPath) {
      ctx.strokeStyle = 'rgba(255,90,31,.26)'; ctx.lineWidth = 20; ctx.stroke(this.covPath);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 9; ctx.stroke(this.covPath);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i], age = (now - s.t) / 420;
      if (age >= 1) { this.sparks.splice(i, 1); continue; }
      const px = s.x + s.vx * age * 26, py = s.y + s.vy * age * 26 + age * age * 14;
      ctx.beginPath(); ctx.arc(px, py, s.r * (1 - age) + 0.6, 0, Math.PI * 2);
      ctx.fillStyle = isOff
        ? `rgba(224,67,74,${(1 - age) * 0.55})`
        : `rgba(255,${Math.round(150 + 90 * (1 - age))},${Math.round(40 + 70 * (1 - age))},${(1 - age) * 0.85})`;
      ctx.fill();
    }

    if (finger) {
      ctx.beginPath(); ctx.arc(finger.x, finger.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = isOff ? 'rgba(224,67,74,.22)' : 'rgba(255,180,90,.20)'; ctx.fill();
      ctx.beginPath(); ctx.arc(finger.x, finger.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = isOff ? '#E0434A' : '#FFE3A8'; ctx.fill();
      ctx.beginPath(); ctx.arc(finger.x, finger.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
    }
    return true;
  }

  /** Celý tvar rozžiarený alebo tlmený — pre výsledkovú obrazovku. */
  renderFinal(won: boolean) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    this.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (won) {
      ctx.strokeStyle = 'rgba(255,90,31,.22)'; ctx.lineWidth = 26; ctx.stroke();
      ctx.strokeStyle = C.orange; ctx.lineWidth = 9; ctx.stroke();
    } else {
      ctx.strokeStyle = C.maroon; ctx.lineWidth = 7; ctx.stroke();
    }
  }

  get fps() { return this.lastFrameAt ? Math.round(1000 / Math.max(1, performance.now() - this.lastFrameAt)) : 0; }
  get skipping() { return this.adapt > 1; }
}
