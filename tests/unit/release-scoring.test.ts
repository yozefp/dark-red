import { describe, it, expect } from 'vitest';
import {
  configFor, landing, pullPower, shoot, scoreRelease, toMm, aimFor, SWEET_POWER, THROWS,
} from '@/games/release/scoring';

const anchor = { x: 300, y: 520 };
const target = { x: 300, y: 170 };
// strop ťahu a dolet si hra počíta z plátna — test musí rovnako
const base = configFor('standard', 1);
const cfg = { ...base, ...aimFor(anchor.y - target.y, 200) };

describe('RELEASE — hod', () => {
  it('ťah nadol vystrelí nahor', () => {
    const p = landing(anchor, { x: 300, y: 620 }, cfg);
    expect(p.x).toBeCloseTo(300, 5);
    expect(p.y).toBeLessThan(anchor.y);
  });

  it('dlhší ťah letí ďalej', () => {
    const near = landing(anchor, { x: 300, y: 570 }, cfg);
    const far = landing(anchor, { x: 300, y: 650 }, cfg);
    expect(anchor.y - far.y).toBeGreaterThan(anchor.y - near.y);
  });

  it('ťah dlhší než strop už dolet nepridá', () => {
    const a = landing(anchor, { x: 300, y: anchor.y + cfg.maxPull }, cfg);
    const b = landing(anchor, { x: 300, y: anchor.y + cfg.maxPull * 3 }, cfg);
    expect(a).toEqual(b);
    expect(pullPower(anchor, { x: 300, y: anchor.y + cfg.maxPull * 3 }, cfg)).toBe(1);
  });

  it('bez ťahu hod neodletí', () => {
    expect(landing(anchor, anchor, cfg)).toEqual(anchor);
  });

  it('terč sa dá trafiť priamym ťahom nadol', () => {
    // dolet presne na vzdialenosť terča
    const need = (anchor.y - target.y) / cfg.rangeK;
    const s = shoot(anchor, { x: 300, y: anchor.y + need }, target, cfg);
    expect(s.distance).toBeLessThan(1);
    expect(scoreRelease([s], cfg).passed).toBe(true);
  });

  it('šikmý ťah minie do strany', () => {
    const need = (anchor.y - target.y) / cfg.rangeK;
    const s = shoot(anchor, { x: 300 + 60, y: anchor.y + need }, target, cfg);
    expect(s.distance).toBeGreaterThan(20);
  });

  it('z troch hodov platí najlepší', () => {
    const shots = [
      { point: { x: 0, y: 0 }, power: 1, distance: 80 },
      { point: { x: 0, y: 0 }, power: 1, distance: 12 },
      { point: { x: 0, y: 0 }, power: 1, distance: 44 },
    ];
    const r = scoreRelease(shots, cfg);
    expect(r.best).toBe(12);
    expect(r.passed).toBe(true);
  });

  it('skóre klesá so vzdialenosťou a nikdy nie je záporné', () => {
    const d = (x: number) => scoreRelease([{ point: { x: 0, y: 0 }, power: 1, distance: x }], cfg).score;
    expect(d(0)).toBe(1);
    expect(d(cfg.tolerance)).toBeCloseTo(0.5, 5);
    expect(d(500)).toBe(0);
  });

  it('na správny hod treba zhruba dve tretiny sily', () => {
    // pruh SILA nesmie pri trafenom hode vyzerať, akoby hráč ťahal slabo
    const need = (anchor.y - target.y) / cfg.rangeK;
    const p = pullPower(anchor, { x: 300, y: anchor.y + need }, cfg);
    expect(p).toBeGreaterThan(0.55);
    expect(p).toBeLessThan(0.75);
  });

  it('správny hod sa zmestí do miesta pod krúžkom pri akomkoľvek tvare plátna', () => {
    // prst nesmie musieť ísť za okraj displeja
    for (const [d, room] of [[200, 90], [350, 120], [600, 300], [900, 200]]) {
      const a = aimFor(d, room);
      expect(a.maxPull).toBe(room);
      expect(d / a.rangeK).toBeCloseTo(room * SWEET_POWER, 5);
    }
  });

  it('tretie kolo je prísnejšie a ťažká obtiažnosť prísnejšia než ľahká', () => {
    expect(configFor('standard', 3).tolerance).toBeLessThan(configFor('standard', 1).tolerance);
    expect(configFor('hard', 1).tolerance).toBeLessThan(configFor('easy', 1).tolerance);
  });

  it('vzdialenosť sa prepočíta na milimetre pre výsledok', () => {
    expect(toMm(10)).toBe(4);
    expect(toMm(90)).toBe(38);
    expect(THROWS).toBe(3);
  });
});
