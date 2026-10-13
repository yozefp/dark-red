<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { COPY } from '../copy';
import Header from '../components/Header.vue';

const props = defineProps<{
  won: boolean;
  headline: string;
  value?: string;
  unit?: string;
  detail?: string;
  timeoutMs: number;
  /** vizuál vľavo (meter, terč) namiesto centrovaného rozloženia */
  sideVisual?: boolean;
}>();
const emit = defineEmits<{ done: [] }>();

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

    <div :class="sideVisual ? 'split' : 'center res__center'">
      <div v-if="sideVisual" class="split__visual"><slot /></div>
      <div :class="sideVisual ? 'split__text' : ''">
        <slot v-if="!sideVisual" />
        <h1 class="h1 res__head" :class="{ lose: !won }">{{ headline }}</h1>
        <div v-if="value" class="val res__val" :class="{ lose: !won }">
          {{ value }}<small v-if="unit">{{ unit }}</small>
        </div>
        <p class="body res__body">{{ won ? COPY.result.winBody : COPY.result.loseBody }}</p>
        <p class="note">{{ won ? '' : COPY.result.loseNote }}</p>
        <p v-if="detail" class="note res__detail">{{ detail }}</p>
      </div>
    </div>

    <div class="timebar" :style="{ width: barWidth, transitionDuration: timeoutMs + 'ms' }" />
  </div>
</template>

<style scoped>
.res__center{padding:0 7vw}
.res__head{margin-top:20px}
.res__head.lose{color:var(--muted)}
.res__val{margin-top:14px}
.res__val.lose{color:var(--maroon)}
.res__body{margin-top:26px}
.res__detail{color:var(--maroon)}
</style>
