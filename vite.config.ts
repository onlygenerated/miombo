/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@simulation': path.resolve(__dirname, 'src/simulation'),
      '@scenes': path.resolve(__dirname, 'src/scenes'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@rendering': path.resolve(__dirname, 'src/rendering'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
