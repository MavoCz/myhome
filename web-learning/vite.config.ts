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
    // older iPads: without this the zoo chunk keeps class fields and the CSS keeps `inset`
    target: 'safari13',
    // Phaser alone is ~1.2 MB; it sits in its own lazily loaded chunk
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        scitani: resolve(root, 'exercises/scitani/index.html'),
        odcitani: resolve(root, 'exercises/odcitani/index.html'),
        vyjmenovana: resolve(root, 'exercises/vyjmenovana/index.html'),
        souhlasky: resolve(root, 'exercises/souhlasky/index.html'),
        parove: resolve(root, 'exercises/parove/index.html'),
        bje: resolve(root, 'exercises/bje/index.html'),
        koncovky: resolve(root, 'exercises/koncovky/index.html'),
        uu: resolve(root, 'exercises/uu/index.html'),
        predpony: resolve(root, 'exercises/predpony/index.html'),
        slovnidruhy: resolve(root, 'exercises/slovnidruhy/index.html'),
        nasobilka: resolve(root, 'exercises/nasobilka/index.html'),
      },
    },
  },
});
