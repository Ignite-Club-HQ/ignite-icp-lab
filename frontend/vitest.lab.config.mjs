import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  server: { host: '127.0.0.1' }, cacheDir: '.lab-cache',
  resolve: { alias: { '@': path.resolve('src') } },
  esbuild: { jsx: 'automatic' },
  test: { include: ['lab-tests/*.test.tsx'], environment: 'jsdom', globals: true },
});
