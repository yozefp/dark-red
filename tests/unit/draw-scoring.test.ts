import { describe, it, expect } from 'vitest';
import { samplePath, VIEW, type Point } from '@/games/draw/geometry';
import { scoreDraw, configFor } from '@/games/draw/scoring';
import type { Sample } from '@/core/input';

const path = samplePath(VIEW / 2, VIEW / 2, (VIEW / 2) * 0.8, 220);

/** Ťah po dráhe s voliteľným chvením a voliteľným vybočením. */
function trace(opts: { jitter?: number; detour?: number; fraction?: number } = {}): Sample[] {
  const { jitter = 0, detour = 0, fraction = 1 } = opts;
  const n = Math.floor(path.length * fraction);
  const out: Sample[] = [];
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);
  for (let i = 0; i < n; i++) {
    let { x, y } = path[i];
    x += rnd() * jitter; y += rnd() * jitter;
    if (detour && i > 60 && i < 95) {
      const t = (i - 60) / 35;
      x += Math.sin(t * Math.PI) * detour;
      y -= Math.sin(t * Math.PI) * detour * 0.8;
    }
    out.push({ x, y, t: i * 8 });
  }
  return out;
}

describe('scoreDraw', () => {
  const cfgR1 = configFor('standard', 1);
  const cfgR3 = configFor('standard', 3);

  it('presný ťah dá plné skóre', () => {
    const r = scoreDraw(trace(), path, cfgR3);
    expect(r.coverage).toBeGreaterThan(0.99);
    expect(r.score).toBeGreaterThan(0.97);
    expect(r.penalty).toBe(0);
  });

  it('chvenie v rámci tolerancie skóre zníži', () => {
    const clean = scoreDraw(trace(), path, cfgR3).score;
    const shaky = scoreDraw(trace({ jitter: 14 }), path, cfgR3).score;
    expect(shaky).toBeLessThan(clean - 0.05);
  });

  it('vybočenie sa trestá nad rámec pokrytia', () => {
    const r = scoreDraw(trace({ detour: 70 }), path, cfgR3);
    expect(r.penalty).toBeGreaterThan(0.05);
    expect(r.score).toBeLessThan(cfgR3.pass);
    expect(r.offSegments.length).toBeGreaterThan(0);
  });

  it('nedokončený ťah neprejde', () => {
    const r = scoreDraw(trace({ fraction: 0.6 }), path, cfgR3);
    expect(r.coverage).toBeLessThan(0.7);
    expect(r.score).toBeLessThan(cfgR3.pass);
  });

  it('prvé kolo je zhovievavejšie než tretie', () => {
    const t = trace({ jitter: 16 });
    expect(scoreDraw(t, path, cfgR1).score)
      .toBeGreaterThan(scoreDraw(t, path, cfgR3).score);
  });

  it('riedke vzorkovanie netrestá — interpolácia medzi vzorkami', () => {
    const dense = trace();
    const sparse = dense.filter((_, i) => i % 5 === 0);   // pätina vzoriek
    const a = scoreDraw(dense, path, cfgR3);
    const b = scoreDraw(sparse, path, cfgR3);
    expect(b.coverage).toBeGreaterThan(a.coverage - 0.05);
  });

  it('skóre nikdy nie je záporné', () => {
    const wild: Sample[] = Array.from({ length: 50 }, (_, i) => ({ x: i * 11, y: 590, t: i * 8 }));
    expect(scoreDraw(wild, path, cfgR3).score).toBeGreaterThanOrEqual(0);
  });
});

describe('geometry', () => {
  it('vzorkovanie dá rovnomerné rozostupy', () => {
    const p = samplePath(300, 300, 240, 100);
    const gaps: number[] = [];
    for (let i = 1; i < p.length; i++) gaps.push(Math.hypot(p[i].x - p[i-1].x, p[i].y - p[i-1].y));
    const mean = gaps.reduce((s, v) => s + v, 0) / gaps.length;
    const max = Math.max(...gaps.map((g) => Math.abs(g - mean) / mean));
    expect(max).toBeLessThan(0.1);        // do 10 % odchýlky
  });

  it('dráha je uzavretá', () => {
    const p: Point[] = samplePath(300, 300, 240, 200);
    expect(Math.hypot(p[0].x - p[p.length-1].x, p[0].y - p[p.length-1].y)).toBeLessThan(20);
  });
});
