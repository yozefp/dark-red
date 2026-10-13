<script setup lang="ts">
import { COPY } from '../copy';
defineProps<{ status?: string; statusValue?: string; off?: boolean }>();
</script>

<template>
  <div class="hdr">
    <div class="hdr__brand">
      <span class="t">{{ COPY.brand.name }}</span><span class="d">{{ COPY.brand.product }}</span>
    </div>
    <div class="hdr__status">
      <span v-if="off" class="off">MIMO LÍNIE</span>
      <template v-else-if="status">
        <span>{{ status }}</span><span v-if="statusValue" class="val">{{ statusValue }}</span>
      </template>
    </div>
  </div>
</template>
