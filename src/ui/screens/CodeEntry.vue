<script setup lang="ts">
import { ref, computed } from 'vue';
import { COPY } from '../copy';
import Header from '../components/Header.vue';

const props = defineProps<{ expected: string }>();
const emit = defineEmits<{ ok: [] }>();

const LEN = 6;
const digits = ref<string[]>([]);
const wrong = ref(false);
const accepted = ref(false);

const cells = computed(() =>
  Array.from({ length: LEN }, (_, i) => ({
    d: digits.value[i] ?? '',
    cursor: i === digits.value.length && !accepted.value,
  })));

function press(n: string) {
  if (accepted.value || digits.value.length >= LEN) return;
  wrong.value = false;
  digits.value = [...digits.value, n];
  if (digits.value.length === LEN) check();
}
function back() { if (!accepted.value) { wrong.value = false; digits.value = digits.value.slice(0, -1); } }

function check() {
  if (digits.value.join('') === props.expected) {
    accepted.value = true;
    setTimeout(() => emit('ok'), 650);
  } else {
    wrong.value = true;
    setTimeout(() => { digits.value = []; wrong.value = false; }, 1100);
  }
}
</script>

<template>
  <div class="screen" data-t="code">
    <Header />
    <div class="split code">
      <div class="split__text">
        <h1 class="h1 h1--tight">{{ COPY.code.headline }}</h1>
        <p class="body code__hint">{{ COPY.code.hint }}</p>
        <div class="code__cells" :class="{ wrong, accepted }">
          <div v-for="(c, i) in cells" :key="i" class="code__cell" :class="{ cursor: c.cursor }">
            {{ c.d }}
          </div>
        </div>
        <p v-if="wrong" class="code__err">{{ COPY.code.wrong }}</p>
      </div>

      <div class="split__visual">
        <div class="pad" :class="{ dimmed: accepted }">
          <button v-for="n in 9" :key="n" class="pad__key" :data-t="`key-${n}`" @pointerdown.stop="press(String(n))">{{ n }}</button>
          <span />
          <button class="pad__key" data-t="key-0" @pointerdown.stop="press('0')">0</button>
          <button class="pad__key pad__key--back" @pointerdown.stop="back()">⌫</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code__hint{margin-top:16px}
.code__cells{display:flex;gap:10px;margin-top:40px}
.code__cell{width:54px;height:66px;border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center;
  font-size:30px;font-weight:300;font-variant-numeric:tabular-nums;color:var(--text);
  transition:border-color .2s,color .2s,box-shadow .2s}
.code__cell.cursor{border-color:var(--amber);box-shadow:0 0 22px rgba(232,163,61,.3)}
.code__cell.cursor::after{content:'';width:1px;height:28px;background:var(--amber);
  animation:blink 1.1s step-end infinite}
@keyframes blink{50%{opacity:0}}
.code__cells.wrong .code__cell{border-color:var(--red);color:var(--red);
  animation:shake .4s}
@keyframes shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.code__cells.accepted .code__cell{border-color:var(--amber);color:var(--amber);
  box-shadow:0 0 26px rgba(232,163,61,.28)}
.code__err{color:var(--red);font-size:12px;letter-spacing:.1em;margin-top:16px}

.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:min(300px,42vw)}
.pad.dimmed{opacity:.25;pointer-events:none}
.pad__key{height:68px;background:#20100E;border:1px solid var(--line);color:var(--text);
  font:inherit;font-size:22px;font-weight:300;font-variant-numeric:tabular-nums;
  cursor:pointer}
.pad__key:active{background:#301713;border-color:var(--amber)}
.pad__key--back{font-size:17px;color:var(--muted)}
</style>
