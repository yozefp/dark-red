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
  petalPolygon, pointInPolygon, hitPetal, ANGLES, DRAW_ORDER,
} from '@/games/memorize/geometry';

const R = 230;
const petals = ANGLES.map((a) => petalPolygon(300, 300, a, R));
/** ťažisko mnohouholníka — bod, ktorý v tvare určite leží */
const tezisko = (poly: { x: number; y: number }[]) => ({
  x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
  y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
});

describe('MEMORIZE — lupene', () => {
  it('obrys je zmysluplný: dĺžka jedna, stopka v počiatku', () => {
    // obrys je odmeraný z predlohy, takže test stráži, že sa nepokazil prenos
    const p = petalPolygon(0, 0, 0, 100);
    expect(p.length).toBeGreaterThan(40);
    expect(Math.hypot(p[0].x, p[0].y)).toBeLessThan(1);
    expect(Math.max(...p.map((q) => q.x))).toBeCloseTo(100, -1);
    const sirka = Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y));
    expect(sirka).toBeGreaterThan(40);
    expect(sirka).toBeLessThan(80);
  });

  it('lupeň je asymetrický — jedna hrana vypuklejšia než druhá', () => {
    // z toho vzniká vrtuľový pohyb kvetu; súmerný list by vyzeral inak
    const p = petalPolygon(0, 0, 0, 100);
    const hore = Math.max(...p.map((q) => q.y));
    const dole = -Math.min(...p.map((q) => q.y));
    expect(Math.abs(hore - dole)).toBeGreaterThan(1.5);
  });

  it('každý lupeň sa dá trafiť a vždy len jeden', () => {
    petals.forEach((poly, i) => {
      const c = tezisko(poly);
      expect(hitPetal(c, petals)).toBe(i);
      expect(petals.filter((q) => pointInPolygon(c, q))).toHaveLength(1);
    });
  });

  it('bod mimo kvetu nie je zásah', () => {
    expect(hitPetal({ x: 20, y: 20 }, petals)).toBe(-1);
    expect(hitPetal({ x: 580, y: 580 }, petals)).toBe(-1);
  });

  it('lupene sa neprekrývajú, takže ťuknutie je jednoznačné', () => {
    // spoločný stred vynechávame — tam sa tvary stretávajú zámerne
    for (let i = 0; i < petals.length; i++) {
      const ine = petals.filter((_, j) => j !== i);
      for (const p of petals[i]) {
        if (Math.hypot(p.x - 300, p.y - 300) < 12) continue;
        expect(hitPetal(p, ine)).toBe(-1);
      }
    }
  });

  it('keby sa tvary prekryli, vyhrá ten navrchu', () => {
    // poistka pre prípad, že sa lupene raz zámerne rozšíria kvôli vizuálu
    const siroke = ANGLES.map((a) => petalPolygon(300, 300, a, R, 2.4));
    const vrstva = (i: number) => DRAW_ORDER.indexOf(i);
    const sporne = siroke.flatMap((poly) =>
      poly.filter((p) => siroke.filter((q) => pointInPolygon(p, q)).length > 1));
    expect(sporne.length).toBeGreaterThan(0);
    for (const p of sporne) {
      const vsetky = siroke.map((q, j) => (pointInPolygon(p, q) ? j : -1)).filter((j) => j >= 0);
      const navrchu = vsetky.reduce((a, b) => (vrstva(b) > vrstva(a) ? b : a));
      expect(hitPetal(p, siroke)).toBe(navrchu);
    }
  });

  it('žiadny lupeň nemieri kolmo dole', () => {
    // dole býva ruka — taký lupeň by si hráč zakrýval
    for (const a of ANGLES) {
      const odDola = Math.abs((((a % 360) + 360) % 360) - 90);
      expect(odDola).toBeGreaterThan(25);
    }
  });


  it('tvar je uzavretý a má šírku', () => {
    const poly = petalPolygon(0, 0, 0, 100);
    const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
    expect(Math.max(...xs)).toBeCloseTo(100, 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
    expect(pointInPolygon({ x: 50, y: 0 }, poly)).toBe(true);
  });
});
