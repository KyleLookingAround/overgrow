import {defineConfig} from 'vitest/config';
import preact from '@preact/preset-vite';

// The page is published as a static site under a sub-path (GitHub Pages), so every asset is referenced relatively.
export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {outDir: 'dist', sourcemap: true, target: 'es2022'},
  worker: {format: 'es'},
  test: {include: ['src/**/*.test.ts'], environment: 'node'},
});
