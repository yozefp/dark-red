import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2020',          // Android 12+ aj iOS 14+ to zvládnu
    assetsInlineLimit: 0,
  },
  server: { host: true },      // aby sa dalo otvoriť z tabletu v tej istej sieti
});
