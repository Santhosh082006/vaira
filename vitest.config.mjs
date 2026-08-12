import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)', 'src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
