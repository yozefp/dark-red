<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { state, go, setConfig } from '@/core/machine';
import { setOverride, parseConfig } from '@/core/config';
import { tuning, resetTuning } from './tuning';
import { DEBUG } from './hooks';
import { traceAlong } from './trace';
import type { GameId } from '@/core/types';

const open = ref(false);
const fps = ref(0);
const score = ref(0);
const GAMES: GameId[] = ['draw', 'push', 'memorize', 'release'];
const READY: GameId[] = ['draw', 'push', 'memorize'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hooks = () => (window as any).__tdr as
  { probe: { path?: unknown[]; score: () => number; replay: (s: unknown[]) => void } | null;
    dump: () => string; clear: () => void } | undefined;

let raf = 0, frames = 0, t0 = 0;
function tick(now: number) {
  frames++;
  if (now - t0 >= 500) { fps.value = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now; }
  score.value = hooks()?.probe?.score() ?? 0;
  raf = requestAnimationFrame(tick);
}
onMounted(() => { if (DEBUG) raf = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(raf));

const cfg = computed(() => state.config);

/** Zmena sa uloží lokálne aj nasadí okamžite — netreba znova načítať stránku. */
function patch(p: Record<string, unknown>) {
  const next = parseConfig({ ...cfg.value, ...p });
  setOverride({ ...next });
  setConfig(next);
}

function replay(kind: 'perfect' | 'wobble' | 'partial' | 'off') {
  const h = hooks();
  const path = h?.probe?.path as { x: number; y: number }[] | undefined;
  if (!path || !h?.probe) return;
  const opts = {
    perfect: { wobble: 0 },
    wobble:  { wobble: 14 },
    partial: { to: 0.7, wobble: 4 },
    off:     { wobble: 55 },
  }[kind];
  h.probe.replay(traceAlong(path, opts));
}

function resetConfig() { setOverride(null); location.reload(); }

async function copyDump() {
  const d = hooks()?.dump() ?? '[]';
  try { await navigator.clipboard.writeText(d); } catch { console.log(d); }
}
</script>

<template>
  <div v-if="DEBUG" class="dp" :class="{ dp__open: open }">
    <button class="dp__tab" @click="open = !open">{{ open ? '✕' : '⚙' }}</button>

    <div v-if="open" class="dp__body">
      <div class="dp__row dp__meter">
        <span>{{ fps }} fps</span>
        <span>skóre {{ Math.round(score * 100) }} %</span>
        <span>{{ state.state }}</span>
      </div>

      <div class="dp__label">obrazovka</div>
      <div class="dp__row">
        <button v-for="s in (['attract','code','tutorial','playing','result'] as const)"
                :key="s" class="dp__b" :class="{ on: state.state === s }"
                @click="go(s)">{{ s }}</button>
      </div>

      <div class="dp__label">hra</div>
      <div class="dp__row">
        <button v-for="g in GAMES" :key="g" class="dp__b"
                :class="{ on: cfg.game === g, todo: !READY.includes(g) }"
                :disabled="!READY.includes(g)" @click="patch({ game: g })">{{ g }}</button>
      </div>

      <div class="dp__label">obtiažnosť · kolá {{ cfg.rounds }}</div>
      <div class="dp__row">
        <button v-for="d in (['easy','standard','hard'] as const)" :key="d" class="dp__b"
                :class="{ on: cfg.difficulty === d }" @click="patch({ difficulty: d })">{{ d }}</button>
        <button v-for="r in [1,3]" :key="r" class="dp__b"
                :class="{ on: cfg.rounds === r }" @click="patch({ rounds: r })">{{ r }}×</button>
      </div>

      <div class="dp__label">
        tolerancia {{ tuning.tolerance ?? 'z obtiažnosti' }}
      </div>
      <input class="dp__s" type="range" min="6" max="48" step="1"
             :value="tuning.tolerance ?? 20"
             @input="tuning.tolerance = +($event.target as HTMLInputElement).value">

      <div class="dp__label">hranica {{ Math.round((tuning.pass ?? 0.85) * 100) }} %</div>
      <input class="dp__s" type="range" min="40" max="99" step="1"
             :value="Math.round((tuning.pass ?? 0.85) * 100)"
             @input="tuning.pass = +($event.target as HTMLInputElement).value / 100">

      <div class="dp__label">prehrať ťah</div>
      <div class="dp__row">
        <button class="dp__b" @click="replay('perfect')">presný</button>
        <button class="dp__b" @click="replay('wobble')">chvenie</button>
        <button class="dp__b" @click="replay('partial')">70 %</button>
        <button class="dp__b" @click="replay('off')">mimo</button>
      </div>

      <div class="dp__label">záznam z tabletu</div>
      <div class="dp__row">
        <button class="dp__b" @click="copyDump()">kopíruj JSON</button>
        <button class="dp__b" @click="hooks()?.clear()">vymaž</button>
      </div>

      <div class="dp__row dp__foot">
        <button class="dp__b" @click="resetTuning()">reset ladenia</button>
        <button class="dp__b" @click="resetConfig()">reset konfigurácie</button>
      </div>
      <div class="dp__note">kód: <b>{{ cfg.code }}</b> · týždeň {{ cfg.week }}</div>
    </div>
  </div>
</template>

<style scoped>
.dp{position:fixed;z-index:9999;right:0;bottom:0;font:11px/1.4 ui-monospace,monospace;
  color:#EADFD6;pointer-events:none}
.dp__tab{pointer-events:auto;position:absolute;right:8px;bottom:8px;width:34px;height:34px;
  border-radius:17px;background:#2A1512;border:1px solid #5A2E28;color:#E8A33D;font-size:15px}
.dp__body{pointer-events:auto;width:278px;max-height:88vh;overflow:auto;margin:0 50px 8px 0;
  padding:10px 12px 12px;background:rgba(18,8,8,.96);border:1px solid #5A2E28;border-radius:10px}
.dp__label{margin:9px 0 4px;color:#9A8278;text-transform:uppercase;letter-spacing:.08em;font-size:9px}
.dp__row{display:flex;flex-wrap:wrap;gap:4px}
.dp__b{flex:1 1 auto;padding:5px 7px;background:#20100E;border:1px solid #3C201C;
  border-radius:5px;color:#EADFD6;font:inherit}
.dp__b.on{background:#4A2018;border-color:#E8A33D;color:#E8A33D}
.dp__b.todo{opacity:.35}
.dp__b:disabled{opacity:.3}
.dp__s{width:100%;margin:0}
.dp__meter{justify-content:space-between;color:#E8A33D;border-bottom:1px solid #3C201C;padding-bottom:7px}
.dp__foot{margin-top:11px;border-top:1px solid #3C201C;padding-top:9px}
.dp__note{margin-top:7px;color:#9A8278}
</style>
