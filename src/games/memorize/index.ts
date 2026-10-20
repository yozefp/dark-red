import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer } from '@/core/input';
import { createStage, type Stage, type Point } from '../shell';
import { hitPetal } from './geometry';
import { layoutFlower, stepGlow, drawFlower } from './draw';
import type { StepMark } from '../shell';
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
  /** ktorý krok ukážky práve beží — pre bodky v stavovom riadku */
  let shown = 0;
  /** krok, pri ktorom sa hráč pomýlil, alebo -1 */
  let badStep = -1;
  /** 0..1 jas každého lupeňa — plynule sa blíži k cieľu, nie skokom */
  let glow = [0, 0, 0, 0];
  /** kam jas smeruje: 1 kým lupeň svieti, inak 0 */
  let target = [0, 0, 0, 0];
  let wrong = -1;
  let flashEl: HTMLElement;

  const self: GameModule = {
    id: 'memorize',
    label: 'MEMORIZE INTENSITY',

    mount(root, rc) {
      round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.length) cfg = { ...cfg, length: rc.overrides.length };

      stage = createStage(root, 'fill');
      // Výsledok kola musí byť tam, kam sa hráč pozerá — teda nad kvetom,
      // nie v stavovom riadku. Pri zapamätávaní poradia nikto oči
      // z lupeňov nespustí.
      stage.area.insertAdjacentHTML('beforeend', '<div class="memo__flash"></div>');
      flashEl = stage.area.querySelector('.memo__flash') as HTMLElement;
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
    shown = 0;
    paintStatus();
    let t = 0;
    seq.forEach((i, k) => {
      after(t, () => { target[i] = 1; shown = k; paintStatus(); });
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

    // každé ťuknutie blikne rovnako, aj to posledné
    after(220, () => { target[i] = 0; });

    const j = judge(seq, got);
    if (j.failed || j.done) {
      if (j.failed) { wrong = i; badStep = got.length - 1; }
      // Ďalšie ťuknutia už neberieme, ale kolo ukončíme až o chvíľu,
      // nech hráč stihne odpoveď prečítať.
      phase = 'done';
      flash(j.done);
      paintStatus();
      after(900, () => finish(j.score, j.done));
      return;
    }
    paintStatus();
  }

  /**
   * Veľká odpoveď nad kvetom, raz za kolo: SPRÁVNE po celom zopakovanom
   * poradí, CHYBA v momente pomýlenia. Pri medzikrokoch sa úmyselne nehlási
   * nič — hláška pri každom ťuknutí odvádza oči od lupeňov a hráč stráca
   * poradie, ktoré si drží v hlave.
   */
  function flash(ok: boolean) {
    const c = COPY.games.memorize;
    flashEl.textContent = ok ? c.stepOk : c.stepBad;
    flashEl.className = `memo__flash on ${ok ? 'ok' : 'bad'}`;
  }

  /**
   * Bodky v stavovom riadku. Počas ukážky ukazujú, kde v poradí sme,
   * počas zadávania dávajú okamžitú odpoveď na každý krok. Hráč to tak
   * nemusí čítať z lupeňa a ten môže normálne bliknúť a zhasnúť.
   */
  function paintStatus() {
    if (phase === 'watch') {
      const steps = seq.map((_, k): StepMark =>
        k < shown ? 'done' : k === shown ? 'now' : 'todo');
      stage.setSteps(COPY.games.memorize.watch, steps);
      return;
    }
    const steps = seq.map((_, k): StepMark => {
      if (k === badStep) return 'bad';
      if (k < got.length) return 'done';
      if (k === got.length && phase === 'input') return 'now';
      return 'todo';
    });
    // po ukážke už popis ostáva „teraz ty" aj počas vyhodnotenia kroku
    stage.setSteps(COPY.games.memorize.yourTurn, steps);
  }

  function finish(score: number, passed: boolean) {
    phase = 'done';
    timers.forEach(clearTimeout);
    // jas sa tu nenuluje — posledné ťuknutie dosvieti až do výsledku
    paintStatus();
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
