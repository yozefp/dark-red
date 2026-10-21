<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { samplePath, traceLayout } from '@/games/draw/geometry';
import { drawTrack, drawStart, drawFinger, traceGradient, tracePolyline, TRACE_STYLE } from '@/games/draw/render';
import { layoutFlower, stepGlow, drawFlower } from '@/games/memorize/draw';
import { C } from '@/ui/tokens';
import type { GameId } from '@/core/types';

/**
 * Ukážka na tutoriáli. Beží v slučke a ukazuje pohyb, nie statický obrázok —
 * k tabletu príde človek, ktorý o hre nič nevie, a osem slov nestačí.
 */
const props = defineProps<{ game: GameId }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let raf = 0;
const V = 400;                     // vnútorná sieť ukážky
const LOOP = 3600;                 // dĺžka jedného cyklu, ms

onMounted(() => {
  const el = canvas.value;
  if (!el) return;
  const ctx = el.getContext('2d');
  if (!ctx) return;

  let scale = 1;
  // Ukážka je kreslená do štvorca, takže aj plátno musí byť štvorec.
  // Keby sa roztiahlo na celý stĺpec, obrázok by sa natiahol a lupene
  // aj obrys by na širokej obrazovke vyzerali pokrivené.
  const fit = () => {
    const host = el.parentElement?.getBoundingClientRect();
    if (!host) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const side = Math.min(host.width, host.height, window.innerHeight * 0.68, 520);
    el.style.width = `${side}px`;
    el.style.height = `${side}px`;
    el.width = Math.round(side * dpr);
    el.height = Math.round(side * dpr);
    scale = (side * dpr) / V;
  };
  fit();
  window.addEventListener('resize', fit);

  const trace = traceLayout(V, V, 160);
  const petals = layoutFlower(V, V);
  const glow = [0, 0, 0, 0];
  const target = [0, 0, 0, 0];
  const t0 = performance.now();
  let last = t0;

  const tick = (now: number) => {
    const k = ((now - t0) % LOOP) / LOOP;          // 0..1 v cykle
    const dt = Math.min(now - last, 60);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (props.game === 'draw') drawDemo(ctx, trace.path, trace.k, k);
    else if (props.game === 'push') pushDemo(ctx, k);
    else if (props.game === 'memorize') memoDemo(ctx, petals, glow, target, k, dt);
    else releaseDemo(ctx, k);

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', fit);
  });
});

/** Obrys, štart so šípkou a prst, ktorý ho obkresľuje — kreslené ako v hre. */
function drawDemo(
  ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], u: number, k: number,
) {
  drawTrack(ctx, path, u);
  const n = Math.floor(Math.min(1, k * 1.25) * path.length);
  if (n > 1) {
    tracePolyline(ctx, path.slice(0, n), false);
    ctx.strokeStyle = traceGradient(ctx, path); ctx.lineWidth = TRACE_STYLE.lineW * u; ctx.stroke();
  }
  drawStart(ctx, path[0], u);
  if (n > 1) drawFinger(ctx, path[Math.min(n, path.length - 1)], u);
}

/** Meter sa rozbieha pomaly a stále zrýchľuje, až kým sa nepustí na 110. */
function pushDemo(ctx: CanvasRenderingContext2D, k: number) {
  const x = V * 0.44, w = V * 0.16, top = V * 0.12, bot = V * 0.88, h = bot - top;
  const value = Math.min(110, 110 * (k / 0.75) ** 2);
  const lo = 100, hi = 125;
  const y = (v: number) => bot - ((Math.max(lo, v) - lo) / (hi - lo)) * h;

  ctx.strokeStyle = C.line; ctx.lineWidth = 1;
  ctx.strokeRect(x, top, w, h);

  const band = { a: y(108), b: y(112) };
  ctx.fillStyle = 'rgba(232,163,61,.14)';
  ctx.fillRect(x, band.b, w, band.a - band.b);
  ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, band.a); ctx.lineTo(x + w, band.a);
  ctx.moveTo(x, band.b); ctx.lineTo(x + w, band.b); ctx.stroke();

  const fh = value < 100 ? (value / 100) * (h * 0.22) : bot - y(value);
  const g = ctx.createLinearGradient(0, bot, 0, bot - fh);
  if (value < 100) { g.addColorStop(0, '#1F8E96'); g.addColorStop(1, C.iqos); }
  else { g.addColorStop(0, C.red); g.addColorStop(1, C.orange); }
  ctx.fillStyle = g;
  ctx.fillRect(x, bot - fh, w, fh);

  ctx.font = '26px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillStyle = value >= 108 && value <= 112 ? C.amber : C.text;
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(value)} %`, x + w + 18, V * 0.52);
}

/**
 * Lupene sa rozsvietia za sebou, potom ich hráč zopakuje.
 * Kreslí sa tým istým kódom ako v hre, takže ukážka vyzerá ako hra —
 * vrátane plynulého nábehu a dozvuku.
 */
function memoDemo(
  ctx: CanvasRenderingContext2D,
  petals: { x: number; y: number }[][],
  glow: number[],
  target: number[],
  k: number,
  dt: number,
) {
  const seq = [1, 3, 0];
  // šesť krokov: tri záblesky ukážky, potom tie isté tri ako ťuknutia
  const step = Math.floor(k * 6);
  const vKroku = (k * 6) % 1;
  const lit = seq[step % 3];

  for (let i = 0; i < target.length; i++) target[i] = 0;
  if (vKroku < 0.62) target[lit] = 1;             // svieti len časť kroku
  stepGlow(glow, target, dt);

  drawFlower(ctx, petals, glow);
}

/** Potiahnutie dozadu, bodkovaný smer, let a zásah. */
function releaseDemo(ctx: CanvasRenderingContext2D, k: number) {
  const target = { x: V / 2, y: V * 0.24 };
  const anchor = { x: V / 2, y: V * 0.78 };
  const pull = k < 0.45 ? (k / 0.45) * 46 : 46;

  for (let i = 3; i >= 0; i--) {
    const r = V * 0.11 * [1, 0.72, 0.48, 0.26][i];
    const pts = samplePath(target.x, target.y, r, 60);
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = ['rgba(107,42,40,.4)', 'rgba(168,46,34,.5)', 'rgba(224,42,38,.6)', C.orange][i];
    ctx.fill();
  }

  if (k < 0.55) {
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + pull); ctx.lineTo(anchor.x, anchor.y);
    ctx.strokeStyle = 'rgba(240,230,226,.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(anchor.x, anchor.y + pull, 6, 0, Math.PI * 2);
    ctx.fillStyle = C.amber; ctx.fill();
    for (let d = 26; d < 100; d += 11) {
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y - d, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,163,61,${0.65 - d / 190})`; ctx.fill();
    }
  } else {
    const t = Math.min(1, (k - 0.55) / 0.25);
    const y = anchor.y + (target.y - anchor.y) * t;
    ctx.beginPath(); ctx.arc(anchor.x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE3A8'; ctx.fill();
  }

  ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2A1512'; ctx.fill();
  ctx.strokeStyle = '#6E3028'; ctx.lineWidth = 1.5; ctx.stroke();
}
</script>

<template>
  <canvas ref="canvas" class="demo" />
</template>

<style scoped>
.demo{display:block;flex:0 0 auto}
</style>
