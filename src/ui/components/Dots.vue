<script setup lang="ts">
defineProps<{ total: number; active: number }>();
</script>

<template>
  <div class="dots">
    <div v-for="i in total" :key="i" class="dot" :class="{ 'dot--on': i <= active }" />
  </div>
</template>
