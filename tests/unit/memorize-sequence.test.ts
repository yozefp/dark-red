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

import { petalPolygon, pointInPolygon, hitPetal, ANGLES } from '@/games/memorize/geometry';

const petals = ANGLES.map((a) => petalPolygon(300, 300, a, 230));

describe('MEMORIZE — lupene', () => {
  it('bod v strede lupeňa je zásah, bod za špicom nie', () => {
    const mid = { x: 300 + Math.cos((-45 * Math.PI) / 180) * 115,
                  y: 300 + Math.sin((-45 * Math.PI) / 180) * 115 };
    expect(hitPetal(mid, petals)).toBe(1);
    expect(hitPetal({ x: 595, y: 5 }, petals)).toBe(-1);
  });

  it('každý lupeň sa dá trafiť a vždy len jeden', () => {
    ANGLES.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const p = { x: 300 + Math.cos(a) * 120, y: 300 + Math.sin(a) * 120 };
      expect(hitPetal(p, petals)).toBe(i);
    });
  });

  it('lupene sa navzájom neprekrývajú', () => {
    // spoločný stred vynechávame — tam sa tvary stretávajú zámerne
    for (let i = 0; i < petals.length; i++) {
      const others = petals.filter((_, j) => j !== i);
      for (const p of petals[i]) {
        if (Math.hypot(p.x - 300, p.y - 300) < 10) continue;
        expect(hitPetal(p, others)).toBe(-1);
      }
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
