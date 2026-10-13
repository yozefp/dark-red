<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, shallowRef, watch } from 'vue';
import { state, go, setConfig, addRound, finish, reportError } from '@/core/machine';
import { loadConfig, skipCode } from '@/core/config';
import { startIdleWatch } from '@/core/idle';
import { suppressBrowserGestures } from '@/core/input';
import { COPY } from '@/ui/copy';
import type { GameModule, RoundConfig, RoundResult } from '@/core/types';
import { createDrawGame } from '@/games/draw';
import { createPushGame } from '@/games/push';
import { createMemorizeGame } from '@/games/memorize';
import { createReleaseGame } from '@/games/release';

import Attract from '@/ui/screens/Attract.vue';
import CodeEntry from '@/ui/screens/CodeEntry.vue';
import Tutorial from '@/ui/screens/Tutorial.vue';
import GameHost from '@/ui/screens/GameHost.vue';
import Result from '@/ui/screens/Result.vue';
import DevPanel from '@/debug/DevPanel.vue';
import { tuningOverrides } from '@/debug/tuning';

const GAMES: Record<string, () => GameModule> = {
  draw: createDrawGame,
  push: createPushGame,
  memorize: createMemorizeGame,
  release: createReleaseGame,
};

const game = shallowRef<GameModule | null>(null);
const round = ref(1);
const last = ref<RoundResult | null>(null);
let stopIdle: (() => void) | null = null;

const cfg = computed(() => state.config);
const roundCfg = computed<RoundConfig>(() => ({
  round: round.value,
  totalRounds: cfg.value.rounds,
  difficulty: cfg.value.difficulty,
  overrides: tuningOverrides(),
}));

onMounted(async () => {
  suppressBrowserGestures();
  try { setConfig(await loadConfig()); } catch (e) { reportError(e); }
  stopIdle = startIdleWatch();
});
onBeforeUnmount(() => stopIdle?.());

function onCodeOk() { round.value = 1; go('tutorial'); }

// Pri testovaní sa dá kód preskočiť — ?debug=1&nocode=1. Ide to cez
// obrazovku s kódom, lebo automat skok z úvodu rovno do tutoriálu
// nepovoľuje a to pravidlo kvôli testovaniu uvoľňovať nechceme.
function onAttractStart() {
  go('code');
  if (skipCode()) onCodeOk();
}

// prepnutie hry v paneli musí vymeniť aj bežiaci modul, nielen konfiguráciu
watch(() => cfg.value.game, () => {
  if (state.state !== 'playing') return;
  game.value?.destroy();
  const make = GAMES[cfg.value.game];
  if (!make) { go('attract'); return; }
  round.value = 1;
  game.value = make();
});

function startGame() {
  const make = GAMES[cfg.value.game];
  if (!make) { reportError(`hra ${cfg.value.game} nie je dostupná`); go('attract'); return; }
  game.value = make();
  go('playing');
}

function onRoundEnd(r: RoundResult) {
  last.value = r;
  addRound(r);
  // kolo bežalo do konca — po krátkej pauze buď ďalšie kolo, alebo výsledok
  setTimeout(() => {
    if (r.passed && round.value < cfg.value.rounds) {
      round.value++;
      game.value = GAMES[cfg.value.game]();     // čistý modul na nové kolo
      return;
    }
    finish();
    go('result');
  }, 1500);
}

const resultHeadline = computed(() => {
  const g = COPY.games[cfg.value.game];
  return state.summary?.passed ? g.win : g.lose;
});
// hodnotu si určuje hra — každá meria niečo iné
const resultValue = computed(() =>
  last.value?.value ?? (last.value ? String(Math.round(last.value.score * 100)) : undefined));
const resultUnit = computed(() => last.value?.unit ?? '%');
</script>

<template>
  <Attract v-if="state.state === 'attract'" @start="onAttractStart()" />

  <CodeEntry v-else-if="state.state === 'code'"
             :expected="cfg.code" @ok="onCodeOk" />

  <Tutorial v-else-if="state.state === 'tutorial'"
            :game="cfg.game" @start="startGame" />

  <GameHost v-else-if="state.state === 'playing' && game"
            :key="`${cfg.game}-${round}`"
            :game="game" :round="roundCfg" @round-end="onRoundEnd" />

  <Result v-else-if="state.state === 'result'"
          :won="!!state.summary?.passed"
          :headline="resultHeadline"
          :value="resultValue" :unit="resultUnit"
          :detail="state.summary?.passed ? undefined : last?.detail"
          :timeout-ms="cfg.resultTimeoutMs"
          @done="go('attract')" />

  <DevPanel />
</template>
