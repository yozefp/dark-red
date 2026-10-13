import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { attachPointer } from '@/core/input';
import { createShell, type Shell } from '../shell';
import { advance, configFor, scorePush, BURN, type PushConfig, type PushScore } from './scoring';
import { COPY } from '@/ui/copy';
import { publishProbe, clearProbe } from '@/debug/hooks';
import gsap from 'gsap';

/** Dokedy siaha stupnica pred prerazením stropu a po ňom. */
const SCALE_LOW = { lo: 0, hi: 100, step: 25 };
const SCALE_HIGH = { lo: 100, hi: 125, step: 5 };

export function createPushGame(): GameModule {
  let shell: Shell;
  let cfg: PushConfig;
  let round: RoundConfig;
  let detach: (() => void) | null = null;
  let raf = 0;

  let value = 0;
  let holding = false;
  let over = false;          // prerazený strop
  let done = false;
  let lastT = 0;

  let el: {
    root: HTMLElement; fill: HTMLElement; band: HTMLElement; ticks: HTMLElement;
    num: HTMLElement; pad: HTMLElement; burn: HTMLElement; target: HTMLElement;
    meter: HTMLElement;
  };

  const self: GameModule = {
    id: 'push',
    label: 'PUSH THE INTENSITY',

    mount(root, rc) {
      round = rc;
      cfg = configFor(rc.difficulty, rc.round);
      if (rc.overrides?.band) cfg = { ...cfg, band: rc.overrides.band };

      shell = createShell(root);
      shell.area.innerHTML = `
        <div class="push">
          <div class="push__meter">
            <div class="push__ticks"></div>
            <div class="push__track">
              <div class="push__band"></div>
              <div class="push__fill"></div>
            </div>
            <div class="push__marks">
              <div class="push__burn">SPÁLENÉ</div>
              <div class="push__target">110</div>
            </div>
          </div>
          <div class="push__read"><span class="push__num">0</span><span class="push__pct">%</span></div>
          <div class="push__padwrap">
            <div class="push__pad"></div>
            <div class="push__padlabel">DRŽ</div>
          </div>
        </div>`;

      const q = <T extends HTMLElement>(s: string) => shell.area.querySelector(s) as T;
      el = {
        root: q('.push'), fill: q('.push__fill'), band: q('.push__band'),
        ticks: q('.push__ticks'), num: q('.push__num'), pad: q('.push__pad'),
        burn: q('.push__burn'), target: q('.push__target'), meter: q('.push__meter'),
      };

      reset();

      // držať sa dá kdekoľvek na ploche — tlačidlo je len ukazovateľ,
      // trafiť malý terč prstom je na tablete zbytočná prekážka
      detach = attachPointer(shell.area, {
        onDown: () => press(),
        onMove: () => { /* pri držaní na pohybe nezáleží */ },
        onUp: () => release(),
      });

      lastT = performance.now();
      loop();

      publishProbe({
        id: 'push', round: rc.round, view: 100,
        score: () => value / 100,
        replay: (samples) => {
          // záznam nesie čas držania — prehrá sa ako jedno stlačenie
          const held = samples.length ? samples[samples.length - 1].t - samples[0].t : 0;
          press();
          value = advance(0, held, cfg);
          release();
        },
      });
    },

    destroy() {
      cancelAnimationFrame(raf);
      detach?.(); detach = null;
      clearProbe();
      shell?.destroy();
    },
  };

  function reset() {
    value = 0; holding = false; over = false; done = false;
    el.root.classList.remove('push--over', 'push--hold');
    paintScale(SCALE_LOW);
    paintBand();
    paint();
    shell.setStatus('INTENZITA', '0 %');
    shell.setHint('Prilož prst a drž. Pusť na stodesiatich.');
  }

  function press() {
    if (done || holding) return;
    holding = true;
    lastT = performance.now();
    el.root.classList.add('push--hold');
    shell.setHint('Nad stovkou to ide ťažšie.');
  }

  function release() {
    if (done || !holding) return;
    holding = false;
    el.root.classList.remove('push--hold');
    finish(scorePush(value, cfg));
  }

  /** Stupnica sa po prerazení stropu prekreslí — to je ten moment hry. */
  function breakthrough() {
    over = true;
    el.root.classList.add('push--over');
    paintScale(SCALE_HIGH);
    paintBand();
    shell.setHint('Strop prerazený. Pusť na stodesiatich.');

    gsap.fromTo(el.meter, { x: -7 },
      { x: 0, duration: 0.42, ease: 'elastic.out(1,0.3)' });
    gsap.fromTo(el.ticks, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  function paintScale(s: { lo: number; hi: number; step: number }) {
    const out: string[] = [];
    const minor = s.step / 5;
    for (let v = s.lo; v <= s.hi + 1e-6; v += minor) {
      const pos = ((v - s.lo) / (s.hi - s.lo)) * 100;
      const major = Math.abs(v / s.step - Math.round(v / s.step)) < 1e-6;
      if (!major) { out.push(`<div class="push__tick push__tick--minor" style="bottom:${pos}%"></div>`); continue; }
      const on = v === 110 ? ' push__tick--target' : v === 100 ? ' push__tick--hundred' : '';
      out.push(`<div class="push__tick${on}" style="bottom:${pos}%"><b>${Math.round(v)}</b></div>`);
    }
    el.ticks.innerHTML = out.join('');
  }

  function paintBand() {
    const s = over ? SCALE_HIGH : SCALE_LOW;
    const span = s.hi - s.lo;
    const lo = ((cfg.target - cfg.band - s.lo) / span) * 100;
    const hi = ((cfg.target + cfg.band - s.lo) / span) * 100;
    el.band.style.bottom = `${lo}%`;
    el.band.style.height = `${Math.max(0, hi - lo)}%`;
    el.band.style.opacity = over ? '1' : '0';
    el.burn.style.opacity = over ? '1' : '0';
    el.target.style.opacity = over ? '1' : '0';
    el.target.style.bottom = `${(lo + hi) / 2}%`;
    el.burn.style.bottom = `${((cfg.burn - s.lo) / span) * 100}%`;
  }

  function paint() {
    const s = over ? SCALE_HIGH : SCALE_LOW;
    const f = Math.max(0, Math.min(1, (value - s.lo) / (s.hi - s.lo)));
    el.fill.style.transform = `scaleY(${f})`;
    const shown = Math.round(value);
    el.num.textContent = String(shown);
    shell.setStatus('INTENZITA', `${shown} %`);
  }

  function finish(r: PushScore) {
    if (done) return;
    done = true;
    holding = false;
    el.root.classList.remove('push--hold');
    el.root.classList.add(r.passed ? 'push--win' : 'push--lose');

    const shown = Math.round(value);
    shell.setHint(r.passed
      ? `<b style="color:var(--amber)">${COPY.games.push.win} — ${shown} %</b>`
      : `<b style="color:var(--red)">${r.burnt ? COPY.games.push.lose : 'VEDĽA'} — ${shown} %</b>`);

    const res: RoundResult = {
      round: round.round,
      passed: r.passed,
      score: r.score,
      value: String(shown),
      unit: '%',
      detail: r.passed ? undefined : reason(r),
    };
    self.onRoundEnd?.(res);
  }

  function loop() {
    raf = requestAnimationFrame((now) => {
      const dt = now - lastT;
      lastT = now;

      if (holding && !done) {
        value = advance(value, dt, cfg);
        if (!over && value >= 100) breakthrough();
        if (value > BURN) { finish(scorePush(value, cfg)); }
        paint();
      }
      loop();
    });
  }

  return self;
}

function reason(r: PushScore): string {
  if (r.burnt) return 'spálil si to — pustil si až za stodvadsiatimi';
  if (r.early) return 'pustil si pred stovkou';
  return `minul si pásmo o ${r.offset.toFixed(1)} %`;
}
