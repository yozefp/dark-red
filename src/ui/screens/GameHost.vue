<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Header from '../components/Header.vue';
import { COPY } from '../copy';
import type { GameModule, RoundConfig, RoundResult } from '@/core/types';

const props = defineProps<{ game: GameModule; round: RoundConfig }>();
const emit = defineEmits<{ roundEnd: [RoundResult] }>();

const host = ref<HTMLElement | null>(null);
const status = ref('');
const statusValue = ref('');

onMounted(() => {
  if (!host.value) return;
  props.game.onRoundEnd = (r) => emit('roundEnd', r);
  props.game.mount(host.value, props.round);
  status.value = COPY.misc.round(props.round.round, props.round.totalRounds);
});
onBeforeUnmount(() => props.game.destroy());
</script>

<template>
  <div class="screen" data-t="playing">
    <div class="glow" />
    <Header :status="status" :status-value="statusValue" />
    <div ref="host" class="gamehost" />
  </div>
</template>

<style scoped>
.gamehost{position:absolute;inset:0;
  /* hlavička je vysoká --gut, hra sa pod ňu nesmie dostať */
  padding:calc(var(--gut) + 10px + var(--safe-t)) calc(.5 * var(--gut) + var(--safe-r))
          calc(.45 * var(--gut) + var(--safe-b)) calc(.5 * var(--gut) + var(--safe-l))}
</style>
