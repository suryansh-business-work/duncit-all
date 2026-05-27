import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    // All vitest tests live under `__tests__/unit-tests/`. Cypress specs are
    // discovered by Cypress separately (see __tests__/e2e/cypress.config.ts).
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
  },
});
