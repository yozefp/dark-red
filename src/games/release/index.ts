import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer } from '@/core/input';
import { createStage, type Stage, type Point, type StepMark } from '../shell';
import { samplePath } from '../draw/geometry';
import {
  configFor, pullPower, shoot, scoreRelease, toMm, aimFor,
  type ReleaseConfig, type Shot,
} from './scoring';
import { COPY } from '@/ui/copy';
import { C } from '@/ui/tokens';
import { publishProbe, clearProbe, recordSample } from '@/debug/hooks';

/** Lúč ukazuje smer, nie dopad — dolet si hráč odhaduje sám. */
const GUIDE_LEN = 150;
const PUCK_R = 22;
/** Prstencom terča zodpovedajú podiely vonkajšieho obrysu. */
const RINGS = [1, 0.74, 0.5, 0.28];

export function createReleaseGame(): GameModule {
  let stage: Stage;
  let cfg: ReleaseConfig;
  let round: RoundConfig;
  let detach: (() => void) | null = null;
  let raf = 0;

  let target: Point = { x: 0, y: 0 };
  let anchor: Point = { x: 0, y: 0 };
  let ringPaths: Point[][] = [];
  let outerR = 0;

  let powerFill: HTMLElement;
  let drag: Point | null = null;
  let shots: Shot[] = [];
  let flight: { from: Point; to: Point; t0: number } | null = null;
  let done = false;

  const self: GameModule = {
    id: 'release',
    label: 'RELEASE THE INTENSITY',

    mount(root, rc) {
      round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.tolerance) cfg = { ...cfg, tolerance: rc.overrides.tolerance };

      stage = createStage(root, 'fill');
      stage.area.insertAdjacentHTML('beforeend', `
        <div class="rel__power">
          <div class="rel__plabel">${COPY.games.release.power}</div>
          <div class="rel__ptrack"><div class="rel__pfill"></div></div>
        </div>`);
      powerFill = stage.area.querySelector('.rel__pfill') as HTMLElement;
      layout();
      shots = []; done = false; drag = null; flight = null;

      detach = attachPointer(stage.canvas, {
        onDown: (s) => { recordSample(s); grab(stage.toView(s)); },
        onMove: (list) => {
          for (const s of list) recordSample(s);
          if (list.length) move(stage.toView(list[list.length - 1]));
        },
        onUp: () => release(),
      });
      window.addEventListener('resize', onResize);

      paintStatus();
      stage.setHint('Potiahni od krúžku dozadu a pusť.');
      loop();

      publishProbe({
        id: 'release', round: rc.round, view: stage.vw,
        score: () => scoreRelease(shots, cfg).score,
        info: () => ({ anchor, target, rangeK: cfg.rangeK, tolerance: cfg.tolerance,
                       throws: shots.length }),
        replay: (samples) => {
          // záznam nesie body ťahu — prehrá sa ako jeden hod
          if (!samples.length) return;
          grab(anchor);
          move(samples[samples.length - 1]);
          release();
        },
      });
    },

    destroy() {
      cancelAnimationFrame(raf);
      detach?.(); detach = null;
      window.removeEventListener('resize', onResize);
      clearProbe();
      stage?.destroy();
    },
  };

  function layout() {
    const cx = stage.vw / 2;
    // Polohy podľa dizajnu (HRA 5 TERČ): krúžok dosť vysoko, aby pod ním
    // ostalo miesto na plný ťah — v dizajne siaha presne po spodný okraj.
    target = { x: cx, y: stage.vh * 0.16 };
    anchor = { x: cx, y: stage.vh * 0.66 };
    outerR = Math.min(stage.vw, stage.vh) * 0.145;
    cfg = { ...cfg, ...aimFor(anchor.y - target.y, stage.vh * 0.97 - anchor.y) };
    ringPaths = RINGS.map((k) => samplePath(target.x, target.y, outerR * k, 90));
  }

  function onResize() { if (stage.fit()) layout(); }

  function grab(p: Point) {
    if (done || flight) return;
    // chytiť sa dá aj vedľa krúžku — trafiť malý terč prstom je zbytočná prekážka
    if (Math.hypot(p.x - anchor.x, p.y - anchor.y) > PUCK_R * 3.5) return;
    drag = p;
  }

  /** Guma sa natiahne len po strop — ďalej prst nesleduje, nech nejde z plátna. */
  function move(p: Point) {
    if (!drag) return;
    const dx = p.x - anchor.x, dy = p.y - anchor.y, len = Math.hypot(dx, dy);
    const k = len > cfg.maxPull ? cfg.maxPull / len : 1;
    drag = { x: anchor.x + dx * k, y: anchor.y + dy * k };
    paintStatus();
  }

  function release() {
    if (!drag || done || flight) return;
    const d = drag;
    drag = null;
    if (pullPower(anchor, d, cfg) < 0.05) return;   // len ťuknutie, nie hod

    const s = shoot(anchor, d, target, cfg);
    shots.push(s);
    flight = { from: anchor, to: onStage(anchor, s.point), t0: performance.now() };
  }

  /**
   * Bod dopadu stiahnutý po dráhe letu na okraj plochy. Hod mimo obrazovky
   * by inak nenechal žiadnu stopu a hráč by nevedel, že sa zarátal.
   * Len na kreslenie — vzdialenosť sa počíta zo skutočného dopadu.
   */
  function onStage(from: Point, to: Point): Point {
    const m = 14;
    let t = 1;
    const fit = (a: number, b: number, lo: number, hi: number) => {
      if (b < lo) t = Math.min(t, (lo - a) / (b - a));
      if (b > hi) t = Math.min(t, (hi - a) / (b - a));
    };
    fit(from.x, to.x, m, stage.vw - m);
    fit(from.y, to.y, m, stage.vh - m);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }

  /** Vzdialenosť pre hráča; mimo terča už milimetre nič nehovoria. */
  function distText(d: number): string {
    return d > outerR ? 'mimo terča' : `${toMm(d)} mm od stredu`;
  }

  function landed() {
    flight = null;
    const r = scoreRelease(shots, cfg);
    // koniec kola sa rozhodne skôr, než sa prekreslí počítadlo — inak by
    // po zásahu na chvíľu ukázalo ďalší hod, ktorý už nepríde
    if (shots.length >= cfg.throws || r.passed) { finish(r.passed); return; }
    paintStatus();
    const t = distText(shots[shots.length - 1].distance);
    stage.setHint(`${t[0].toUpperCase()}${t.slice(1)}. Skús znova.`);
  }

  /**
   * Číslo je hod, ktorý práve beží; po konci kola posledný hodený.
   * Bodky ako v dizajne: zásah, vedľa, na rade, ešte nehodený.
   */
  function paintStatus() {
    const n = done ? shots.length : Math.min(shots.length + (flight ? 0 : 1), cfg.throws);
    const steps = Array.from({ length: cfg.throws }, (_, k): StepMark => {
      const landedShot = k < shots.length && !(flight && k === shots.length - 1);
      if (landedShot) return shots[k].distance <= cfg.tolerance ? 'done' : 'bad';
      return !done && k === n - 1 ? 'now' : 'todo';
    });
    stage.setSteps(`HOD ${n} / ${cfg.throws}`, steps);
  }

  function finish(passed: boolean) {
    if (done) return;
    done = true;
    paintStatus();
    const r = scoreRelease(shots, cfg);
    const mm = toMm(r.best);
    // medzi terčom a krúžkom, kde nič iné nie je
    stage.flash(passed ? COPY.games.release.roundWin : COPY.games.release.roundLose, passed,
      { sub: distText(r.best), y: 41 });
    stage.setHint(passed
      ? `<b style="color:var(--amber)">${COPY.games.release.roundWin} — ${distText(r.best)}</b>`
      : `<b style="color:var(--red)">${COPY.games.release.roundLose} — ${distText(r.best)}</b>`);

    const res: RoundResult = {
      round: round.round,
      passed,
      score: r.score,
      value: String(mm),
      unit: 'mm od stredu',
      detail: passed ? undefined
        : r.best > outerR ? 'všetky hody boli mimo terča' : `najbližší hod bol ${mm} mm od stredu`,
      // v násobkoch polomeru terča, nie v pixeloch — výsledok kreslí svoj vlastný
      visual: {
        game: 'release',
        hits: shots.map((s) => ({
          x: (s.point.x - target.x) / outerR,
          y: (s.point.y - target.y) / outerR,
        })),
        tolerance: cfg.tolerance / outerR,
      },
    };
    self.onRoundEnd?.(res);
  }

  function loop() {
    raf = requestAnimationFrame((now) => {
      if (flight) {
        const k = (now - flight.t0) / 420;
        if (k >= 1) landed();
      }
      render(now);
      loop();
    });
  }

  function render(now: number) {
    const ctx = stage.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, stage.canvas.width, stage.canvas.height);
    ctx.setTransform(stage.scale, 0, 0, stage.scale, 0, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    drawTarget(ctx);
    drawShots(ctx);
    if (drag) drawAim(ctx);
    if (flight) drawFlight(ctx, now);
    drawPuck(ctx);
    powerFill.style.transform = `scaleX(${drag ? pullPower(anchor, drag, cfg) : 0})`;
  }

  /** Terč je ten istý obrys loga ako v hre DRAW — tvar kampane sa opakuje. */
  function drawTarget(ctx: CanvasRenderingContext2D) {
    const fills = ['rgba(107,42,40,.30)', 'rgba(168,46,34,.42)', 'rgba(224,42,38,.55)', C.orange];
    ringPaths.forEach((pts, i) => {
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = fills[i];
      ctx.fill();
    });

    const g = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, outerR * 0.34);
    g.addColorStop(0, 'rgba(255,240,200,.95)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.beginPath(); ctx.arc(target.x, target.y, outerR * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }

  function drawShots(ctx: CanvasRenderingContext2D) {
    shots.forEach((s, i) => {
      if (flight && i === shots.length - 1) return;    // práve letí
      const hit = s.distance <= cfg.tolerance;
      const q = onStage(anchor, s.point);
      ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = hit ? C.amber : 'rgba(240,230,226,.55)';
      ctx.fill();
      ctx.beginPath(); ctx.arc(q.x, q.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = hit ? 'rgba(232,163,61,.5)' : 'rgba(240,230,226,.22)';
      ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  function drawAim(ctx: CanvasRenderingContext2D) {
    if (!drag) return;
    const dx = anchor.x - drag.x, dy = anchor.y - drag.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    // guma od krúžku k prstu
    ctx.beginPath();
    ctx.moveTo(drag.x, drag.y); ctx.lineTo(anchor.x, anchor.y);
    ctx.strokeStyle = 'rgba(240,230,226,.85)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(drag.x, drag.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = C.amber; ctx.fill();

    // bodkovaný lúč smeru — s pevnou dĺžkou, dopad neprezrádza
    const ux = dx / len, uy = dy / len;
    for (let d = PUCK_R + 10; d < GUIDE_LEN; d += 13) {
      const a = 1 - d / GUIDE_LEN;
      ctx.beginPath();
      ctx.arc(anchor.x + ux * d, anchor.y + uy * d, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,163,61,${0.1 + a * 0.6})`;
      ctx.fill();
    }
  }

  function drawFlight(ctx: CanvasRenderingContext2D, now: number) {
    if (!flight) return;
    const k = Math.min(1, (now - flight.t0) / 420);
    const x = flight.from.x + (flight.to.x - flight.from.x) * k;
    const y = flight.from.y + (flight.to.y - flight.from.y) * k;

    ctx.beginPath();
    ctx.moveTo(flight.from.x, flight.from.y); ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255,90,31,.28)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    ctx.shadowColor = C.orange; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE3A8'; ctx.fill();
    ctx.restore();
  }

  function drawPuck(ctx: CanvasRenderingContext2D) {
    ctx.beginPath(); ctx.arc(anchor.x, anchor.y, PUCK_R, 0, Math.PI * 2);
    ctx.fillStyle = '#2A1512';
    ctx.fill();
    ctx.strokeStyle = drag ? C.amber : '#6E3028';
    ctx.lineWidth = 1.5; ctx.stroke();
  }

  return self;
}
