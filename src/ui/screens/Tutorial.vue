<script setup lang="ts">
import { COPY } from '../copy';
import Header from '../components/Header.vue';
import type { GameId } from '@/core/types';

const props = defineProps<{ game: GameId }>();
const emit = defineEmits<{ start: []; other: [] }>();
const t = COPY.games[props.game];
</script>

<template>
  <div class="screen" data-t="tutorial">
    <div class="glow" />
    <Header />
    <div class="split">
      <div class="split__text">
        <h1 class="h1">{{ t.headline }}</h1>
        <div class="rule" />
        <p class="body">{{ t.rule }}</p>
        <button class="btn tut__cta" data-t="start" @pointerdown.stop="emit('start')">{{ t.cta }}</button>
        <div>
          <button class="btn btn--ghost" @pointerdown.stop="emit('other')">
            {{ COPY.misc.otherGame }}
          </button>
        </div>
      </div>
      <div class="split__visual"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.tut__cta{margin-top:34px}
.btn--ghost{margin-top:22px}
</style>
