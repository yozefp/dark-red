import { describe, it, expect } from 'vitest';
import { scorePush, configFor, advance, rateAt, TARGET, BURN } from '@/games/push/scoring';

const std = (round = 1) => configFor('standard', round);

describe('PUSH — bodovanie', () => {
  it('presne na stodesiatich dá plné skóre', () => {
    const s = scorePush(TARGET, std());
    expect(s.score).toBe(1);
    expect(s.passed).toBe(true);
  });

  it('okraj pásma ešte prejde, tesne za ním už nie', () => {
    const cfg = std();
    expect(scorePush(TARGET + cfg.band, cfg).passed).toBe(true);
    expect(scorePush(TARGET + cfg.band + 0.2, cfg).passed).toBe(false);
  });

  it('nad hranicou spálenia je kolo stratené', () => {
    const s = scorePush(BURN + 0.5, std());
    expect(s.burnt).toBe(true);
    expect(s.score).toBe(0);
  });

  it('pustenie pred prerazením stropu neprejde', () => {
    const s = scorePush(96, std());
    expect(s.early).toBe(true);
    expect(s.passed).toBe(false);
  });

  it('vyhráva sa medzi 105 a 115 v každom kole aj obtiažnosti', () => {
    for (const d of ['easy', 'standard', 'hard']) for (const r of [1, 2, 3]) {
      const cfg = configFor(d, r);
      expect(scorePush(105, cfg).passed).toBe(true);
      expect(scorePush(115, cfg).passed).toBe(true);
      expect(scorePush(104.8, cfg).passed).toBe(false);
      expect(scorePush(115.2, cfg).passed).toBe(false);
    }
  });

  it('tretie kolo je rýchlejšie než prvé a ťažká obtiažnosť rýchlejšia než ľahká', () => {
    expect(configFor('standard', 3).rateAtTarget).toBeGreaterThan(configFor('standard', 1).rateAtTarget);
    expect(configFor('hard', 1).rateAtTarget).toBeGreaterThan(configFor('easy', 1).rateAtTarget);
  });

  it('meter stále zrýchľuje — začne pomaly a nikde nespomalí', () => {
    const cfg = std();
    let prev = 0;
    for (let v = 0; v <= BURN; v += 5) {
      expect(rateAt(v, cfg)).toBeGreaterThan(prev);
      prev = rateAt(v, cfg);
    }
    expect(rateAt(0, cfg)).toBeLessThan(15);
    expect(rateAt(TARGET, cfg)).toBeCloseTo(cfg.rateAtTarget, 5);
  });

  it('pustenie nad pásmom je neskoro, pod pásmom skoro', () => {
    const cfg = std();
    const late = scorePush(TARGET + cfg.band + 2, cfg);
    expect(late.passed).toBe(false);
    expect(late.late).toBe(true);
    expect(late.early).toBe(false);
    const early = scorePush(TARGET - cfg.band - 2, cfg);
    expect(early.early).toBe(true);
    expect(early.late).toBe(false);
  });

  it('každé kolo dá menej času v pásme — prvé je mäkké, tretie rozhoduje', () => {
    // čas v pásme = šírka pásma / rýchlosť pri 110
    const window = (r: number) => (2 * std(r).band) / std(r).rateAtTarget;
    expect(window(1)).toBeGreaterThanOrEqual(0.4);
    expect(window(2)).toBeLessThan(window(1));
    expect(window(3)).toBeLessThan(window(2));
    expect(window(3)).toBeGreaterThan(0.15);
  });

  it('priebeh nezávisí od dĺžky snímku', () => {
    const cfg = std();
    // jeden dlhý krok verzus veľa krátkych musí skončiť takmer rovnako
    let a = 20;
    for (let i = 0; i < 100; i++) a = advance(a, 10, cfg);
    let b = 20;
    for (let i = 0; i < 20; i++) b = advance(b, 50, cfg);
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });

  it('na 110 sa dá dostať za tri a pol až šesť sekúnd', () => {
    for (const r of [1, 2, 3]) {
      const cfg = std(r);
      let v = 0, t = 0;
      while (v < TARGET && t < 20_000) { v = advance(v, 16, cfg); t += 16; }
      expect(t).toBeGreaterThan(3500);
      expect(t).toBeLessThan(6000);
    }
  });
});
