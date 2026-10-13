import type { Sample } from '@/core/input';
import type { Point } from '@/games/draw/geometry';

/**
 * Generátor syntetických ťahov. Používa sa v testoch a v ladiacom paneli,
 * aby sa dalo overiť bodovanie bez tabletu — s presne určenou chybou.
 */
export function traceAlong(
  path: Point[],
  opts: { from?: number; to?: number; wobble?: number; step?: number; seed?: number } = {},
): Sample[] {
  const { from = 0, to = 1, wobble = 0, step = 3, seed = 1 } = opts;
  const i0 = Math.floor(from * (path.length - 1));
  const i1 = Math.floor(to * (path.length - 1));
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

  const out: Sample[] = [];
  let t = 0;
  for (let i = i0; i <= i1; i += step) {
    const p = path[i % path.length];
    out.push({ x: p.x + rnd() * wobble, y: p.y + rnd() * wobble, t: (t += 16) });
  }
  return out;
}
