import { describe, it, expect } from 'vitest';
import { makeSequence, judge, seeded, configFor, PETALS } from '@/games/memorize/sequence';

describe('MEMORIZE — poradie', () => {
  it('poradie má žiadanú dĺžku a platné indexy', () => {
    const s = makeSequence(6, seeded(7));
    expect(s).toHaveLength(6);
    expect(s.every((v) => Number.isInteger(v) && v >= 0 && v < PETALS)).toBe(true);
  });

  it('nikdy nezopakuje ten istý lupeň dvakrát za sebou', () => {
    for (let seed = 1; seed < 300; seed++) {
      const s = makeSequence(8, seeded(seed));
      for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
    }
  });

  it('rovnaké semienko dá rovnaké poradie', () => {
    expect(makeSequence(6, seeded(42))).toEqual(makeSequence(6, seeded(42)));
  });

  it('správne zopakovanie prejde', () => {
    const exp = [0, 2, 1, 3];
    const j = judge(exp, exp);
    expect(j.done).toBe(true);
    expect(j.failed).toBe(false);
    expect(j.score).toBe(1);
  });

  it('rozbehnuté poradie ešte nie je hotové ani chybné', () => {
    const j = judge([0, 2, 1, 3], [0, 2]);
    expect(j.done).toBe(false);
    expect(j.failed).toBe(false);
    expect(j.correct).toBe(2);
  });

  it('chybné ťuknutie pokazí kolo a skóre ukáže, kam sa hráč dostal', () => {
    const j = judge([0, 2, 1, 3], [0, 2, 3]);
    expect(j.failed).toBe(true);
    expect(j.correct).toBe(2);
    expect(j.score).toBe(0.5);
  });

  it('tretie kolo je dlhšie než prvé a ťažká obtiažnosť dlhšia než ľahká', () => {
    expect(configFor('standard', 3).length).toBeGreaterThan(configFor('standard', 1).length);
    expect(configFor('hard', 1).length).toBeGreaterThan(configFor('easy', 1).length);
  });

  it('dlhšie poradie beží svižnejšie, aby sa kolo nevlieklo', () => {
    expect(configFor('hard', 3).flashMs).toBeLessThan(configFor('easy', 1).flashMs);
    expect(configFor('hard', 3).flashMs).toBeGreaterThanOrEqual(300);
  });
});

import {
  petalPolygon, pointInPolygon, hitPetal, ANGLES, DRAW_ORDER, FLOWER, PETAL_LEN,
} from '@/games/memorize/geometry';

const L = PETAL_LEN;
const petals = ANGLES.map((a) => petalPolygon(300, 300, a, L));
/** bod na osi lupeňa v danom podiele vzdialenosti po špicu */
const naOsi = (i: number, frac: number) => {
  const a = (ANGLES[i] * Math.PI) / 180;
  const d = frac * 330;
  return { x: 300 + d * Math.sin(a), y: 300 - d * Math.cos(a) };
};

describe('MEMORIZE — lupene', () => {
  it('tvar sedí na dizajnérsky export', () => {
    // export: M0 60 C 165 10 140 -250 0 -330 … stopka pod otočným bodom,
    // špica 330 nad ním, šírka symetrická
    const p = petalPolygon(0, 0, 0, L);
    const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
    expect(Math.min(...ys)).toBeCloseTo(-330, 0);
    expect(Math.max(...ys)).toBeCloseTo(60, 0);
    expect(Math.max(...xs)).toBeCloseTo(-Math.min(...xs), 0);
    expect(Math.max(...xs)).toBeGreaterThan(90);
  });

  it('mierka je lineárna — dvojnásobná dĺžka, dvojnásobný tvar', () => {
    const a = petalPolygon(0, 0, 0, L);
    const b = petalPolygon(0, 0, 0, L * 2);
    expect(Math.min(...b.map((q) => q.y))).toBeCloseTo(2 * Math.min(...a.map((q) => q.y)), 0);
  });

  it('každý lupeň sa dá trafiť pozdĺž celej osi', () => {
    ANGLES.forEach((_, i) => {
      for (const frac of [0.5, 0.75, 0.9]) {
        const q = naOsi(i, frac);
        expect(hitPetal(q, petals)).toBe(i);
        expect(petals.filter((t) => pointInPolygon(q, t))).toHaveLength(1);
      }
    });
  });

  it('bod mimo kvetu nie je zásah', () => {
    expect(hitPetal({ x: 300, y: 560 }, petals)).toBe(-1);
    expect(hitPetal({ x: -200, y: -200 }, petals)).toBe(-1);
  });

  it('pri stopke sa lupene prekrývajú a vyhráva ten navrchu', () => {
    // všetky vyrastajú z jedného bodu, takže prekryv je tam zámerný
    const vrstva = (i: number) => DRAW_ORDER.indexOf(i);
    const sporne = petals.flatMap((poly) =>
      poly.filter((q) => petals.filter((t) => pointInPolygon(q, t)).length > 1));
    expect(sporne.length).toBeGreaterThan(0);
    for (const q of sporne) {
      const vsetky = petals.map((t, j) => (pointInPolygon(q, t) ? j : -1)).filter((j) => j >= 0);
      const navrchu = vsetky.reduce((x, y) => (vrstva(y) > vrstva(x) ? y : x));
      expect(hitPetal(q, petals)).toBe(navrchu);
    }
  });

  it('žiadny lupeň nemieri dole — tam býva ruka', () => {
    for (const a of ANGLES) expect(Math.abs(a)).toBeLessThan(90);
  });

  it('rozmery kvetu zodpovedajú vejáru zo štyroch lupeňov', () => {
    expect(FLOWER.width).toBeGreaterThan(FLOWER.height);   // vejár je širší než vyšší
    expect(FLOWER.height).toBeGreaterThan(330 * 0.8);
    expect(FLOWER.down).toBeGreaterThan(0);                // stopky siahajú pod otočný bod
  });

  it('obrys je uzavretý a má vnútro', () => {
    const poly = petalPolygon(0, 0, 0, L);
    expect(poly.length).toBeGreaterThan(40);
    expect(pointInPolygon({ x: 0, y: -165 }, poly)).toBe(true);
  });
});
