import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer, type Sample } from '@/core/input';
import { samplePath, VIEW, dist, type Point } from './geometry';
import { scoreDraw, configFor, type DrawScore, type DrawConfig } from './scoring';
import { DrawRenderer } from './render';
import { COPY } from '@/ui/copy';
import { C } from '@/ui/tokens';

const PATH_POINTS = 220;
const SHAPE_INSET = 0.80;      // odsadenie od okrajov kvôli odmietaniu dotyku pri ráme
const START_RADIUS = 80;       // ako blízko štartu treba začať

export function createDrawGame(): GameModule {
  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement;
  let status: HTMLElement;
  let hint: HTMLElement;
  let renderer: DrawRenderer;
  let detach: (() => void) | null = null;
  let raf = 0;

  let path: Point[] = [];
  let cfg: DrawConfig;
  let round: RoundConfig;
  let samples: Sample[] = [];
  let drawing = false;
  let isOff = false;
  let finger: Point | null = null;
  let score: DrawScore | null = null;

  const self: GameModule = {
    id: 'draw',
    label: 'DRAW THE INTENSITY',

    mount(el, rc) {
      root = el; round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.tolerance) cfg = { ...cfg, tolerance: rc.overrides.tolerance };
      if (rc.overrides?.pass) cfg = { ...cfg, pass: rc.overrides.pass };

      el.innerHTML = `
        <div class="g-draw">
          <div class="g-draw__status"></div>
          <canvas class="g-draw__canvas"></canvas>
          <div class="g-draw__hint"></div>
        </div>`;
      canvas = el.querySelector('.g-draw__canvas')!;
      status = el.querySelector('.g-draw__status')!;
      hint = el.querySelector('.g-draw__hint')!;

      path = samplePath(VIEW / 2, VIEW / 2, (VIEW / 2) * SHAPE_INSET, PATH_POINTS);
      renderer = new DrawRenderer(canvas, path);
      resetRound();

      detach = attachPointer(canvas, {
        onDown: (s) => {
          const p = toView(s);
          if (dist(p, path[0]) > START_RADIUS) { hint.textContent = 'Začni pri krúžku.'; return; }
          drawing = true; samples = [s0(p, s.t)]; finger = p;
          hint.textContent = '';
        },
        onMove: (list) => {
          if (!drawing) return;
          for (const s of list) {
            const p = toView(s);
            samples.push(s0(p, s.t));
            finger = p;
            renderer.addSpark(p.x, p.y, performance.now());
          }
          score = scoreDraw(samples, path, cfg);
          isOff = score.offSegments.length > 0 &&
                  score.offSegments[score.offSegments.length - 1][1] === finger;
          renderer.update(score);
          paintStatus();
        },
        onUp: () => {
          if (!drawing) return;
          drawing = false;
          score = scoreDraw(samples, path, cfg);
          finish();
        },
      });

      loop();
      window.addEventListener('resize', onResize);
    },

    destroy() {
      cancelAnimationFrame(raf);
      detach?.(); detach = null;
      window.removeEventListener('resize', onResize);
      if (root) root.innerHTML = '';
      root = null;
    },
  };

  function onResize() { renderer.resize(); if (score) renderer.update(score); }

  function toView(s: Sample): Point {
    const r = canvas.getBoundingClientRect();
    return { x: (s.x / r.width) * VIEW, y: (s.y / r.height) * VIEW };
  }
  const s0 = (p: Point, t: number): Sample => ({ x: p.x, y: p.y, t });

  function resetRound() {
    samples = []; drawing = false; isOff = false; finger = null; score = null;
    renderer.reset();
    status.innerHTML = `<span class="lbl">${COPY.games.draw.status}</span><span class="val">0 %</span>`;
    hint.textContent = 'Prilož prst na krúžok a obkresli tvar.';
  }

  function paintStatus() {
    if (!score) return;
    status.innerHTML = isOff
      ? `<span class="lbl off">MIMO LÍNIE</span>`
      : `<span class="lbl">${COPY.games.draw.status}</span><span class="val">${Math.round(score.score * 100)} %</span>`;
  }

  function finish() {
    if (!score) return;
    const passed = score.score >= cfg.pass;
    renderer.renderFinal(passed);
    const pct = Math.round(score.score * 100);
    hint.innerHTML = passed
      ? `<b style="color:${C.amber}">${COPY.games.draw.win} — ${pct} %</b>`
      : `<b style="color:${C.red}">${COPY.games.draw.lose} — ${pct} %</b>`;

    const r: RoundResult = {
      round: round.round,
      passed,
      score: score.score,
      detail: passed ? undefined : reason(score, cfg),
    };
    self.onRoundEnd?.(r);
  }

  function loop() {
    raf = requestAnimationFrame((now) => {
      if (drawing || renderer) renderer.render(finger, isOff, now);
      loop();
    });
  }

  return self;
}

/** Konkrétna spätná väzba namiesto „nepodarilo sa". */
function reason(s: DrawScore, cfg: DrawConfig): string {
  if (s.penalty > 0.05) return `vybočil si — trest ${Math.round(s.penalty * 100)} %`;
  if (s.coverage < 0.95) return 'nedokončil si celý tvar';
  return `drž sa bližšie k línii — chýbalo ${Math.round((cfg.pass - s.score) * 100)} %`;
}
