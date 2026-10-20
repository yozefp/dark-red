<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { COPY } from '../copy';
import Header from '../components/Header.vue';
import ResultVisual from '../components/ResultVisual.vue';
import type { ResultVisual as RV } from '@/core/types';

const props = defineProps<{
  won: boolean;
  headline: string;
  value?: string;
  unit?: string;
  detail?: string;
  timeoutMs: number;
  visual?: RV;
}>();
const emit = defineEmits<{ done: [] }>();

/**
 * Rozloženie určuje tvar hry: obrys DRAW má text vo vnútri, kvet MEMORIZE
 * nad textom, meter aj terč stoja vedľa neho. Tak je to v dizajne.
 */
const layout = computed(() => {
  if (!props.visual) return 'plain';
  return { draw: 'inside', memorize: 'above', push: 'side', release: 'side' }[props.visual.game];
});

const barWidth = ref('100%');
onMounted(() => {
  requestAnimationFrame(() => { barWidth.value = '0%'; });
  setTimeout(() => emit('done'), props.timeoutMs);
});
</script>

<template>
  <div class="screen" data-t="result">
    <div class="glow" v-if="won" />
    <Header />

    <div class="res" :class="`res--${layout}`">
      <div v-if="visual" class="res__vis">
        <ResultVisual :visual="visual" :won="won" />
      </div>

      <div class="res__txt">
        <h1 class="h1" :class="{ lose: !won }">{{ headline }}</h1>
        <div v-if="value" class="val res__val" :class="{ lose: !won }">
          {{ value }}<small v-if="unit">{{ unit }}</small>
        </div>
        <p class="body res__body">{{ won ? COPY.result.winBody : COPY.result.loseBody }}</p>
        <p v-if="detail" class="note res__detail">{{ detail }}</p>
        <p v-if="!won && visual?.game === 'memorize'" class="note res__legend">
          <span class="sw sw--red" />tvoj výber
          <span class="sw sw--amber" />táto bola na rade
        </p>
      </div>
    </div>

    <div class="timebar" :style="{ width: barWidth, transitionDuration: timeoutMs + 'ms' }" />
  </div>
</template>

<style scoped>
.res{position:absolute;inset:0;
  padding:calc(var(--gut) + var(--safe-t)) calc(var(--gut) + var(--safe-r))
          calc(.7 * var(--gut) + var(--safe-b)) calc(var(--gut) + var(--safe-l))}
.res__vis{min-width:0;min-height:0}
.res__txt{min-width:0}
.res__val{margin-top:.6vw}
.res__body{margin-top:1.8vw}
.res__detail{color:var(--maroon)}
.h1.lose{color:var(--muted)}
.res__val.lose{color:var(--maroon)}

/* text vo vnútri obrysu */
.res--inside .res__vis{position:absolute;inset:0;display:flex;
  align-items:center;justify-content:center}
.res--inside{display:flex;align-items:center;justify-content:center}
.res--inside .res__txt{position:relative;text-align:center;max-width:44%}
.res--inside .res__body{margin-top:1.1vw}

/* kvet nad textom */
.res--above{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1.2vw;text-align:center}
.res--above .res__vis{flex:1 1 auto;width:min(58vw,640px);min-height:0}
.res--above .res__txt{flex:0 0 auto}

/* meter alebo terč vedľa textu */
.res--side{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:2vw}
.res--side .res__vis{height:100%;display:flex;align-items:center;justify-content:center}

.res--plain{display:flex;align-items:center;justify-content:center;text-align:center}

.res__legend{display:flex;align-items:center;gap:8px;justify-content:center;margin-top:1vw}
.sw{width:10px;height:10px;border-radius:50%;display:inline-block}
.sw--red{background:var(--red)}
.sw--amber{background:var(--amber);margin-left:14px}
</style>
