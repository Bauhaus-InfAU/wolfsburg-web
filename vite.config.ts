import { defineConfig } from 'vite';

export default defineConfig({
  base: '/weimar-web/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  publicDir: 'public',
});
