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
      // AG Grid and Chart.js need a real layout engine and a canvas, which jsdom
      // has neither of. Both stand-ins drive this console's own column and chart
      // code for real; everything else (shell, forms, dialogs, ui) is the real package.
      '@duncit/table': mock('table.tsx'),
      'react-chartjs-2': mock('charts.tsx'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material', '@mui/system'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    // Suites under __tests__/unit-tests, plus the colocated `*.form.cy.tsx`
    // specs the form structure (rule 17) asks for.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.cy.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    // Full React Hook Form + MockedProvider flows under v8 instrumentation on a
    // two-core runner pass 5s; same setting and reason as the CRM portal.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails, so one red suite
      // would delete this workspace's lcov and SonarQube would read it as 0%.
      reportOnFailure: true,
      reporter: ['text', 'text-summary', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.cy.{ts,tsx}',
        // React root bootstrap — mountWelcomePortal render side-effect, no unit logic.
        'src/main.tsx',
      ],
    },
  },
});
