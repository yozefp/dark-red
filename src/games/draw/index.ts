import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer, type Sample } from '@/core/input';
import { samplePath, VIEW, dist, type Point } from './geometry';
import { createStage, type Stage } from '../shell';
import { scoreDraw, configFor, type DrawScore, type DrawConfig } from './scoring';
import { DrawRenderer } from './render';
import { COPY } from '@/ui/copy';
import { C } from '@/ui/tokens';
import { publishProbe, clearProbe, recordSample } from '@/debug/hooks';

const PATH_POINTS = 220;
const SHAPE_INSET = 0.80;      // odsadenie od okrajov kvôli odmietaniu dotyku pri ráme
const START_RADIUS = 80;       // ako blízko štartu treba začať

export function createDrawGame(): GameModule {
  let stage: Stage;
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
      round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.tolerance) cfg = { ...cfg, tolerance: rc.overrides.tolerance };
      if (rc.overrides?.pass) cfg = { ...cfg, pass: rc.overrides.pass };

      stage = createStage(el, 1);
      path = samplePath(VIEW / 2, VIEW / 2, (VIEW / 2) * SHAPE_INSET, PATH_POINTS);
      renderer = new DrawRenderer(stage, path);
      resetRound();

      detach = attachPointer(stage.canvas, {
        onDown: (s) => { recordSample(s); begin(stage.toView(s), s.t); },
        onMove: (list) => {
          for (const s of list) recordSample(s);
          move(list.map((s) => s0(stage.toView(s), s.t)));
        },
        onUp: () => end(),
      });

      loop();
      window.addEventListener('resize', onResize);
      publishProbe({
        id: 'draw', round: rc.round, view: VIEW, path,
        score: () => score?.score ?? 0,
        replay: (list) => {
          if (!list.length) return;
          begin(list[0], list[0].t);
          move(list.slice(1));
          end();
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

  function begin(p: Point, t: number) {
    if (dist(p, path[0]) > START_RADIUS) { stage.setHint('Začni pri krúžku.'); return; }
    drawing = true; samples = [s0(p, t)]; finger = p;
    stage.setHint('');
  }

  function move(list: Sample[]) {
    if (!drawing) return;
    for (const s of list) {
      finger = { x: s.x, y: s.y };
      samples.push(s);
      renderer.addSpark(s.x, s.y, performance.now());
    }
    score = scoreDraw(samples, path, cfg);
    isOff = score.offNow;
    renderer.update(score);
    paintStatus();
  }

  function end() {
    if (!drawing) return;
    drawing = false;
    score = scoreDraw(samples, path, cfg);
    finish();
  }

  function onResize() { renderer.resize(); if (score) renderer.update(score); }

  const s0 = (p: Point, t: number): Sample => ({ x: p.x, y: p.y, t });

  function resetRound() {
    samples = []; drawing = false; isOff = false; finger = null; score = null;
    renderer.reset();
    stage.setStatus(COPY.games.draw.status, '0 %');
    stage.setHint('Prilož prst na krúžok a obkresli tvar.');
  }

  function paintStatus() {
    if (!score) return;
    if (isOff) stage.setStatus('MIMO LÍNIE', undefined, true);
    else stage.setStatus(COPY.games.draw.status, `${Math.round(score.score * 100)} %`);
  }

  function finish() {
    if (!score) return;
    const passed = score.score >= cfg.pass;
    renderer.renderFinal(passed);
    const pct = Math.round(score.score * 100);
    stage.setHint(passed
      ? `<b style="color:${C.amber}">${COPY.games.draw.win} — ${pct} %</b>`
      : `<b style="color:${C.red}">${COPY.games.draw.lose} — ${pct} %</b>`);

    const r: RoundResult = {
      round: round.round,
      passed,
      score: score.score,
      value: String(pct),
      unit: '%',
      detail: passed ? undefined : reason(score, cfg),
      // prvé vybočenie — výsledok ním ukáže, kde ťah opustil líniu
      visual: { game: 'draw', off: score.offSegments[0]?.[1] ?? null },
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
