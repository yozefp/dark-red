<script setup lang="ts">
import { COPY } from '../copy';
import Header from '../components/Header.vue';
const emit = defineEmits<{ start: [] }>();
</script>

<template>
  <div class="screen attract" data-t="attract" @pointerdown="emit('start')">
    <div class="glow" />
    <Header />
    <div class="split">
      <div class="split__text">
        <h1 class="h1 h1--hero">{{ COPY.attract.headline }}</h1>
        <div class="rule" />
        <p class="body">
          {{ COPY.attract.body }}<br>{{ COPY.attract.body2 }}
          <span class="hl">{{ COPY.attract.body3 }}</span>.
        </p>
        <div class="attract__cta">
          <span class="attract__dot" />
          <span>{{ COPY.attract.cta }}</span>
        </div>
      </div>
      <div class="split__visual"><div class="attract__beam" /></div>
    </div>
    <p class="note attract__note">{{ COPY.attract.note }}</p>
  </div>
</template>

<style scoped>
.attract__cta{display:flex;align-items:center;gap:1.4vw;margin-top:4vw;
  font-size:var(--fs-cta);letter-spacing:.22em;text-transform:uppercase;color:var(--text)}
.attract__note{position:absolute;left:calc(var(--gut) + var(--safe-l));
  bottom:calc(.9 * var(--gut) + var(--safe-b));margin:0}
.attract__dot{width:2.3vw;height:2.3vw;min-width:16px;min-height:16px;border-radius:50%;
  border:1px solid var(--amber);position:relative;flex:none}
.attract__dot::after{content:'';position:absolute;inset:25%;border-radius:50%;
  background:var(--amber);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
/* svetelný lúč — jediný prvok, ktorý na úvodnej svieti */
.attract__beam{width:3px;height:74%;border-radius:2px;
  background:linear-gradient(180deg,transparent,var(--amber) 22%,#fff 50%,var(--amber) 78%,transparent);
  box-shadow:0 0 44px 10px rgba(232,163,61,.26);
  animation:breathe 4.5s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.75;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.04)}}
</style>
