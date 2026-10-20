import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer } from '@/core/input';
import { createStage, type Stage, type Point } from '../shell';
import {
  ANGLES, LEN_OF_FRAME, DRAW_ORDER, FLOWER, PETAL_LEN, petalPolygon, hitPetal,
} from './geometry';
import { configFor, makeSequence, judge, seeded, type MemoConfig } from './sequence';
import { COPY } from '@/ui/copy';
import { C } from '@/ui/tokens';

/** Farby stavov lupeňa — prepísané z dizajnérskeho exportu. */
const IDLE = { fill: '#1E0B0D', stroke: '#4A1518' };
const LIT = { fill: '#FF5A1F', stroke: '#120607', glow: '#FF5A1F' };

/**
 * Hrúbky obrysov sú z exportu, ktorý kreslí v rámci širokom 960.
 * Naša sieť je široká 600, takže sa prepočítajú — inak by čiara na
 * tablete vyšla takmer dvakrát hrubšia, než má byť.
 */
const PX = 600 / 960;

/**
 * Časové konštanty prechodu. Rozsvietenie je svižné, zhasínanie dlhšie —
 * záblesk tak má náběh aj dozvuk a neprepína sa skokom.
 */
const RISE_MS = 120;
const FALL_MS = 210;
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
    // Veľkosť je z exportu, ale nikdy väčšia, než sa na plátno zmestí —
    // orezaný lupeň sa zle ťuká.
    const k = PETAL_LEN / Math.max(FLOWER.width / stage.vw, FLOWER.height / stage.vh);
    const len = Math.min(stage.vh * LEN_OF_FRAME, k * 0.96);

    // kvet nie je okolo otočného bodu súmerný, takže pivot dopočítame
    // z rozmerov kvetu tak, aby celý sedel v strede plochy
    const u = len / PETAL_LEN;
    const cx = (stage.vw - FLOWER.width * u) / 2 - FLOWER.left * u;
    const cy = (stage.vh - FLOWER.height * u) / 2 - FLOWER.up * u;
    petals = ANGLES.map((a) => petalPolygon(cx, cy, a, len));
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
    after(220, () => { target[i] = 0; });
    got.push(i);

    const j = judge(seq, got);
    if (j.failed) { wrong = i; finish(j.score, false); return; }
    if (j.done) { finish(1, true); return; }
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
    target = [0, 0, 0, 0];
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

    // Poradie je stále — dané indexom lupeňa, nie tým, ktorý práve svieti.
    // Keby sa rozsvietený preklápal navrch, kvet by pri každom záblesku
    // preskočil a ukážka by sa zle sledovala.
    for (const i of DRAW_ORDER) {
      // jas sa k cieľu blíži exponenciálne, nezávisle od snímkovania
      const tau = target[i] > glow[i] ? RISE_MS : FALL_MS;
      glow[i] += (target[i] - glow[i]) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target[i] - glow[i]) < 0.004) glow[i] = target[i];
      const g = glow[i];
      ctx.beginPath();
      petals[i].forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();

      if (i === wrong) {
        ctx.fillStyle = `rgba(224,42,38,${0.3 + g * 0.5})`;
        ctx.fill();
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 2 * PX;
        ctx.stroke();
        continue;
      }

      // tmavý lupeň je vždy dole; svetlo sa cez neho len prelína,
      // takže prechod je plynulý a poradie tvarov sa nemení
      ctx.fillStyle = IDLE.fill;
      ctx.fill();
      ctx.strokeStyle = IDLE.stroke;
      ctx.lineWidth = 1 * PX;
      ctx.stroke();

      if (g > 0.003) {
        ctx.save();
        ctx.globalAlpha = g;
        ctx.shadowColor = LIT.glow;
        ctx.shadowBlur = 26 * PX * g;
        ctx.fillStyle = LIT.fill;
        ctx.fill();
        ctx.strokeStyle = LIT.stroke;
        ctx.lineWidth = 2.5 * PX;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  return self;
}
