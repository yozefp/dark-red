import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer } from '@/core/input';
import { createStage, type Stage, type Point } from '../shell';
import { hitPetal } from './geometry';
import { layoutFlower, stepGlow, drawFlower } from './draw';
import { configFor, makeSequence, judge, seeded, type MemoConfig } from './sequence';
import { COPY } from '@/ui/copy';

import { publishProbe, clearProbe } from '@/debug/hooks';

type Phase = 'intro' | 'watch' | 'input' | 'done';

export function createMemorizeGame(): GameModule {
  let stage: Stage;
  let cfg: MemoConfig;
  let round: RoundConfig;
  let detach: (() => void) | null = null;
  let raf = 0;
  const timers: number[] = [];

  let petals: Point[][] = [];
  let seq: number[] = [];
  let got: number[] = [];
  let phase: Phase = 'intro';
  /** 0..1 jas každého lupeňa — plynule sa blíži k cieľu, nie skokom */
  let glow = [0, 0, 0, 0];
  /** kam jas smeruje: 1 kým lupeň svieti, inak 0 */
  let target = [0, 0, 0, 0];
  let wrong = -1;

  const self: GameModule = {
    id: 'memorize',
    label: 'MEMORIZE INTENSITY',

    mount(root, rc) {
      round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.length) cfg = { ...cfg, length: rc.overrides.length };

      stage = createStage(root, 'fill');
      layout();
      seq = makeSequence(cfg.length, seeded(Date.now() & 0xffff));
      got = [];

      detach = attachPointer(stage.canvas, { onDown: tap, onMove: () => {}, onUp: () => {} });
      window.addEventListener('resize', onResize);

      stage.setHint('Sleduj poradie, potom ho zopakuj.');
      loop();
      after(600, playback);

      publishProbe({
        id: 'memorize', round: rc.round, view: stage.vw,
        score: () => judge(seq, got).score,
        info: () => ({ seq: [...seq], got: [...got], phase }),
        replay: (samples) => {
          // záznam nesie indexy lupeňov v x — prehrá sa ako séria ťuknutí
          for (const s of samples) press(Math.round(s.x));
        },
      });
    },

    destroy() {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      detach?.(); detach = null;
      window.removeEventListener('resize', onResize);
      clearProbe();
      stage?.destroy();
    },
  };

  function after(ms: number, fn: () => void) {
    timers.push(window.setTimeout(fn, ms));
  }

  function layout() {
    petals = layoutFlower(stage.vw, stage.vh);
  }

  function onResize() { if (stage.fit()) layout(); }

  /** Ukážka poradia. Tempo je v konfigurácii, nie v kóde hry. */
  function playback() {
    phase = 'watch';
    paintStatus();
    let t = 0;
    seq.forEach((i, k) => {
      after(t, () => { target[i] = 1; });
      after(t + cfg.flashMs, () => {
        target[i] = 0;
        if (k === seq.length - 1) toInput();
      });
      t += cfg.flashMs + cfg.gapMs;
    });
  }

  function toInput() {
    after(420, () => {
      phase = 'input';
      paintStatus();
      stage.setHint('Ťukni na lupene v tom istom poradí.');
    });
  }

  function tap(s: { x: number; y: number }) {
    if (phase !== 'input') return;
    press(hitPetal(stage.toView(s), petals));
  }

  function press(i: number) {
    if (phase !== 'input' || i < 0) return;
    target[i] = 1;
    got.push(i);

    const j = judge(seq, got);
    if (j.failed || j.done) {
      if (j.failed) wrong = i;
      // Ďalšie ťuknutia už neberieme, ale kolo ukončíme až o chvíľu:
      // posledné ťuknutie musí ostať svietiť, inak hráč nevidí, že trafil.
      phase = 'done';
      after(460, () => finish(j.score, j.done));
      return;
    }

    after(220, () => { target[i] = 0; });
    paintStatus();
  }

  function paintStatus() {
    if (phase === 'watch') {
      stage.setStatus(COPY.games.memorize.watch, `${seq.length}`);
    } else if (phase === 'input') {
      stage.setStatus(COPY.games.memorize.yourTurn, `${got.length} / ${seq.length}`);
    }
  }

  function finish(score: number, passed: boolean) {
    phase = 'done';
    timers.forEach(clearTimeout);
    // jas sa tu nenuluje — posledné ťuknutie dosvieti až do výsledku
    stage.setStatus(passed ? COPY.games.memorize.win : COPY.games.memorize.lose,
                    `${got.length - (passed ? 0 : 1)} / ${seq.length}`, !passed);
    stage.setHint(passed
      ? `<b style="color:var(--amber)">${COPY.games.memorize.win} — ${seq.length} krokov</b>`
      : `<b style="color:var(--red)">${COPY.games.memorize.lose}</b>`);

    const r: RoundResult = {
      round: round.round,
      passed,
      score,
      value: String(passed ? seq.length : Math.max(0, got.length - 1)),
      unit: `/ ${seq.length}`,
      detail: passed ? undefined : `pomýlil si sa pri ${got.length}. kroku`,
      visual: { game: 'memorize', seq: [...seq], got: [...got] },
    };
    self.onRoundEnd?.(r);
  }

  let lastT = 0;
  function loop() {
    raf = requestAnimationFrame((now) => {
      const dt = lastT ? Math.min(now - lastT, 60) : 16;
      lastT = now;
      render(dt);
      loop();
    });
  }

  function render(dt: number) {
    const ctx = stage.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, stage.canvas.width, stage.canvas.height);
    ctx.setTransform(stage.scale, 0, 0, stage.scale, 0, 0);

    stepGlow(glow, target, dt);
    drawFlower(ctx, petals, glow, { wrong: wrong >= 0 ? wrong : undefined });
  }
  return self;
}
