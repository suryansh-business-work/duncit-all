import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}'],
    coverage: {
      // Always collect coverage on `vitest run` so CI's form-test job enforces
      // the thresholds below without needing a separate --coverage flag.
      enabled: true,
      provider: 'v8',
      all: true,
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test files themselves + type-only declarations.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        // React root bootstrap — mountPortal render side-effect, no unit logic.
        'src/main.tsx',
        // Thin Apollo client factory (delegates to @duncit/shell).
        'src/apollo.ts',
        // Static URL config gated on Vite's build-time import.meta.env.DEV.
        'src/config/url-configs.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
