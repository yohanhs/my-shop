import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** En `file://` (Electron empaquetado), `crossorigin` en script/link suele impedir cargar el bundle → pantalla en blanco. */
function stripCrossoriginForElectron(): Plugin {
  return {
    name: 'strip-crossorigin-electron',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossoriginForElectron()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/app'),
    },
  },
  server: {
    port: 5173,
  },
});
