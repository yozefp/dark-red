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

  it('tretie kolo je prísnejšie než prvé', () => {
    expect(configFor('standard', 3).band).toBeLessThan(configFor('standard', 1).band);
    expect(configFor('hard', 1).band).toBeLessThan(configFor('easy', 1).band);
  });

  it('nad stropom meter spomalí', () => {
    const cfg = std();
    expect(rateAt(99, cfg)).toBeGreaterThan(rateAt(101, cfg) * 5);
    expect(rateAt(118, cfg)).toBeLessThan(rateAt(101, cfg));
  });

  it('priebeh nezávisí od dĺžky snímku', () => {
    const cfg = std();
    // jeden dlhý krok verzus veľa krátkych musí skončiť takmer rovnako
    let a = 100;
    for (let i = 0; i < 100; i++) a = advance(a, 10, cfg);
    let b = 100;
    for (let i = 0; i < 20; i++) b = advance(b, 50, cfg);
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });

  it('do stropu sa dá dostať zhruba za sekundu a trištvrte', () => {
    const cfg = std();
    let v = 0, t = 0;
    while (v < 100 && t < 10_000) { v = advance(v, 16, cfg); t += 16; }
    expect(t).toBeGreaterThan(900);
    expect(t).toBeLessThan(2000);
  });

  it('od stropu po spálenie ostáva čas na reakciu', () => {
    const cfg = std();
    let v = 100, t = 0;
    while (v < BURN && t < 20_000) { v = advance(v, 16, cfg); t += 16; }
    expect(t).toBeGreaterThan(2500);
  });
});
