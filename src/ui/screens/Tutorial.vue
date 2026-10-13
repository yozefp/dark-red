<script setup lang="ts">
import { COPY } from '../copy';
import Header from '../components/Header.vue';
import Demo from '../components/Demo.vue';
import type { GameId } from '@/core/types';

const props = defineProps<{ game: GameId }>();
const emit = defineEmits<{ start: [] }>();
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
      </div>
      <div class="split__visual"><Demo :game="props.game" /></div>
    </div>
  </div>
</template>

<style scoped>
.tut__cta{margin-top:34px}
</style>
