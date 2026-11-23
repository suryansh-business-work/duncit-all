import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const mock = (file: string) => path.resolve(projectRoot, '__tests__/mocks', file);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The shell (Apollo, auth, runtime) and the grid need a whole console
      // around them. These stand-ins keep the store's own column code real: the
      // table stub re-exports the package's real LabeledIds cell.
      '@duncit/shell': mock('shell.tsx'),
      '@duncit/table': mock('table.tsx'),
      '@duncit/ui': mock('ui.tsx'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material', '@mui/system'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails, so one red suite
      // would delete this workspace's lcov and SonarQube would read it as 0%.
      reportOnFailure: true,
      reporter: ['text', 'text-summary', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
});
