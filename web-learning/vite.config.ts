import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080';

// Served by the myhome backend at /learning/; built outside static/ so the web build cannot wipe it.
export default defineConfig({
  base: '/learning/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: resolve(root, '../backend/src/main/resources/learning-static'),
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB; it sits in its own lazily loaded chunk
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        scitani: resolve(root, 'exercises/scitani/index.html'),
        vyjmenovana: resolve(root, 'exercises/vyjmenovana/index.html'),
      },
    },
  },
});
