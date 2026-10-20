import type { Point } from '../shell';
import { ANGLES, DRAW_ORDER, FLOWER, LEN_OF_FRAME, PETAL_LEN, petalPolygon } from './geometry';

/**
 * Vykresľovanie kvetu. Zdieľa ho hra, ukážka na tutoriáli aj výsledková
 * obrazovka — nech ukážka vyzerá presne ako hra a nemôžu sa rozísť.
 */

/** Farby stavov lupeňa — prepísané z dizajnérskeho exportu. */
export const IDLE = { fill: '#1E0B0D', stroke: '#4A1518' };
export const LIT = { fill: '#FF5A1F', stroke: '#120607', glow: '#FF5A1F' };
export const WRONG = { fill: 'rgba(224,42,38,', stroke: '#E02A26' };
export const EXPECTED = { fill: 'rgba(232,163,61,.14)', stroke: '#E8A33D' };

/**
 * Hrúbky obrysov sú z exportu, ktorý kreslí v rámci širokom 960.
 * Naša sieť je široká 600, takže sa prepočítajú — inak by čiara na
 * tablete vyšla takmer dvakrát hrubšia, než má byť.
 */
export const PX = 600 / 960;

/** Nábeh je svižný, dozvuk dlhší — záblesk tak nepreskakuje. */
export const RISE_MS = 120;
export const FALL_MS = 210;

/**
 * Kvet usadený do plochy. Nie je okolo otočného bodu súmerný — nadol
 * siaha len o kúsok a nahor o celú dĺžku lupeňa — takže sa veľkosť počíta
 * z jeho skutočných rozmerov, nie z dosahu okolo stredu.
 */
export function layoutFlower(vw: number, vh: number): Point[][] {
  const fit = PETAL_LEN / Math.max(FLOWER.width / vw, FLOWER.height / vh);
  const len = Math.min(vh * LEN_OF_FRAME, fit * 0.96);
  const u = len / PETAL_LEN;
  const cx = (vw - FLOWER.width * u) / 2 - FLOWER.left * u;
  const cy = (vh - FLOWER.height * u) / 2 - FLOWER.up * u;
  return ANGLES.map((a) => petalPolygon(cx, cy, a, len));
}

/** Posunie jas k cieľu. V čase, nie na snímok — rovnako na každom tablete. */
export function stepGlow(glow: number[], target: number[], dt: number): void {
  for (let i = 0; i < glow.length; i++) {
    const tau = target[i] > glow[i] ? RISE_MS : FALL_MS;
    glow[i] += (target[i] - glow[i]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target[i] - glow[i]) < 0.004) glow[i] = target[i];
  }
}

export interface FlowerMarks {
  /** lupeň, ktorý hráč stlačil omylom */
  wrong?: number;
  /** lupeň, ktorý mal byť na rade */
  expected?: number;
}

/**
 * Nakreslí kvet. Poradie je stále, dané indexom lupeňa — keby sa
 * rozsvietený preklápal navrch, kvet by pri každom záblesku preskočil
 * a ukážka by sa zle sledovala. Svetlo sa preto cez tmavý lupeň prelína.
 */
export function drawFlower(
  ctx: CanvasRenderingContext2D,
  petals: Point[][],
  glow: number[],
  marks: FlowerMarks = {},
): void {
  for (const i of DRAW_ORDER) {
    const poly = petals[i];
    if (!poly) continue;
    const g = glow[i] ?? 0;

    ctx.beginPath();
    poly.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();

    if (i === marks.wrong) {
      ctx.fillStyle = `${WRONG.fill}${0.3 + g * 0.5})`;
      ctx.fill();
      ctx.strokeStyle = WRONG.stroke; ctx.lineWidth = 2 * PX; ctx.stroke();
      continue;
    }

    ctx.fillStyle = IDLE.fill;
    ctx.fill();
    ctx.strokeStyle = i === marks.expected ? EXPECTED.stroke : IDLE.stroke;
    ctx.lineWidth = (i === marks.expected ? 2 : 1) * PX;
    ctx.stroke();

    if (g > 0.003) {
      ctx.save();
      ctx.globalAlpha = g;
      ctx.shadowColor = LIT.glow;
      ctx.shadowBlur = 26 * PX * g;
      ctx.fillStyle = LIT.fill;
      ctx.fill();
      ctx.strokeStyle = LIT.stroke; ctx.lineWidth = 2.5 * PX; ctx.stroke();
      ctx.restore();
    }
  }
}
