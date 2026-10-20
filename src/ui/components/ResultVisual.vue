<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { samplePath, VIEW } from '@/games/draw/geometry';
import {
  ANGLES, LEN_OF_FRAME, DRAW_ORDER, FLOWER, PETAL_LEN, petalPolygon,
} from '@/games/memorize/geometry';
import { C } from '@/ui/tokens';
import type { ResultVisual } from '@/core/types';

/**
 * Obrázok hry na výsledkovej obrazovke. Kreslí sa z údajov, ktoré hra
 * poslala v RoundResult — hra samotná je v tej chvíli už zbúraná.
 */
const props = defineProps<{ visual: ResultVisual; won: boolean }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let raf = 0;

/** PUSH je v DOM, nie na plátne — stupnica je text a ten má byť ostrý. */
const isMeter = computed(() => props.visual.game === 'push');
const meter = computed(() => {
  const v = props.visual;
  if (v.game !== 'push') return null;
  const lo = 100, hi = 125;
  const pos = (x: number) => ((x - lo) / (hi - lo)) * 100;
  return {
    fill: Math.max(0, Math.min(100, pos(v.value))),
    bandLo: pos(110 - v.band),
    bandHi: pos(110 + v.band),
    ticks: [100, 105, 110, 115, 120, 125].map((t) => ({ t, y: pos(t) })),
  };
});

onMounted(() => {
  if (isMeter.value) return;
  const el = canvas.value;
  if (!el) return;
  const ctx = el.getContext('2d');
  if (!ctx) return;

  let scale = 1, vh = VIEW;
  const fit = () => {
    const r = el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    el.width = Math.round(r.width * dpr);
    el.height = Math.round(r.height * dpr);
    scale = (r.width * dpr) / VIEW;
    vh = Math.round((r.height / r.width) * VIEW);
  };
  fit();
  window.addEventListener('resize', fit);

  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / 700);          // jediná animácia: rozsvietenie
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (props.visual.game === 'draw') drawShape(ctx, vh, k);
    else if (props.visual.game === 'memorize') drawFlower(ctx, vh, k);
    else drawTarget(ctx, vh, k);

    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', fit);
  });
});

/** DRAW — obrys buď rozžiarený, alebo tlmený s bodom, kde hráč vybočil. */
function drawShape(ctx: CanvasRenderingContext2D, vh: number, k: number) {
  const r = Math.min(VIEW, vh) * 0.42;
  const path = samplePath(VIEW / 2, vh / 2, r, 200);
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();

  if (props.won) {
    const g = ctx.createLinearGradient(0, vh / 2 - r, 0, vh / 2 + r);
    g.addColorStop(0, C.orange); g.addColorStop(1, C.red);
    ctx.strokeStyle = `rgba(255,90,31,${0.22 * k})`; ctx.lineWidth = 30; ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = 9; ctx.stroke();
  } else {
    ctx.strokeStyle = C.maroon; ctx.lineWidth = 7; ctx.stroke();
    const off = props.visual.game === 'draw' ? props.visual.off : null;
    if (off) {
      // bod na okraji ukazuje, kde ťah opustil líniu
      const x = VIEW / 2 + (off.x - VIEW / 2) * (r / (VIEW * 0.4));
      const y = vh / 2 + (off.y - VIEW / 2) * (r / (VIEW * 0.4));
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = C.red; ctx.fill();
    }
  }
}

/** MEMORIZE — kvet rozsvietený, alebo s vyznačenou chybou. */
function drawFlower(ctx: CanvasRenderingContext2D, vh: number, k: number) {
  const v = props.visual;
  if (v.game !== 'memorize') return;
  // rovnaké usadenie ako v hre: podľa skutočných rozmerov kvetu
  const fit = PETAL_LEN / Math.max(FLOWER.width / VIEW, FLOWER.height / vh);
  const len = Math.min(vh * LEN_OF_FRAME, fit * 0.96);
  const u = len / PETAL_LEN;
  const cx = (VIEW - FLOWER.width * u) / 2 - FLOWER.left * u;
  const cy = (vh - FLOWER.height * u) / 2 - FLOWER.up * u;
  const petals = ANGLES.map((a) => petalPolygon(cx, cy, a, len));

  const wrongAt = v.got.length - 1;
  const chosen = props.won ? -1 : v.got[wrongAt];
  const expected = props.won ? -1 : v.seq[wrongAt];

  for (const i of DRAW_ORDER) {
    const poly = petals[i];
    ctx.beginPath();
    poly.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();

    if (props.won) {
      ctx.save();
      ctx.shadowColor = C.orange; ctx.shadowBlur = 40 * k;
      ctx.fillStyle = `rgba(255,90,31,${0.25 + 0.65 * k})`;
      ctx.fill(); ctx.restore();
      ctx.strokeStyle = C.orange;
    } else if (i === chosen) {
      ctx.fillStyle = 'rgba(224,42,38,.45)'; ctx.fill();
      ctx.strokeStyle = C.red;
    } else if (i === expected) {
      ctx.fillStyle = 'rgba(232,163,61,.14)'; ctx.fill();
      ctx.strokeStyle = C.amber;
    } else {
      ctx.fillStyle = '#2E1512'; ctx.fill();
      ctx.strokeStyle = '#8A4036';
    }
    ctx.lineWidth = 2; ctx.stroke();
  }
}

/** RELEASE — terč a na ňom všetky tri hody. */
function drawTarget(ctx: CanvasRenderingContext2D, vh: number, k: number) {
  const v = props.visual;
  if (v.game !== 'release') return;
  const cx = VIEW / 2, cy = vh / 2;
  const R = Math.min(VIEW, vh) * 0.34;
  const fills = ['rgba(107,42,40,.32)', 'rgba(168,46,34,.44)', 'rgba(224,42,38,.56)', C.orange];

  [1, 0.74, 0.5, 0.28].forEach((f, i) => {
    const pts = samplePath(cx, cy, R * f, 70);
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fills[i];
    ctx.fill();
  });

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
  glow.addColorStop(0, `rgba(255,240,200,${0.95 * k})`);
  glow.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();

  const best = v.hits.reduce((a, h, i) =>
    Math.hypot(h.x, h.y) < Math.hypot(v.hits[a].x, v.hits[a].y) ? i : a, 0);

  // ďaleko minutý hod by spadol mimo plátna; pritiahneme ho dovnútra,
  // aby bolo vidieť aspoň smer, ktorým šiel
  const maxR = Math.min(cx, cy) - 22;
  v.hits.forEach((h, i) => {
    const d = Math.hypot(h.x, h.y) * R;
    const k2 = d > maxR ? maxR / d : 1;
    const x = cx + h.x * R * k2, y = cy + h.y * R * k2;
    const win = i === best && Math.hypot(h.x, h.y) <= v.tolerance;
    ctx.beginPath(); ctx.arc(x, y, win ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = win ? C.amber : 'rgba(240,230,226,.6)';
    ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, win ? 16 : 12, 0, Math.PI * 2);
    ctx.strokeStyle = win ? `rgba(232,163,61,${0.6 * k})` : 'rgba(240,230,226,.22)';
    ctx.lineWidth = 1.5; ctx.stroke();
  });
}
</script>

<template>
  <div v-if="isMeter && meter" class="rv-meter" :class="{ lose: !won }">
    <div class="rv-meter__ticks">
      <div v-for="t in meter.ticks" :key="t.t" class="rv-meter__tick"
           :class="{ on: t.t === 110 }" :style="{ bottom: t.y + '%' }"><b>{{ t.t }}</b></div>
    </div>
    <div class="rv-meter__track">
      <div class="rv-meter__band"
           :style="{ bottom: meter.bandLo + '%', height: (meter.bandHi - meter.bandLo) + '%' }" />
      <div class="rv-meter__fill" :style="{ height: meter.fill + '%' }" />
    </div>
  </div>
  <canvas v-else ref="canvas" class="rv-canvas" />
</template>

<style scoped>
.rv-canvas{display:block;width:100%;height:100%}

.rv-meter{display:flex;align-items:stretch;gap:12px;height:min(70%,460px)}
.rv-meter__ticks{position:relative;width:46px}
.rv-meter__tick{position:absolute;right:0;transform:translateY(50%);display:flex;
  align-items:center;gap:8px;font-size:var(--fs-label);color:var(--muted);
  font-variant-numeric:tabular-nums}
.rv-meter__tick::after{content:'';width:11px;height:1px;background:#5A2E28}
.rv-meter__tick b{font-weight:300}
.rv-meter__tick.on b{color:var(--amber);font-weight:500}
.rv-meter__track{position:relative;width:clamp(50px,6vw,80px);
  border:1px solid var(--line);background:#120707;overflow:hidden}
.rv-meter__band{position:absolute;left:0;right:0;background:rgba(232,163,61,.14);
  border-top:2px solid var(--amber);border-bottom:2px solid var(--amber)}
.rv-meter__fill{position:absolute;left:0;right:0;bottom:0;
  background:linear-gradient(to top,var(--red),var(--orange));
  box-shadow:0 0 46px rgba(255,90,31,.5)}
.rv-meter.lose .rv-meter__fill{background:linear-gradient(to top,#4A1512,#6B2A28);
  box-shadow:none}
</style>
