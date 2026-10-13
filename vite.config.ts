import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  // @/ musí poznať aj bundler, nielen tsconfig
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',          // Android 12+ aj iOS 14+ to zvládnu
    assetsInlineLimit: 0,
  },
  server: { host: true },      // aby sa dalo otvoriť z tabletu v tej istej sieti
});
