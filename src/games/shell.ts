import type { Sample } from '@/core/input';

/** Vnútorná súradnicová sieť hier. Všetko sa kreslí v nej a až plátno
 *  ju prepočíta na skutočné pixely — hra je tým nezávislá od rozlíšenia. */
export const VIEW = 600;

export interface Point { x: number; y: number }

/** Spoločná kostra: stavový riadok hore, plocha hry, nápoveda dole. */
/** Stav jedného kroku v stavovom riadku. */
export type StepMark = 'done' | 'now' | 'todo' | 'bad';

export interface Shell {
  /** voľná plocha, do ktorej si hra postaví, čo potrebuje */
  area: HTMLElement;
  setStatus(label: string, value?: string, off?: boolean): void;
  /**
   * Stavový riadok s bodkami namiesto čísla — postup po krokoch.
   * Hráč tak hneď vidí, či bol krok správny, bez toho aby sa to muselo
   * čítať z lupeňa.
   */
  setSteps(label: string, steps: ReadonlyArray<StepMark>): void;
  setHint(html: string): void;
  destroy(): void;
}

export function createShell(root: HTMLElement): Shell {
  root.innerHTML = `
    <div class="g">
      <div class="g__status"></div>
      <div class="g__area"></div>
      <div class="g__hint"></div>
    </div>`;

  const area = root.querySelector('.g__area') as HTMLElement;
  const statusEl = root.querySelector('.g__status') as HTMLElement;
  const hintEl = root.querySelector('.g__hint') as HTMLElement;

  return {
    area,
    setStatus(label, value, off = false) {
      statusEl.innerHTML = off
        ? `<span class="lbl off">${label}</span>`
        : `<span class="lbl">${label}</span>${value ? `<span class="val">${value}</span>` : ''}`;
    },
    setSteps(label, steps) {
      const dots = steps
        .map((m) => `<span class="dot dot--${m}"></span>`)
        .join('');
      statusEl.innerHTML =
        `<span class="lbl">${label}</span><span class="dots">${dots}</span>`;
    },

    setHint(html) { hintEl.innerHTML = html; },
    destroy() { root.innerHTML = ''; },
  };
}

export interface Stage extends Shell {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** rozmery vnútornej siete */
  vw: number;
  vh: number;
  /** koľko pixelov plátna je jedna jednotka siete */
  scale: number;
  /** dotyk na obrazovke → bod vnútornej siete */
  toView(s: Sample | Point): Point;
  /** nové plátno s rovnakým rozmerom a transformáciou — na predkreslenie */
  offscreen(): CanvasRenderingContext2D;
  /** prekreslí po zmene rozmeru okna; vráti true, ak sa rozmer naozaj zmenil */
  fit(): boolean;
}

/**
 * Kostra s plátnom. `aspect` je pomer strán plátna; 'fill' znamená, že
 * plátno zaberie celú plochu a výška siete sa dopočíta podľa displeja —
 * to je pre hry, ktorých kompozícia ide cez celú obrazovku.
 */
export function createStage(root: HTMLElement, aspect: number | 'fill' = 1): Stage {
  const shell = createShell(root);
  shell.area.innerHTML = '<canvas></canvas>';
  const canvas = shell.area.querySelector('canvas') as HTMLCanvasElement;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d kontext nedostupný');

  const vw = VIEW;
  let vh = typeof aspect === 'number' ? Math.round(VIEW / aspect) : VIEW;
  let scale = 1;
  let cssW = 0, cssH = 0;

  function fit(): boolean {
    const r = shell.area.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;

    // najväčší obdĺžnik daného pomeru, ktorý sa vojde do dostupného miesta
    const w = aspect === 'fill' ? r.width : Math.min(r.width, r.height * aspect);
    const h = aspect === 'fill' ? r.height : w / aspect;
    if (Math.abs(w - cssW) < 0.5 && Math.abs(h - cssH) < 0.5) return false;
    cssW = w; cssH = h;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);  // nad 3× už nič nepridá
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = (w * dpr) / vw;
    if (aspect === 'fill') vh = Math.round((h / w) * vw);
    return true;
  }
  fit();

  return {
    ...shell,
    canvas, ctx,
    get vw() { return vw; },
    get vh() { return vh; },
    get scale() { return scale; },

    // attachPointer dáva súradnice už relatívne k plátnu
    toView(s) {
      const r = canvas.getBoundingClientRect();
      return { x: (s.x / r.width) * vw, y: (s.y / r.height) * vh };
    },

    offscreen() {
      const b = document.createElement('canvas');
      b.width = canvas.width; b.height = canvas.height;
      const x = b.getContext('2d');
      if (!x) throw new Error('canvas 2d kontext nedostupný');
      x.setTransform(scale, 0, 0, scale, 0, 0);
      return x;
    },

    fit,
  };
}
